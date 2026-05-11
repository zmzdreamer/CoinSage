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
        assert "users" in table_names
        assert "app_config" in table_names


def test_app_config_has_jwt_secret():
    with get_db(":memory:") as db:
        init_db(db)
        row = db.execute(
            "SELECT value FROM app_config WHERE key='jwt_secret'"
        ).fetchone()
        assert row is not None
        assert len(row[0]) > 0


def test_users_table_has_is_owner():
    with get_db(":memory:") as db:
        init_db(db)
        cols = [r[1] for r in db.execute("PRAGMA table_info(users)").fetchall()]
        assert "is_owner" in cols


def test_data_tables_have_user_id():
    with get_db(":memory:") as db:
        init_db(db)
        for table in ("transactions", "budgets", "categories", "recurring_templates"):
            cols = [r[1] for r in db.execute(f"PRAGMA table_info({table})").fetchall()]
            assert "user_id" in cols, f"user_id missing from {table}"


def test_categories_empty_without_user():
    """Categories are seeded per-user at registration, not by init_db."""
    with get_db(":memory:") as db:
        init_db(db)
        rows = db.execute("SELECT name FROM categories").fetchall()
        assert len(rows) == 0
