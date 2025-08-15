// // server-postgres/index.js
// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const { Pool } = require("pg");
// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcryptjs");

// const app = express();
// app.set("trust proxy", 1); // friendly with Render/Proxies

// // ---- CORS: allow local dev + your production origin ----
// const ALLOWED_ORIGINS = [
//   "http://localhost:5173",
//   "http://127.0.0.1:5173",
//   "https://pos.therichie.in",
//   "https://restaurant-pwa-pos.pages.dev",
//   process.env.FRONTEND_ORIGIN || "", // e.g. https://pos.therichie.in
// ].filter(Boolean);

// app.use(
//   cors({
//     origin(origin, cb) {
//       // allow same-origin / curl / postman (no origin header)
//       if (!origin) return cb(null, true);
//       if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
//       return cb(null, false);
//     },
//   })
// );

// // const allow = (process.env.CORS_ORIGINS || "")
// //   .split(",")
// //   .map((s) => s.trim())
// //   .filter(Boolean);

// // app.use(
// //   cors({
// //     origin: (origin, cb) => {
// //       // allow server-to-server/curl (no Origin) and any origin in allow-list
// //       if (!origin) return cb(null, true);
// //       if (allow.length === 0 || allow.includes(origin)) return cb(null, true);
// //       return cb(new Error("Not allowed by CORS"));
// //     },
// //     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
// //     allowedHeaders: ["Content-Type", "Authorization"],
// //   })
// // );
// // app.options("*", cors());

// // ---- Body parsers ----
// app.use(express.json({ limit: "2mb" }));
// app.use(express.text({ limit: "2mb", type: ["text/*", "text/csv"] }));

// // ---- Postgres Pool (Neon/Render friendly) ----
// let pool;
// if (process.env.DATABASE_URL) {
//   // Neon serverless connection
//   pool = new Pool({
//     connectionString: process.env.DATABASE_URL,
//     ssl: { rejectUnauthorized: false }, // Neon requires TLS
//     max: 10,
//   });
// } else {
//   // Local dev / self-hosted PG
//   pool = new Pool({
//     host: process.env.PGHOST || "localhost",
//     port: +(process.env.PGPORT || 5432),
//     database: process.env.PGDATABASE || "restaurant_pos",
//     user: process.env.PGUSER || "pos_user",
//     password: process.env.PGPASSWORD || "pos_pass",
//     max: 10,
//   });
// }

// const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// // ---- Helpers ----
// function fyLabel(d) {
//   const y = d.getFullYear();
//   const m = d.getMonth();
//   if (m >= 3) return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
//   return `${y - 1}-${String(y % 100).padStart(2, "0")}`;
// }
// function ddmmyyyy(iso) {
//   const d = new Date(iso);
//   return `${String(d.getDate()).padStart(2, "0")}/${String(
//     d.getMonth() + 1
//   ).padStart(2, "0")}/${d.getFullYear()}`;
// }
// const pad6 = (n) => String(n).padStart(6, "0");

// const sign = (u) =>
//   jwt.sign({ sub: u.id, role: u.role, username: u.username }, JWT_SECRET, {
//     expiresIn: "7d",
//   });

// function authRequired(req, res, next) {
//   const h = req.headers.authorization || "";
//   const [type, token] = h.split(" ");
//   if (type !== "Bearer" || !token) return res.status(401).send("Unauthorized");
//   try {
//     req.user = jwt.verify(token, JWT_SECRET);
//     next();
//   } catch {
//     return res.status(401).send("Unauthorized");
//   }
// }

// // ---- Health (for Render/monitoring) ----
// app.get("/healthz", async (_req, res) => {
//   try {
//     await pool.query("select 1");
//     res.json({ ok: true });
//   } catch (e) {
//     res.status(500).json({ ok: false, error: String(e?.message || e) });
//   }
// });

// // ---------- AUTH ----------
// app.get("/auth/status", async (_req, res) => {
//   const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM users");
//   res.json({ initialized: rows[0].c > 0 });
// });

// app.post("/auth/register", async (req, res) => {
//   const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM users");
//   if (rows[0].c > 0) return res.status(403).send("Already initialized");
//   const { username, password } = req.body || {};
//   if (!username || !password)
//     return res.status(400).send("username & password required");
//   const hash = await bcrypt.hash(password, 10);
//   const { rows: ins } = await pool.query(
//     "INSERT INTO users (username, password_hash, role) VALUES ($1,$2,$3) RETURNING id, username, role",
//     [username, hash, "admin"]
//   );
//   const user = ins[0];
//   res.json({ user, token: sign(user) });
// });

// app.post("/auth/login", async (req, res) => {
//   const { username, password } = req.body || {};
//   if (!username || !password)
//     return res.status(400).send("username & password required");
//   const { rows } = await pool.query(
//     "SELECT id, username, password_hash, role FROM users WHERE username=$1",
//     [username]
//   );
//   const user = rows[0];
//   if (!user) return res.status(401).send("Invalid credentials");
//   const ok = await bcrypt.compare(password, user.password_hash);
//   if (!ok) return res.status(401).send("Invalid credentials");
//   res.json({
//     user: { id: user.id, username: user.username, role: user.role },
//     token: sign(user),
//   });
// });

// app.get("/me", authRequired, async (req, res) => {
//   res.json({
//     user: {
//       id: req.user.sub,
//       username: req.user.username,
//       role: req.user.role,
//     },
//   });
// });

// // ---------- SETTINGS ----------
// app.get("/settings", async (_req, res) => {
//   const { rows } = await pool.query("SELECT * FROM settings WHERE id=1");
//   res.json(rows[0]);
// });
// app.put("/settings", authRequired, async (req, res) => {
//   const s = req.body || {};
//   const q = `
//   INSERT INTO settings (id, restaurant_name, address, gstin, invoice_prefix, default_discount,
//     printer_width, hide_zero_discount_on_print, round_printed_total_to_rupee, login_pin)
//   VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9)
//   ON CONFLICT (id) DO UPDATE SET
//     restaurant_name=$1,address=$2,gstin=$3,invoice_prefix=$4,default_discount=$5,
//     printer_width=$6,hide_zero_discount_on_print=$7,round_printed_total_to_rupee=$8,login_pin=$9
//   RETURNING *`;
//   const vals = [
//     s.restaurant_name,
//     s.address,
//     s.gstin,
//     s.invoice_prefix || "INV",
//     s.default_discount || 0,
//     s.printer_width || "80",
//     !!s.hide_zero_discount_on_print,
//     !!s.round_printed_total_to_rupee,
//     s.login_pin || "0000",
//   ];
//   const { rows } = await pool.query(q, vals);
//   res.json(rows[0]);
// });

// // ---------- MENU ----------
// app.get("/menu", authRequired, async (_req, res) => {
//   const { rows } = await pool.query(
//     "SELECT id, dish_name, unit_price FROM menu ORDER BY id"
//   );
//   res.json(
//     rows.map((r) => ({
//       id: r.id,
//       dish_name: r.dish_name,
//       unit_price: Number(r.unit_price),
//     }))
//   );
// });

// function parseCsv(text) {
//   const lines = text.split(/\r?\n/).filter(Boolean);
//   if (!lines.length) return { rows: [], errors: ["Empty CSV"] };
//   const headers = lines[0].split(",").map((h) => h.trim());
//   const need = ["id", "dish_name", "price"];
//   for (const h of need)
//     if (!headers.includes(h))
//       return {
//         rows: [],
//         errors: ["Missing required headers: id,dish_name,price"],
//       };
//   const idx = {
//     id: headers.indexOf("id"),
//     dish_name: headers.indexOf("dish_name"),
//     price: headers.indexOf("price"),
//   };
//   const seen = new Set();
//   const rows = [],
//     errors = [];
//   for (let i = 1; i < lines.length; i++) {
//     const cols = lines[i].split(",").map((c) => c.trim());
//     if (!cols[idx.id] || !cols[idx.dish_name] || !cols[idx.price]) {
//       errors.push(`Invalid row ${i + 1}`);
//       continue;
//     }
//     if (!/^\d+(\.\d+)?$/.test(cols[idx.price])) {
//       errors.push(`Invalid price at row ${i + 1}`);
//       continue;
//     }
//     if (seen.has(cols[idx.id])) {
//       errors.push(`Duplicate id ${cols[idx.id]}`);
//       continue;
//     }
//     seen.add(cols[idx.id]);
//     rows.push({
//       id: cols[idx.id],
//       dish_name: cols[idx.dish_name],
//       unit_price: Number(cols[idx.price]),
//     });
//   }
//   return { rows, errors };
// }

// app.post("/menu/import-csv", authRequired, async (req, res) => {
//   const text = req.body || "";
//   const { rows, errors } = parseCsv(text);
//   if (errors.length) return res.status(400).send(errors.join("\n"));
//   const client = await pool.connect();
//   try {
//     await client.query("BEGIN");
//     for (const r of rows) {
//       await client.query(
//         `INSERT INTO menu (id, dish_name, unit_price)
//          VALUES ($1,$2,$3)
//          ON CONFLICT (id) DO UPDATE SET dish_name=EXCLUDED.dish_name, unit_price=EXCLUDED.unit_price`,
//         [r.id, r.dish_name, r.unit_price]
//       );
//     }
//     await client.query("COMMIT");
//     res.json({ upserted: rows.length });
//   } catch (e) {
//     await client.query("ROLLBACK");
//     console.error(e);
//     res.status(500).send("Import failed");
//   } finally {
//     client.release();
//   }
// });

// // ---------- INVOICES ----------
// app.post("/invoices/finalize", authRequired, async (req, res) => {
//   const { lines, discount } = req.body || {};
//   if (!Array.isArray(lines) || lines.length === 0)
//     return res.status(400).send("No lines");

//   const ids = lines.map((l) => String(l.item_id));
//   const { rows: menuRows } = await pool.query(
//     `SELECT id, dish_name, unit_price FROM menu WHERE id = ANY($1::text[])`,
//     [ids]
//   );
//   const menuMap = new Map(menuRows.map((m) => [m.id, m]));
//   let sum = 0;
//   const items = [];
//   for (const l of lines) {
//     const mi = menuMap.get(String(l.item_id));
//     if (!mi) return res.status(400).send(`Unknown item ${l.item_id}`);
//     const qty = Number(l.quantity);
//     if (!Number.isFinite(qty) || qty <= 0)
//       return res.status(400).send("Bad quantity");
//     const line_total = +(Number(mi.unit_price) * qty).toFixed(2);
//     sum += line_total;
//     items.push({
//       item_id: mi.id,
//       dish_name: mi.dish_name,
//       quantity: qty,
//       unit_price: Number(mi.unit_price),
//       line_total,
//     });
//   }
//   const disc = discount && discount > 0 ? Number(discount) : 0;
//   const grand = +(sum - disc).toFixed(2);
//   const now = new Date();
//   const fy = fyLabel(now);

//   const client = await pool.connect();
//   try {
//     await client.query("BEGIN");
//     const { rows: srows } = await client.query(
//       "SELECT invoice_prefix FROM settings WHERE id=1"
//     );
//     const prefix = srows[0]?.invoice_prefix || "INV";

//     const { rows: sr } = await client.query(
//       `INSERT INTO serials (fy_label, last_serial)
//        VALUES ($1, 1)
//        ON CONFLICT (fy_label) DO UPDATE SET last_serial = serials.last_serial + 1
//        RETURNING last_serial`,
//       [fy]
//     );
//     const serial = sr[0].last_serial;
//     const invoice_no = `${prefix}/${fy}/${pad6(serial)}`;

//     const invIns = await client.query(
//       `INSERT INTO invoices (invoice_no, fy_label, grand_total, discount)
//        VALUES ($1,$2,$3,$4)
//        RETURNING invoice_no, bill_date, fy_label, grand_total, discount`,
//       [invoice_no, fy, grand, disc > 0 ? disc : null]
//     );

//     const values = [];
//     const params = [];
//     items.forEach((it, i) => {
//       const base = i * 6;
//       params.push(
//         `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${
//           base + 6
//         })`
//       );
//       values.push(
//         invoice_no,
//         it.item_id,
//         it.dish_name,
//         it.quantity,
//         it.unit_price,
//         it.line_total
//       );
//     });
//     await client.query(
//       `INSERT INTO invoice_lines (invoice_no, item_id, dish_name, quantity, unit_price, line_total)
//        VALUES ${params.join(",")}`,
//       values
//     );

//     await client.query("COMMIT");
//     const invRow = invIns.rows[0];
//     res.json({
//       invoice_no,
//       bill_date_iso: new Date(invRow.bill_date).toISOString(),
//       lines: items,
//       grand_total: Number(invRow.grand_total),
//       fy_label: invRow.fy_label,
//       discount: invRow.discount ? Number(invRow.discount) : undefined,
//     });
//   } catch (e) {
//     await client.query("ROLLBACK");
//     console.error(e);
//     res.status(500).send("Finalize failed");
//   } finally {
//     client.release();
//   }
// });

// app.get("/invoices", authRequired, async (req, res) => {
//   const { from, to } = req.query;
//   const cond = [];
//   const vals = [];
//   if (from) {
//     vals.push(from);
//     cond.push(`bill_date::date >= $${vals.length}`);
//   }
//   if (to) {
//     vals.push(to);
//     cond.push(`bill_date::date <= $${vals.length}`);
//   }
//   const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
//   const q = `
//   SELECT i.invoice_no, i.bill_date, i.fy_label, i.grand_total, i.discount,
//          json_agg(json_build_object(
//            'item_id', l.item_id, 'dish_name', l.dish_name, 'quantity', l.quantity,
//            'unit_price', l.unit_price, 'line_total', l.line_total
//          ) ORDER BY l.id) AS lines
//   FROM invoices i
//   JOIN invoice_lines l ON l.invoice_no = i.invoice_no
//   ${where}
//   GROUP BY i.invoice_no
//   ORDER BY i.bill_date DESC
//   `;
//   const { rows } = await pool.query(q, vals);
//   res.json(
//     rows.map((r) => ({
//       invoice_no: r.invoice_no,
//       bill_date_iso: new Date(r.bill_date).toISOString(),
//       fy_label: r.fy_label,
//       grand_total: Number(r.grand_total),
//       discount: r.discount == null ? undefined : Number(r.discount),
//       lines: r.lines.map((x) => ({
//         item_id: x.item_id,
//         dish_name: x.dish_name,
//         quantity: Number(x.quantity),
//         unit_price: Number(x.unit_price),
//         line_total: Number(x.line_total),
//       })),
//     }))
//   );
// });

// app.get("/exports/gst", authRequired, async (req, res) => {
//   const { from, to } = req.query;
//   const cond = [];
//   const vals = [];
//   if (from) {
//     vals.push(from);
//     cond.push(`i.bill_date::date >= $${vals.length}`);
//   }
//   if (to) {
//     vals.push(to);
//     cond.push(`i.bill_date::date <= $${vals.length}`);
//   }
//   const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
//   const q = `
//   SELECT i.invoice_no, i.bill_date, i.fy_label, i.grand_total, i.discount,
//          l.item_id, l.dish_name, l.quantity, l.unit_price, l.line_total
//   FROM invoices i
//   JOIN invoice_lines l ON l.invoice_no = i.invoice_no
//   ${where}
//   ORDER BY i.bill_date, i.invoice_no, l.id
//   `;
//   const { rows } = await pool.query(q, vals);
//   let csv =
//     "invoice_no,bill_date(DD/MM/YYYY),item_id,dish_name,quantity,unit_price_inr,line_total_inr,grand_total_inr,fy_label,created_at_iso\n";
//   for (const r of rows) {
//     csv += `${r.invoice_no},${ddmmyyyy(r.bill_date)},${r.item_id},"${String(
//       r.dish_name
//     ).replace(/"/g, '""')}",${r.quantity},${Number(r.unit_price).toFixed(
//       2
//     )},${Number(r.line_total).toFixed(2)},${Number(r.grand_total).toFixed(2)},${
//       r.fy_label
//     },${new Date(r.bill_date).toISOString()}\n`;
//   }
//   res.setHeader("Content-Type", "text/csv");
//   res.send(csv);
// });

// // CREDIT NOTES (stub)
// app.post("/credit-notes", authRequired, async (req, res) => {
//   const { invoice_no, amount, reason } = req.body || {};
//   const { rows } = await pool.query(
//     `INSERT INTO credit_notes (invoice_no, amount, reason)
//      VALUES ($1,$2,$3) RETURNING id, created_at`,
//     [invoice_no, amount, reason || null]
//   );
//   res.json({ id: rows[0].id, created_at: rows[0].created_at });
// });

// // ---- Start server ----
// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => {
//   console.log(`API listening on :${PORT}`);
//   if (ALLOWED_ORIGINS.length)
//     console.log("CORS allowed:", ALLOWED_ORIGINS.join(", "));
// });

// server-postgres/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
app.set("trust proxy", 1);

// ---- CORS allow-list via env ----
// CORS_ORIGINS should be a comma-separated list, e.g.
// "https://pos.therichie.in,https://restaurant-pwa-pos.pages.dev,http://localhost:5173,http://127.0.0.1:5173"
const allow = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow server-to-server/curl (no Origin) and any origin in allow-list
      if (!origin) return cb(null, true);
      if (allow.length === 0 || allow.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);
// DO NOT add app.options("*", cors()) — not needed and breaks on path-to-regexp

// ---- Body parsers ----
app.use(express.json({ limit: "2mb" }));
app.use(express.text({ limit: "2mb", type: ["text/*", "text/csv"] }));

// ---- Postgres Pool (Neon/Render friendly) ----
let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
  });
} else {
  pool = new Pool({
    host: process.env.PGHOST || "localhost",
    port: +(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || "restaurant_pos",
    user: process.env.PGUSER || "pos_user",
    password: process.env.PGPASSWORD || "pos_pass",
    max: 10,
  });
}

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// ---- Helpers ----
function fyLabel(d) {
  const y = d.getFullYear();
  const m = d.getMonth();
  if (m >= 3) return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
  return `${y - 1}-${String(y % 100).padStart(2, "0")}`;
}
function ddmmyyyy(iso) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
}
const pad6 = (n) => String(n).padStart(6, "0");

const sign = (u) =>
  jwt.sign({ sub: u.id, role: u.role, username: u.username }, JWT_SECRET, {
    expiresIn: "7d",
  });

function authRequired(req, res, next) {
  const h = req.headers.authorization || "";
  const [type, token] = h.split(" ");
  if (type !== "Bearer" || !token) return res.status(401).send("Unauthorized");
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).send("Unauthorized");
  }
}

// ---- Health ----
app.get("/healthz", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// ---------- AUTH ----------
app.get("/auth/status", async (_req, res) => {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM users");
  res.json({ initialized: rows[0].c > 0 });
});

app.post("/auth/register", async (req, res) => {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM users");
  if (rows[0].c > 0) return res.status(403).send("Already initialized");
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).send("username & password required");
  const hash = await bcrypt.hash(password, 10);
  const { rows: ins } = await pool.query(
    "INSERT INTO users (username, password_hash, role) VALUES ($1,$2,$3) RETURNING id, username, role",
    [username, hash, "admin"]
  );
  const user = ins[0];
  res.json({ user, token: sign(user) });
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).send("username & password required");
  const { rows } = await pool.query(
    "SELECT id, username, password_hash, role FROM users WHERE username=$1",
    [username]
  );
  const user = rows[0];
  if (!user) return res.status(401).send("Invalid credentials");
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).send("Invalid credentials");
  res.json({
    user: { id: user.id, username: user.username, role: user.role },
    token: sign(user),
  });
});

app.get("/me", authRequired, async (req, res) => {
  res.json({
    user: {
      id: req.user.sub,
      username: req.user.username,
      role: req.user.role,
    },
  });
});

// ---------- SETTINGS ----------
app.get("/settings", async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM settings WHERE id=1");
  res.json(rows[0] || {});
});
app.put("/settings", authRequired, async (req, res) => {
  const s = req.body || {};
  const q = `
  INSERT INTO settings (id, restaurant_name, address, gstin, invoice_prefix, default_discount,
    printer_width, hide_zero_discount_on_print, round_printed_total_to_rupee, login_pin)
  VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9)
  ON CONFLICT (id) DO UPDATE SET
    restaurant_name=$1,address=$2,gstin=$3,invoice_prefix=$4,default_discount=$5,
    printer_width=$6,hide_zero_discount_on_print=$7,round_printed_total_to_rupee=$8,login_pin=$9
  RETURNING *`;
  const vals = [
    s.restaurant_name,
    s.address,
    s.gstin,
    s.invoice_prefix || "INV",
    s.default_discount || 0,
    s.printer_width || "80",
    !!s.hide_zero_discount_on_print,
    !!s.round_printed_total_to_rupee,
    s.login_pin || "0000",
  ];
  const { rows } = await pool.query(q, vals);
  res.json(rows[0]);
});

// ---------- MENU ----------
app.get("/menu", authRequired, async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT id, dish_name, unit_price FROM menu ORDER BY id"
  );
  res.json(
    rows.map((r) => ({
      id: r.id,
      dish_name: r.dish_name,
      unit_price: Number(r.unit_price),
    }))
  );
});

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { rows: [], errors: ["Empty CSV"] };
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
  const seen = new Set();
  const rows = [],
    errors = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (!cols[idx.id] || !cols[idx.dish_name] || !cols[idx.price]) {
      errors.push(`Invalid row ${i + 1}`);
      continue;
    }
    if (seen.has(cols[idx.id])) {
      errors.push(`Duplicate id ${cols[idx.id]}`);
      continue;
    }
    seen.add(cols[idx.id]);
    rows.push({
      id: cols[idx.id],
      dish_name: cols[idx.dish_name],
      unit_price: Number(cols[idx.price]),
    });
  }
  return { rows, errors };
}

app.post("/menu/import-csv", authRequired, async (req, res) => {
  const text = req.body || "";
  const { rows, errors } = parseCsv(text);
  if (errors.length) return res.status(400).send(errors.join("\n"));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const r of rows) {
      await client.query(
        `INSERT INTO menu (id, dish_name, unit_price)
         VALUES ($1,$2,$3)
         ON CONFLICT (id) DO UPDATE SET dish_name=EXCLUDED.dish_name, unit_price=EXCLUDED.unit_price`,
        [r.id, r.dish_name, r.unit_price]
      );
    }
    await client.query("COMMIT");
    res.json({ upserted: rows.length });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).send("Import failed");
  } finally {
    client.release();
  }
});

// ---------- INVOICES ----------
app.post("/invoices/finalize", authRequired, async (req, res) => {
  const { lines, discount } = req.body || {};
  if (!Array.isArray(lines) || lines.length === 0)
    return res.status(400).send("No lines");

  const ids = lines.map((l) => String(l.item_id));
  const { rows: menuRows } = await pool.query(
    `SELECT id, dish_name, unit_price FROM menu WHERE id = ANY($1::text[])`,
    [ids]
  );
  const menuMap = new Map(menuRows.map((m) => [m.id, m]));
  let sum = 0;
  const items = [];
  for (const l of lines) {
    const mi = menuMap.get(String(l.item_id));
    if (!mi) return res.status(400).send(`Unknown item ${l.item_id}`);
    const qty = Number(l.quantity);
    if (!Number.isFinite(qty) || qty <= 0)
      return res.status(400).send("Bad quantity");
    const line_total = +(Number(mi.unit_price) * qty).toFixed(2);
    sum += line_total;
    items.push({
      item_id: mi.id,
      dish_name: mi.dish_name,
      quantity: qty,
      unit_price: Number(mi.unit_price),
      line_total,
    });
  }
  const disc = discount && discount > 0 ? Number(discount) : 0;
  const grand = +(sum - disc).toFixed(2);
  const now = new Date();
  const fy = fyLabel(now);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: srows } = await client.query(
      "SELECT invoice_prefix FROM settings WHERE id=1"
    );
    const prefix = srows[0]?.invoice_prefix || "INV";

    const { rows: sr } = await client.query(
      `INSERT INTO serials (fy_label, last_serial)
       VALUES ($1, 1)
       ON CONFLICT (fy_label) DO UPDATE SET last_serial = serials.last_serial + 1
       RETURNING last_serial`,
      [fy]
    );
    const serial = sr[0].last_serial;
    const invoice_no = `${prefix}/${fy}/${pad6(serial)}`;

    const invIns = await client.query(
      `INSERT INTO invoices (invoice_no, fy_label, grand_total, discount)
       VALUES ($1,$2,$3,$4)
       RETURNING invoice_no, bill_date, fy_label, grand_total, discount`,
      [invoice_no, fy, grand, disc > 0 ? disc : null]
    );

    const values = [];
    const params = [];
    items.forEach((it, i) => {
      const base = i * 6;
      params.push(
        `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${
          base + 6
        })`
      );
      values.push(
        invoice_no,
        it.item_id,
        it.dish_name,
        it.quantity,
        it.unit_price,
        it.line_total
      );
    });
    await client.query(
      `INSERT INTO invoice_lines (invoice_no, item_id, dish_name, quantity, unit_price, line_total)
       VALUES ${params.join(",")}`,
      values
    );

    await client.query("COMMIT");
    const invRow = invIns.rows[0];
    res.json({
      invoice_no,
      bill_date_iso: new Date(invRow.bill_date).toISOString(),
      lines: items,
      grand_total: Number(invRow.grand_total),
      fy_label: invRow.fy_label,
      discount: invRow.discount ? Number(invRow.discount) : undefined,
    });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).send("Finalize failed");
  } finally {
    client.release();
  }
});

app.get("/invoices", authRequired, async (req, res) => {
  const { from, to } = req.query;
  const cond = [];
  const vals = [];
  if (from) {
    vals.push(from);
    cond.push(`bill_date::date >= $${vals.length}`);
  }
  if (to) {
    vals.push(to);
    cond.push(`bill_date::date <= $${vals.length}`);
  }
  const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
  const q = `
  SELECT i.invoice_no, i.bill_date, i.fy_label, i.grand_total, i.discount,
         json_agg(json_build_object(
           'item_id', l.item_id, 'dish_name', l.dish_name, 'quantity', l.quantity,
           'unit_price', l.unit_price, 'line_total', l.line_total
         ) ORDER BY l.id) AS lines
  FROM invoices i
  JOIN invoice_lines l ON l.invoice_no = i.invoice_no
  ${where}
  GROUP BY i.invoice_no
  ORDER BY i.bill_date DESC
  `;
  const { rows } = await pool.query(q, vals);
  res.json(
    rows.map((r) => ({
      invoice_no: r.invoice_no,
      bill_date_iso: new Date(r.bill_date).toISOString(),
      fy_label: r.fy_label,
      grand_total: Number(r.grand_total),
      discount: r.discount == null ? undefined : Number(r.discount),
      lines: r.lines.map((x) => ({
        item_id: x.item_id,
        dish_name: x.dish_name,
        quantity: Number(x.quantity),
        unit_price: Number(x.unit_price),
        line_total: Number(x.line_total),
      })),
    }))
  );
});

app.get("/exports/gst", authRequired, async (req, res) => {
  const { from, to } = req.query;
  const cond = [];
  const vals = [];
  if (from) {
    vals.push(from);
    cond.push(`i.bill_date::date >= $${vals.length}`);
  }
  if (to) {
    vals.push(to);
    cond.push(`i.bill_date::date <= $${vals.length}`);
  }
  const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
  const q = `
  SELECT i.invoice_no, i.bill_date, i.fy_label, i.grand_total, i.discount,
         l.item_id, l.dish_name, l.quantity, l.unit_price, l.line_total
  FROM invoices i
  JOIN invoice_lines l ON l.invoice_no = i.invoice_no
  ${where}
  ORDER BY i.bill_date, i.invoice_no, l.id
  `;
  const { rows } = await pool.query(q, vals);
  let csv =
    "invoice_no,bill_date(DD/MM/YYYY),item_id,dish_name,quantity,unit_price_inr,line_total_inr,grand_total_inr,fy_label,created_at_iso\n";
  for (const r of rows) {
    csv += `${r.invoice_no},${ddmmyyyy(r.bill_date)},${r.item_id},"${String(
      r.dish_name
    ).replace(/\"/g, '""')}",${r.quantity},${Number(r.unit_price).toFixed(
      2
    )},${Number(r.line_total).toFixed(2)},${Number(r.grand_total).toFixed(2)},${
      r.fy_label
    },${new Date(r.bill_date).toISOString()}\n`;
  }
  res.setHeader("Content-Type", "text/csv");
  res.send(csv);
});

// CREDIT NOTES (stub)
app.post("/credit-notes", authRequired, async (req, res) => {
  const { invoice_no, amount, reason } = req.body || {};
  const { rows } = await pool.query(
    `INSERT INTO credit_notes (invoice_no, amount, reason)
     VALUES ($1,$2,$3) RETURNING id, created_at`,
    [invoice_no, amount, reason || null]
  );
  res.json({ id: rows[0].id, created_at: rows[0].created_at });
});

// ---- Start server ----
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
  if (allow.length) console.log("CORS allowed:", allow.join(", "));
});
