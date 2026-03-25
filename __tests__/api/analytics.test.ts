import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    location: { findUnique: vi.fn() },
    order: { findMany: vi.fn(), count: vi.fn() },
    orderItem: { groupBy: vi.fn() },
    menuItem: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}))

import { GET } from "@/app/api/analytics/route"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

const mockSession = {
  user: { id: "user-1", email: "test@test.de", name: "Test" },
}

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/analytics")
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url)
}

describe("GET /api/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 if no session", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await GET(makeRequest({ locationId: "loc-1" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 if locationId missing", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never)
    const res = await GET(new NextRequest("http://localhost/api/analytics"))
    expect(res.status).toBe(400)
  })

  it("returns 403 if not owner", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never)
    vi.mocked(db.location.findUnique).mockResolvedValue({
      id: "loc-1",
      userId: "other-user",
    } as never)
    const res = await GET(makeRequest({ locationId: "loc-1" }))
    expect(res.status).toBe(403)
  })

  it("returns analytics data for valid owner", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never)
    vi.mocked(db.location.findUnique).mockResolvedValue({
      id: "loc-1",
      userId: "user-1",
    } as never)
    vi.mocked(db.order.findMany).mockResolvedValue([] as never)
    vi.mocked(db.order.count).mockResolvedValue(0 as never)
    vi.mocked(db.orderItem.groupBy).mockResolvedValue([] as never)
    vi.mocked(db.menuItem.findMany).mockResolvedValue([] as never)
    // Mock $queryRaw as a tagged template function
    ;(db as unknown as Record<string, unknown>).$queryRaw = vi.fn().mockResolvedValue([{ total: 0 }])

    const res = await GET(makeRequest({ locationId: "loc-1", range: "7d" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.summary).toBeDefined()
    expect(json.summary.totalOrders).toBe(0)
    expect(json.summary.totalRevenue).toBe(0)
    expect(json.dailyOrders).toBeDefined()
    expect(json.topItems).toBeDefined()
    expect(json.hourlyDistribution).toBeDefined()
    expect(json.hourlyDistribution).toHaveLength(24)
  })
})
