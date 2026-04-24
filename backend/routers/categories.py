from fastapi import APIRouter, HTTPException, Response, Depends
from pydantic import BaseModel
from backend.database import get_db
from backend.models import Category, UserInfo
from backend.auth import get_current_user

router = APIRouter(prefix="/api/categories", tags=["categories"])


class CategoryCreate(BaseModel):
    name: str
    color: str = "#6b7280"
    icon: str = "tag"


class CategoryUpdate(BaseModel):
    name: str | None = None
    color: str | None = None


@router.get("", response_model=list[Category])
def list_categories(_: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        rows = db.execute("SELECT * FROM categories ORDER BY id").fetchall()
    return [dict(row) for row in rows]


@router.post("", response_model=Category, status_code=201)
def create_category(body: CategoryCreate, _: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        existing = db.execute("SELECT id FROM categories WHERE name=?", (body.name,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="分类名已存在")
        cur = db.execute(
            "INSERT INTO categories (name, color, icon) VALUES (?,?,?)",
            (body.name, body.color, body.icon)
        )
        db.commit()
        row = db.execute("SELECT * FROM categories WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)


@router.patch("/{cat_id}", response_model=Category)
def update_category(cat_id: int, body: CategoryUpdate, _: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        row = db.execute("SELECT * FROM categories WHERE id=?", (cat_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Category not found")
        name = body.name if body.name is not None else row["name"]
        color = body.color if body.color is not None else row["color"]
        db.execute("UPDATE categories SET name=?, color=? WHERE id=?", (name, color, cat_id))
        db.commit()
        row = db.execute("SELECT * FROM categories WHERE id=?", (cat_id,)).fetchone()
    return dict(row)


@router.delete("/{cat_id}", status_code=204)
def delete_category(cat_id: int, _: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        row = db.execute("SELECT id FROM categories WHERE id=?", (cat_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Category not found")
        db.execute("DELETE FROM categories WHERE id=?", (cat_id,))
        db.commit()
    return Response(status_code=204)
