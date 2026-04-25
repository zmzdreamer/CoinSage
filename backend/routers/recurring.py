from fastapi import APIRouter, HTTPException, Response, Depends
from datetime import date
from backend.database import get_db
from backend.models import Recurring, RecurringCreate, UserInfo
from backend.auth import get_current_user

router = APIRouter(prefix="/api/recurring", tags=["recurring"])


@router.get("", response_model=list[dict])
def list_recurring(_: UserInfo = Depends(get_current_user)):
    today = date.today()
    month_str = f"{today.year}-{today.month:02d}"

    with get_db() as db:
        templates = db.execute("""
            SELECT r.*, c.name as category_name, c.color as category_color
            FROM recurring_templates r
            LEFT JOIN categories c ON r.category_id = c.id
            WHERE r.active = 1
            ORDER BY r.day_of_month
        """).fetchall()

        result = []
        for t in templates:
            row = dict(t)
            existing = db.execute("""
                SELECT id FROM transactions
                WHERE note = ? AND amount = ? AND strftime('%Y-%m', date) = ?
                LIMIT 1
            """, (t["name"], t["amount"], month_str)).fetchone()
            row["confirmed_this_month"] = existing is not None
            row["due_this_month"] = today.day >= t["day_of_month"]
            result.append(row)

    return result


@router.post("", response_model=Recurring, status_code=201)
def create_recurring(body: RecurringCreate, _: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO recurring_templates (name, amount, category_id, day_of_month, note) VALUES (?,?,?,?,?)",
            (body.name, body.amount, body.category_id, body.day_of_month, body.note)
        )
        db.commit()
        row = db.execute("SELECT * FROM recurring_templates WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)


@router.delete("/{tmpl_id}", status_code=204)
def delete_recurring(tmpl_id: int, _: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        db.execute("UPDATE recurring_templates SET active=0 WHERE id=?", (tmpl_id,))
        db.commit()
    return Response(status_code=204)


@router.post("/{tmpl_id}/confirm")
def confirm_recurring(tmpl_id: int, _: UserInfo = Depends(get_current_user)):
    today = date.today()
    with get_db() as db:
        tmpl = db.execute(
            "SELECT * FROM recurring_templates WHERE id=? AND active=1", (tmpl_id,)
        ).fetchone()
        if not tmpl:
            raise HTTPException(status_code=404, detail="模板不存在")
        cur = db.execute(
            "INSERT INTO transactions (amount, category_id, note, date) VALUES (?,?,?,?)",
            (tmpl["amount"], tmpl["category_id"], tmpl["name"], str(today))
        )
        db.commit()
        row = db.execute("SELECT * FROM transactions WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)
