import type { FinalizedInvoice, MenuItem, Settings } from "@/types";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const getToken = () =>
  typeof sessionStorage !== "undefined"
    ? sessionStorage.getItem("token")
    : null;
const authHeaders = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export async function apiAuthStatus(): Promise<{ initialized: boolean }> {
  const r = await fetch(`${BASE}/auth/status`);
  if (!r.ok) throw new Error("status failed");
  return r.json();
}
export async function apiRegister(username: string, password: string) {
  const r = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ user: any; token: string }>;
}
export async function apiLogin(username: string, password: string) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ user: any; token: string }>;
}
export async function apiMe() {
  const r = await fetch(`${BASE}/me`, { headers: { ...authHeaders() } });
  if (!r.ok) throw new Error("unauthorized");
  return r.json();
}

// export async function apiGetMenu(): Promise<MenuItem[]> {
//   const r = await fetch(`${BASE}/menu`, { headers: { ...authHeaders() } });
//   if (!r.ok) throw new Error("Failed to fetch menu");
//   return r.json();
// }

export async function apiGetMenu(): Promise<MenuItem[]> {
  const r = await fetch(`${BASE}/menu`, { headers: { ...authHeaders() } });
  if (!r.ok) throw new Error("Failed to fetch menu");
  const list = await r.json();
  // ensure unit_price is a number
  return list.map((m: any) => ({
    id: String(m.id),
    dish_name: m.dish_name,
    unit_price: Number(m.unit_price),
  }));
}

export async function apiImportMenuCsv(
  csvText: string
): Promise<{ upserted: number }> {
  const r = await fetch(`${BASE}/menu/import-csv`, {
    method: "POST",
    headers: { "Content-Type": "text/csv", ...authHeaders() },
    body: csvText,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function apiGetSettings(): Promise<Settings> {
  const r = await fetch(`${BASE}/settings`);
  if (!r.ok) throw new Error("Failed to load settings");
  return r.json();
}

export async function apiPutSettings(s: Settings): Promise<Settings> {
  const r = await fetch(`${BASE}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(s),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export interface FinalizeRequest {
  lines: { item_id: string; quantity: number }[];
  discount?: number;
}

export async function apiFinalizeInvoice(
  payload: FinalizeRequest
): Promise<FinalizedInvoice> {
  const r = await fetch(`${BASE}/invoices/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function apiExportCsv(from: string, to: string): Promise<string> {
  const r = await fetch(`${BASE}/exports/gst?from=${from}&to=${to}`, {
    headers: { ...authHeaders() },
  });
  if (!r.ok) throw new Error("Export failed");
  return r.text();
}
