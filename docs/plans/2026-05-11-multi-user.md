# Multi-User Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 CoinSage 从单用户改造为多用户，支持开放注册，所有数据按用户隔离，消除 env 依赖。

**Architecture:** 给所有数据表加 `user_id` 字段实现数据隔离；新增 `app_config` 表替代 env 变量；第一个注册用户成为 owner 并可控制注册开关；前端新增注册页和首次启动引导逻辑。

**Tech Stack:** FastAPI + SQLite (后端), React + Vite (前端), bcrypt + JWT (认证)

---

## Task 1: database.py — app_config 表 + JWT secret 自动生成

**Files:**
- Modify: `backend/database.py`
- Modify: `backend/auth.py`

**Step 1: 在 `database.py` 的 `init_db` 中新增 `app_config` 表**

在 `conn.execute("PRAGMA foreign_keys = ON")` 之后、创建 categories 表之前添加：

```python
conn.execute("""
    CREATE TABLE IF NOT EXISTS app_config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
""")
```

**Step 2: 在 `init_db` 中自动生成 JWT secret**

在 `app_config` 表创建语句之后添加：

```python
import secrets as _secrets
existing_secret = conn.execute(
    "SELECT value FROM app_config WHERE key='jwt_secret'"
).fetchone()
if not existing_secret:
    conn.execute(
        "INSERT INTO app_config (key, value) VALUES ('jwt_secret', ?)",
        (_secrets.token_hex(32),)
    )
```

**Step 3: 在 `init_db` 中初始化注册开关**

```python
conn.execute(
    "INSERT OR IGNORE INTO app_config (key, value) VALUES ('allow_registration', '1')"
)
```

**Step 4: 修改 `auth.py` 从 DB 读取 JWT secret**

将文件顶部的：
```python
SECRET_KEY = os.getenv("JWT_SECRET", "coinsage-dev-secret-change-in-prod")
```

替换为：
```python
def _get_secret_key() -> str:
    from backend.database import get_db
    with get_db() as db:
        row = db.execute("SELECT value FROM app_config WHERE key='jwt_secret'").fetchone()
        if row:
            return row["value"]
    return "fallback-not-for-production"
```

并将所有使用 `SECRET_KEY` 的地方改为调用 `_get_secret_key()`：
- `create_access_token`: `jwt.encode(payload, _get_secret_key(), algorithm=ALGORITHM)`
- `get_current_user`: `jwt.decode(token, _get_secret_key(), algorithms=[ALGORITHM])`

**Step 5: 删除 `database.py` 中的 admin seed 逻辑**

找到并删除以下代码块（文件末尾附近）：
```python
# Seed default admin account
admin_username = os.getenv("ADMIN_USERNAME", "admin")
admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
admin_hash = bcrypt.hashpw(admin_password.encode(), bcrypt.gensalt()).decode()
conn.execute(
    "INSERT OR IGNORE INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)",
    (admin_username, admin_hash)
)
```

**Step 6: 删除 `database.py` 顶部无用的 import**

删除 `import bcrypt`（seed 删掉后不再需要）。

**Step 7: 验证**

```bash
cd /Users/unme/project/CoinSage
python -c "
from backend.database import get_db, init_db
import os, tempfile
db_path = tempfile.mktemp(suffix='.db')
os.environ['DB_PATH'] = db_path
from backend import database
database.DB_PATH = db_path
with database.get_db(db_path) as db:
    init_db(db)
    row = db.execute(\"SELECT value FROM app_config WHERE key='jwt_secret'\").fetchone()
    print('JWT secret length:', len(row['value']))
    assert len(row['value']) == 64, 'Secret should be 64 hex chars'
print('OK')
"
```
期望输出：`JWT secret length: 64` 和 `OK`

**Step 8: Commit**

```bash
git add backend/database.py backend/auth.py
git commit -m "feat: auto-generate JWT secret in app_config, remove admin seed"
```

---

## Task 2: models.py — 更新 UserInfo，新增注册和状态模型

**Files:**
- Modify: `backend/models.py`

**Step 1: 更新 `UserInfo`**

将：
```python
class UserInfo(BaseModel):
    id: int
    username: str
    is_admin: bool
```

替换为：
```python
class UserInfo(BaseModel):
    id: int
    username: str
    is_owner: bool
```

**Step 2: 新增注册模型**

在 `UserLogin` 类之后添加：
```python
class UserRegister(BaseModel):
    username: str
    password: str

class AuthStatus(BaseModel):
    first_run: bool
    registration_open: bool
```

**Step 3: 更新 `Token` 模型**（无需修改，`user: UserInfo` 字段自动适配）

**Step 4: 验证**

```bash
python -c "from backend.models import UserInfo, UserRegister, AuthStatus; print('OK')"
```

**Step 5: Commit**

```bash
git add backend/models.py
git commit -m "feat: update UserInfo to is_owner, add UserRegister and AuthStatus models"
```

---

## Task 3: database.py — users 表加 is_owner 字段

**Files:**
- Modify: `backend/database.py`

**Step 1: 修改 users 表创建语句**

将：
```python
conn.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT    NOT NULL UNIQUE,
        password_hash TEXT    NOT NULL,
        is_admin      INTEGER NOT NULL DEFAULT 0,
        created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
""")
```

替换为：
```python
conn.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT    NOT NULL UNIQUE,
        password_hash TEXT    NOT NULL,
        is_owner      INTEGER NOT NULL DEFAULT 0,
        created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
""")
```

**Step 2: 在迁移块中添加 is_owner 列迁移（兼容旧数据库）**

在 recurring_templates 迁移块之后添加：
```python
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
```

**Step 3: 验证**

```bash
python -c "
from backend.database import get_db, init_db
import tempfile, os
db_path = tempfile.mktemp(suffix='.db')
from backend import database; database.DB_PATH = db_path
with database.get_db(db_path) as db:
    init_db(db)
    cols = [r[1] for r in db.execute('PRAGMA table_info(users)').fetchall()]
    assert 'is_owner' in cols, f'Missing is_owner, got: {cols}'
print('OK')
"
```

**Step 4: Commit**

```bash
git add backend/database.py
git commit -m "feat: add is_owner column to users table"
```

---

## Task 4: database.py — 数据表加 user_id 字段

**Files:**
- Modify: `backend/database.py`

**Step 1: 修改 transactions 表**

将 transactions 表创建语句的最后一行改为包含 `user_id`：
```python
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
```

**Step 2: 修改 budgets 表**

```python
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
```

**Step 3: 修改 categories 表**

```python
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
```

**Step 4: 修改 recurring_templates 表**

在 `recurring_templates` 创建语句的字段列表中加入 `user_id`：
```python
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
```

**Step 5: 处理 ai_settings 表（重建以去除 id=1 约束）**

将旧的 ai_settings CREATE 替换为：
```python
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
# 迁移旧数据：将 id=1 的单例记录归到 user_id=1
try:
    conn.execute("""
        INSERT OR IGNORE INTO ai_settings (user_id, provider, model, api_key, base_url, enabled, updated_at)
        SELECT 1, provider, model, api_key, base_url, enabled, updated_at
        FROM (SELECT provider, model, api_key, base_url, enabled, updated_at FROM ai_settings WHERE rowid=1)
        WHERE EXISTS (SELECT 1 FROM users WHERE id=1)
    """)
except Exception:
    pass
```

**Step 6: 删除旧的默认分类 INSERT 语句（6条 INSERT OR IGNORE）**

这些默认分类现在由注册流程按用户插入（Task 6），全局插入不再适用，删掉：
```python
# 删除这6行
conn.execute("INSERT OR IGNORE INTO categories (name, color, icon) VALUES (?, ?, ?)", ('餐饮', ...))
# ... 等共6条
```

**Step 7: 新增数据迁移——现有数据归属 user_id=1**

在 `init_db` 末尾 `conn.commit()` 之前，添加存量数据迁移：
```python
# 存量数据迁移：若 user_id=1 存在，将无 user_id 的旧数据归属于它
# transactions
for col_check in [("transactions", "user_id"), ("budgets", "user_id"),
                  ("categories", "user_id"), ("recurring_templates", "user_id")]:
    table, col = col_check
    try:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} INTEGER")
    except Exception:
        pass  # 列已存在
try:
    conn.execute("UPDATE transactions SET user_id=1 WHERE user_id IS NULL")
    conn.execute("UPDATE budgets SET user_id=1 WHERE user_id IS NULL")
    conn.execute("UPDATE categories SET user_id=1 WHERE user_id IS NULL")
    conn.execute("UPDATE recurring_templates SET user_id=1 WHERE user_id IS NULL")
except Exception:
    pass
```

**Step 8: 验证**

```bash
python -c "
from backend.database import get_db, init_db
import tempfile
from backend import database
db_path = tempfile.mktemp(suffix='.db')
database.DB_PATH = db_path
with database.get_db(db_path) as db:
    init_db(db)
    for table in ['transactions', 'budgets', 'categories', 'recurring_templates', 'ai_settings']:
        cols = [r[1] for r in db.execute(f'PRAGMA table_info({table})').fetchall()]
        assert 'user_id' in cols, f'{table} missing user_id, got {cols}'
        print(f'{table}: OK')
print('All OK')
"
```

**Step 9: Commit**

```bash
git add backend/database.py
git commit -m "feat: add user_id to all data tables, migrate existing data to user 1"
```

---

## Task 5: auth.py — get_owner_user 依赖

**Files:**
- Modify: `backend/auth.py`

**Step 1: 更新 `get_current_user` 中的 UserInfo 构建**

将：
```python
return UserInfo(id=row["id"], username=row["username"], is_admin=bool(row["is_admin"]))
```
替换为：
```python
return UserInfo(id=row["id"], username=row["username"], is_owner=bool(row["is_owner"]))
```

**Step 2: 将 `get_admin_user` 重命名为 `get_owner_user`**

将：
```python
def get_admin_user(user: UserInfo = Depends(get_current_user)) -> UserInfo:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要管理员权限")
    return user
```
替换为：
```python
def get_owner_user(user: UserInfo = Depends(get_current_user)) -> UserInfo:
    if not user.is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要 Owner 权限")
    return user
```

**Step 3: 更新 `settings.py` 中的 import**

将 `backend/routers/settings.py` 顶部：
```python
from backend.auth import get_admin_user
```
改为：
```python
from backend.auth import get_current_user
```

并将 `get_ai_settings` 和 `update_ai_settings` 的依赖从 `get_admin_user` 改为 `get_current_user`：
```python
def get_ai_settings(user: UserInfo = Depends(get_current_user)):
def update_ai_settings(body: AISettingUpdate, user: UserInfo = Depends(get_current_user)):
```

**Step 4: 验证**

```bash
python -c "from backend.auth import get_owner_user, get_current_user; print('OK')"
```

**Step 5: Commit**

```bash
git add backend/auth.py backend/routers/settings.py
git commit -m "feat: rename get_admin_user to get_owner_user, AI settings open to all users"
```

---

## Task 6: routers/auth.py — status + register 端点

**Files:**
- Modify: `backend/routers/auth.py`

**Step 1: 更新 import**

将文件顶部改为：
```python
from fastapi import APIRouter, HTTPException, status
from backend.database import get_db
from backend.models import UserLogin, UserRegister, AuthStatus, Token, UserInfo
from backend.auth import verify_password, create_access_token, get_current_user
from fastapi import Depends
import bcrypt
```

**Step 2: 新增默认分类的辅助函数**

在 `router = APIRouter(...)` 之后添加：
```python
DEFAULT_CATEGORIES = [
    ('餐饮', '#f97316', 'utensils'),
    ('交通', '#3b82f6', 'car'),
    ('购物', '#ec4899', 'shopping-bag'),
    ('娱乐', '#8b5cf6', 'gamepad'),
    ('医疗', '#ef4444', 'heart'),
    ('其他', '#6b7280', 'more-horizontal'),
]

def _seed_categories(db, user_id: int):
    for name, color, icon in DEFAULT_CATEGORIES:
        db.execute(
            "INSERT OR IGNORE INTO categories (user_id, name, color, icon) VALUES (?,?,?,?)",
            (user_id, name, color, icon)
        )
```

**Step 3: 新增 `GET /api/auth/status` 端点**

```python
@router.get("/status", response_model=AuthStatus)
def auth_status():
    with get_db() as db:
        user_count = db.execute("SELECT COUNT(*) as n FROM users").fetchone()["n"]
        reg_row = db.execute(
            "SELECT value FROM app_config WHERE key='allow_registration'"
        ).fetchone()
    registration_open = (reg_row["value"] == "1") if reg_row else True
    return AuthStatus(first_run=(user_count == 0), registration_open=registration_open)
```

**Step 4: 新增 `POST /api/auth/register` 端点**

```python
@router.post("/register", response_model=Token, status_code=201)
def register(body: UserRegister):
    with get_db() as db:
        user_count = db.execute("SELECT COUNT(*) as n FROM users").fetchone()["n"]
        is_first = user_count == 0

        if not is_first:
            reg_row = db.execute(
                "SELECT value FROM app_config WHERE key='allow_registration'"
            ).fetchone()
            if not reg_row or reg_row["value"] != "1":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="注册已关闭，请联系管理员"
                )

        if not body.username.strip():
            raise HTTPException(status_code=400, detail="用户名不能为空")
        if len(body.password) < 6:
            raise HTTPException(status_code=400, detail="密码至少 6 位")

        existing = db.execute(
            "SELECT id FROM users WHERE username=?", (body.username.strip(),)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="用户名已被占用")

        pw_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
        cur = db.execute(
            "INSERT INTO users (username, password_hash, is_owner) VALUES (?,?,?)",
            (body.username.strip(), pw_hash, 1 if is_first else 0)
        )
        db.commit()
        user_id = cur.lastrowid
        _seed_categories(db, user_id)
        db.commit()
        row = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()

    user = UserInfo(id=row["id"], username=row["username"], is_owner=bool(row["is_owner"]))
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=user)
```

**Step 5: 更新 `login` 端点中的 UserInfo 构建**

将：
```python
user = UserInfo(id=row["id"], username=row["username"], is_admin=bool(row["is_admin"]))
```
替换为：
```python
user = UserInfo(id=row["id"], username=row["username"], is_owner=bool(row["is_owner"]))
```

**Step 6: 运行测试验证**

```bash
cd /Users/unme/project/CoinSage
python -m pytest tests/ -q 2>&1 | head -40
```

期望：大多数测试通过（部分测试因 user_id 字段改变可能需要后续修复）。

**Step 7: Commit**

```bash
git add backend/routers/auth.py
git commit -m "feat: add /auth/status and /auth/register endpoints"
```

---

## Task 7: routers/settings.py — ai_settings 用户隔离 + 注册开关

**Files:**
- Modify: `backend/routers/settings.py`

**Step 1: 更新 `get_ai_settings` 使用 user_id**

将：
```python
@router.get("/ai", response_model=AISetting)
def get_ai_settings(_: UserInfo = Depends(get_admin_user)):
    with get_db() as db:
        row = db.execute("SELECT * FROM ai_settings WHERE id=1").fetchone()
    if row is None:
        return AISetting(provider="openai", model="", api_key="",
                         base_url=None, enabled=False, updated_at="")
    return AISetting(**dict(row))
```

替换为：
```python
@router.get("/ai", response_model=AISetting)
def get_ai_settings(user: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM ai_settings WHERE user_id=?", (user.id,)
        ).fetchone()
    if row is None:
        return AISetting(provider="openai", model="", api_key="",
                         base_url=None, enabled=False, updated_at="")
    return AISetting(**dict(row))
```

**Step 2: 更新 `update_ai_settings` 使用 user_id**

将：
```python
@router.put("/ai", response_model=AISetting)
def update_ai_settings(body: AISettingUpdate, _: UserInfo = Depends(get_admin_user)):
    with get_db() as db:
        db.execute("""
            INSERT INTO ai_settings (id, provider, model, api_key, base_url, enabled, updated_at)
            VALUES (1, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET ...
        """, ...)
        row = db.execute("SELECT * FROM ai_settings WHERE id=1").fetchone()
    return AISetting(**dict(row))
```

替换为：
```python
@router.put("/ai", response_model=AISetting)
def update_ai_settings(body: AISettingUpdate, user: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        db.execute("""
            INSERT INTO ai_settings (user_id, provider, model, api_key, base_url, enabled, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
                provider=excluded.provider,
                model=excluded.model,
                api_key=excluded.api_key,
                base_url=excluded.base_url,
                enabled=excluded.enabled,
                updated_at=CURRENT_TIMESTAMP
        """, (user.id, body.provider, body.model, body.api_key, body.base_url, int(body.enabled)))
        db.commit()
        row = db.execute(
            "SELECT * FROM ai_settings WHERE user_id=?", (user.id,)
        ).fetchone()
    return AISetting(**dict(row))
```

**Step 3: 新增注册开关端点**

在文件末尾添加（同时在文件顶部 import 中添加 `get_owner_user`）：

```python
from backend.auth import get_current_user, get_owner_user

class RegistrationUpdate(BaseModel):
    allow_registration: bool

@router.put("/registration")
def update_registration(body: RegistrationUpdate, _: UserInfo = Depends(get_owner_user)):
    with get_db() as db:
        db.execute(
            "INSERT OR REPLACE INTO app_config (key, value) VALUES ('allow_registration', ?)",
            ("1" if body.allow_registration else "0",)
        )
        db.commit()
    return {"allow_registration": body.allow_registration}
```

**Step 4: 更新 models.py 中的 `AISetting`**

`AISetting` 的父类字段包含 `updated_at: str`，当从 DB 返回时需要处理空字符串情况，无需修改（已有兼容逻辑）。

**Step 5: Commit**

```bash
git add backend/routers/settings.py backend/models.py
git commit -m "feat: ai_settings per-user isolation, add registration toggle endpoint"
```

---

## Task 8: 数据路由 — user_id 隔离（transactions）

**Files:**
- Modify: `backend/routers/transactions.py`

**Step 1: 将所有 `_: UserInfo` 改为 `user: UserInfo`**

文件中所有函数签名中的 `_: UserInfo = Depends(get_current_user)` 改为 `user: UserInfo = Depends(get_current_user)`。

**Step 2: 更新 `create_transaction`**

```python
@router.post("", response_model=Transaction, status_code=201)
def create_transaction(body: TransactionCreate, user: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO transactions (user_id, amount, category_id, note, date) VALUES (?,?,?,?,?)",
            (user.id, body.amount, body.category_id, body.note, str(body.date))
        )
        db.commit()
        row = db.execute("SELECT * FROM transactions WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)
```

**Step 3: 更新 `list_transactions`**

在所有查询中加 `AND user_id=?` 条件，并在 params 中加入 `user.id`：

```python
@router.get("", response_model=list[Transaction])
def list_transactions(date: Optional[date_type] = None, month: Optional[str] = None,
                      user: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        if date:
            rows = db.execute(
                "SELECT * FROM transactions WHERE user_id=? AND date=? ORDER BY created_at DESC",
                (user.id, str(date))
            ).fetchall()
        elif month:
            rows = db.execute(
                "SELECT * FROM transactions WHERE user_id=? AND strftime('%Y-%m', date)=? ORDER BY date DESC",
                (user.id, month)
            ).fetchall()
        else:
            rows = db.execute(
                "SELECT * FROM transactions WHERE user_id=? ORDER BY date DESC LIMIT 100",
                (user.id,)
            ).fetchall()
    return [dict(row) for row in rows]
```

**Step 4: 更新 `search_transactions`**

在 `conditions` 列表初始化时预填用户过滤条件：
```python
conditions = ["t.user_id = ?"]
params = [user.id]
```

**Step 5: 更新 `export_transactions_csv`**

在 SQL 中加 `AND t.user_id=?`，params 中加 `user.id`：
```python
rows = db.execute(
    "SELECT t.date, t.amount, COALESCE(c.name, '其他') as category_name, t.note "
    "FROM transactions t LEFT JOIN categories c ON t.category_id = c.id "
    "WHERE t.user_id=? AND strftime('%Y-%m', t.date)=? ORDER BY t.date ASC",
    (user.id, month)
).fetchall()
```

**Step 6: 更新 `update_transaction` 和 `delete_transaction`**

加 `AND user_id=?` 防止越权：
```python
# update
db.execute(
    "UPDATE transactions SET amount=?, category_id=?, note=? WHERE id=? AND user_id=?",
    (body.amount, body.category_id, body.note, tx_id, user.id)
)
# delete
db.execute("DELETE FROM transactions WHERE id=? AND user_id=?", (tx_id, user.id))
```

**Step 7: Commit**

```bash
git add backend/routers/transactions.py
git commit -m "feat: transactions user_id isolation"
```

---

## Task 9: 数据路由 — user_id 隔离（categories、budgets、recurring）

**Files:**
- Modify: `backend/routers/categories.py`
- Modify: `backend/routers/budgets.py`
- Modify: `backend/routers/recurring.py`

**Step 1: categories.py — 所有查询加 user_id 过滤**

- `list_categories`: `WHERE user_id=?` + `(user.id,)`
- `create_category`: INSERT 加 `user_id`，重名检查加 `AND user_id=?`
- `update_category`: WHERE 加 `AND user_id=?`
- `delete_category`: WHERE 加 `AND user_id=?`
- 所有函数签名 `_:` 改为 `user:`

**Step 2: budgets.py — 所有查询加 user_id 过滤**

- `set_budget`: DELETE 和 INSERT 加 `user_id`
- `list_budgets`: `WHERE user_id=? AND year=? AND month=?`
- `get_current_budget`: `budget_row` 查询加 `AND user_id=?`，`spent_row` 查询加 `AND user_id=?`

**Step 3: recurring.py — 所有查询加 user_id 过滤**

- `list_recurring`: `WHERE r.active=1 AND r.user_id=?` + `(user.id,)`
- `create_recurring`: INSERT 加 `user_id`
- `delete_recurring`: WHERE 加 `AND user_id=?`
- `confirm_recurring`: 查询模板时加 `AND user_id=?`；INSERT transactions 时加 `user_id`
- `_confirmed` 函数：添加 `user_id: int` 参数，所有查询加 `AND user_id=?`
- 调用 `_confirmed` 的地方传入 `user.id`（需要将函数签名中的 `_:` 改为 `user:`）

**Step 4: Commit**

```bash
git add backend/routers/categories.py backend/routers/budgets.py backend/routers/recurring.py
git commit -m "feat: categories/budgets/recurring user_id isolation"
```

---

## Task 10: routers/ai.py — user_id 隔离

**Files:**
- Modify: `backend/routers/ai.py`

**Step 1: 查看并更新 ai.py**

ai.py 中读取 AI 设置的查询从 `WHERE id=1` 改为 `WHERE user_id=current_user.id`，同时数据查询（transactions/budgets）加 `AND user_id=?`。

具体：找到读取 `ai_settings` 的查询，改为按 user_id；找到读取 transactions/budgets 的分析查询，加 `user_id` 过滤。

**Step 2: Commit**

```bash
git add backend/routers/ai.py
git commit -m "feat: ai analysis user_id isolation"
```

---

## Task 11: 更新测试文件

**Files:**
- Modify: `tests/test_transactions.py`
- Modify: `tests/test_budgets.py`
- Modify: `tests/test_categories.py`
- Modify: `tests/test_database.py`

**Step 1: 检查现有测试的 fixture**

```bash
head -60 tests/test_transactions.py
```

**Step 2: 在测试 fixture 中创建用户**

大多数测试需要先注册/登录用户才能操作数据。在各测试文件的 `client` fixture 中，添加用户注册步骤：
```python
# 在 fixture 中创建测试用户
client.post("/api/auth/register", json={"username": "testuser", "password": "testpass123"})
resp = client.post("/api/auth/login", json={"username": "testuser", "password": "testpass123"})
token = resp.json()["access_token"]
# 后续请求带上 Authorization: Bearer {token}
```

**Step 3: 运行所有测试**

```bash
python -m pytest tests/ -v 2>&1 | tail -30
```

期望：所有测试通过。

**Step 4: Commit**

```bash
git add tests/
git commit -m "test: update tests for multi-user user_id isolation"
```

---

## Task 12: api.js — 新增前端接口方法

**Files:**
- Modify: `frontend/src/api.js`

**Step 1: 在 `api` 对象的 Auth 区块中添加方法**

在 `getMe()` 之后添加：
```javascript
getAuthStatus() {
  return fetchJSON(`${BASE}/auth/status`)
},
register(username, password) {
  return fetchJSON(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
},
```

**Step 2: 在 Settings 区块末尾添加注册开关方法**

```javascript
updateRegistration(allow) {
  return fetchJSON(`${BASE}/settings/registration`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ allow_registration: allow }),
  })
},
```

**Step 3: Commit**

```bash
git add frontend/src/api.js
git commit -m "feat: add register, getAuthStatus, updateRegistration to api.js"
```

---

## Task 13: 前端 — Register.jsx

**Files:**
- Create: `frontend/src/pages/Register.jsx`

**Step 1: 创建注册页**

样式与 `Login.jsx` 完全一致，字段：用户名、密码、确认密码。

```jsx
import { useState } from "react"
import { useAuth } from "../AuthContext"
import { api } from "../api"

export default function Register({ isFirstRun = false, onSwitchToLogin }) {
  const { login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm]   = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password || !confirm) return
    if (password !== confirm) { setError("两次密码不一致"); return }
    if (password.length < 6)  { setError("密码至少 6 位"); return }
    setLoading(true); setError("")
    try {
      const resp = await api.register(username.trim(), password)
      login(resp)
    } catch (err) {
      setError(err?.message?.includes("409") ? "用户名已被占用" :
               err?.message?.includes("403") ? "注册已关闭" : "注册失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--c-bg)", padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "360px" }}>
        {/* Logo — 与 Login.jsx 相同的 logo 块 */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "16px",
            background: "#0071E3",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: "16px",
          }}>
            <svg width="36" height="36" viewBox="0 0 28 28" fill="none">
              <path d="M8 20l4-12 4 12M9.5 16h5" stroke="white" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.5px",
            color: "var(--c-text-1)", margin: 0 }}>CoinSage</h1>
          <p style={{ fontSize: "14px", color: "var(--c-text-3)", marginTop: "6px" }}>
            {isFirstRun ? "创建第一个账号" : "创建账号"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ overflow: "hidden", marginBottom: "12px" }}>
            {[
              { label: "用户名", value: username, setter: setUsername, type: "text",    placeholder: "请输入用户名",   auto: "username" },
              { label: "密码",   value: password, setter: setPassword, type: "password", placeholder: "至少 6 位",    auto: "new-password" },
              { label: "确认密码", value: confirm, setter: setConfirm, type: "password", placeholder: "再次输入密码", auto: "new-password" },
            ].map((field, i) => (
              <div key={field.label}>
                {i > 0 && <div className="sep" />}
                <div style={{ padding: "14px 16px" }}>
                  <label style={{
                    display: "block", fontSize: "11px", fontWeight: 600,
                    letterSpacing: "0.08em", color: "var(--c-text-3)",
                    textTransform: "uppercase", marginBottom: "6px",
                  }}>{field.label}</label>
                  <input
                    type={field.type}
                    autoComplete={field.auto}
                    autoFocus={i === 0}
                    value={field.value}
                    onChange={e => field.setter(e.target.value)}
                    placeholder={field.placeholder}
                    style={{
                      width: "100%", background: "transparent", border: "none",
                      outline: "none", fontSize: "16px", color: "var(--c-text-1)",
                      fontFamily: "var(--font)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p style={{ fontSize: "13px", color: "var(--c-red)",
              textAlign: "center", marginBottom: "12px" }}>{error}</p>
          )}

          <button type="submit" className="btn-primary"
            disabled={loading || !username.trim() || !password || !confirm}>
            {loading ? "注册中…" : "注册"}
          </button>
        </form>

        {!isFirstRun && onSwitchToLogin && (
          <p style={{ textAlign: "center", marginTop: "20px",
            fontSize: "14px", color: "var(--c-text-3)" }}>
            已有账号？{" "}
            <button onClick={onSwitchToLogin}
              style={{ background: "none", border: "none", cursor: "pointer",
                color: "var(--c-blue)", fontFamily: "var(--font)", fontSize: "14px" }}>
              登录
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/Register.jsx
git commit -m "feat: add Register page"
```

---

## Task 14: 前端 — Login.jsx 加注册入口

**Files:**
- Modify: `frontend/src/pages/Login.jsx`

**Step 1: 接收 `onSwitchToRegister` prop**

函数签名改为 `export default function Login({ onSwitchToRegister })`

**Step 2: 在 Submit 按钮下方添加注册链接**

在 `</form>` 之后添加：
```jsx
{onSwitchToRegister && (
  <p style={{ textAlign: "center", marginTop: "20px",
    fontSize: "14px", color: "var(--c-text-3)" }}>
    还没有账号？{" "}
    <button onClick={onSwitchToRegister}
      style={{ background: "none", border: "none", cursor: "pointer",
        color: "var(--c-blue)", fontFamily: "var(--font)", fontSize: "14px" }}>
      注册
    </button>
  </p>
)}
```

**Step 3: Commit**

```bash
git add frontend/src/pages/Login.jsx
git commit -m "feat: add register link to Login page"
```

---

## Task 15: 前端 — App.jsx 启动逻辑 + 权限更新

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: 新增 import**

```jsx
import Register from "./pages/Register"
```

**Step 2: 新增状态**

在 `const [refreshKey, setRefreshKey] = useState(0)` 之后添加：
```jsx
const [authStatus, setAuthStatus]     = useState(null)  // { first_run, registration_open }
const [showRegister, setShowRegister] = useState(false)
```

**Step 3: 首次加载检查 auth status**

在 `AuthContext` 的 `loading` 效果之后，新增一个 `useEffect`：
```jsx
useEffect(() => {
  if (loading) return
  if (!user) {
    api.getAuthStatus()
      .then(s => setAuthStatus(s))
      .catch(() => setAuthStatus({ first_run: false, registration_open: true }))
  }
}, [loading, user])
```

**Step 4: 更新未登录时的渲染逻辑**

将原来的：
```jsx
if (!user) return <Login />
```

替换为：
```jsx
if (!user) {
  if (authStatus?.first_run) {
    return <Register isFirstRun={true} />
  }
  if (showRegister) {
    return <Register onSwitchToLogin={() => setShowRegister(false)} />
  }
  return <Login onSwitchToRegister={authStatus?.registration_open ? () => setShowRegister(true) : null} />
}
```

**Step 5: 更新 `user.is_admin` 为 `user.is_owner`（顶栏逻辑）**

将：
```jsx
{user.is_admin && (
  <>
    <button onClick={() => setShowAISettings(true)} ...>
    <button onClick={() => setShowCategories(true)} ...>
  </>
)}
```

替换为（所有用户均可访问）：
```jsx
<button onClick={() => setShowAISettings(true)} ...>
<button onClick={() => setShowCategories(true)} ...>
```

**Step 6: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: App startup auth status check, first-run redirect, all users get AI/category access"
```

---

## Task 16: docker-compose.yml — 删除 env 变量

**Files:**
- Modify: `docker-compose.yml`

**Step 1: 删除 environment 块**

将：
```yaml
    environment:
      - DB_PATH=/app/data/coinsage.db
      - JWT_SECRET=${JWT_SECRET:-coinsage-dev-secret-change-in-prod}
      - ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin123}
      - OLLAMA_BASE_URL=${OLLAMA_BASE_URL:-http://host.docker.internal:11434}
```

替换为：
```yaml
    environment:
      - DB_PATH=/app/data/coinsage.db
```

（保留 `DB_PATH` 是因为它指定容器内数据库路径，不是秘密，只是路径配置。）

**Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: remove secret env vars from docker-compose, JWT auto-generated"
```

---

## Task 17: 集成验证

**Step 1: 启动后端**

```bash
cd /Users/unme/project/CoinSage
DB_PATH=test_multi.db uvicorn backend.main:app --reload --port 8000
```

**Step 2: 测试注册流程**

```bash
# 检查 first_run
curl http://localhost:8000/api/auth/status
# 期望: {"first_run": true, "registration_open": true}

# 注册第一个用户（成为 owner）
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "alice123"}'
# 期望: 201，返回 token，user.is_owner=true

# 再次检查状态
curl http://localhost:8000/api/auth/status
# 期望: {"first_run": false, "registration_open": true}

# 注册第二个用户（普通用户）
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "bob", "password": "bob123"}'
# 期望: 201，user.is_owner=false
```

**Step 3: 测试数据隔离**

```bash
# alice 登录并记账
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -X POST http://localhost:8000/api/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50, "category_id": 1, "note": "alice的午饭", "date": "2026-05-11"}'

# bob 登录，确认看不到 alice 的数据
BOB_TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","password":"bob123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl http://localhost:8000/api/transactions \
  -H "Authorization: Bearer $BOB_TOKEN"
# 期望: []
```

**Step 4: 运行完整测试套件**

```bash
python -m pytest tests/ -v
```

**Step 5: 清理测试数据库**

```bash
rm -f test_multi.db
```

**Step 6: 最终 commit**

```bash
git add .
git commit -m "feat: complete multi-user support with data isolation"
```
