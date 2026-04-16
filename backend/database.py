import sqlite3
import os
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

    # Insert default categories (使用 INSERT OR IGNORE 保证幂等)
    conn.execute("INSERT OR IGNORE INTO categories (name, color, icon) VALUES (?, ?, ?)", ('餐饮',   '#f97316', 'utensils'))
    conn.execute("INSERT OR IGNORE INTO categories (name, color, icon) VALUES (?, ?, ?)", ('交通',   '#3b82f6', 'car'))
    conn.execute("INSERT OR IGNORE INTO categories (name, color, icon) VALUES (?, ?, ?)", ('购物',   '#ec4899', 'shopping-bag'))
    conn.execute("INSERT OR IGNORE INTO categories (name, color, icon) VALUES (?, ?, ?)", ('娱乐',   '#8b5cf6', 'gamepad'))
    conn.execute("INSERT OR IGNORE INTO categories (name, color, icon) VALUES (?, ?, ?)", ('医疗',   '#ef4444', 'heart'))
    conn.execute("INSERT OR IGNORE INTO categories (name, color, icon) VALUES (?, ?, ?)", ('其他',   '#6b7280', 'more-horizontal'))

    conn.commit()
