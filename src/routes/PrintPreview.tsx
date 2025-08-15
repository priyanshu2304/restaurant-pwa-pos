import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { FinalizedInvoice, Settings } from "@/types";
import "@/styles/print.css";
import { formatINR } from "@/lib/format";
import { rupeeNearest } from "@/lib/rounding";
import { toDDMMYYYY } from "@/lib/date";

export default function PrintPreview() {
  const nav = useNavigate();
  const loc = useLocation();
  const { invoice, settings } = (loc.state || {}) as {
    invoice: FinalizedInvoice;
    settings: Settings;
  };
  if (!invoice || !settings)
    return <div style={{ padding: 16 }}>Missing invoice. Go back.</div>;

  const totalForPrint = settings.round_printed_total_to_rupee
    ? rupeeNearest(invoice.grand_total)
    : invoice.grand_total;

  // src/routes/PrintPreview.tsx (add)

  // ...
  // useEffect(() => {
  //   const t = setTimeout(() => window.print(), 300);
  //   const onAfter = () => nav("/billing", { replace: true });
  //   window.addEventListener("afterprint", onAfter);
  //   return () => {
  //     clearTimeout(t);
  //     window.removeEventListener("afterprint", onAfter);
  //   };
  // }, []);

  return (
    <div className="print">
      <div
        className={`receipt ${settings.printer_width === "58" ? "w58" : ""}`}
      >
        <div className="center large">{settings.restaurant_name}</div>
        <div className="center small">{settings.address}</div>
        <div className="center small">GSTIN: {settings.gstin}</div>
        <hr />
        <div className="row small">
          <span>Inv: {invoice.invoice_no}</span>
          <span>Date: {toDDMMYYYY(invoice.bill_date_iso)}</span>
        </div>
        <hr />
        <div className="row medium" style={{ fontWeight: 700 }}>
          <span style={{ flex: 1 }}>Item</span>
          <span>Qty</span>
          <span>Amt</span>
        </div>
        {invoice.lines.map((l) => (
          <div className="lineitem small" key={l.item_id + l.dish_name}>
            <span className="name">{l.dish_name}</span>
            <span className="qty">{l.quantity}</span>
            <span className="amt">{formatINR(l.line_total)}</span>
          </div>
        ))}
        <hr />
        {invoice.discount && invoice.discount > 0 ? (
          <>
            <div className="row small">
              <span>Discount</span>
              <span>-{formatINR(invoice.discount)}</span>
            </div>
            <hr />
          </>
        ) : settings.hide_zero_discount_on_print ? null : (
          <>
            <div className="row small">
              <span>Discount</span>
              <span>{formatINR(0)}</span>
            </div>
            <hr />
          </>
        )}
        <div className="row medium" style={{ fontWeight: 800 }}>
          <span>Grand Total</span>
          <span>
            {settings.round_printed_total_to_rupee
              ? `₹${totalForPrint}`
              : formatINR(totalForPrint)}
          </span>
        </div>
        <hr />
        <div className="center small">Thank you! Visit again.</div>
        <div className="center small">FY: {invoice.fy_label}</div>
        <div className="center small">Made with 🩶 in 🇮🇳</div>

        <div
          className="noprint"
          style={{ marginTop: 12, display: "flex", gap: 8, width: "100%" }}
        >
          <button
            onClick={() => window.print()}
            style={{ flex: 1, padding: 12, width: "50%" }}
          >
            Print
          </button>
          <button
            onClick={() => nav("/billing", { replace: true })}
            style={{ flex: 1, padding: 12, width: "50%" }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
