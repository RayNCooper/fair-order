import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    location: { findUnique: vi.fn() },
    order: { findMany: vi.fn() },
  },
}))

import { GET } from "@/app/api/analytics/day-report/route"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

const mockSession = {
  user: { id: "user-1", email: "test@test.de", name: "Test" },
}

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/analytics/day-report")
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url)
}

describe("GET /api/analytics/day-report", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 if no session", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await GET(makeRequest({ locationId: "loc-1" }))
    expect(res.status).toBe(401)
  })

  it("returns 403 if not owner", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never)
    vi.mocked(db.location.findUnique).mockResolvedValue({
      userId: "other-user",
      name: "Test",
    } as never)
    const res = await GET(makeRequest({ locationId: "loc-1" }))
    expect(res.status).toBe(403)
  })

  it("returns empty report for date with no orders", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never)
    vi.mocked(db.location.findUnique).mockResolvedValue({
      userId: "user-1",
      name: "Test Bakery",
    } as never)
    vi.mocked(db.order.findMany).mockResolvedValue([] as never)

    const res = await GET(makeRequest({ locationId: "loc-1", date: "2026-03-25" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.summary.totalOrders).toBe(0)
    expect(json.summary.totalRevenue).toBe(0)
    expect(json.items).toEqual([])
    expect(json.locationName).toBe("Test Bakery")
  })

  it("computes revenue correctly with multiple items", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never)
    vi.mocked(db.location.findUnique).mockResolvedValue({
      userId: "user-1",
      name: "Test",
    } as never)
    vi.mocked(db.order.findMany).mockResolvedValue([
      {
        paymentMethod: "cash",
        items: [
          { menuItemId: "i1", unitPrice: 3.5, quantity: 2, menuItem: { name: "Brötchen" } },
          { menuItemId: "i2", unitPrice: 5.0, quantity: 1, menuItem: { name: "Kuchen" } },
        ],
      },
      {
        paymentMethod: "stripe",
        items: [
          { menuItemId: "i1", unitPrice: 3.5, quantity: 1, menuItem: { name: "Brötchen" } },
        ],
      },
    ] as never)

    const res = await GET(makeRequest({ locationId: "loc-1" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.summary.totalOrders).toBe(2)
    expect(json.summary.totalRevenue).toBe(15.5) // (3.5*2 + 5.0) + 3.5
    expect(json.summary.cashRevenue).toBe(12) // 3.5*2 + 5.0
    expect(json.summary.stripeRevenue).toBe(3.5)
    expect(json.items[0].name).toBe("Brötchen") // most popular
    expect(json.items[0].count).toBe(3) // 2 + 1
  })
})
