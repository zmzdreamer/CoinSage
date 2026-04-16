from fastapi import APIRouter, Response
from typing import Optional
from datetime import date as date_type
from backend.database import get_db
from backend.models import Transaction, TransactionCreate

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

@router.post("", response_model=Transaction, status_code=201)
def create_transaction(body: TransactionCreate):
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO transactions (amount, category_id, note, date) VALUES (?,?,?,?)",
            (body.amount, body.category_id, body.note, str(body.date))
        )
        db.commit()
        row = db.execute("SELECT * FROM transactions WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)

@router.get("", response_model=list[Transaction])
def list_transactions(date: Optional[date_type] = None, month: Optional[str] = None):
    with get_db() as db:
        if date:
            rows = db.execute(
                "SELECT * FROM transactions WHERE date=? ORDER BY created_at DESC",
                (str(date),)
            ).fetchall()
        elif month:
            rows = db.execute(
                "SELECT * FROM transactions WHERE strftime('%Y-%m', date)=? ORDER BY date DESC",
                (month,)
            ).fetchall()
        else:
            rows = db.execute(
                "SELECT * FROM transactions ORDER BY date DESC LIMIT 100"
            ).fetchall()
    return [dict(row) for row in rows]

@router.delete("/{tx_id}", status_code=204)
def delete_transaction(tx_id: int):
    with get_db() as db:
        db.execute("DELETE FROM transactions WHERE id=?", (tx_id,))
        db.commit()
    return Response(status_code=204)
