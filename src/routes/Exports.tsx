// src/routes/Exports.tsx
import { useMemo, useState } from "react";
import { apiExportCsv } from "@/lib/api";

// --- local date helpers (YYYY-MM-DD; no UTC) ---
const toYMDLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// India FY helpers
const fyOf = (d: Date) =>
  d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
const fyBounds = (anchorDate: Date) => {
  const y = fyOf(anchorDate);
  return { start: new Date(y, 3, 1), end: new Date(y + 1, 2, 31) }; // Apr 1 .. Mar 31
};
const quarterBoundsFY = (anchorDate: Date, q: 1 | 2 | 3 | 4) => {
  const y = fyOf(anchorDate);
  const map = {
    1: { ys: y, ms: 3, ye: y, me: 5, de: 30 }, // Apr-Jun
    2: { ys: y, ms: 6, ye: y, me: 8, de: 30 }, // Jul-Sep
    3: { ys: y, ms: 9, ye: y, me: 11, de: 31 }, // Oct-Dec
    4: { ys: y + 1, ms: 0, ye: y + 1, me: 2, de: 31 }, // Jan-Mar (next calendar year)
  } as const;
  const cfg = map[q];
  return {
    start: new Date(cfg.ys, cfg.ms, 1),
    end: new Date(cfg.ye, cfg.me, cfg.de),
  };
};

export default function Exports() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // today at local midnight (no time portion)
  const today = useMemo(
    () =>
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate()
      ),
    []
  );
  const todayYMD = toYMDLocal(today);

  const clampToToday = (d: Date) => (d > today ? today : d);
  const setRange = (start: Date, end: Date) => {
    const e = clampToToday(end);
    setFrom(toYMDLocal(start));
    setTo(toYMDLocal(e));
  };

  const invalidRange = !!from && !!to && from > to;

  const download = async () => {
    setBusy(true);
    setMsg("");
    try {
      const csv = await apiExportCsv(from, to);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_${from}_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Downloaded");
    } catch (e: any) {
      setMsg("Export failed: " + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  };

  const presets = [
    { label: "Today", run: () => setRange(today, today) },
    { label: "Last 7 Days", run: () => setRange(addDays(today, -6), today) },
    {
      label: "This FY",
      run: () => {
        const { start, end } = fyBounds(today);
        setRange(start, end);
      },
    },
    {
      label: "Last FY",
      run: () => {
        const lastFYAnchor = new Date(fyOf(today) - 1, 6, 1);
        const { start, end } = fyBounds(lastFYAnchor);
        setRange(start, end);
      },
    },
  ];

  const quarters = [
    {
      key: "Q1 (Apr–Jun)",
      run: () => {
        const { start, end } = quarterBoundsFY(today, 1);
        setRange(start, end);
      },
    },
    {
      key: "Q2 (Jul–Sep)",
      run: () => {
        const { start, end } = quarterBoundsFY(today, 2);
        setRange(start, end);
      },
    },
    {
      key: "Q3 (Oct–Dec)",
      run: () => {
        const { start, end } = quarterBoundsFY(today, 3);
        setRange(start, end);
      },
    },
    {
      key: "Q4 (Jan–Mar)",
      run: () => {
        const { start, end } = quarterBoundsFY(today, 4);
        setRange(start, end);
      },
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <h2>Exports</h2>

      <div style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>From</span>
          <input
            type="date"
            value={from}
            max={todayYMD}
            onChange={(e) => setFrom(e.target.value)}
            style={{ width: "100%", padding: 8, fontSize: 16 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>To</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            max={todayYMD}
            onChange={(e) => setTo(e.target.value)}
            style={{ width: "100%", padding: 8, fontSize: 16 }}
          />
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Quick presets</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 8,
          }}
        >
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={p.run}
              style={{ padding: 10, fontSize: 14 }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>
          Quarters (FY Apr–Mar)
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 8,
          }}
        >
          {quarters.map((q) => (
            <button
              key={q.key}
              onClick={q.run}
              style={{ padding: 10, fontSize: 14 }}
            >
              {q.key}
            </button>
          ))}
        </div>
      </div>

      {invalidRange && (
        <div style={{ color: "crimson", marginTop: 8 }}>
          “From” date must be earlier than or equal to “To” date.
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => {
            setFrom("");
            setTo("");
            setMsg("");
          }}
          style={{ marginTop: 12, padding: 12, flex: 1 }}
        >
          Clear
        </button>
        <button
          onClick={download}
          disabled={!from || !to || busy || invalidRange}
          style={{ marginTop: 12, padding: 12, flex: 2, fontSize: 16 }}
        >
          {busy ? "Preparing…" : "Download CSV"}
        </button>
      </div>

      {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
