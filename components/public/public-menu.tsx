"use client";

import { useState } from "react";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  allergens: string[];
  dietaryTags: string[];
}

interface Category {
  id: string;
  name: string;
  menuItems: MenuItem[];
}

interface PublicMenuProps {
  locationId: string;
  locationName: string;
  orderingEnabled: boolean;
  categories: Category[];
  uncategorizedItems: MenuItem[];
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

function formatPrice(price: number): string {
  return price.toFixed(2).replace(".", ",");
}

type OrderState = "idle" | "cart" | "submitting" | "success" | "error";

export function PublicMenu({
  locationId,
  locationName,
  orderingEnabled,
  categories,
  uncategorizedItems,
}: PublicMenuProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderState, setOrderState] = useState<OrderState>("idle");
  const [customerName, setCustomerName] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [orderNumber, setOrderNumber] = useState<number | null>(null);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  }

  function updateQuantity(menuItemId: string, delta: number) {
    setCart((prev) => {
      const updated = prev
        .map((c) =>
          c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0);
      // Auto-close cart overlay when last item is removed
      if (updated.length === 0 && orderState === "cart") {
        setOrderState("idle");
      }
      return updated;
    });
  }

  function getCartQuantity(menuItemId: string): number {
    return cart.find((c) => c.menuItemId === menuItemId)?.quantity ?? 0;
  }

  async function submitOrder() {
    if (!customerName.trim()) {
      setErrorMessage("Bitte gib deinen Namen an.");
      return;
    }
    if (cart.length === 0) return;

    setOrderState("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          customerName: customerName.trim(),
          customerNote: customerNote.trim() || undefined,
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            quantity: c.quantity,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMessage(data.error || "Bestellung fehlgeschlagen.");
        setOrderState("error");
        return;
      }

      const order = await res.json();
      setOrderNumber(order.orderNumber);
      setOrderState("success");
      setCart([]);
      setCustomerName("");
      setCustomerNote("");
    } catch {
      setErrorMessage("Verbindungsfehler. Bitte versuche es erneut.");
      setOrderState("error");
    }
  }

  // Success screen
  if (orderState === "success" && orderNumber) {
    return (
      <div className="min-h-dvh bg-[#FAFAF8]">
        <header className="border-b border-stone-200 bg-white px-4 py-6 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
            {locationName}
          </h1>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="space-y-4">
            <div className="inline-flex h-16 w-16 items-center justify-center bg-green-100">
              <span className="text-2xl text-green-600">&#10003;</span>
            </div>
            <h2 className="text-xl font-extrabold text-stone-900">
              Bestellung aufgegeben!
            </h2>
            <p className="font-mono text-3xl font-bold tabular-nums text-stone-900">
              #{orderNumber}
            </p>
            <p className="text-sm text-stone-500">
              Deine Bestellnummer. Wir informieren dich, wenn sie bereit ist.
            </p>
            <button
              className="mt-6 bg-stone-900 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-stone-800"
              onClick={() => {
                setOrderState("idle");
                setOrderNumber(null);
              }}
            >
              Neue Bestellung
            </button>
          </div>
        </main>
      </div>
    );
  }

  const hasItems =
    categories.some((c) => c.menuItems.length > 0) ||
    uncategorizedItems.length > 0;

  const hasImages =
    categories.some((c) => c.menuItems.some((i) => i.imageUrl)) ||
    uncategorizedItems.some((i) => i.imageUrl);

  return (
    <div className="min-h-dvh bg-[#FAFAF8]">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white px-4 py-6 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
          {locationName}
        </h1>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-stone-400">
          Speisekarte
        </p>
      </header>

      {/* Affiliate banner — shown only when menu items have images */}
      {hasImages && (
        <div className="border-b border-stone-100 bg-white py-1.5 text-center">
          <a
            href="https://bunny.net?ref=ql6ot7qdg0"
            target="_blank"
            rel="noopener"
            className="font-mono text-[10px] uppercase tracking-wider text-stone-400 hover:text-stone-600 transition-colors"
          >
            Bilder via bunny.net &rarr;
          </a>
        </div>
      )}

      {/* Menu content */}
      <main className="mx-auto max-w-2xl px-4 py-8">
        {!hasItems ? (
          <div className="py-16 text-center">
            <p className="text-sm text-stone-500">
              Die Speisekarte wird gerade aktualisiert.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {categories.map((category) => {
              if (category.menuItems.length === 0) return null;
              return (
                <section key={category.id}>
                  <h2 className="border-b border-stone-200 pb-2 text-lg font-extrabold tracking-tight text-stone-900">
                    {category.name}
                  </h2>
                  <div className="mt-4 space-y-3">
                    {category.menuItems.map((item) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        orderingEnabled={orderingEnabled}
                        quantity={getCartQuantity(item.id)}
                        onAdd={() => addToCart(item)}
                        onIncrement={() => updateQuantity(item.id, 1)}
                        onDecrement={() => updateQuantity(item.id, -1)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            {uncategorizedItems.length > 0 && (
              <section>
                <h2 className="border-b border-stone-200 pb-2 text-lg font-extrabold tracking-tight text-stone-900">
                  Weitere Gerichte
                </h2>
                <div className="mt-4 space-y-3">
                  {uncategorizedItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      orderingEnabled={orderingEnabled}
                      quantity={getCartQuantity(item.id)}
                      onAdd={() => addToCart(item)}
                      onIncrement={() => updateQuantity(item.id, 1)}
                      onDecrement={() => updateQuantity(item.id, -1)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Cart bar — fixed at bottom */}
      {orderingEnabled && cartCount > 0 && orderState !== "cart" && (
        <div className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white px-4 py-3 shadow-lg">
          <button
            className="flex w-full items-center justify-between bg-stone-900 px-4 py-3 text-white hover:bg-stone-800"
            onClick={() => setOrderState("cart")}
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <span className="inline-flex h-6 w-6 items-center justify-center bg-white font-mono text-xs font-bold text-stone-900">
                {cartCount}
              </span>
              Warenkorb anzeigen
            </span>
            <span className="font-mono text-sm font-bold tabular-nums">
              {formatPrice(cartTotal)}&nbsp;&euro;
            </span>
          </button>
        </div>
      )}

      {/* Cart / Checkout overlay */}
      {orderState === "cart" || orderState === "submitting" || orderState === "error" ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#FAFAF8]">
          <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-4">
            <h2 className="text-lg font-extrabold tracking-tight text-stone-900">
              Deine Bestellung
            </h2>
            <button
              className="font-mono text-sm text-stone-500 hover:text-stone-900"
              onClick={() => {
                setOrderState("idle");
                setErrorMessage("");
              }}
            >
              Schliessen
            </button>
          </header>

          <main className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto max-w-md space-y-6">
              {/* Cart items */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="flex items-center justify-between border border-stone-200 bg-white p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-stone-900">{item.name}</p>
                      <p className="font-mono text-xs text-stone-500">
                        {formatPrice(item.price)}&nbsp;&euro;
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="flex h-8 w-8 items-center justify-center border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                        onClick={() => updateQuantity(item.menuItemId, -1)}
                      >
                        &minus;
                      </button>
                      <span className="w-6 text-center font-mono text-sm font-bold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        className="flex h-8 w-8 items-center justify-center border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                        onClick={() => updateQuantity(item.menuItemId, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer info */}
              <div className="space-y-3">
                <div>
                  <label htmlFor="customer-name" className="text-sm font-bold text-stone-700">
                    Dein Name *
                  </label>
                  <input
                    id="customer-name"
                    type="text"
                    className="mt-1 w-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none"
                    placeholder="z.B. Max"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="customer-note" className="text-sm font-bold text-stone-700">
                    Hinweis <span className="font-normal text-stone-400">(optional)</span>
                  </label>
                  <textarea
                    id="customer-note"
                    className="mt-1 w-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none"
                    placeholder="z.B. Ohne Zwiebeln"
                    rows={2}
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                  />
                </div>
              </div>

              {/* Error */}
              {errorMessage && (
                <div className="border-l-3 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}
            </div>
          </main>

          {/* Submit button */}
          <div className="border-t border-stone-200 bg-white px-4 py-4">
            <div className="mx-auto max-w-md">
              <button
                className="flex w-full items-center justify-between bg-green-600 px-4 py-3 text-white hover:bg-green-500 disabled:opacity-50"
                disabled={orderState === "submitting" || cart.length === 0}
                onClick={submitOrder}
              >
                <span className="text-sm font-bold">
                  {orderState === "submitting" ? "Wird gesendet..." : "Bestellung aufgeben"}
                </span>
                <span className="font-mono text-sm font-bold tabular-nums">
                  {formatPrice(cartTotal)}&nbsp;&euro;
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Footer */}
      {cartCount === 0 && (
        <footer className="border-t border-stone-200 py-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-wider text-stone-400">
            Powered by FairOrder
          </p>
        </footer>
      )}
    </div>
  );
}

function MenuItemCard({
  item,
  orderingEnabled,
  quantity,
  onAdd,
  onIncrement,
  onDecrement,
}: {
  item: MenuItem;
  orderingEnabled: boolean;
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="flex gap-4 border border-stone-200 bg-white p-4">
      {item.imageUrl && (
        <div className="h-16 w-16 shrink-0 overflow-hidden bg-stone-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-stone-900">{item.name}</h3>
          <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-stone-900">
            {formatPrice(item.price)}&nbsp;&euro;
          </span>
        </div>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-xs text-stone-500">
            {item.description}
          </p>
        )}
        {(item.dietaryTags.length > 0 || item.allergens.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.dietaryTags.map((tag) => (
              <span
                key={tag}
                className="bg-stone-100 px-1.5 py-0 font-mono text-[10px] text-stone-600"
              >
                {tag}
              </span>
            ))}
            {item.allergens.map((allergen) => (
              <span
                key={allergen}
                className="border border-stone-200 px-1.5 py-0 font-mono text-[10px] text-stone-500"
              >
                {allergen}
              </span>
            ))}
          </div>
        )}

        {/* Add / quantity controls */}
        {orderingEnabled && (
          <div className="mt-3">
            {quantity === 0 ? (
              <button
                className="bg-stone-900 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-stone-800"
                onClick={onAdd}
              >
                Hinzufügen
              </button>
            ) : (
              <div className="inline-flex items-center gap-2">
                <button
                  className="flex h-7 w-7 items-center justify-center border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  onClick={onDecrement}
                >
                  &minus;
                </button>
                <span className="w-5 text-center font-mono text-sm font-bold tabular-nums">
                  {quantity}
                </span>
                <button
                  className="flex h-7 w-7 items-center justify-center border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  onClick={onIncrement}
                >
                  +
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
