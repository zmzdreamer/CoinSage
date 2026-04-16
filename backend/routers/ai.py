from fastapi import APIRouter
from datetime import date
from backend.database import get_db
from backend.llm.client import LLMClient, load_prompt
from backend.routers.budgets import get_current_budget

router = APIRouter(prefix="/api/ai", tags=["ai"])
llm = LLMClient()


def _fmt_transactions(rows) -> str:
    """Format transaction rows into a readable string.

    Args:
        rows: List of transaction rows from database

    Returns:
        Formatted string with transaction details
    """
    if not rows:
        return "（暂无记录）"
    return "\n".join(
        f"- {r['note'] or '无备注'}: ¥{r['amount']}" for r in rows
    )


@router.get("/daily-summary")
def daily_summary():
    """Get AI analysis summary of today's expenses.

    Returns:
        JSON object with AI analysis result
    """
    today = date.today()
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM transactions WHERE date=?", (str(today),)
        ).fetchall()

    budget = get_current_budget()
    prompt = load_prompt("daily_summary").format(
        date=str(today),
        transactions=_fmt_transactions(rows),
        budget_info=f"月预算 ¥{budget['total_budget']}，本月已花 ¥{budget['total_spent']}，剩余 ¥{budget['remaining']}"
    )
    return {"result": llm.analyze(prompt)}


@router.post("/rebalance")
def rebalance():
    """Get AI analysis for budget rebalancing advice.

    Returns:
        JSON object with rebalance advice
    """
    today = date.today()
    month_str = f"{today.year}-{today.month:02d}"
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM transactions WHERE strftime('%Y-%m', date)=? ORDER BY date DESC",
            (month_str,)
        ).fetchall()

    budget = get_current_budget()
    prompt = load_prompt("rebalance").format(
        total_budget=budget["total_budget"],
        total_spent=budget["total_spent"],
        days_left=budget["days_left"],
        transactions=_fmt_transactions(rows)
    )
    return {"result": llm.analyze(prompt)}
