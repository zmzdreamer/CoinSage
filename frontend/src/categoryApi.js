const BASE = "/api/categories"

async function req(url, options) {
  try {
    const r = await fetch(url, options)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    if (r.status === 204) return null
    return r.json()
  } catch (e) {
    console.error(`[categoryApi]`, e)
    throw e
  }
}

export const categoryApi = {
  list: () => req(BASE),
  create: (data) => req(BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
  update: (id, data) => req(`${BASE}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
  delete: (id) => req(`${BASE}/${id}`, { method: "DELETE" }),
}
