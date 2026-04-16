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
