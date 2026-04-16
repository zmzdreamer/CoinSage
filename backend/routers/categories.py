from fastapi import APIRouter
from backend.database import get_db
from backend.models import Category

router = APIRouter(prefix="/api/categories", tags=["categories"])

@router.get("", response_model=list[Category])
def list_categories():
    with get_db() as db:
        rows = db.execute("SELECT * FROM categories ORDER BY id").fetchall()
    return [dict(row) for row in rows]
