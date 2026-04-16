import pytest
from backend.database import init_db, get_db

def test_init_db_creates_tables():
    with get_db(":memory:") as db:
        init_db(db)
        tables = db.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
        table_names = {row[0] for row in tables}
        assert "transactions" in table_names
        assert "categories" in table_names
        assert "budgets" in table_names

def test_default_categories_inserted():
    with get_db(":memory:") as db:
        init_db(db)
        rows = db.execute("SELECT name FROM categories").fetchall()
        names = {row[0] for row in rows}
        assert "餐饮" in names
        assert "交通" in names
