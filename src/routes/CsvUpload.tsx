import { useState } from 'react';
import { parseMenuCsv } from '@/lib/csv';
import { apiImportMenuCsv, apiGetMenu } from '@/lib/api';
import { cacheMenu } from '@/lib/idb';

export default function CsvUpload() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [log, setLog] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const handleUpload = async () => {
    if (!csvFile) return;
    setBusy(true);
    setLog('');
    const text = await csvFile.text();
    const { errors } = parseMenuCsv(text);
    if (errors.length) {
      setBusy(false);
      setLog('Validation errors:\n' + errors.join('\n'));
      return;
    }
    try {
      const res = await apiImportMenuCsv(text);
      const refreshed = await apiGetMenu();
      await cacheMenu(refreshed);
      setLog(`Imported OK. Upserted: ${res.upserted}. Local cache refreshed.`);
    } catch (e: any) {
      setLog('Upload failed: ' + (e?.message || 'Unknown'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Import Menu CSV</h2>
      <input type="file" accept=".csv,text/csv" onChange={e => setCsvFile(e.target.files?.[0] || null)} />
      <button onClick={handleUpload} disabled={!csvFile || busy} style={{ marginLeft: 8, padding: '8px 12px' }}>{busy ? 'Uploading…' : 'Upload'}</button>
      <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{log}</pre>
      <details style={{ marginTop: 12 }}>
        <summary>CSV format</summary>
        <code>id,dish_name,price</code>
      </details>
    </div>
  );
}
