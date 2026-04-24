# 周期性账单 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 允许用户设置周期性支出模板（房租、水电、订阅等），在账单页提示本月应执行的周期账单，一键确认入账。

**Architecture:** 后端新增 `recurring_templates` 表存模板，`GET /api/recurring` 返回模板列表并计算本月是否已入账；前端在预算页新增「周期账单」卡片管理模板，首页/账单页顶部出现「本月待确认」提示横幅。

**Tech Stack:** Python/FastAPI + SQLite，React，无新依赖

---

## 数据模型

```sql
CREATE TABLE recurring_templates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    amount      REAL    NOT NULL CHECK(amount > 0),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    day_of_month INTEGER NOT NULL CHECK(day_of_month >= 1 AND day_of_month <= 28),
    note        TEXT    NOT NULL DEFAULT '',
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)
```

字段说明：
- `day_of_month` — 每月几号执行（1-28，避免 29-31 跨月问题）
- `active` — 是否启用（软删除）

---

## 项目现状

- `backend/database.py` — `init_db` 末尾可追加新表
- `backend/models.py` — 已有 BudgetCreate/Budget 等模型风格
- `backend/routers/` — 已有 categories/transactions/budgets 路由
- `backend/main.py` — 注册新路由只需 `app.include_router`
- `frontend/src/pages/Budget.jsx` — 已有分类预算卡片，可在其下方添加周期账单卡片
- `frontend/src/pages/Home.jsx` — 首页顶部三卡区，可在下方插入提示横幅
- `frontend/src/api.js` — fetchJSON 已有 auth token 注入

---

### Task 1: 数据库新增 recurring_templates 表

**Files:**
- Modify: `backend/database.py`

**Step 1: 在 `init_db` 的 `conn.commit()` 之前添加建表语句**

```python
conn.execute("""
    CREATE TABLE IF NOT EXISTS recurring_templates (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        name         TEXT    NOT NULL,
        amount       REAL    NOT NULL CHECK(amount > 0),
        category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        day_of_month INTEGER NOT NULL CHECK(day_of_month >= 1 AND day_of_month <= 28),
        note         TEXT    NOT NULL DEFAULT '',
        active       INTEGER NOT NULL DEFAULT 1,
        created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
""")
```

**Step 2: 验证**

```bash
cd /Users/unme/project/CoinSage
python -c "
from backend.database import get_db, init_db
with get_db() as db:
    init_db(db)
    rows = db.execute(\"SELECT name FROM sqlite_master WHERE type='table'\").fetchall()
    print([r['name'] for r in rows])
"
```
预期输出包含 `recurring_templates`。

**Step 3: Commit**

```bash
git add backend/database.py
git commit -m "feat: add recurring_templates table to database schema"
```

---

### Task 2: 后端模型 + 路由

**Files:**
- Modify: `backend/models.py`
- Create: `backend/routers/recurring.py`
- Modify: `backend/main.py`

**Step 1: 在 `backend/models.py` 末尾添加模型**

```python
class RecurringCreate(BaseModel):
    name: str
    amount: float
    category_id: Optional[int] = None
    day_of_month: int
    note: str = ""

class Recurring(RecurringCreate):
    id: int
    active: bool
    created_at: datetime
```

**Step 2: 新建 `backend/routers/recurring.py`**

```python
from fastapi import APIRouter, HTTPException, Response, Depends
from datetime import date
from backend.database import get_db
from backend.models import Recurring, RecurringCreate, UserInfo
from backend.auth import get_current_user

router = APIRouter(prefix="/api/recurring", tags=["recurring"])


@router.get("", response_model=list[dict])
def list_recurring(_: UserInfo = Depends(get_current_user)):
    """返回所有启用的模板，附带本月是否已入账信息。"""
    today = date.today()
    month_str = f"{today.year}-{today.month:02d}"

    with get_db() as db:
        templates = db.execute("""
            SELECT r.*, c.name as category_name, c.color as category_color
            FROM recurring_templates r
            LEFT JOIN categories c ON r.category_id = c.id
            WHERE r.active = 1
            ORDER BY r.day_of_month
        """).fetchall()

        result = []
        for t in templates:
            row = dict(t)
            # 检查本月是否已有同名同金额的交易（简单匹配：note 含模板名且在本月）
            existing = db.execute("""
                SELECT id FROM transactions
                WHERE note = ? AND amount = ? AND strftime('%Y-%m', date) = ?
                LIMIT 1
            """, (t["name"], t["amount"], month_str)).fetchone()
            row["confirmed_this_month"] = existing is not None
            row["due_this_month"] = today.day >= t["day_of_month"]
            result.append(row)

    return result


@router.post("", response_model=Recurring, status_code=201)
def create_recurring(body: RecurringCreate, _: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO recurring_templates (name, amount, category_id, day_of_month, note) VALUES (?,?,?,?,?)",
            (body.name, body.amount, body.category_id, body.day_of_month, body.note)
        )
        db.commit()
        row = db.execute("SELECT * FROM recurring_templates WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)


@router.delete("/{tmpl_id}", status_code=204)
def delete_recurring(tmpl_id: int, _: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        db.execute("UPDATE recurring_templates SET active=0 WHERE id=?", (tmpl_id,))
        db.commit()
    return Response(status_code=204)


@router.post("/{tmpl_id}/confirm")
def confirm_recurring(tmpl_id: int, _: UserInfo = Depends(get_current_user)):
    """将周期账单模板一键转为今日交易记录。"""
    today = date.today()
    with get_db() as db:
        tmpl = db.execute(
            "SELECT * FROM recurring_templates WHERE id=? AND active=1", (tmpl_id,)
        ).fetchone()
        if not tmpl:
            raise HTTPException(status_code=404, detail="模板不存在")
        cur = db.execute(
            "INSERT INTO transactions (amount, category_id, note, date) VALUES (?,?,?,?)",
            (tmpl["amount"], tmpl["category_id"], tmpl["name"], str(today))
        )
        db.commit()
        row = db.execute("SELECT * FROM transactions WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)
```

**Step 3: 在 `backend/main.py` 注册路由**

在 `from backend.routers import ...` 的 import 行添加：
```python
from backend.routers import recurring as recurring_router
```

在 `app.include_router(ai.router)` 后添加：
```python
app.include_router(recurring_router.router)
```

**Step 4: 验证**

```bash
# 启动后端
uvicorn backend.main:app --reload

# 新开终端测试（先登录获取 token）
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# 拿到 token 后：
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/recurring
# 预期：返回空数组 []
```

**Step 5: Commit**

```bash
git add backend/models.py backend/routers/recurring.py backend/main.py
git commit -m "feat: recurring templates CRUD + confirm endpoint"
```

---

### Task 3: api.js 添加周期账单方法

**Files:**
- Modify: `frontend/src/api.js`

在 `setBudget` 之后添加：

```js
/* ── Recurring ── */
getRecurring() {
  return fetchJSON(`${BASE}/recurring`)
},
createRecurring(data) {
  return fetchJSON(`${BASE}/recurring`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
},
deleteRecurring(id) {
  return fetchJSON(`${BASE}/recurring/${id}`, { method: "DELETE" })
},
confirmRecurring(id) {
  return fetchJSON(`${BASE}/recurring/${id}/confirm`, { method: "POST" })
},
```

**Step: Commit**

```bash
git add frontend/src/api.js
git commit -m "feat: add recurring API methods to api.js"
```

---

### Task 4: 预算页添加「周期账单」管理卡片

**Files:**
- Modify: `frontend/src/pages/Budget.jsx`

**Step 1: 添加 import 和 state**

```jsx
// 顶部 import 添加:
import { useToast } from "../ToastContext"  // 已有，跳过
// 新增 state：
const [recurring, setRecurring] = useState([])
const [showAddRecurring, setShowAddRecurring] = useState(false)
const [newR, setNewR] = useState({ name: "", amount: "", category_id: null, day_of_month: 1, note: "" })
```

**Step 2: 在 useEffect 中加载周期账单**

```jsx
api.getRecurring().then(setRecurring)
```

**Step 3: 添加保存/删除方法**

```jsx
async function saveRecurring() {
  if (!newR.name.trim() || !newR.amount || Number(newR.amount) <= 0) return
  await api.createRecurring({
    name: newR.name.trim(),
    amount: Number(newR.amount),
    category_id: newR.category_id || null,
    day_of_month: Number(newR.day_of_month),
    note: newR.note,
  })
  api.getRecurring().then(setRecurring)
  setShowAddRecurring(false)
  setNewR({ name: "", amount: "", category_id: null, day_of_month: 1, note: "" })
  showToast("周期账单已添加")
}

async function removeRecurring(id) {
  await api.deleteRecurring(id)
  setRecurring(prev => prev.filter(r => r.id !== id))
  showToast("周期账单已删除")
}
```

**Step 4: 在 `budget-grid` div 末尾添加周期账单卡片**

```jsx
{/* 周期账单卡片 */}
<div className="card fade-up overflow-hidden" style={{ animationDelay: "180ms" }}>
  <div style={{ padding: "20px 24px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", color: "var(--c-text-3)", textTransform: "uppercase" }}>
      周期账单
    </p>
    <button onClick={() => setShowAddRecurring(v => !v)}
      style={{ background: "none", border: "none", cursor: "pointer",
               fontSize: "12px", fontWeight: 600, color: "var(--c-blue)", fontFamily: "var(--font)" }}>
      {showAddRecurring ? "取消" : "+ 添加"}
    </button>
  </div>

  {/* 添加表单 */}
  {showAddRecurring && (
    <div style={{ padding: "0 20px 16px" }}>
      <div className="sep" style={{ marginBottom: "12px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
        <div>
          <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "4px", fontWeight: 600 }}>名称</p>
          <input value={newR.name} onChange={e => setNewR(r => ({...r, name: e.target.value}))}
            placeholder="房租" style={{ width: "100%", background: "var(--c-fill-2)", border: "1px solid var(--c-sep)",
            borderRadius: "8px", padding: "8px 10px", fontSize: "13px", color: "var(--c-text-1)",
            fontFamily: "var(--font)", outline: "none" }} />
        </div>
        <div>
          <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "4px", fontWeight: 600 }}>金额（¥）</p>
          <input type="number" inputMode="decimal" value={newR.amount}
            onChange={e => setNewR(r => ({...r, amount: e.target.value}))}
            placeholder="0.00" style={{ width: "100%", background: "var(--c-fill-2)", border: "1px solid var(--c-sep)",
            borderRadius: "8px", padding: "8px 10px", fontSize: "13px", color: "var(--c-text-1)",
            fontFamily: "var(--font)", outline: "none" }} />
        </div>
        <div>
          <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "4px", fontWeight: 600 }}>每月几号</p>
          <input type="number" min="1" max="28" value={newR.day_of_month}
            onChange={e => setNewR(r => ({...r, day_of_month: e.target.value}))}
            style={{ width: "100%", background: "var(--c-fill-2)", border: "1px solid var(--c-sep)",
            borderRadius: "8px", padding: "8px 10px", fontSize: "13px", color: "var(--c-text-1)",
            fontFamily: "var(--font)", outline: "none" }} />
        </div>
        <div>
          <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "4px", fontWeight: 600 }}>分类</p>
          <select value={newR.category_id || ""} onChange={e => setNewR(r => ({...r, category_id: e.target.value || null}))}
            style={{ width: "100%", background: "var(--c-fill-2)", border: "1px solid var(--c-sep)",
            borderRadius: "8px", padding: "8px 10px", fontSize: "13px", color: "var(--c-text-1)",
            fontFamily: "var(--font)", outline: "none" }}>
            <option value="">不指定</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <button onClick={saveRecurring}
        disabled={!newR.name.trim() || !newR.amount}
        style={{ width: "100%", padding: "10px", background: "var(--c-blue)", color: "#fff",
                 border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600,
                 fontFamily: "var(--font)", cursor: "pointer" }}>
        保存周期账单
      </button>
    </div>
  )}

  {/* 模板列表 */}
  {recurring.length === 0 && !showAddRecurring ? (
    <p style={{ padding: "16px 24px", fontSize: "13px", color: "var(--c-text-3)" }}>
      暂无周期账单，点击「+ 添加」设置房租、订阅等定期支出
    </p>
  ) : (
    recurring.map((r, i) => (
      <div key={r.id}>
        <div className="sep" style={{ marginLeft: "20px" }} />
        <div style={{ display: "flex", alignItems: "center", padding: "12px 20px", gap: "10px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                        background: r.category_color || "#6b7280" }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--c-text-1)" }}>{r.name}</p>
            <p style={{ fontSize: "11px", color: "var(--c-text-3)" }}>
              每月 {r.day_of_month} 日 · {r.category_name || "不分类"}
            </p>
          </div>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--c-text-1)",
                         fontVariantNumeric: "tabular-nums" }}>¥{r.amount}</span>
          <button onClick={() => removeRecurring(r.id)}
            style={{ background: "none", border: "none", cursor: "pointer",
                     color: "var(--c-text-3)", fontSize: "16px", padding: "4px" }}>✕</button>
        </div>
      </div>
    ))
  )}
</div>
```

**Step: Commit**

```bash
git add frontend/src/pages/Budget.jsx
git commit -m "feat: recurring templates management card in Budget page"
```

---

### Task 5: 首页「待确认」提示横幅

**Files:**
- Modify: `frontend/src/pages/Home.jsx`

**Step 1: 添加 state 和加载**

```jsx
const [recurringDue, setRecurringDue] = useState([])

// 在 useEffect 的 loadData 调用旁边加：
api.getRecurring().then(list => {
  setRecurringDue(list.filter(r => r.due_this_month && !r.confirmed_this_month))
})
```

**Step 2: 添加确认方法**

```jsx
const showToast = useToast()  // 已有

async function handleConfirmRecurring(id, name) {
  await api.confirmRecurring(id)
  setRecurringDue(prev => prev.filter(r => r.id !== id))
  loadData()  // 刷新预算和今日交易
  showToast(`「${name}」已入账`)
}
```

**Step 3: 在页面标题下方、bento 三卡之前插入横幅**

```jsx
{/* 周期账单待确认横幅 */}
{recurringDue.length > 0 && (
  <div style={{ marginBottom: "16px" }}>
    {recurringDue.map(r => (
      <div key={r.id} className="fade-up" style={{
        display: "flex", alignItems: "center", gap: "12px",
        background: "rgba(59,130,246,0.08)",
        border: "1px solid rgba(59,130,246,0.20)",
        borderRadius: "var(--r-md)", padding: "12px 16px", marginBottom: "8px",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c-blue)" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--c-text-1)" }}>
            {r.name}
          </p>
          <p style={{ fontSize: "11px", color: "var(--c-text-3)" }}>
            周期账单 · 每月 {r.day_of_month} 日 · ¥{r.amount}
          </p>
        </div>
        <button
          onClick={() => handleConfirmRecurring(r.id, r.name)}
          style={{
            background: "var(--c-blue)", color: "#fff", border: "none",
            borderRadius: "8px", padding: "6px 14px", cursor: "pointer",
            fontSize: "12px", fontWeight: 600, fontFamily: "var(--font)",
            flexShrink: 0,
          }}>
          确认入账
        </button>
      </div>
    ))}
  </div>
)}
```

在 `import { api } from "../api"` 下方添加：
```jsx
import { api as apiModule } from "../api"  // 已有，直接用 api
```
（api 已 import，无需重复）

**Step: Commit**

```bash
git add frontend/src/pages/Home.jsx
git commit -m "feat: recurring due banner on Home page with one-click confirm"
```

---

## 完成验证清单

```
□ 后端重启后 recurring_templates 表自动创建
□ POST /api/recurring 创建模板成功（返回 201）
□ GET /api/recurring 返回模板列表，含 confirmed_this_month / due_this_month 字段
□ POST /api/recurring/{id}/confirm 创建一条今日交易，记录名称=模板名称
□ DELETE /api/recurring/{id} 软删除（active=0），之后 GET 不再返回
□ 预算页「周期账单」卡片：+ 添加 → 填表 → 保存 → 列表出现新模板
□ 首页：若本月有到期且未入账的模板 → 顶部显示蓝色横幅
□ 点「确认入账」→ 横幅消失，Toast 提示，今日交易列表刷新
□ 已确认过的模板当天再次进入首页 → 横幅不再显示
```
