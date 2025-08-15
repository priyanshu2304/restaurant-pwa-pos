export const fyLabelFromDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = d.getMonth();
  if (month >= 3) {
    const yy = String((year + 1) % 100).padStart(2, '0');
    return `${year}-${yy}`;
  } else {
    const yy = String(year % 100).padStart(2, '0');
    return `${year - 1}-${yy}`;
  }
};
