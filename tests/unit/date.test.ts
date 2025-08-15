import { toDDMMYYYY } from '@/lib/date';

describe('toDDMMYYYY', () => {
  it('formats ISO date', () => {
    expect(toDDMMYYYY('2025-08-15T10:00:00.000Z')).toBe('15/08/2025');
  });
  it('formats Date object', () => {
    const d = new Date('2025-03-01T00:00:00Z');
    expect(toDDMMYYYY(d)).toBe('01/03/2025');
  });
});
