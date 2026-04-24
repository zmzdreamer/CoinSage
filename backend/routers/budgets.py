from fastapi import APIRouter, Depends
from datetime import date
import calendar
from backend.database import get_db
from backend.models import Budget, BudgetCreate, UserInfo
from backend.auth import get_current_user

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.post("", response_model=Budget, status_code=201)
def set_budget(body: BudgetCreate, _: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        db.execute(
            "DELETE FROM budgets WHERE category_id IS ? AND year=? AND month=?",
            (body.category_id, body.year, body.month)
        )
        cur = db.execute(
            "INSERT INTO budgets (category_id, amount, period, year, month) VALUES (?,?,?,?,?)",
            (body.category_id, body.amount, body.period, body.year, body.month)
        )
        db.commit()
        row = db.execute("SELECT * FROM budgets WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)


@router.get("", response_model=list[Budget])
def list_budgets(year: int, month: int, _: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM budgets WHERE year=? AND month=?",
            (year, month)
        ).fetchall()
    return [dict(row) for row in rows]


@router.get("/current")
def get_current_budget(_: UserInfo = Depends(get_current_user)):
    today = date.today()
    year, month = today.year, today.month
    month_str = f"{year}-{month:02d}"
    days_in_month = calendar.monthrange(year, month)[1]
    days_left = days_in_month - today.day + 1

    with get_db() as db:
        budget_row = db.execute(
            "SELECT amount FROM budgets WHERE category_id IS NULL AND year=? AND month=?",
            (year, month)
        ).fetchone()
        spent_row = db.execute(
            "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE strftime('%Y-%m', date)=?",
            (month_str,)
        ).fetchone()

    total_budget = budget_row["amount"] if budget_row else 0
    total_spent = spent_row["total"]
    remaining = total_budget - total_spent

    return {
        "total_budget": total_budget,
        "total_spent": round(total_spent, 2),
        "remaining": round(remaining, 2),
        "days_left": days_left,
        "daily_allowance": round(remaining / days_left, 2) if days_left > 0 else 0
    }
