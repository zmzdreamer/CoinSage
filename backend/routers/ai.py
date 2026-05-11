from collections import defaultdict
from fastapi import APIRouter, Depends
from datetime import date
from backend.database import get_db
from backend.llm.client import LLMClient, load_prompt
from backend.routers.budgets import get_current_budget
from backend.auth import get_current_user
from backend.models import UserInfo

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _get_llm_config(db, user_id: int) -> dict:
    row = db.execute("SELECT * FROM ai_settings WHERE user_id=?", (user_id,)).fetchone()
    if row:
        return dict(row)
    return {}


def _load_category_map(db, user_id: int) -> dict:
    rows = db.execute("SELECT id, name FROM categories WHERE user_id=?", (user_id,)).fetchall()
    return {row["id"]: row["name"] for row in rows}


def _fmt_transactions(rows, category_map: dict) -> str:
    if not rows:
        return "暂无记录）"
    return "\n".join(
        f"- [{category_map.get(r['category_id'], '其他')}] {r['note'] or '无备注'}: ¥{r['amount']}"
        for r in rows
    )


def _fmt_category_summary(rows, category_map: dict) -> str:
    totals: dict[str, float] = defaultdict(float)
    for r in rows:
        cat = category_map.get(r["category_id"], "其他")
        totals[cat] += r["amount"]
    if not totals:
        return "（暂无消费）"
    return "\n".join(
        f"- {cat}: ¥{total:.2f}"
        for cat, total in sorted(totals.items(), key=lambda x: x[1], reverse=True)
    )


@router.get("/daily-summary")
def daily_summary(user: UserInfo = Depends(get_current_user)):
    today = date.today()
    with get_db() as db:
        config = _get_llm_config(db, user.id)
        category_map = _load_category_map(db, user.id)
        rows = db.execute(
            "SELECT * FROM transactions WHERE user_id=? AND date=?", (user.id, str(today))
        ).fetchall()

    llm = LLMClient(config=config)
    budget = get_current_budget(user=user)
    prompt = load_prompt("daily_summary").format(
        date=str(today),
        transactions=_fmt_transactions(rows, category_map),
        category_summary=_fmt_category_summary(rows, category_map),
        budget_info=f"月预算 ¥{budget['total_budget']}，本月已花 ¥{budget['total_spent']}，剩余 ¥{budget['remaining']}，每日建议 ¥{budget['daily_allowance']}"
    )
    return {"result": llm.analyze(prompt)}


@router.post("/rebalance")
def rebalance(user: UserInfo = Depends(get_current_user)):
    today = date.today()
    month_str = f"{today.year}-{today.month:02d}"
    with get_db() as db:
        config = _get_llm_config(db, user.id)
        category_map = _load_category_map(db, user.id)
        rows = db.execute(
            "SELECT * FROM transactions WHERE user_id=? AND strftime('%Y-%m', date)=? ORDER BY date DESC",
            (user.id, month_str)
        ).fetchall()

    llm = LLMClient(config=config)
    budget = get_current_budget(user=user)
    prompt = load_prompt("rebalance").format(
        total_budget=budget["total_budget"],
        total_spent=budget["total_spent"],
        days_left=budget["days_left"],
        daily_allowance=budget["daily_allowance"],
        transactions=_fmt_transactions(rows, category_map),
        category_summary=_fmt_category_summary(rows, category_map)
    )
    return {"result": llm.analyze(prompt)}
