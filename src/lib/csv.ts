import Papa from 'papaparse';
import { z } from 'zod';

const Row = z.object({
  id: z.string().min(1),
  dish_name: z.string().min(1),
  price: z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().regex(/^\d+(\.\d+)?$/))
});

export type CsvRow = z.infer<typeof Row>;

export function parseMenuCsv(text: string): { rows: CsvRow[]; errors: string[] } {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const errors: string[] = [];
  if (!parsed.meta.fields?.includes('id') || !parsed.meta.fields?.includes('dish_name') || !parsed.meta.fields?.includes('price')) {
    errors.push('Missing required headers: id,dish_name,price');
  }
  const rows: CsvRow[] = [];
  const seen = new Set<string>();
  for (const r of parsed.data) {
    const res = Row.safeParse(r);
    if (!res.success) {
      errors.push(`Invalid row: ${JSON.stringify(r)}`);
      continue;
    }
    if (seen.has(res.data.id)) {
      errors.push(`Duplicate id: ${res.data.id}`);
      continue;
    }
    seen.add(res.data.id);
    rows.push(res.data);
  }
  return { rows, errors };
}
