import sqlite3
import os

DB_PATH = os.getenv("DB_PATH", "coinsage.db")

def get_db(path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(conn: sqlite3.Connection):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS categories (
            id    INTEGER PRIMARY KEY AUTOINCREMENT,
            name  TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL DEFAULT '#6366f1',
            icon  TEXT NOT NULL DEFAULT 'tag'
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            amount      REAL    NOT NULL CHECK(amount > 0),
            category_id INTEGER REFERENCES categories(id),
            note        TEXT    NOT NULL DEFAULT '',
            date        DATE    NOT NULL,
            created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS budgets (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER REFERENCES categories(id),
            amount      REAL    NOT NULL CHECK(amount > 0),
            period      TEXT    NOT NULL DEFAULT 'monthly',
            year        INTEGER NOT NULL,
            month       INTEGER
        );

        INSERT OR IGNORE INTO categories (name, color, icon) VALUES
            ('餐饮',   '#f97316', 'utensils'),
            ('交通',   '#3b82f6', 'car'),
            ('购物',   '#ec4899', 'shopping-bag'),
            ('娱乐',   '#8b5cf6', 'gamepad'),
            ('医疗',   '#ef4444', 'heart'),
            ('其他',   '#6b7280', 'more-horizontal');
    """)
    conn.commit()
