export function parseNumericDN(dn: any): number {
  if (dn === undefined || dn === null || dn === '') return NaN;
  return Number(dn);
}

export function parseYearDN(value: any): number | null {
  if (value === null || value === undefined || value === '' || value === '미상') return null;
  const text = String(value).trim();
  
  // Try YYYY at the beginning
  const match = text.match(/^(\d{4})/);
  if (match) {
    const year = Number(match[1]);
    if (year >= 1800 && year <= 2100) return year;
  }
  
  // Try Date parsing (e.g. MM/DD/YYYY)
  const d = new Date(text);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    if (year >= 1800 && year <= 2100) return year;
  }
  
  return null;
}

export function normalizeEnvironmentalGrade(dn: any): number | null {
  if (dn === undefined || dn === null || dn === '') return null;
  const str = String(dn);
  const match = str.match(/^([1-5])/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}
