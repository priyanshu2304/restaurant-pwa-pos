const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.text({ limit: "2mb", type: ["text/*", "text/csv"] }));

const dataDir = path.join(__dirname, "data");
const settingsPath = path.join(dataDir, "settings.json");
const menuPath = path.join(dataDir, "menu.json");
const invoicesPath = path.join(dataDir, "invoices.json");
const creditNotesPath = path.join(dataDir, "credit_notes.json");

function loadJSON(p, def) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return def;
  }
}
function saveJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

function fyLabel(d) {
  const year = d.getFullYear();
  const m = d.getMonth();
  if (m >= 3) {
    const yy = String((year + 1) % 100).padStart(2, "0");
    return `${year}-${yy}`;
  } else {
    const yy = String(year % 100).padStart(2, "0");
    return `${year - 1}-${yy}`;
  }
}

function ensureData() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(settingsPath))
    saveJSON(settingsPath, {
      restaurant_name: "Abhinandan Restaurant 123454",
      address: "NSB Road Raniganj-713347, Dist: Paschim Bardhaman, West Bengal",
      gstin: "29ABCDE1234F1Z5",
      invoice_prefix: "INV",
      default_discount: 0,
      printer_width: "80",
      hide_zero_discount_on_print: true,
      round_printed_total_to_rupee: false,
      login_pin: "0000",
    });
  if (!fs.existsSync(menuPath)) saveJSON(menuPath, []);
  if (!fs.existsSync(invoicesPath))
    saveJSON(invoicesPath, { invoices: [], serials: {} });
  if (!fs.existsSync(creditNotesPath)) saveJSON(creditNotesPath, []);
}
ensureData();

app.get("/settings", (req, res) => {
  res.json(loadJSON(settingsPath, {}));
});
app.put("/settings", (req, res) => {
  const s = req.body || {};
  saveJSON(settingsPath, s);
  res.json(s);
});

app.get("/menu", (req, res) => {
  res.json(loadJSON(menuPath, []));
});

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: ["Empty CSV"] };
  const headers = lines[0].split(",").map((h) => h.trim());
  const need = ["id", "dish_name", "price"];
  for (const h of need)
    if (!headers.includes(h))
      return {
        rows: [],
        errors: ["Missing required headers: id,dish_name,price"],
      };
  const idx = {
    id: headers.indexOf("id"),
    dish_name: headers.indexOf("dish_name"),
    price: headers.indexOf("price"),
  };
  const rows = [];
  const seen = new Set();
  const errors = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (cols.length < headers.length) continue;
    const id = cols[idx.id];
    const dish = cols[idx.dish_name];
    const price = cols[idx.price];
    if (!id || !dish || !price) {
      errors.push(`Invalid row ${i + 1}`);
      continue;
    }
    if (!/^\d+(\.\d+)?$/.test(price)) {
      errors.push(`Invalid price at row ${i + 1}`);
      continue;
    }
    if (seen.has(id)) {
      errors.push(`Duplicate id ${id}`);
      continue;
    }
    seen.add(id);
    rows.push({ id, dish_name: dish, unit_price: Number(price) });
  }
  return { rows, errors };
}

app.post("/menu/import-csv", (req, res) => {
  const text = req.body || "";
  const { rows, errors } = parseCsv(text);
  if (errors.length) return res.status(400).send(errors.join("\n"));
  const curr = loadJSON(menuPath, []);
  const map = new Map(curr.map((m) => [m.id, m]));
  for (const r of rows) map.set(r.id, r);
  const out = Array.from(map.values());
  saveJSON(menuPath, out);
  res.json({ upserted: rows.length });
});

app.post("/invoices/finalize", (req, res) => {
  const { lines, discount } = req.body || {};
  if (!Array.isArray(lines) || lines.length === 0)
    return res.status(400).send("No lines");
  const menu = loadJSON(menuPath, []);
  const menuMap = new Map(menu.map((m) => [m.id, m]));
  let sum = 0;
  const items = [];
  for (const l of lines) {
    const mi = menuMap.get(String(l.item_id));
    if (!mi) return res.status(400).send(`Unknown item ${l.item_id}`);
    const qty = Number(l.quantity);
    if (!Number.isFinite(qty) || qty <= 0)
      return res.status(400).send("Bad quantity");
    const line_total = +(mi.unit_price * qty).toFixed(2);
    sum += line_total;
    items.push({
      item_id: mi.id,
      dish_name: mi.dish_name,
      quantity: qty,
      unit_price: mi.unit_price,
      line_total,
    });
  }
  const disc = discount && discount > 0 ? Number(discount) : 0;
  const grand = +(sum - disc).toFixed(2);
  const now = new Date();
  const fy = fyLabel(now);

  const setting = loadJSON(settingsPath, {});
  const invoices = loadJSON(invoicesPath, { invoices: [], serials: {} });
  const last = invoices.serials[fy] || 0;
  const next = last + 1;
  invoices.serials[fy] = next;
  const invoice_no = `${setting.invoice_prefix || "INV"}/${fy}/${String(
    next
  ).padStart(6, "0")}`;
  const inv = {
    invoice_no,
    bill_date_iso: now.toISOString(),
    lines: items,
    grand_total: grand,
    fy_label: fy,
    discount: disc > 0 ? disc : undefined,
  };
  invoices.invoices.push(inv);
  fs.writeFileSync(invoicesPath, JSON.stringify(invoices, null, 2));

  res.json(inv);
});

app.get("/invoices", (req, res) => {
  const { from, to } = req.query;
  const invs = loadJSON(invoicesPath, { invoices: [] }).invoices;
  const filt = invs.filter(
    (i) => (!from || i.bill_date_iso >= from) && (!to || i.bill_date_iso <= to)
  );
  res.json(filt);
});

app.get("/exports/gst", (req, res) => {
  const { from, to } = req.query;
  const invs = loadJSON(invoicesPath, { invoices: [] }).invoices;
  const rows = [];
  for (const inv of invs) {
    const d = inv.bill_date_iso.slice(0, 10);
    if (from && d < from) continue;
    if (to && d > to) continue;
    for (const l of inv.lines) {
      rows.push({
        invoice_no: inv.invoice_no,
        bill_date: ddmmyyyy(inv.bill_date_iso),
        item_id: l.item_id,
        dish_name: l.dish_name,
        quantity: l.quantity,
        unit_price_inr: l.unit_price.toFixed(2),
        line_total_inr: l.line_total.toFixed(2),
        grand_total_inr: inv.grand_total.toFixed(2),
        fy_label: inv.fy_label,
        created_at_iso: inv.bill_date_iso,
      });
    }
  }
  let csv =
    "invoice_no,bill_date(DD/MM/YYYY),item_id,dish_name,quantity,unit_price_inr,line_total_inr,grand_total_inr,fy_label,created_at_iso\n";
  for (const r of rows) {
    csv += `${r.invoice_no},${r.bill_date},${r.item_id},"${r.dish_name.replace(
      /"/g,
      '""'
    )}",${r.quantity},${r.unit_price_inr},${r.line_total_inr},${
      r.grand_total_inr
    },${r.fy_label},${r.created_at_iso}\n`;
  }
  res.setHeader("Content-Type", "text/csv");
  res.send(csv);
});

function ddmmyyyy(iso) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

app.post("/credit-notes", (req, res) => {
  const cn = req.body || {};
  const list = loadJSON(creditNotesPath, []);
  list.push({
    ...cn,
    id: String(list.length + 1),
    created_at: new Date().toISOString(),
  });
  saveJSON(creditNotesPath, list);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Mock server on http://localhost:${PORT}`));
