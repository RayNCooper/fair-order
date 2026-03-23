import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locationId, customerName, customerNote, items } = body;

    // --- Validate required fields ---

    if (!locationId || typeof locationId !== "string") {
      return NextResponse.json(
        { error: "Standort-ID ist erforderlich." },
        { status: 400 }
      );
    }

    if (!customerName || typeof customerName !== "string" || !customerName.trim()) {
      return NextResponse.json(
        { error: "Bitte gib deinen Namen an." },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Die Bestellung muss mindestens einen Artikel enthalten." },
        { status: 400 }
      );
    }

    // --- Validate location ---

    const location = await db.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Standort nicht gefunden." },
        { status: 404 }
      );
    }

    if (!location.orderingEnabled) {
      return NextResponse.json(
        { error: "Dieser Standort nimmt derzeit keine Bestellungen an." },
        { status: 403 }
      );
    }

    // --- Check maxActiveOrders limit ---

    const activeOrderCount = await db.order.count({
      where: {
        locationId,
        status: { in: ["PENDING", "PREPARING", "READY"] },
      },
    });

    if (activeOrderCount >= location.maxActiveOrders) {
      return NextResponse.json(
        { error: "Maximale Anzahl aktiver Bestellungen erreicht. Bitte versuche es später erneut." },
        { status: 429 }
      );
    }

    // --- Validate menu items ---

    const menuItemIds = items.map((item: { menuItemId: string }) => item.menuItemId);

    const menuItems = await db.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        locationId,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const menuItemMap = new Map<string, any>(menuItems.map((mi: any) => [mi.id, mi]));

    for (const item of items) {
      if (!item.menuItemId || typeof item.menuItemId !== "string") {
        return NextResponse.json(
          { error: "Ungültige Artikel-ID." },
          { status: 400 }
        );
      }

      const menuItem = menuItemMap.get(item.menuItemId);

      if (!menuItem) {
        return NextResponse.json(
          { error: `Artikel „${item.menuItemId}" wurde nicht gefunden oder gehört nicht zu diesem Standort.` },
          { status: 400 }
        );
      }

      if (!menuItem.isAvailable) {
        return NextResponse.json(
          { error: `„${menuItem.name}" ist derzeit nicht verfügbar.` },
          { status: 400 }
        );
      }

      if (!item.quantity || typeof item.quantity !== "number" || item.quantity < 1) {
        return NextResponse.json(
          { error: "Menge muss mindestens 1 sein." },
          { status: 400 }
        );
      }
    }

    // --- Generate next orderNumber ---

    const lastOrder = await db.order.findFirst({
      where: { locationId },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });

    const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

    // --- Calculate requestedPickupTime ---

    const requestedPickupTime = new Date(
      Date.now() + location.orderLeadTimeMinutes * 60 * 1000
    );

    // --- Create order with items ---

    const order = await db.order.create({
      data: {
        locationId,
        orderNumber,
        customerName: customerName.trim(),
        customerNote: customerNote?.trim() || null,
        requestedPickupTime,
        items: {
          create: items.map((item: { menuItemId: string; quantity: number }) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: menuItemMap.get(item.menuItemId)!.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Bestellung konnte nicht erstellt werden. Bitte versuche es erneut." },
      { status: 500 }
    );
  }
}
