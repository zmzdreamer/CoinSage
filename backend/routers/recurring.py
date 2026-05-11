from fastapi import APIRouter, HTTPException, Response, Depends
from datetime import date
from backend.database import get_db
from backend.models import Recurring, RecurringCreate, UserInfo
from backend.auth import get_current_user

router = APIRouter(prefix="/api/recurring", tags=["recurring"])


def _confirmed(db, user_id: int, name: str, amount: float, period: str, today: date) -> bool:
    if period == "daily":
        row = db.execute(
            "SELECT id FROM transactions WHERE user_id=? AND note=? AND amount=? AND date=? LIMIT 1",
            (user_id, name, amount, str(today))
        ).fetchone()
    elif period == "yearly":
        row = db.execute(
            "SELECT id FROM transactions WHERE user_id=? AND note=? AND amount=? AND strftime('%Y',date)=? LIMIT 1",
            (user_id, name, amount, str(today.year))
        ).fetchone()
    else:  # monthly
        row = db.execute(
            "SELECT id FROM transactions WHERE user_id=? AND note=? AND amount=? AND strftime('%Y-%m',date)=? LIMIT 1",
            (user_id, name, amount, f"{today.year}-{today.month:02d}")
        ).fetchone()
    return row is not None


def _due(period: str, day_of_month: int, month_of_year, today: date) -> bool:
    if period == "daily":
        return True
    if period == "yearly":
        return today.month == (month_of_year or 1) and today.day >= day_of_month
    return today.day >= day_of_month  # monthly


@router.get("", response_model=list[dict])
def list_recurring(user: UserInfo = Depends(get_current_user)):
    today = date.today()
    with get_db() as db:
        templates = db.execute("""
            SELECT r.*, c.name as category_name, c.color as category_color
            FROM recurring_templates r
            LEFT JOIN categories c ON r.category_id = c.id
            WHERE r.active = 1 AND r.user_id = ?
            ORDER BY r.month_of_year, r.day_of_month
        """, (user.id,)).fetchall()

        result = []
        for t in templates:
            row = dict(t)
            period = row.get("period") or "monthly"
            row["due_this_period"] = _due(period, t["day_of_month"], t.get("month_of_year"), today)
            row["confirmed_this_period"] = _confirmed(db, user.id, t["name"], t["amount"], period, today)
            result.append(row)

    return result


@router.post("", response_model=Recurring, status_code=201)
def create_recurring(body: RecurringCreate, user: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO recurring_templates (user_id, name, amount, category_id, period, day_of_month, month_of_year, note) VALUES (?,?,?,?,?,?,?,?)",
            (user.id, body.name, body.amount, body.category_id, body.period, body.day_of_month, body.month_of_year, body.note)
        )
        db.commit()
        row = db.execute("SELECT * FROM recurring_templates WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)


@router.delete("/{tmpl_id}", status_code=204)
def delete_recurring(tmpl_id: int, user: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        row = db.execute(
            "SELECT id FROM recurring_templates WHERE id=? AND user_id=? AND active=1",
            (tmpl_id, user.id)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="模板不存在")
        db.execute("UPDATE recurring_templates SET active=0 WHERE id=?", (tmpl_id,))
        db.commit()
    return Response(status_code=204)


@router.post("/{tmpl_id}/confirm")
def confirm_recurring(tmpl_id: int, user: UserInfo = Depends(get_current_user)):
    today = date.today()
    with get_db() as db:
        tmpl = db.execute(
            "SELECT * FROM recurring_templates WHERE id=? AND active=1 AND user_id=?", (tmpl_id, user.id)
        ).fetchone()
        if not tmpl:
            raise HTTPException(status_code=404, detail="模板不存在")

        period = tmpl["period"] if "period" in tmpl.keys() else "monthly"
        if _confirmed(db, user.id, tmpl["name"], tmpl["amount"], period, today):
            labels = {"daily": "今日", "yearly": "今年", "monthly": "本月"}
            raise HTTPException(status_code=409, detail=f"{labels.get(period,'本期')}已确认过此周期账单")

        cur = db.execute(
            "INSERT INTO transactions (user_id, amount, category_id, note, date) VALUES (?,?,?,?,?)",
            (user.id, tmpl["amount"], tmpl["category_id"], tmpl["name"], str(today))
        )
        db.commit()
        row = db.execute("SELECT * FROM transactions WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)
