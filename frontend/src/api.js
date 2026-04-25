const BASE = "/api"

function getToken() {
  return localStorage.getItem("token")
}

async function fetchJSON(url, options = {}) {
  const token = getToken()
  const headers = { ...options.headers }
  if (token) headers["Authorization"] = `Bearer ${token}`

  try {
    const r = await fetch(url, { ...options, headers })
    if (r.status === 401) {
      localStorage.removeItem("token")
      window.dispatchEvent(new Event("auth:logout"))
      throw new Error("登录已过期")
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    if (r.status === 204) return null
    return r.json()
  } catch (e) {
    console.error(`[api] ${options?.method || "GET"} ${url}`, e)
    throw e
  }
}

export const api = {
  /* ── Auth ── */
  login(username, password) {
    return fetchJSON(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
  },
  getMe() {
    return fetchJSON(`${BASE}/auth/me`)
  },

  /* ── AI Settings (admin only) ── */
  getAISettings() {
    return fetchJSON(`${BASE}/settings/ai`)
  },
  updateAISettings(data) {
    return fetchJSON(`${BASE}/settings/ai`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },

  /* ── Categories ── */
  getCategories() {
    return fetchJSON(`${BASE}/categories`)
  },

  /* ── Transactions ── */
  getTodayTransactions() {
    const today = new Date().toISOString().split("T")[0]
    return fetchJSON(`${BASE}/transactions?date=${today}`)
  },
  getMonthTransactions(month) {
    return fetchJSON(`${BASE}/transactions?month=${month}`)
  },
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
  createTransaction(data) {
    return fetchJSON(`${BASE}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },
  updateTransaction(id, data) {
    return fetchJSON(`${BASE}/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },
  async deleteTransaction(id) {
    try {
      const token = getToken()
      const r = await fetch(`${BASE}/transactions/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (r.status === 401) {
        localStorage.removeItem("token")
        window.dispatchEvent(new Event("auth:logout"))
        throw new Error("登录已过期")
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
    } catch (e) {
      console.error(`[api] DELETE /transactions/${id}`, e)
      throw e
    }
  },

  /* ── Budgets ── */
  getCurrentBudget() {
    return fetchJSON(`${BASE}/budgets/current`)
  },
  setBudget(data) {
    return fetchJSON(`${BASE}/budgets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },
  getCategoryBudgets(year, month) {
    return fetchJSON(`${BASE}/budgets?year=${year}&month=${month}`)
  },

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

  /* ── AI Analysis ── */
  getDailySummary() {
    return fetchJSON(`${BASE}/ai/daily-summary`)
  },
  getRebalance() {
    return fetchJSON(`${BASE}/ai/rebalance`, { method: "POST" })
  },

  /* ── Export ── */
  async exportTransactions(month) {
    try {
      const token = getToken()
      const r = await fetch(`${BASE}/transactions/export?month=${month}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const blob = await r.blob()
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = `coinsage-${month}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      console.error(`[api] export ${month}`, e)
      throw e
    }
  },
}
