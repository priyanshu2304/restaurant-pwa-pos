import { fyLabelFromDate } from '@/lib/fy';

describe('fyLabelFromDate', () => {
  it('Apr 1, 2025 -> 2025-26', () => {
    expect(fyLabelFromDate(new Date('2025-04-01T00:00:00Z'))).toBe('2025-26');
  });
  it('Mar 31, 2025 -> 2024-25', () => {
    expect(fyLabelFromDate(new Date('2025-03-31T12:00:00Z'))).toBe('2024-25');
  });
});
