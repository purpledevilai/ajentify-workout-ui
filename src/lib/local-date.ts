/** Returns the current local date as YYYY-MM-DD (not UTC). */
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Returns the current local month as YYYY-MM (not UTC). */
export function localMonthString(date: Date = new Date()): string {
  return localDateString(date).slice(0, 7);
}
