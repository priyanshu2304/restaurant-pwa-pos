import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MenuItem } from "@/types";
import { apiGetMenu } from "@/lib/api";
import { cacheMenu, getCart, setCart } from "@/lib/idb";

export default function MenuPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState("");
  const [qtyById, setQtyById] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const items = await apiGetMenu();
        setMenu(items);
        cacheMenu(items);
      } catch {
        // fallback: keep empty; Billing will still work with cached fetch
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return menu;
    return menu.filter(
      (m) =>
        m.id.toLowerCase().includes(q) || m.dish_name.toLowerCase().includes(q)
    );
  }, [menu, search]);

  // const addToCart = async (item: MenuItem) => {
  //   const qtyStr = qtyById[item.id] ?? "1";
  //   const qty = parseInt(qtyStr, 10);
  //   if (!Number.isFinite(qty) || qty <= 0) {
  //     setMsg("Enter a valid quantity");
  //     return;
  //   }
  //   const cart = await getCart();
  //   const idx = cart.findIndex((l) => l.item_id === item.id);
  //   if (idx >= 0) {
  //     cart[idx] = { ...cart[idx], quantity: cart[idx].quantity + qty };
  //   } else {
  //     cart.push({ item_id: item.id, quantity: qty });
  //   }
  //   await setCart(cart);
  //   setMsg(`Added ${qty} × ${item.dish_name}`);
  //   // brief toast
  //   setTimeout(() => setMsg(""), 1500);
  // };

  const addToCart = async (item: MenuItem) => {
    const qtyStr = qtyById[item.id] ?? "1";
    const qty = parseInt(qtyStr, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setMsg("Enter a valid quantity");
      return;
    }

    const cart = await getCart();
    const itemId = String(item.id);
    const idx = cart.findIndex((l) => String(l.item_id) === itemId);

    if (idx >= 0) {
      cart[idx] = { ...cart[idx], quantity: cart[idx].quantity + qty };
    } else {
      cart.push({ item_id: itemId, quantity: qty });
    }
    await setCart(cart);

    // 🔔 notify others (e.g., Billing) that cart changed
    document.dispatchEvent(new CustomEvent("cart:updated"));

    setMsg(`Added ${qty} × ${item.dish_name}`);
    setTimeout(() => setMsg(""), 1500);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Menu</h2>

      <input
        placeholder="Search by name or ID"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: 12, fontSize: 16, marginBottom: 10 }}
      />

      {msg && (
        <div style={{ background: "#eef8ee", padding: 8, marginBottom: 8 }}>
          {msg}
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {filtered.map((item) => (
          <div
            key={item.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 8,
              alignItems: "center",
              border: "1px solid #eee",
              padding: 10,
              borderRadius: 8,
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>{item.dish_name}</div>
              <div style={{ fontSize: 12, color: "#666" }}>ID: {item.id}</div>
            </div>
            <div style={{ textAlign: "right", fontWeight: 700 }}>
              ₹{Number(item.unit_price).toFixed(2)}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                inputMode="numeric"
                value={qtyById[item.id] ?? "1"}
                onChange={(e) =>
                  setQtyById((s) => ({ ...s, [item.id]: e.target.value }))
                }
                style={{ width: 56, padding: 8, textAlign: "center" }}
              />
              <button
                onClick={() => addToCart(item)}
                style={{ padding: "8px 10px" }}
              >
                Add
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ color: "#666", textAlign: "center", padding: 24 }}>
            No items match your search.
          </div>
        )}
      </div>

      <button
        onClick={() => nav("/billing")}
        style={{ width: "100%", padding: 14, fontSize: 16, marginTop: 16 }}
      >
        Go to Billing
      </button>
    </div>
  );
}
