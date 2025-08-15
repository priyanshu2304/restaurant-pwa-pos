import { useEffect, useState } from 'react';
import type { Settings } from '@/types';
import { apiGetSettings, apiPutSettings } from '@/lib/api';

const empty: Settings = {
  restaurant_name: '',
  address: '',
  gstin: '',
  invoice_prefix: 'INV',
  default_discount: 0,
  printer_width: '80',
  hide_zero_discount_on_print: true,
  round_printed_total_to_rupee: false,
  login_pin: '0000'
};

export default function SettingsPage() {
  const [s, setS] = useState<Settings>(empty);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiGetSettings().then(setS).catch(() => {});
  }, []);

  const save = async () => {
    setMsg('');
    try {
      const res = await apiPutSettings(s);
      setS(res);
      setMsg('Saved');
    } catch (e: any) {
      setMsg('Save failed: ' + (e?.message || 'Unknown'));
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Settings</h2>
      <label>Name<input value={s.restaurant_name} onChange={e => setS({ ...s, restaurant_name: e.target.value })} style={{ width: '100%', padding: 8 }} /></label>
      <label>Address<textarea value={s.address} onChange={e => setS({ ...s, address: e.target.value })} style={{ width: '100%', padding: 8 }} /></label>
      <label>GSTIN<input value={s.gstin} onChange={e => setS({ ...s, gstin: e.target.value })} style={{ width: '100%', padding: 8 }} /></label>
      <label>Invoice Prefix<input value={s.invoice_prefix} onChange={e => setS({ ...s, invoice_prefix: e.target.value })} style={{ width: '100%', padding: 8 }} /></label>
      <label>Default Discount (₹)
        <input type="number" step="0.01" value={s.default_discount} onChange={e => setS({ ...s, default_discount: parseFloat(e.target.value || '0') })} style={{ width: '100%', padding: 8 }} />
      </label>
      <label>Printer Width
        <select value={s.printer_width} onChange={e => setS({ ...s, printer_width: e.target.value as any })} style={{ width: '100%', padding: 8 }}>
          <option value="80">80mm</option>
          <option value="58">58mm</option>
        </select>
      </label>
      <label>
        <input type="checkbox" checked={s.hide_zero_discount_on_print} onChange={e => setS({ ...s, hide_zero_discount_on_print: e.target.checked })} /> Hide zero-discount line on print
      </label>
      <label>
        <input type="checkbox" checked={s.round_printed_total_to_rupee} onChange={e => setS({ ...s, round_printed_total_to_rupee: e.target.checked })} /> Round printed total to nearest ₹
      </label>
      <label>Login PIN (4-digit)
        <input value={s.login_pin} onChange={e => setS({ ...s, login_pin: e.target.value })} maxLength={4} style={{ width: '100%', padding: 8 }} />
      </label>

      <button onClick={save} style={{ marginTop: 12, padding: 12, width: '100%' }}>Save</button>
      {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
