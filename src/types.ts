export type PrinterWidth = '80' | '58';

export interface MenuItem {
  id: string;
  dish_name: string;
  unit_price: number; // INR, GST-inclusive
}

export interface CartLine {
  item_id: string;
  quantity: number;
}

export interface InvoiceLine {
  item_id: string;
  dish_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface FinalizedInvoice {
  invoice_no: string;
  bill_date_iso: string;
  lines: InvoiceLine[];
  grand_total: number;
  fy_label: string;
  discount?: number;
}

export interface Settings {
  restaurant_name: string;
  address: string;
  gstin: string;
  invoice_prefix: string; // default "INV"
  default_discount: number; // 0 by default
  printer_width: PrinterWidth; // '80' | '58'
  hide_zero_discount_on_print: boolean; // default true
  round_printed_total_to_rupee: boolean; // default false
  login_pin: string; // "0000" by default
}
