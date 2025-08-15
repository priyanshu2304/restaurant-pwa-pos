// import { openDB, IDBPDatabase } from 'idb';
// import type { MenuItem, CartLine, FinalizedInvoice, Settings } from '@/types';

// type DBSchema = {
//   menu: MenuItem;
//   cart: { id: 'current'; lines: CartLine[] };
//   lastInvoice: FinalizedInvoice;
//   settingsCache: Settings;
// };

// let _db: IDBPDatabase<any> | null = null;

// export async function db() {
//   if (_db) return _db;
//   _db = await openDB<unknown>('billing-db', 1, {
//     upgrade(db) {
//       if (!db.objectStoreNames.contains('menu')) {
//         db.createObjectStore('menu', { keyPath: 'id' });
//       }
//       if (!db.objectStoreNames.contains('cart')) {
//         const s = db.createObjectStore('cart', { keyPath: 'id' });
//         s.add({ id: 'current', lines: [] });
//       }
//       if (!db.objectStoreNames.contains('lastInvoice')) {
//         db.createObjectStore('lastInvoice', { keyPath: 'invoice_no' });
//       }
//       if (!db.objectStoreNames.contains('settingsCache')) {
//         db.createObjectStore('settingsCache', { keyPath: 'invoice_prefix' });
//       }
//     }
//   });
//   return _db!;
// }

// export async function cacheMenu(items: MenuItem[]) {
//   const d = await db();
//   const tx = d.transaction('menu', 'readwrite');
//   await Promise.all(items.map((it) => tx.store.put(it)));
//   await tx.done;
// }

// export async function getMenu(): Promise<MenuItem[]> {
//   const d = await db();
//   return (await d.getAll('menu')) as MenuItem[];
// }

// export async function getCart(): Promise<CartLine[]> {
//   const d = await db();
//   const rec = (await d.get('cart', 'current')) as any;
//   return rec?.lines ?? [];
// }

// export async function setCart(lines: CartLine[]) {
//   const d = await db();
//   await d.put('cart', { id: 'current', lines });
// }

// export async function clearCart() {
//   await setCart([]);
// }

// src/lib/idb.ts
import { openDB, IDBPDatabase } from "idb";
import type { MenuItem, CartLine, FinalizedInvoice, Settings } from "@/types";

let _db: IDBPDatabase<any> | null = null;

const DB_NAME = "billing-db";
const DB_VERSION = 1 as const;

function emitCartUpdated() {
  if (typeof document !== "undefined") {
    document.dispatchEvent(new CustomEvent("cart:updated"));
  }
}

export async function db() {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("menu")) {
        db.createObjectStore("menu", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("cart")) {
        db.createObjectStore("cart", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("lastInvoice")) {
        db.createObjectStore("lastInvoice", { keyPath: "invoice_no" });
      }
      // Note: using 'invoice_prefix' as keyPath is a bit odd for a cache.
      // Keeping as-is for compatibility with your code.
      if (!db.objectStoreNames.contains("settingsCache")) {
        db.createObjectStore("settingsCache", { keyPath: "invoice_prefix" });
      }
    },
  });

  // Ensure the singleton cart record exists
  const hasCart = await _db.get("cart", "current");
  if (!hasCart) {
    await _db.put("cart", { id: "current", lines: [] });
  }

  return _db!;
}

/** Upsert menu into IndexedDB, normalizing id:string and unit_price:number */
export async function cacheMenu(items: MenuItem[]) {
  const d = await db();
  const tx = d.transaction("menu", "readwrite");
  for (const it of items) {
    await tx.store.put({
      ...it,
      id: String((it as any).id),
      unit_price: Number((it as any).unit_price),
    });
  }
  await tx.done;
}

/** Get all menu items with normalized shapes */
export async function getMenu(): Promise<MenuItem[]> {
  const d = await db();
  const all = (await d.getAll("menu")) as any[];
  return all.map((it) => ({
    ...it,
    id: String(it.id),
    unit_price: Number(it.unit_price),
  })) as MenuItem[];
}

/** Read the current cart lines (always returns an array). */
export async function getCart(): Promise<CartLine[]> {
  const d = await db();
  const rec = (await d.get("cart", "current")) as any;
  const lines: any[] = rec?.lines ?? [];
  // Normalize: item_id as string, quantity as number >= 0
  return lines.map((l) => ({
    item_id: String(l.item_id),
    quantity: Math.max(0, Number(l.quantity) || 0),
  })) as CartLine[];
}

/** Replace the entire cart and notify listeners. */
export async function setCart(lines: CartLine[]) {
  const d = await db();
  const normalized = lines.map((l) => ({
    item_id: String(l.item_id),
    quantity: Math.max(0, Number(l.quantity) || 0),
  }));
  await d.put("cart", { id: "current", lines: normalized });
  emitCartUpdated();
}

/** Clear the cart and notify listeners. */
export async function clearCart() {
  await setCart([]);
  // setCart already emits cart:updated
}

/** Optional helpers if you use them later */
export async function cacheLastInvoice(inv: FinalizedInvoice) {
  const d = await db();
  await d.put("lastInvoice", inv);
}
export async function getLastInvoice(
  invoice_no: string
): Promise<FinalizedInvoice | undefined> {
  const d = await db();
  return (await d.get("lastInvoice", invoice_no)) as
    | FinalizedInvoice
    | undefined;
}

export async function cacheSettings(s: Settings) {
  const d = await db();
  await d.put("settingsCache", s as any);
}
export async function getCachedSettings(): Promise<Settings | undefined> {
  const d = await db();
  // If you only ever store one settings row, you can also use getAll()[0]
  const all = (await d.getAll("settingsCache")) as Settings[];
  return all[0];
}
