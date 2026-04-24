import csv
import io
from fastapi import APIRouter, HTTPException, Response, Depends
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import date as date_type
from backend.database import get_db
from backend.models import Transaction, TransactionCreate, TransactionUpdate, UserInfo
from backend.auth import get_current_user

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.post("", response_model=Transaction, status_code=201)
def create_transaction(body: TransactionCreate, _: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO transactions (amount, category_id, note, date) VALUES (?,?,?,?)",
            (body.amount, body.category_id, body.note, str(body.date))
        )
        db.commit()
        row = db.execute("SELECT * FROM transactions WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)


@router.get("", response_model=list[Transaction])
def list_transactions(date: Optional[date_type] = None, month: Optional[str] = None,
                      _: UserInfo = Depends(get_current_user)):
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


@router.get("/search")
def search_transactions(
    q: Optional[str] = None,
    category_id: Optional[int] = None,
    amount_min: Optional[float] = None,
    amount_max: Optional[float] = None,
    date_from: Optional[date_type] = None,
    date_to: Optional[date_type] = None,
    limit: int = 100,
    _: UserInfo = Depends(get_current_user),
):
    conditions = []
    params = []

    if q:
        conditions.append("t.note LIKE ?")
        params.append(f"%{q}%")
    if category_id is not None:
        conditions.append("t.category_id = ?")
        params.append(category_id)
    if amount_min is not None:
        conditions.append("t.amount >= ?")
        params.append(amount_min)
    if amount_max is not None:
        conditions.append("t.amount <= ?")
        params.append(amount_max)
    if date_from is not None:
        conditions.append("t.date >= ?")
        params.append(str(date_from))
    if date_to is not None:
        conditions.append("t.date <= ?")
        params.append(str(date_to))

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    sql = f"""
        SELECT t.*, c.name as category_name, c.color as category_color
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        {where}
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT ?
    """
    params.append(limit)

    with get_db() as db:
        rows = db.execute(sql, params).fetchall()
    return [dict(row) for row in rows]


@router.get("/export")
def export_transactions_csv(month: Optional[str] = None, _: UserInfo = Depends(get_current_user)):
    if not month:
        raise HTTPException(status_code=400, detail="month 参数必填，格式 YYYY-MM")
    with get_db() as db:
        rows = db.execute(
            "SELECT t.date, t.amount, COALESCE(c.name, '其他') as category_name, t.note "
            "FROM transactions t LEFT JOIN categories c ON t.category_id = c.id "
            "WHERE strftime('%Y-%m', t.date)=? ORDER BY t.date ASC",
            (month,)
        ).fetchall()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["日期", "金额", "分类", "备注"])
    for row in rows:
        writer.writerow([row["date"], row["amount"], row["category_name"], row["note"] or ""])
    csv_bytes = ("﻿" + buf.getvalue()).encode("utf-8")
    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f'attachment; filename="coinsage-{month}.csv"'},
    )


@router.patch("/{tx_id}", response_model=Transaction)
def update_transaction(tx_id: int, body: TransactionUpdate, _: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        db.execute(
            "UPDATE transactions SET amount=?, category_id=?, note=? WHERE id=?",
            (body.amount, body.category_id, body.note, tx_id)
        )
        db.commit()
        row = db.execute("SELECT * FROM transactions WHERE id=?", (tx_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return dict(row)


@router.delete("/{tx_id}", status_code=204)
def delete_transaction(tx_id: int, _: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        db.execute("DELETE FROM transactions WHERE id=?", (tx_id,))
        db.commit()
    return Response(status_code=204)
