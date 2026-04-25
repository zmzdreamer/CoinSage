import sqlite3
import os
import bcrypt
from contextlib import contextmanager

DB_PATH = os.getenv("DB_PATH", "coinsage.db")

@contextmanager
def get_db(path: str = DB_PATH):
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()

def init_db(conn: sqlite3.Connection):
    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON")

    # Create tables (逐句执行避免 executescript 的隐式事务提交副作用)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id    INTEGER PRIMARY KEY AUTOINCREMENT,
            name  TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL DEFAULT '#6366f1',
            icon  TEXT NOT NULL DEFAULT 'tag'
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            amount      REAL    NOT NULL CHECK(amount > 0),
            category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
            note        TEXT    NOT NULL DEFAULT '',
            date        DATE    NOT NULL,
            created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
            amount      REAL    NOT NULL CHECK(amount > 0),
            period      TEXT    NOT NULL DEFAULT 'monthly' CHECK(period IN ('monthly', 'yearly')),
            year        INTEGER NOT NULL,
            month       INTEGER CHECK(month IS NULL OR (month >= 1 AND month <= 12))
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT    NOT NULL UNIQUE,
            password_hash TEXT    NOT NULL,
            is_admin      INTEGER NOT NULL DEFAULT 0,
            created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS ai_settings (
            id        INTEGER PRIMARY KEY DEFAULT 1 CHECK(id = 1),
            provider  TEXT    NOT NULL DEFAULT 'openai',
            model     TEXT    NOT NULL DEFAULT 'gpt-4o-mini',
            api_key   TEXT    NOT NULL DEFAULT '',
            base_url  TEXT,
            enabled   INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Insert default categories (使用 INSERT OR IGNORE 保证幂等)
    conn.execute("INSERT OR IGNORE INTO categories (name, color, icon) VALUES (?, ?, ?)", ('餐饮',   '#f97316', 'utensils'))
    conn.execute("INSERT OR IGNORE INTO categories (name, color, icon) VALUES (?, ?, ?)", ('交通',   '#3b82f6', 'car'))
    conn.execute("INSERT OR IGNORE INTO categories (name, color, icon) VALUES (?, ?, ?)", ('购物',   '#ec4899', 'shopping-bag'))
    conn.execute("INSERT OR IGNORE INTO categories (name, color, icon) VALUES (?, ?, ?)", ('娱乐',   '#8b5cf6', 'gamepad'))
    conn.execute("INSERT OR IGNORE INTO categories (name, color, icon) VALUES (?, ?, ?)", ('医疗',   '#ef4444', 'heart'))
    conn.execute("INSERT OR IGNORE INTO categories (name, color, icon) VALUES (?, ?, ?)", ('其他',   '#6b7280', 'more-horizontal'))

    conn.execute("""
        CREATE TABLE IF NOT EXISTS recurring_templates (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT    NOT NULL,
            amount        REAL    NOT NULL CHECK(amount > 0),
            category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
            period        TEXT    NOT NULL DEFAULT 'monthly' CHECK(period IN ('daily','monthly','yearly')),
            day_of_month  INTEGER NOT NULL DEFAULT 1 CHECK(day_of_month >= 1 AND day_of_month <= 28),
            month_of_year INTEGER CHECK(month_of_year IS NULL OR (month_of_year >= 1 AND month_of_year <= 12)),
            note          TEXT    NOT NULL DEFAULT '',
            active        INTEGER NOT NULL DEFAULT 1,
            created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # 存量数据库迁移
    for col, ddl in [
        ("period",        "TEXT NOT NULL DEFAULT 'monthly'"),
        ("month_of_year", "INTEGER"),
    ]:
        try:
            conn.execute(f"ALTER TABLE recurring_templates ADD COLUMN {col} {ddl}")
        except Exception:
            pass

    # Seed default admin account
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    admin_hash = bcrypt.hashpw(admin_password.encode(), bcrypt.gensalt()).decode()
    conn.execute(
        "INSERT OR IGNORE INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)",
        (admin_username, admin_hash)
    )

    conn.commit()
