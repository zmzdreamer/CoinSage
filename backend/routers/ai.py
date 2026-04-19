from collections import defaultdict
from fastapi import APIRouter
from datetime import date
from backend.database import get_db
from backend.llm.client import LLMClient, load_prompt
from backend.routers.budgets import get_current_budget

router = APIRouter(prefix="/api/ai", tags=["ai"])
llm = LLMClient()


def _load_category_map(db) -> dict:
    rows = db.execute("SELECT id, name FROM categories").fetchall()
    return {row["id"]: row["name"] for row in rows}


def _fmt_transactions(rows, category_map: dict) -> str:
    if not rows:
        return "��暂无记录）"
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
def daily_summary():
    today = date.today()
    with get_db() as db:
        category_map = _load_category_map(db)
        rows = db.execute(
            "SELECT * FROM transactions WHERE date=?", (str(today),)
        ).fetchall()

    budget = get_current_budget()
    prompt = load_prompt("daily_summary").format(
        date=str(today),
        transactions=_fmt_transactions(rows, category_map),
        category_summary=_fmt_category_summary(rows, category_map),
        budget_info=f"月预算 ¥{budget['total_budget']}，本月已花 ¥{budget['total_spent']}，剩余 ¥{budget['remaining']}，每日建议 ¥{budget['daily_allowance']}"
    )
    return {"result": llm.analyze(prompt)}


@router.post("/rebalance")
def rebalance():
    today = date.today()
    month_str = f"{today.year}-{today.month:02d}"
    with get_db() as db:
        category_map = _load_category_map(db)
        rows = db.execute(
            "SELECT * FROM transactions WHERE strftime('%Y-%m', date)=? ORDER BY date DESC",
            (month_str,)
        ).fetchall()

    budget = get_current_budget()
    prompt = load_prompt("rebalance").format(
        total_budget=budget["total_budget"],
        total_spent=budget["total_spent"],
        days_left=budget["days_left"],
        daily_allowance=budget["daily_allowance"],
        transactions=_fmt_transactions(rows, category_map),
        category_summary=_fmt_category_summary(rows, category_map)
    )
    return {"result": llm.analyze(prompt)}
