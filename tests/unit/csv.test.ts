import { parseMenuCsv } from '@/lib/csv';

const good = `id,dish_name,price
101,Paneer Tikka,180
102,Masala Dosa,90
103,Chai,15
`;

describe('parseMenuCsv', () => {
  it('parses valid CSV', () => {
    const { rows, errors } = parseMenuCsv(good);
    expect(errors).toEqual([]);
    expect(rows.length).toBe(3);
    expect(rows[0].id).toBe('101');
  });
  it('detects duplicate ids', () => {
    const dup = `id,dish_name,price
1,A,10
1,B,12
`;
    const { errors } = parseMenuCsv(dup);
    expect(errors.some(e => e.includes('Duplicate id'))).toBe(true);
  });
  it('requires headers', () => {
    const bad = `a,b,c
1,2,3
`;
    const { errors } = parseMenuCsv(bad);
    expect(errors[0]).toContain('Missing required headers');
  });
});
