import {
  formatDate,
  parseDate,
  addDays,
  subtractDays,
  daysBetween,
  firstOfMonth,
  lastOfMonth,
  daysInMonth,
  dayOfWeek,
  getDatesInMonth,
  getCalendarGrid,
  formatDisplayDate,
  formatMonthYear,
  getMonthYear,
  isInMonth,
  getPrevMonth,
  getNextMonth,
} from '../../src/lib/utils/dates';

describe('dates utility functions', () => {
  describe('formatDate', () => {
    it('formats date with zero-padded month and day', () => {
      expect(formatDate(new Date(2024, 0, 5))).toBe('2024-01-05');
      expect(formatDate(new Date(2024, 11, 25))).toBe('2024-12-25');
    });

    it('handles single digit months and days', () => {
      expect(formatDate(new Date(2024, 2, 3))).toBe('2024-03-03');
    });
  });

  describe('parseDate', () => {
    it('parses ISO date string to Date object', () => {
      const date = parseDate('2024-06-15');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(5); // June is 5 (0-indexed)
      expect(date.getDate()).toBe(15);
    });

    it('handles edge cases', () => {
      const date = parseDate('2024-01-01');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(1);
    });
  });

  describe('addDays', () => {
    it('adds days to a date', () => {
      expect(addDays('2024-01-01', 5)).toBe('2024-01-06');
    });

    it('handles month boundaries', () => {
      expect(addDays('2024-01-30', 5)).toBe('2024-02-04');
    });

    it('handles year boundaries', () => {
      expect(addDays('2024-12-30', 5)).toBe('2025-01-04');
    });

    it('handles negative days', () => {
      expect(addDays('2024-01-10', -5)).toBe('2024-01-05');
    });
  });

  describe('subtractDays', () => {
    it('subtracts days from a date', () => {
      expect(subtractDays('2024-01-10', 5)).toBe('2024-01-05');
    });

    it('handles month boundaries', () => {
      expect(subtractDays('2024-02-05', 10)).toBe('2024-01-26');
    });
  });

  describe('daysBetween', () => {
    it('calculates positive difference', () => {
      expect(daysBetween('2024-01-01', '2024-01-10')).toBe(9);
    });

    it('calculates negative difference', () => {
      expect(daysBetween('2024-01-10', '2024-01-01')).toBe(-9);
    });

    it('returns 0 for same date', () => {
      expect(daysBetween('2024-01-01', '2024-01-01')).toBe(0);
    });

    it('handles month boundaries', () => {
      expect(daysBetween('2024-01-28', '2024-02-03')).toBe(6);
    });
  });

  describe('firstOfMonth', () => {
    it('returns first day of month', () => {
      expect(firstOfMonth(2024, 0)).toBe('2024-01-01'); // January
      expect(firstOfMonth(2024, 11)).toBe('2024-12-01'); // December
    });
  });

  describe('lastOfMonth', () => {
    it('returns last day of month', () => {
      expect(lastOfMonth(2024, 0)).toBe('2024-01-31'); // January
      expect(lastOfMonth(2024, 1)).toBe('2024-02-29'); // February 2024 (leap year)
      expect(lastOfMonth(2023, 1)).toBe('2023-02-28'); // February 2023
      expect(lastOfMonth(2024, 3)).toBe('2024-04-30'); // April
    });
  });

  describe('daysInMonth', () => {
    it('returns correct number of days', () => {
      expect(daysInMonth(2024, 0)).toBe(31); // January
      expect(daysInMonth(2024, 1)).toBe(29); // February 2024 (leap year)
      expect(daysInMonth(2023, 1)).toBe(28); // February 2023
      expect(daysInMonth(2024, 3)).toBe(30); // April
    });
  });

  describe('dayOfWeek', () => {
    it('returns correct day of week', () => {
      // 2024-01-01 was a Monday
      expect(dayOfWeek('2024-01-01')).toBe(1);
      // 2024-01-07 was a Sunday
      expect(dayOfWeek('2024-01-07')).toBe(0);
    });
  });

  describe('getDatesInMonth', () => {
    it('returns all dates in a month', () => {
      const dates = getDatesInMonth(2024, 1); // February 2024
      expect(dates.length).toBe(29); // Leap year
      expect(dates[0]).toBe('2024-02-01');
      expect(dates[28]).toBe('2024-02-29');
    });
  });

  describe('getCalendarGrid', () => {
    it('returns 42 days (6 weeks)', () => {
      const grid = getCalendarGrid(2024, 0); // January 2024
      expect(grid.length).toBe(42);
    });

    it('starts from Sunday of the week containing first of month', () => {
      // January 2024 starts on Monday, so grid starts on Sunday Dec 31, 2023
      const grid = getCalendarGrid(2024, 0);
      expect(grid[0]).toBe('2023-12-31');
      expect(grid[1]).toBe('2024-01-01');
    });
  });

  describe('formatDisplayDate', () => {
    it('formats short date', () => {
      expect(formatDisplayDate('2024-01-15', 'short')).toBe('Jan 15');
    });

    it('formats long date', () => {
      expect(formatDisplayDate('2024-01-15', 'long')).toBe('January 15, 2024');
    });

    it('defaults to short format', () => {
      expect(formatDisplayDate('2024-06-20')).toBe('Jun 20');
    });
  });

  describe('formatMonthYear', () => {
    it('formats month and year', () => {
      expect(formatMonthYear(2024, 0)).toBe('January 2024');
      expect(formatMonthYear(2024, 11)).toBe('December 2024');
    });
  });

  describe('getMonthYear', () => {
    it('extracts month and year from date string', () => {
      const result = getMonthYear('2024-06-15');
      expect(result.year).toBe(2024);
      expect(result.month).toBe(5); // June is 5 (0-indexed)
    });
  });

  describe('isInMonth', () => {
    it('returns true if date is in the specified month', () => {
      expect(isInMonth('2024-06-15', 2024, 5)).toBe(true);
    });

    it('returns false if date is in different month', () => {
      expect(isInMonth('2024-06-15', 2024, 6)).toBe(false);
    });

    it('returns false if date is in different year', () => {
      expect(isInMonth('2024-06-15', 2023, 5)).toBe(false);
    });
  });

  describe('getPrevMonth', () => {
    it('returns previous month', () => {
      expect(getPrevMonth(2024, 6)).toEqual({ year: 2024, month: 5 });
    });

    it('handles year boundary', () => {
      expect(getPrevMonth(2024, 0)).toEqual({ year: 2023, month: 11 });
    });
  });

  describe('getNextMonth', () => {
    it('returns next month', () => {
      expect(getNextMonth(2024, 5)).toEqual({ year: 2024, month: 6 });
    });

    it('handles year boundary', () => {
      expect(getNextMonth(2024, 11)).toEqual({ year: 2025, month: 0 });
    });
  });
});
