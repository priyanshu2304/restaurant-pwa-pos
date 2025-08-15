import { useEffect, useMemo, useState } from "react";
import type { CartLine, MenuItem, Settings } from "@/types";
import { apiFinalizeInvoice, apiGetMenu, apiGetSettings } from "@/lib/api";
import { cacheMenu, clearCart, getCart, getMenu, setCart } from "@/lib/idb";
import useOnlineStatus from "@/lib/hooks/useOnlineStatus";
import { toTwo } from "@/lib/rounding";
import { useNavigate } from "react-router-dom";

export default function Billing() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("1");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const online = useOnlineStatus();
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const s = await apiGetSettings();
        setSettings(s);
      } catch {}
      try {
        const serverMenu = await apiGetMenu();
        setMenu(serverMenu);
        cacheMenu(serverMenu);
      } catch {
        const cached = await getMenu();
        setMenu(cached);
      }
      setLines(await getCart());
    })();
  }, []);

  useEffect(() => {
    setCart(lines);
  }, [lines]);

  const add = () => {
    setError("");
    const q = parseInt(qty, 10);
    if (!itemId || !Number.isFinite(q) || q <= 0) {
      setError("Provide item id and positive quantity");
      return;
    }
    const exists = menu.find((m) => m.id === itemId.trim());
    if (!exists) {
      setError("Unknown item id");
      return;
    }
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.item_id === itemId.trim());
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + q };
        return copy;
      }
      return [...prev, { item_id: itemId.trim(), quantity: q }];
    });
    setItemId("");
    setQty("1");
  };

  const remove = (id: string) =>
    setLines((prev) => prev.filter((l) => l.item_id !== id));
  const clear = async () => {
    setLines([]);
    await clearCart();
  };

  const enriched = useMemo(() => {
    return lines.map((l) => {
      const mi = menu.find((m) => m.id === l.item_id);
      const unit = mi?.unit_price ?? 0;
      const name = mi?.dish_name ?? "(unknown)";
      const total = toTwo(unit * l.quantity);
      return { ...l, dish_name: name, unit_price: unit, line_total: total };
    });
  }, [lines, menu]);

  const grandTotal = useMemo(() => {
    const sum = enriched.reduce((acc, l) => acc + l.line_total, 0);
    const disc = settings?.default_discount ?? 0;
    return toTwo(sum - disc);
  }, [enriched, settings]);

  const finalize = async () => {
    if (!online) return;
    if (enriched.length === 0) return;
    setBusy(true);
    try {
      const payload = {
        lines: enriched.map((l) => ({
          item_id: l.item_id,
          quantity: l.quantity,
        })),
        discount:
          settings?.default_discount && settings.default_discount > 0
            ? settings.default_discount
            : undefined,
      };
      const inv = await apiFinalizeInvoice(payload);
      await clear();
      nav("/print", { state: { invoice: inv, settings } });
    } catch (e: any) {
      setError(e?.message || "Finalize failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Billing</h2>
      {!online && (
        <div style={{ color: "#b00", marginBottom: 8 }}>
          Offline: finalize disabled
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="Item ID"
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          style={{ flex: 2, padding: 12, fontSize: 16, width: "100%" }}
        />
        <input
          placeholder="Qty"
          inputMode="numeric"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          style={{ width: 60, padding: 12, fontSize: 16 }}
        />
        <button onClick={add} style={{ padding: "12px 16px", fontSize: 16 }}>
          Add
        </button>
      </div>
      {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}

      <div style={{ marginTop: 12 }}>
        {enriched.map((l) => (
          <div
            key={l.item_id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{l.dish_name}</div>
              <div style={{ fontSize: 12, color: "#555" }}>
                ID: {l.item_id} • ₹{l.unit_price} × {l.quantity}
              </div>
            </div>
            <div style={{ fontWeight: 700 }}>₹{l.line_total.toFixed(2)}</div>
            <button onClick={() => remove(l.item_id)} style={{ marginLeft: 8 }}>
              ✕
            </button>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>Subtotal</div>
        <div>₹{enriched.reduce((a, l) => a + l.line_total, 0).toFixed(2)}</div>
      </div>
      {(settings?.default_discount ?? 0) > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>Discount</div>
          <div>−₹{settings!.default_discount.toFixed(2)}</div>
        </div>
      )}
      <div
        style={{
          marginTop: 8,
          fontSize: 20,
          fontWeight: 800,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>Grand Total</div>
        <div>₹{grandTotal.toFixed(2)}</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={clear} style={{ flex: 1, padding: 14 }}>
          Clear
        </button>
        <button
          onClick={finalize}
          disabled={!online || enriched.length === 0 || busy}
          style={{ flex: 2, padding: 14, fontSize: 18 }}
        >
          {busy ? "Finalizing…" : "Finalize & Print"}
        </button>
      </div>
    </div>
  );
}
