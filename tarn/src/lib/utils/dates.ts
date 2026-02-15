// All dates stored as ISO strings (YYYY-MM-DD)

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function today(): string {
  return formatDate(new Date());
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

export function subtractDays(dateStr: string, days: number): string {
  return addDays(dateStr, -days);
}

export function daysBetween(startDate: string, endDate: string): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function isToday(dateStr: string): boolean {
  return dateStr === today();
}

export function isFuture(dateStr: string): boolean {
  return dateStr > today();
}

export function firstOfMonth(year: number, month: number): string {
  return formatDate(new Date(year, month, 1));
}

export function lastOfMonth(year: number, month: number): string {
  return formatDate(new Date(year, month + 1, 0));
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function dayOfWeek(dateStr: string): number {
  return parseDate(dateStr).getDay();
}

export function getDatesInMonth(year: number, month: number): string[] {
  const days = daysInMonth(year, month);
  const dates: string[] = [];
  for (let day = 1; day <= days; day++) {
    dates.push(formatDate(new Date(year, month, day)));
  }
  return dates;
}

// Returns 6 weeks (42 days) with padding from adjacent months
export function getCalendarGrid(year: number, month: number): string[] {
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay(); // 0-6

  // Start from the Sunday before (or on) the first of the month
  const gridStart = new Date(year, month, 1 - startDayOfWeek);

  const grid: string[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    grid.push(formatDate(date));
  }

  return grid;
}

export function formatDisplayDate(dateStr: string, format: 'short' | 'long' = 'short'): string {
  const date = parseDate(dateStr);

  if (format === 'short') {
    return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
  }
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatMonthYear(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

export function getMonthYear(dateStr: string): { year: number; month: number } {
  const date = parseDate(dateStr);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function isInMonth(dateStr: string, year: number, month: number): boolean {
  const date = parseDate(dateStr);
  return date.getFullYear() === year && date.getMonth() === month;
}

export function getPrevMonth(year: number, month: number): { year: number; month: number } {
  if (month === 0) {
    return { year: year - 1, month: 11 };
  }
  return { year, month: month - 1 };
}

export function getNextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 11) {
    return { year: year + 1, month: 0 };
  }
  return { year, month: month + 1 };
}
