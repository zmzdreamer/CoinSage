import sqlite3
import os
import secrets
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

    conn.execute("""
        CREATE TABLE IF NOT EXISTS app_config (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)

    existing_secret = conn.execute(
        "SELECT value FROM app_config WHERE key='jwt_secret'"
    ).fetchone()
    if not existing_secret:
        conn.execute(
            "INSERT INTO app_config (key, value) VALUES ('jwt_secret', ?)",
            (secrets.token_hex(32),)
        )

    conn.execute(
        "INSERT OR IGNORE INTO app_config (key, value) VALUES ('allow_registration', '1')"
    )

    # Create tables (逐句执行避免 executescript 的隐式事务提交副作用)
    # users 必须先建，其他表通过外键引用它
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT    NOT NULL UNIQUE,
            password_hash TEXT    NOT NULL,
            is_owner      INTEGER NOT NULL DEFAULT 0,
            created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name    TEXT NOT NULL,
            color   TEXT NOT NULL DEFAULT '#6366f1',
            icon    TEXT NOT NULL DEFAULT 'tag',
            UNIQUE(user_id, name)
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
            user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
            amount      REAL    NOT NULL CHECK(amount > 0),
            period      TEXT    NOT NULL DEFAULT 'monthly' CHECK(period IN ('monthly', 'yearly')),
            year        INTEGER NOT NULL,
            month       INTEGER CHECK(month IS NULL OR (month >= 1 AND month <= 12))
        )
    """)

    # ai_settings: 用 user_id 替代旧的 id=1 单例约束
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ai_settings (
            user_id   INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            provider  TEXT    NOT NULL DEFAULT 'openai',
            model     TEXT    NOT NULL DEFAULT '',
            api_key   TEXT    NOT NULL DEFAULT '',
            base_url  TEXT,
            enabled   INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS recurring_templates (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

    # users 表迁移
    for col, ddl in [
        ("is_owner", "INTEGER NOT NULL DEFAULT 0"),
    ]:
        try:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col} {ddl}")
        except Exception:
            pass
    # 将旧的 is_admin=1 映射为 is_owner=1
    try:
        conn.execute("UPDATE users SET is_owner=1 WHERE is_admin=1")
    except Exception:
        pass

    # 存量数据迁移：给旧表加 user_id 列，将旧数据归属 user_id=1
    for table in ["transactions", "budgets", "categories", "recurring_templates"]:
        try:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER")
        except Exception:
            pass  # 列已存在
    try:
        conn.execute("UPDATE transactions SET user_id=1 WHERE user_id IS NULL")
        conn.execute("UPDATE budgets SET user_id=1 WHERE user_id IS NULL")
        conn.execute("UPDATE categories SET user_id=1 WHERE user_id IS NULL")
        conn.execute("UPDATE recurring_templates SET user_id=1 WHERE user_id IS NULL")
    except Exception:
        pass

    # ai_settings 迁移：旧版单例表（id=1）→ 新版 per-user 表（user_id）
    try:
        existing_cols = [r[1] for r in conn.execute("PRAGMA table_info(ai_settings)").fetchall()]
        if existing_cols and "user_id" not in existing_cols:
            # 旧表存在但无 user_id：重建表
            conn.execute("""
                CREATE TABLE ai_settings_new (
                    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    provider   TEXT    NOT NULL DEFAULT 'openai',
                    model      TEXT    NOT NULL DEFAULT '',
                    api_key    TEXT    NOT NULL DEFAULT '',
                    base_url   TEXT,
                    enabled    INTEGER NOT NULL DEFAULT 0,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # 将旧数据迁移到新表（归属 user_id=1，若 user_id=1 存在）
            conn.execute("""
                INSERT OR IGNORE INTO ai_settings_new (user_id, provider, model, api_key, base_url, enabled, updated_at)
                SELECT 1, provider, model, api_key, base_url, enabled, updated_at
                FROM ai_settings
                WHERE EXISTS (SELECT 1 FROM users WHERE id=1)
            """)
            conn.execute("DROP TABLE ai_settings")
            conn.execute("ALTER TABLE ai_settings_new RENAME TO ai_settings")
    except Exception:
        pass

    conn.commit()
