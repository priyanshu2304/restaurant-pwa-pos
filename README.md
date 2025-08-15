# Abhinandan Restaurant Billing (PWA)

Mobile-first React (TypeScript) PWA for 80mm thermal printing and FY-wise invoices. Mock Node server included.

## Features

- Billing with menu lookup (CSV import)
- Finalize requires online; immutable invoices (credit note stub)
- FY-wise serial: `INV/YYYY-YY/000001`
- 80mm print CSS with 58mm fallback
- IndexedDB cache for menu + in-progress cart
- Exports CSV (item-level)

## Run

```bash
npm i
cp .env.example .env   # optional; defaults to http://localhost:4000
npm run dev
```

Open http://localhost:5173  
Login PIN default: `0000`

### Tests

- Unit: `npm test`
- E2E (requires `npm run dev` in another terminal): `npm run test:e2e`

### Android printing

Pair the Bluetooth thermal printer with your Android phone. In the app, finalize a bill, tap **Print**, and use Chrome’s print dialog. Choose paper size 80mm (or 58mm) per your printer in system settings. No jQuery used.

## Postgres Upgrade (Optional)

A starter schema and steps are included below (also see `server-postgres/` if you add it):

1. Create DB and user

```sql
CREATE DATABASE restaurant_pos;
CREATE USER pos_user WITH ENCRYPTED PASSWORD 'pos_pass';
GRANT ALL PRIVILEGES ON DATABASE restaurant_pos TO pos_user;
```

2. Tables

```sql
CREATE TABLE settings (
  id int PRIMARY KEY DEFAULT 1,
  restaurant_name text NOT NULL,
  address text NOT NULL,
  gstin text NOT NULL,
  invoice_prefix text NOT NULL DEFAULT 'INV',
  default_discount numeric(12,2) NOT NULL DEFAULT 0,
  printer_width text NOT NULL DEFAULT '80',
  hide_zero_discount_on_print boolean NOT NULL DEFAULT true,
  round_printed_total_to_rupee boolean NOT NULL DEFAULT false,
  login_pin text NOT NULL DEFAULT '0000'
);
INSERT INTO settings (id, restaurant_name, address, gstin) VALUES
(1,'Abhinandan Restaurant','NSB Road Raniganj-713347, Dist: Paschim Bardhaman, West Bengal','29ABCDE1234F1Z5')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE menu (
  id text PRIMARY KEY,
  dish_name text NOT NULL,
  unit_price numeric(12,2) NOT NULL
);

CREATE TABLE serials (
  fy_label text PRIMARY KEY,
  last_serial int NOT NULL DEFAULT 0
);

CREATE TABLE invoices (
  invoice_no text PRIMARY KEY,
  bill_date timestamptz NOT NULL DEFAULT now(),
  fy_label text NOT NULL,
  grand_total numeric(12,2) NOT NULL,
  discount numeric(12,2)
);

CREATE TABLE invoice_lines (
  id bigserial PRIMARY KEY,
  invoice_no text REFERENCES invoices(invoice_no) ON DELETE CASCADE,
  item_id text NOT NULL,
  dish_name text NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL,
  line_total numeric(12,2) NOT NULL
);

CREATE TABLE credit_notes (
  id bigserial PRIMARY KEY,
  invoice_no text NOT NULL,
  amount numeric(12,2) NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

3. Seed menu

```sql
INSERT INTO menu (id, dish_name, unit_price) VALUES
('101','Paneer Tikka',180), ('102','Masala Dosa',90), ('103','Chai',15)
ON CONFLICT (id) DO UPDATE SET dish_name=EXCLUDED.dish_name, unit_price=EXCLUDED.unit_price;
```

4. Node server (pg) outline

- Install: `npm i pg` (or create a separate service)
- Use a single transaction for finalize:
  - Lock/update serials row for the FY with `INSERT ... ON CONFLICT ... DO UPDATE RETURNING last_serial`
  - Insert into `invoices`, then `invoice_lines`
  - Commit and return payload

5. Env for pg server

```
PGHOST=localhost
PGPORT=5432
PGDATABASE=restaurant_pos
PGUSER=pos_user
PGPASSWORD=pos_pass
```

You can keep the current file-based server for local use and switch to Postgres later.
