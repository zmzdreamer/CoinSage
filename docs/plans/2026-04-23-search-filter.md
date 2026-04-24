# 智能搜索与过滤 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 CoinSage 添加跨月份的交易搜索功能，支持关键词、分类、金额范围、日期范围过滤。

**Architecture:** 后端新增 `GET /api/transactions/search` 接口（SQLite LIKE + WHERE 过滤）；前端新增搜索覆层（点击顶部搜索图标弹出），实时 debounce 搜索，结果按日期倒序展示。

**Tech Stack:** Python/FastAPI（后端），React（前端），纯 CSS，无新依赖

---

## 项目现状

- `backend/routers/transactions.py` — 已有 `GET /api/transactions`，支持 `date`/`month` 过滤
- `frontend/src/api.js` — `fetchJSON` 已自动注入 auth token
- `frontend/src/App.jsx` — 顶部 Header 有 Logo 和右侧按钮区
- `frontend/src/index.css` — 已有 `.modal-backdrop`、`.card`、`.fade-up`、`var(--c-*)` token

---

### Task 1: 后端搜索接口

**Files:**
- Modify: `backend/routers/transactions.py`

**Step 1: 在 `list_transactions` 之后，`export_transactions_csv` 之前添加搜索路由**

注意：路径 `/search` 必须在 `/{tx_id}` 之前注册，否则 FastAPI 会将 "search" 当作 tx_id。

```python
@router.get("/search")
def search_transactions(
    q: Optional[str] = None,
    category_id: Optional[int] = None,
    amount_min: Optional[float] = None,
    amount_max: Optional[float] = None,
    date_from: Optional[date_type] = None,
    date_to: Optional[date_type] = None,
    limit: int = 100,
    _: UserInfo = Depends(get_current_user),
):
    conditions = []
    params = []

    if q:
        conditions.append("t.note LIKE ?")
        params.append(f"%{q}%")
    if category_id is not None:
        conditions.append("t.category_id = ?")
        params.append(category_id)
    if amount_min is not None:
        conditions.append("t.amount >= ?")
        params.append(amount_min)
    if amount_max is not None:
        conditions.append("t.amount <= ?")
        params.append(amount_max)
    if date_from is not None:
        conditions.append("t.date >= ?")
        params.append(str(date_from))
    if date_to is not None:
        conditions.append("t.date <= ?")
        params.append(str(date_to))

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    sql = f"""
        SELECT t.*, c.name as category_name, c.color as category_color
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        {where}
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT ?
    """
    params.append(limit)

    with get_db() as db:
        rows = db.execute(sql, params).fetchall()
    return [dict(row) for row in rows]
```

**Step 2: 验证接口可用**

启动后端后：
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/transactions/search?q=咖啡&limit=10"
```
预期：返回备注含"咖啡"的交易 JSON 数组。

**Step 3: Commit**

```bash
git add backend/routers/transactions.py
git commit -m "feat: add /api/transactions/search endpoint with multi-filter support"
```

---

### Task 2: api.js 添加搜索方法

**Files:**
- Modify: `frontend/src/api.js`

在 `getMonthTransactions` 之后添加：

```js
searchTransactions(params = {}) {
  const q = new URLSearchParams()
  if (params.q)           q.set("q", params.q)
  if (params.category_id) q.set("category_id", params.category_id)
  if (params.amount_min)  q.set("amount_min", params.amount_min)
  if (params.amount_max)  q.set("amount_max", params.amount_max)
  if (params.date_from)   q.set("date_from", params.date_from)
  if (params.date_to)     q.set("date_to", params.date_to)
  return fetchJSON(`${BASE}/transactions/search?${q.toString()}`)
},
```

**Step: Commit**

```bash
git add frontend/src/api.js
git commit -m "feat: add searchTransactions to api.js"
```

---

### Task 3: Search 覆层组件

**Files:**
- Create: `frontend/src/pages/Search.jsx`

完整组件如下（内含 debounce、过滤条件、结果列表）：

```jsx
import { useEffect, useRef, useState } from "react"
import { api } from "../api"

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"]
function fmt(n) { return Number(n).toFixed(2) }
function dayLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00")
  return `${d.getMonth()+1}月${d.getDate()}日 周${WEEKDAYS[d.getDay()]}`
}

export default function Search({ onClose }) {
  const inputRef = useRef(null)
  const [q, setQ]                   = useState("")
  const [categories, setCategories] = useState([])
  const [selCat, setSelCat]         = useState(null)
  const [amtMin, setAmtMin]         = useState("")
  const [amtMax, setAmtMax]         = useState("")
  const [dateFrom, setDateFrom]     = useState("")
  const [dateTo, setDateTo]         = useState("")
  const [results, setResults]       = useState([])
  const [loading, setLoading]       = useState(false)
  const [searched, setSearched]     = useState(false)

  const debouncedQ = useDebounce(q)

  useEffect(() => {
    api.getCategories().then(setCategories)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  useEffect(() => {
    const hasFilter = debouncedQ || selCat || amtMin || amtMax || dateFrom || dateTo
    if (!hasFilter) { setResults([]); setSearched(false); return }

    setLoading(true)
    api.searchTransactions({
      q: debouncedQ || undefined,
      category_id: selCat || undefined,
      amount_min: amtMin ? Number(amtMin) : undefined,
      amount_max: amtMax ? Number(amtMax) : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    })
      .then(r => { setResults(r); setSearched(true) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [debouncedQ, selCat, amtMin, amtMax, dateFrom, dateTo])

  function clearAll() {
    setQ(""); setSelCat(null); setAmtMin(""); setAmtMax("")
    setDateFrom(""); setDateTo(""); setResults([]); setSearched(false)
    inputRef.current?.focus()
  }

  const hasFilter = q || selCat || amtMin || amtMax || dateFrom || dateTo

  const inputBase = {
    background: "var(--c-fill-2)", border: "1px solid var(--c-sep)",
    borderRadius: "var(--r-sm)", padding: "8px 12px",
    fontSize: "14px", color: "var(--c-text-1)", fontFamily: "var(--font)",
    outline: "none", width: "100%",
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "var(--c-bg)",
      display: "flex", flexDirection: "column",
      paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
    }}>
      {/* 顶栏 */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 16px 12px" }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: "8px",
          background: "var(--c-fill)", borderRadius: "var(--r-md)", padding: "8px 14px",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c-text-3)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索备注关键词…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: "15px", color: "var(--c-text-1)", fontFamily: "var(--font)",
            }}
          />
          {q && (
            <button onClick={() => setQ("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-3)", fontSize: "16px", padding: 0, lineHeight: 1 }}>
              ✕
            </button>
          )}
        </div>
        <button onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-blue)", fontSize: "15px", fontWeight: 500, fontFamily: "var(--font)", whiteSpace: "nowrap" }}>
          取消
        </button>
      </div>

      <div className="sep" />

      {/* 过滤条件 */}
      <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--c-sep)" }}>
        {/* 分类筛选 */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
          <button
            onClick={() => setSelCat(null)}
            style={{
              padding: "5px 12px", borderRadius: "20px", border: "none",
              fontSize: "12px", fontWeight: 500, fontFamily: "var(--font)", cursor: "pointer",
              background: !selCat ? "var(--c-blue)" : "var(--c-fill)",
              color: !selCat ? "#fff" : "var(--c-text-2)",
              transition: "all 0.15s",
            }}>
            全部
          </button>
          {categories.map(c => (
            <button key={c.id}
              onClick={() => setSelCat(selCat === c.id ? null : c.id)}
              style={{
                padding: "5px 12px", borderRadius: "20px", border: "none",
                fontSize: "12px", fontWeight: 500, fontFamily: "var(--font)", cursor: "pointer",
                background: selCat === c.id ? c.color : "var(--c-fill)",
                color: selCat === c.id ? "#fff" : "var(--c-text-2)",
                transition: "all 0.15s",
              }}>
              {c.name}
            </button>
          ))}
        </div>

        {/* 金额 + 日期 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div>
            <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "4px", fontWeight: 600 }}>最低金额</p>
            <input type="number" inputMode="decimal" placeholder="¥ 0"
              value={amtMin} onChange={e => setAmtMin(e.target.value)} style={inputBase} />
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "4px", fontWeight: 600 }}>最高金额</p>
            <input type="number" inputMode="decimal" placeholder="¥ 不限"
              value={amtMax} onChange={e => setAmtMax(e.target.value)} style={inputBase} />
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "4px", fontWeight: 600 }}>开始日期</p>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputBase} />
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "4px", fontWeight: 600 }}>结束日期</p>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputBase} />
          </div>
        </div>

        {hasFilter && (
          <button onClick={clearAll}
            style={{ marginTop: "8px", background: "none", border: "none", cursor: "pointer",
                     color: "var(--c-red)", fontSize: "12px", fontWeight: 500, fontFamily: "var(--font)", padding: 0 }}>
            清除所有条件
          </button>
        )}
      </div>

      {/* 结果列表 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: "60px", borderRadius: "var(--r-md)" }} />
            ))}
          </div>
        ) : !searched ? (
          <div style={{ textAlign: "center", paddingTop: "60px", color: "var(--c-text-3)" }}>
            <p style={{ fontSize: "32px", marginBottom: "12px" }}>🔍</p>
            <p style={{ fontSize: "14px" }}>输入关键词或选择条件开始搜索</p>
          </div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: "60px", color: "var(--c-text-3)" }}>
            <p style={{ fontSize: "32px", marginBottom: "12px" }}>📭</p>
            <p style={{ fontSize: "14px" }}>没有找到匹配的记录</p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: "12px", color: "var(--c-text-3)", marginBottom: "10px", fontWeight: 600 }}>
              找到 {results.length} 条记录
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {results.map(t => (
                <div key={t.id} className="card" style={{ display: "flex", alignItems: "center", padding: "12px 14px", gap: "10px" }}>
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                    background: t.category_color || "#6b7280",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--c-text-1)",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.note || "支出"}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginTop: "2px" }}>
                      {t.category_name || "其他"} · {dayLabel(t.date)}
                    </p>
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--c-red)",
                                 fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                    −¥{fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step: Commit**

```bash
git add frontend/src/pages/Search.jsx
git commit -m "feat: Search overlay component with keyword/category/amount/date filters"
```

---

### Task 4: App.jsx 接入搜索入口

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: 顶部 import 添加 Search**

```jsx
import Search from "./pages/Search"
```

**Step 2: 添加 state**

```jsx
const [showSearch, setShowSearch] = useState(false)
```

**Step 3: 在 Header 左侧 Logo 旁边添加搜索图标**

在 `<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>` 内，Logo span 之后添加：

```jsx
<button
  onClick={() => setShowSearch(true)}
  aria-label="搜索"
  style={{
    background: "var(--c-fill)", border: "none", borderRadius: "8px",
    padding: "6px 10px", cursor: "pointer",
    display: "flex", alignItems: "center",
    color: "var(--c-text-2)", marginLeft: "4px",
  }}
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
</button>
```

**Step 4: 在 return 末尾（Categories modal 之后）添加 Search 渲染**

```jsx
{showSearch && <Search onClose={() => setShowSearch(false)} />}
```

**Step 5: 验证**

- 点击搜索图标 → 全屏搜索覆层打开
- 输入"咖啡" → 约 400ms 后显示结果
- 选择分类筛选 → 结果实时更新
- 点"取消" → 返回主界面

**Step 6: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: search button in header, wire Search overlay to App"
```

---

## 完成验证清单

```
□ GET /api/transactions/search?q=XX 返回正确结果（带 category_name/color）
□ 搜索覆层从顶部 Logo 旁图标打开，点取消关闭
□ 关键词搜索 debounce 400ms 后触发（快速输入不会每个字符都请求）
□ 分类筛选 chip 点击高亮，再次点击取消
□ 金额范围两端都生效（min/max 单独或组合）
□ 日期范围过滤正确
□ 无结果时显示 📭 空状态
□ 搜索结果每行显示：分类色点 + 备注 + 分类名 + 日期 + 金额
□ 搜索中显示骨架屏占位
□ 手机浏览器宽度下过滤条件 2×2 网格布局正常
```
