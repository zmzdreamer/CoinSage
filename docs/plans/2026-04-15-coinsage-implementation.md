# CoinSage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建 CoinSage —— 隐私优先、可自托管的 AI 记账 PWA，支持手动记账、AI 消费分析和预算再平衡。

**Architecture:** Python FastAPI 后端 + SQLite 存储 + React PWA 前端。后端暴露 REST API，前端通过移动端响应式界面快速录入支出，AI 分析模块通过统一 LLM 客户端支持 OpenAI / Anthropic / Ollama 切换。

**Tech Stack:** Python 3.11+, FastAPI, SQLite, React 18, Vite, TailwindCSS, Docker Compose

---

## Task 1: 后端项目初始化

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/main.py`
- Create: `backend/__init__.py`
- Create: `.env.example`

**Step 1: 创建目录结构**

```bash
cd /Users/unme/project/CoinSage
mkdir -p backend/routers backend/llm/prompts tests
touch backend/__init__.py backend/routers/__init__.py backend/llm/__init__.py
```

**Step 2: 写 requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
pydantic==2.7.0
httpx==0.27.0
openai==1.30.0
anthropic==0.28.0
python-dotenv==1.0.0
pytest==8.2.0
pytest-asyncio==0.23.0
```

**Step 3: 写 main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="CoinSage API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}
```

**Step 4: 写 .env.example**

```
LLM_PROVIDER=openai          # openai | anthropic | ollama
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-...
OLLAMA_BASE_URL=http://localhost:11434
ENABLE_AI=true
```

**Step 5: 安装依赖并验证**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# 访问 http://localhost:8000/health 应返回 {"status": "ok"}
```

**Step 6: Commit**

```bash
git add backend/ .env.example
git commit -m "feat: initialize FastAPI backend"
```

---

## Task 2: 数据库初始化

**Files:**
- Create: `backend/database.py`
- Create: `tests/test_database.py`

**Step 1: 写失败的测试**

```python
# tests/test_database.py
import pytest
from backend.database import init_db, get_db

def test_init_db_creates_tables():
    db = get_db(":memory:")
    init_db(db)
    tables = db.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()
    table_names = {row[0] for row in tables}
    assert "transactions" in table_names
    assert "categories" in table_names
    assert "budgets" in table_names
    db.close()
```

**Step 2: 运行确认失败**

```bash
cd /Users/unme/project/CoinSage
pytest tests/test_database.py -v
# Expected: ERROR - cannot import 'database'
```

**Step 3: 实现 database.py**

```python
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
```

**Step 4: 运行确认通过**

```bash
pytest tests/test_database.py -v
# Expected: PASSED
```

**Step 5: 在 main.py 中初始化数据库**

在 `main.py` 顶部 import 后添加：

```python
from backend.database import get_db, init_db

@app.on_event("startup")
def startup():
    db = get_db()
    init_db(db)
    db.close()
```

**Step 6: Commit**

```bash
git add backend/database.py tests/test_database.py backend/main.py
git commit -m "feat: add SQLite database schema and init"
```

---

## Task 3: 分类 API

**Files:**
- Create: `backend/models.py`
- Create: `backend/routers/categories.py`
- Create: `tests/test_categories.py`

**Step 1: 写失败的测试**

```python
# tests/test_categories.py
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_list_categories():
    response = client.get("/api/categories")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 6
    assert data[0]["name"] == "餐饮"

def test_category_has_required_fields():
    response = client.get("/api/categories")
    cat = response.json()[0]
    assert "id" in cat
    assert "name" in cat
    assert "color" in cat
    assert "icon" in cat
```

**Step 2: 运行确认失败**

```bash
pytest tests/test_categories.py -v
# Expected: FAIL - 404 Not Found
```

**Step 3: 写 models.py**

```python
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class Category(BaseModel):
    id: int
    name: str
    color: str
    icon: str

class TransactionCreate(BaseModel):
    amount: float
    category_id: int
    note: str = ""
    date: date

class Transaction(TransactionCreate):
    id: int
    created_at: datetime

class BudgetCreate(BaseModel):
    category_id: Optional[int] = None
    amount: float
    period: str = "monthly"
    year: int
    month: Optional[int] = None

class Budget(BudgetCreate):
    id: int
```

**Step 4: 写 routers/categories.py**

```python
from fastapi import APIRouter
from backend.database import get_db
from backend.models import Category

router = APIRouter(prefix="/api/categories", tags=["categories"])

@router.get("", response_model=list[Category])
def list_categories():
    db = get_db()
    rows = db.execute("SELECT * FROM categories ORDER BY id").fetchall()
    db.close()
    return [dict(row) for row in rows]
```

**Step 5: 在 main.py 注册路由**

```python
from backend.routers import categories
app.include_router(categories.router)
```

**Step 6: 运行确认通过**

```bash
pytest tests/test_categories.py -v
# Expected: 2 PASSED
```

**Step 7: Commit**

```bash
git add backend/models.py backend/routers/categories.py tests/test_categories.py backend/main.py
git commit -m "feat: add categories API"
```

---

## Task 4: 支出记录 API

**Files:**
- Create: `backend/routers/transactions.py`
- Create: `tests/test_transactions.py`

**Step 1: 写失败的测试**

```python
# tests/test_transactions.py
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_create_transaction():
    payload = {"amount": 25.5, "category_id": 1, "note": "午饭", "date": "2026-04-15"}
    response = client.post("/api/transactions", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] > 0
    assert data["amount"] == 25.5

def test_list_transactions_by_date():
    response = client.get("/api/transactions?date=2026-04-15")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_delete_transaction():
    payload = {"amount": 10.0, "category_id": 1, "note": "测试", "date": "2026-04-15"}
    created = client.post("/api/transactions", json=payload).json()
    response = client.delete(f"/api/transactions/{created['id']}")
    assert response.status_code == 204
```

**Step 2: 运行确认失败**

```bash
pytest tests/test_transactions.py -v
# Expected: FAIL
```

**Step 3: 写 routers/transactions.py**

```python
from fastapi import APIRouter, HTTPException, Response
from typing import Optional
from datetime import date as date_type
from backend.database import get_db
from backend.models import Transaction, TransactionCreate

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

@router.post("", response_model=Transaction, status_code=201)
def create_transaction(body: TransactionCreate):
    db = get_db()
    cur = db.execute(
        "INSERT INTO transactions (amount, category_id, note, date) VALUES (?,?,?,?)",
        (body.amount, body.category_id, body.note, str(body.date))
    )
    db.commit()
    row = db.execute("SELECT * FROM transactions WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return dict(row)

@router.get("", response_model=list[Transaction])
def list_transactions(date: Optional[date_type] = None, month: Optional[str] = None):
    db = get_db()
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
    db.close()
    return [dict(row) for row in rows]

@router.delete("/{tx_id}", status_code=204)
def delete_transaction(tx_id: int):
    db = get_db()
    db.execute("DELETE FROM transactions WHERE id=?", (tx_id,))
    db.commit()
    db.close()
    return Response(status_code=204)
```

**Step 4: 注册路由（main.py）**

```python
from backend.routers import transactions
app.include_router(transactions.router)
```

**Step 5: 运行确认通过**

```bash
pytest tests/test_transactions.py -v
# Expected: 3 PASSED
```

**Step 6: Commit**

```bash
git add backend/routers/transactions.py tests/test_transactions.py backend/main.py
git commit -m "feat: add transactions CRUD API"
```

---

## Task 5: 预算 API

**Files:**
- Create: `backend/routers/budgets.py`
- Create: `tests/test_budgets.py`

**Step 1: 写失败的测试**

```python
# tests/test_budgets.py
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_set_monthly_budget():
    payload = {"amount": 2000.0, "period": "monthly", "year": 2026, "month": 4}
    response = client.post("/api/budgets", json=payload)
    assert response.status_code == 201
    assert response.json()["amount"] == 2000.0

def test_get_current_budget():
    response = client.get("/api/budgets/current")
    assert response.status_code == 200
    data = response.json()
    assert "total_budget" in data
    assert "total_spent" in data
    assert "remaining" in data
    assert "days_left" in data
```

**Step 2: 运行确认失败**

```bash
pytest tests/test_budgets.py -v
# Expected: FAIL
```

**Step 3: 写 routers/budgets.py**

```python
from fastapi import APIRouter
from datetime import date
import calendar
from backend.database import get_db
from backend.models import Budget, BudgetCreate

router = APIRouter(prefix="/api/budgets", tags=["budgets"])

@router.post("", response_model=Budget, status_code=201)
def set_budget(body: BudgetCreate):
    db = get_db()
    # 同月份预算覆盖写入
    db.execute(
        "DELETE FROM budgets WHERE category_id IS ? AND year=? AND month=?",
        (body.category_id, body.year, body.month)
    )
    cur = db.execute(
        "INSERT INTO budgets (category_id, amount, period, year, month) VALUES (?,?,?,?,?)",
        (body.category_id, body.amount, body.period, body.year, body.month)
    )
    db.commit()
    row = db.execute("SELECT * FROM budgets WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return dict(row)

@router.get("/current")
def get_current_budget():
    today = date.today()
    year, month = today.year, today.month
    month_str = f"{year}-{month:02d}"
    days_in_month = calendar.monthrange(year, month)[1]
    days_left = days_in_month - today.day + 1

    db = get_db()
    budget_row = db.execute(
        "SELECT amount FROM budgets WHERE category_id IS NULL AND year=? AND month=?",
        (year, month)
    ).fetchone()
    spent_row = db.execute(
        "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE strftime('%Y-%m', date)=?",
        (month_str,)
    ).fetchone()
    db.close()

    total_budget = budget_row["amount"] if budget_row else 0
    total_spent = spent_row["total"]
    remaining = total_budget - total_spent

    return {
        "total_budget": total_budget,
        "total_spent": round(total_spent, 2),
        "remaining": round(remaining, 2),
        "days_left": days_left,
        "daily_allowance": round(remaining / days_left, 2) if days_left > 0 and remaining > 0 else 0
    }
```

**Step 4: 注册路由**

```python
from backend.routers import budgets
app.include_router(budgets.router)
```

**Step 5: 运行确认通过**

```bash
pytest tests/test_budgets.py -v
# Expected: 2 PASSED
```

**Step 6: Commit**

```bash
git add backend/routers/budgets.py tests/test_budgets.py backend/main.py
git commit -m "feat: add budgets API with current period summary"
```

---

## Task 6: LLM 统一客户端 + Prompt 模板

**Files:**
- Create: `backend/llm/client.py`
- Create: `backend/llm/prompts/daily_summary.txt`
- Create: `backend/llm/prompts/rebalance.txt`
- Create: `tests/test_llm_client.py`

**Step 1: 写失败的测试（使用 mock，不实际调用 API）**

```python
# tests/test_llm_client.py
import os
os.environ["ENABLE_AI"] = "false"

from backend.llm.client import LLMClient, load_prompt

def test_load_prompt_daily_summary():
    prompt = load_prompt("daily_summary")
    assert "{transactions}" in prompt
    assert "{date}" in prompt

def test_llm_client_disabled():
    client = LLMClient()
    result = client.analyze("test")
    assert result == "[AI 功能未启用，请在 .env 中设置 ENABLE_AI=true]"
```

**Step 2: 运行确认失败**

```bash
pytest tests/test_llm_client.py -v
# Expected: FAIL
```

**Step 3: 写 Prompt 模板文件**

```
# backend/llm/prompts/daily_summary.txt
你是一位友好的个人理财助手。请根据以下 {date} 的消费记录，用简洁的中文给出今日消费摘要和简短建议。

消费记录：
{transactions}

月度预算信息：
{budget_info}

请输出：
1. 今日消费合计和主要支出方向（1-2句）
2. 与日均预算的对比（1句）
3. 一条简短的实用建议（1句）
```

```
# backend/llm/prompts/rebalance.txt
你是一位友好的个人理财助手。用户本月预算为 {total_budget} 元，已花费 {total_spent} 元，还剩 {days_left} 天。

消费明细（本月）：
{transactions}

请用简洁的中文输出：
1. 当前消费状况评估（超支/正常/节余）
2. 剩余 {days_left} 天的每日建议花费上限
3. 针对最大支出类别的1条具体节省建议
```

**Step 4: 写 llm/client.py**

```python
import os
from pathlib import Path

PROMPTS_DIR = Path(__file__).parent / "prompts"

def load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.txt").read_text(encoding="utf-8")

class LLMClient:
    def __init__(self):
        self.enabled = os.getenv("ENABLE_AI", "false").lower() == "true"
        self.provider = os.getenv("LLM_PROVIDER", "openai")
        self.model = os.getenv("LLM_MODEL", "gpt-4o-mini")
        self.api_key = os.getenv("LLM_API_KEY", "")
        self.ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    def analyze(self, prompt: str) -> str:
        if not self.enabled:
            return "[AI 功能未启用，请在 .env 中设置 ENABLE_AI=true]"
        if self.provider == "openai":
            return self._call_openai(prompt)
        if self.provider == "anthropic":
            return self._call_anthropic(prompt)
        if self.provider == "ollama":
            return self._call_ollama(prompt)
        return "[不支持的 LLM_PROVIDER]"

    def _call_openai(self, prompt: str) -> str:
        from openai import OpenAI
        client = OpenAI(api_key=self.api_key)
        resp = client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            timeout=30,
        )
        return resp.choices[0].message.content

    def _call_anthropic(self, prompt: str) -> str:
        import anthropic
        client = anthropic.Anthropic(api_key=self.api_key)
        resp = client.messages.create(
            model=self.model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text

    def _call_ollama(self, prompt: str) -> str:
        import httpx
        resp = httpx.post(
            f"{self.ollama_url}/api/generate",
            json={"model": self.model, "prompt": prompt, "stream": False},
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["response"]
```

**Step 5: 运行确认通过**

```bash
pytest tests/test_llm_client.py -v
# Expected: 2 PASSED
```

**Step 6: Commit**

```bash
git add backend/llm/ tests/test_llm_client.py
git commit -m "feat: add unified LLM client with prompt templates"
```

---

## Task 7: AI 分析 API 端点

**Files:**
- Create: `backend/routers/ai.py`
- Create: `tests/test_ai.py`

**Step 1: 写失败的测试**

```python
# tests/test_ai.py
import os
os.environ["ENABLE_AI"] = "false"

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_daily_summary_returns_disabled_message():
    response = client.get("/api/ai/daily-summary")
    assert response.status_code == 200
    assert "未启用" in response.json()["result"]

def test_rebalance_returns_disabled_message():
    response = client.post("/api/ai/rebalance")
    assert response.status_code == 200
    assert "未启用" in response.json()["result"]
```

**Step 2: 运行确认失败**

```bash
pytest tests/test_ai.py -v
# Expected: FAIL
```

**Step 3: 写 routers/ai.py**

```python
from fastapi import APIRouter
from datetime import date
from backend.database import get_db
from backend.llm.client import LLMClient, load_prompt
from backend.routers.budgets import get_current_budget

router = APIRouter(prefix="/api/ai", tags=["ai"])
llm = LLMClient()

def _fmt_transactions(rows) -> str:
    if not rows:
        return "（今日暂无记录）"
    return "\n".join(f"- {r['note'] or '无备注'}: ¥{r['amount']} [{r['category_id']}]" for r in rows)

@router.get("/daily-summary")
def daily_summary():
    today = date.today()
    db = get_db()
    rows = db.execute(
        "SELECT * FROM transactions WHERE date=?", (str(today),)
    ).fetchall()
    db.close()

    budget = get_current_budget()
    prompt = load_prompt("daily_summary").format(
        date=str(today),
        transactions=_fmt_transactions(rows),
        budget_info=f"月预算 ¥{budget['total_budget']}，本月已花 ¥{budget['total_spent']}，剩余 ¥{budget['remaining']}"
    )
    return {"result": llm.analyze(prompt)}

@router.post("/rebalance")
def rebalance():
    from datetime import date
    today = date.today()
    month_str = f"{today.year}-{today.month:02d}"
    db = get_db()
    rows = db.execute(
        "SELECT * FROM transactions WHERE strftime('%Y-%m', date)=? ORDER BY date DESC",
        (month_str,)
    ).fetchall()
    db.close()

    budget = get_current_budget()
    prompt = load_prompt("rebalance").format(
        total_budget=budget["total_budget"],
        total_spent=budget["total_spent"],
        days_left=budget["days_left"],
        transactions=_fmt_transactions(rows)
    )
    return {"result": llm.analyze(prompt)}
```

**Step 4: 注册路由**

```python
from backend.routers import ai
app.include_router(ai.router)
```

**Step 5: 运行全部测试**

```bash
pytest tests/ -v
# Expected: 全部 PASSED
```

**Step 6: Commit**

```bash
git add backend/routers/ai.py tests/test_ai.py backend/main.py
git commit -m "feat: add AI analysis and rebalance endpoints"
```

---

## Task 8: 前端项目初始化（React PWA）

**Files:**
- Create: `frontend/` (Vite 项目)

**Step 1: 初始化 Vite + React 项目**

```bash
cd /Users/unme/project/CoinSage
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 2: 配置 TailwindCSS**

编辑 `frontend/tailwind.config.js`：

```js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

在 `frontend/src/index.css` 顶部替换为：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 3: 添加 PWA manifest**

编辑 `frontend/index.html`，在 `<head>` 中添加：

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta name="theme-color" content="#6366f1">
<link rel="manifest" href="/manifest.json">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="CoinSage">
```

创建 `frontend/public/manifest.json`：

```json
{
  "name": "CoinSage",
  "short_name": "CoinSage",
  "description": "AI 智能记账助手",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Step 4: 配置 API 代理（开发环境）**

编辑 `frontend/vite.config.js`：

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})
```

**Step 5: 验证前端启动**

```bash
cd frontend && npm run dev
# 访问 http://localhost:5173 应显示默认 Vite 页面
```

**Step 6: Commit**

```bash
cd /Users/unme/project/CoinSage
git add frontend/
git commit -m "feat: initialize React PWA frontend with Tailwind"
```

---

## Task 9: 前端主页（今日概览）

**Files:**
- Create: `frontend/src/api.js`
- Modify: `frontend/src/App.jsx`
- Create: `frontend/src/pages/Home.jsx`

**Step 1: 写 api.js（封装 fetch 调用）**

```js
// frontend/src/api.js
const BASE = "/api"

export const api = {
  async getCategories() {
    const r = await fetch(`${BASE}/categories`)
    return r.json()
  },
  async getTodayTransactions() {
    const today = new Date().toISOString().split("T")[0]
    const r = await fetch(`${BASE}/transactions?date=${today}`)
    return r.json()
  },
  async createTransaction(data) {
    const r = await fetch(`${BASE}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return r.json()
  },
  async deleteTransaction(id) {
    await fetch(`${BASE}/transactions/${id}`, { method: "DELETE" })
  },
  async getCurrentBudget() {
    const r = await fetch(`${BASE}/budgets/current`)
    return r.json()
  },
  async setBudget(data) {
    const r = await fetch(`${BASE}/budgets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return r.json()
  },
  async getDailySummary() {
    const r = await fetch(`${BASE}/ai/daily-summary`)
    return r.json()
  },
  async getRebalance() {
    const r = await fetch(`${BASE}/ai/rebalance`, { method: "POST" })
    return r.json()
  },
}
```

**Step 2: 写 Home.jsx**

```jsx
// frontend/src/pages/Home.jsx
import { useEffect, useState } from "react"
import { api } from "../api"

export default function Home({ onAddClick }) {
  const [budget, setBudget] = useState(null)
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    api.getCurrentBudget().then(setBudget)
    api.getTodayTransactions().then(setTransactions)
  }, [])

  const todayTotal = transactions.reduce((s, t) => s + t.amount, 0)
  const pct = budget?.total_budget > 0
    ? Math.min((budget.total_spent / budget.total_budget) * 100, 100)
    : 0

  return (
    <div className="p-4 space-y-4">
      {/* 月度预算卡片 */}
      <div className="bg-indigo-600 text-white rounded-2xl p-5">
        <p className="text-sm opacity-80">本月支出 / 预算</p>
        <p className="text-3xl font-bold mt-1">
          ¥{budget?.total_spent ?? "—"}
          <span className="text-lg opacity-70"> / ¥{budget?.total_budget ?? "—"}</span>
        </p>
        <div className="mt-3 bg-indigo-400 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs mt-2 opacity-70">
          剩余 ¥{budget?.remaining ?? "—"} · 还有 {budget?.days_left ?? "—"} 天 · 每日可花 ¥{budget?.daily_allowance ?? "—"}
        </p>
      </div>

      {/* 今日记录 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-gray-700">今日记录</h2>
          <span className="text-sm text-gray-500">合计 ¥{todayTotal.toFixed(2)}</span>
        </div>
        {transactions.length === 0 ? (
          <p className="text-center text-gray-400 py-8">今日暂无记录</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(t => (
              <div key={t.id} className="flex justify-between items-center bg-white rounded-xl p-3 shadow-sm">
                <span className="text-gray-700">{t.note || "无备注"}</span>
                <span className="font-medium text-gray-900">¥{t.amount}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 快速记账按钮 */}
      <button
        onClick={onAddClick}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg text-2xl flex items-center justify-center"
      >
        +
      </button>
    </div>
  )
}
```

**Step 3: 更新 App.jsx（路由框架）**

```jsx
import { useState } from "react"
import Home from "./pages/Home"
import AddRecord from "./pages/AddRecord"
import Analysis from "./pages/Analysis"
import Budget from "./pages/Budget"

const TABS = [
  { id: "home", label: "首页" },
  { id: "analysis", label: "分析" },
  { id: "budget", label: "预算" },
]

export default function App() {
  const [tab, setTab] = useState("home")
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">
        {tab === "home" && <Home onAddClick={() => setShowAdd(true)} />}
        {tab === "analysis" && <Analysis />}
        {tab === "budget" && <Budget />}
      </div>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t flex">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-sm ${tab === t.id ? "text-indigo-600 font-medium" : "text-gray-400"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* 记账弹窗 */}
      {showAdd && <AddRecord onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); setTab("home") }} />}
    </div>
  )
}
```

**Step 4: 验证主页渲染**

```bash
# 确保后端运行中
cd /Users/unme/project/CoinSage/backend && uvicorn main:app --reload &
cd ../frontend && npm run dev
# 手机或浏览器访问 http://localhost:5173，应看到主页卡片
```

**Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: add Home page with budget overview"
```

---

## Task 10: 快速记账弹窗

**Files:**
- Create: `frontend/src/pages/AddRecord.jsx`

**Step 1: 写 AddRecord.jsx**

```jsx
import { useEffect, useState } from "react"
import { api } from "../api"

export default function AddRecord({ onClose, onSaved }) {
  const [categories, setCategories] = useState([])
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState(null)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.getCategories().then(cats => {
      setCategories(cats)
      if (cats.length) setCategoryId(cats[0].id)
    })
  }, [])

  async function handleSave() {
    if (!amount || isNaN(Number(amount))) return
    setLoading(true)
    await api.createTransaction({
      amount: Number(amount),
      category_id: categoryId,
      note,
      date: new Date().toISOString().split("T")[0],
    })
    setLoading(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">记一笔</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>

        {/* 金额输入 */}
        <input
          type="number"
          placeholder="金额（元）"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full text-3xl font-bold border-b-2 border-indigo-500 pb-2 outline-none text-center"
          autoFocus
        />

        {/* 分类选择 */}
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id)}
              className={`px-3 py-1 rounded-full text-sm ${categoryId === cat.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 备注 */}
        <input
          type="text"
          placeholder="备注（可选）"
          value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
        />

        <button
          onClick={handleSave}
          disabled={loading || !amount}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
        >
          {loading ? "保存中…" : "保存"}
        </button>
      </div>
    </div>
  )
}
```

**Step 2: 验证记账流程**

在手机浏览器点击 `+` 按钮，输入金额、选分类、点保存，应回到首页并看到新记录。

**Step 3: Commit**

```bash
git add frontend/src/pages/AddRecord.jsx
git commit -m "feat: add quick expense recording modal"
```

---

## Task 11: AI 分析页 + 预算设置页

**Files:**
- Create: `frontend/src/pages/Analysis.jsx`
- Create: `frontend/src/pages/Budget.jsx`

**Step 1: 写 Analysis.jsx**

```jsx
import { useState } from "react"
import { api } from "../api"

export default function Analysis() {
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState("daily")

  async function run() {
    setLoading(true)
    setResult("")
    const res = mode === "daily"
      ? await api.getDailySummary()
      : await api.getRebalance()
    setResult(res.result)
    setLoading(false)
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">AI 分析</h1>

      <div className="flex gap-2">
        {[["daily", "今日摘要"], ["rebalance", "预算再平衡"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex-1 py-2 rounded-xl text-sm ${mode === id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
      >
        {loading ? "AI 分析中…" : "开始分析"}
      </button>

      {result && (
        <div className="bg-white rounded-2xl p-4 shadow-sm whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
          {result}
        </div>
      )}
    </div>
  )
}
```

**Step 2: 写 Budget.jsx**

```jsx
import { useEffect, useState } from "react"
import { api } from "../api"

export default function Budget() {
  const [amount, setAmount] = useState("")
  const [saved, setSaved] = useState(false)
  const [budget, setBudget] = useState(null)

  useEffect(() => {
    api.getCurrentBudget().then(b => {
      setBudget(b)
      if (b.total_budget > 0) setAmount(String(b.total_budget))
    })
  }, [])

  async function handleSave() {
    const today = new Date()
    await api.setBudget({
      amount: Number(amount),
      period: "monthly",
      year: today.getFullYear(),
      month: today.getMonth() + 1,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    api.getCurrentBudget().then(setBudget)
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">月度预算</h1>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <label className="text-sm text-gray-500">本月总预算（元）</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="例如 2000"
          className="w-full text-2xl font-bold border-b-2 border-indigo-500 pb-2 outline-none"
        />
        <button
          onClick={handleSave}
          disabled={!amount}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
        >
          {saved ? "✓ 已保存" : "保存预算"}
        </button>
      </div>

      {budget?.total_budget > 0 && (
        <div className="bg-indigo-50 rounded-2xl p-4 space-y-1 text-sm text-indigo-900">
          <p>月预算：¥{budget.total_budget}</p>
          <p>已花费：¥{budget.total_spent}</p>
          <p>剩余：¥{budget.remaining}</p>
          <p>每日建议上限：¥{budget.daily_allowance}</p>
        </div>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add frontend/src/pages/Analysis.jsx frontend/src/pages/Budget.jsx
git commit -m "feat: add AI analysis page and budget settings page"
```

---

## Task 12: Docker Compose 部署

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`

**Step 1: 写 backend/Dockerfile**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Step 2: 写 frontend/nginx.conf**

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8000;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Step 3: 写 frontend/Dockerfile**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

**Step 4: 写 docker-compose.yml**

```yaml
services:
  backend:
    build: ./backend
    volumes:
      - ./data:/app/data
    environment:
      - DB_PATH=/app/data/coinsage.db
      - LLM_PROVIDER=${LLM_PROVIDER:-openai}
      - LLM_MODEL=${LLM_MODEL:-gpt-4o-mini}
      - LLM_API_KEY=${LLM_API_KEY:-}
      - ENABLE_AI=${ENABLE_AI:-false}
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  data:
```

**Step 5: 验证构建**

```bash
cd /Users/unme/project/CoinSage
mkdir -p data
cp .env.example .env
docker compose build
docker compose up -d
# 访问 http://localhost:3000 应看到 CoinSage 主页
```

**Step 6: Commit**

```bash
git add docker-compose.yml backend/Dockerfile frontend/Dockerfile frontend/nginx.conf
git commit -m "feat: add Docker Compose deployment"
```

---

## 完成验证清单

运行以下命令确认一切正常：

```bash
# 1. 全部测试通过
cd /Users/unme/project/CoinSage && pytest tests/ -v

# 2. Docker 启动
docker compose up -d

# 3. 手机浏览器访问 http://<局域网IP>:3000
#    - 添加一笔记录（< 3 秒）
#    - 设置月度预算
#    - 点击 AI 分析（ENABLE_AI=false 时显示未启用提示）
#    - 在 Safari/Chrome "添加到主屏幕" 验证 PWA 安装
```
