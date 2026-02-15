import {
  extractCycles,
  detectOvulation,
  predictNext,
  calculateStats,
  getCurrentPhase,
  Cycle,
} from '../../src/lib/predictions/engine';
import { Entry } from '../../src/lib/db/queries';

// Helper to create test entries
function createEntry(
  date: string,
  flow: number = 0,
  temp: number | null = null,
  mucus: number = 0
): Entry {
  return {
    id: `entry-${date}`,
    date,
    flow,
    temp,
    mucus,
    symptoms: [],
    note: '',
    createdAt: date,
    updatedAt: date,
  };
}

// Helper to create entries for a period (consecutive flow days)
function createPeriod(startDate: string, duration: number, flowLevel: number = 2): Entry[] {
  const entries: Entry[] = [];
  const [year, month, day] = startDate.split('-').map(Number);
  const start = new Date(year, month - 1, day);

  for (let i = 0; i < duration; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    entries.push(createEntry(dateStr, flowLevel));
  }

  return entries;
}

describe('predictions engine', () => {
  describe('extractCycles', () => {
    it('returns empty array for no entries', () => {
      const cycles = extractCycles([]);
      expect(cycles).toEqual([]);
    });

    it('returns empty array for entries with no flow', () => {
      const entries = [
        createEntry('2024-01-15', 0),
        createEntry('2024-01-16', 0),
      ];
      const cycles = extractCycles(entries);
      expect(cycles).toEqual([]);
    });

    it('extracts single ongoing cycle', () => {
      const entries = createPeriod('2024-01-01', 5);
      const cycles = extractCycles(entries);

      expect(cycles.length).toBe(1);
      expect(cycles[0].startDate).toBe('2024-01-01');
      expect(cycles[0].endDate).toBe('2024-01-05');
      expect(cycles[0].duration).toBe(5);
      expect(cycles[0].length).toBe(0); // Ongoing
    });

    it('extracts multiple cycles', () => {
      const entries = [
        ...createPeriod('2024-01-01', 5),
        ...createPeriod('2024-01-29', 5),
        ...createPeriod('2024-02-26', 5),
      ];
      const cycles = extractCycles(entries);

      expect(cycles.length).toBe(3);

      // First cycle
      expect(cycles[0].startDate).toBe('2024-01-01');
      expect(cycles[0].length).toBe(28); // Days to next cycle

      // Second cycle
      expect(cycles[1].startDate).toBe('2024-01-29');
      expect(cycles[1].length).toBe(28);

      // Third cycle (ongoing)
      expect(cycles[2].startDate).toBe('2024-02-26');
      expect(cycles[2].length).toBe(0);
    });

    it('handles gap of 1-2 days within same period', () => {
      const entries = [
        createEntry('2024-01-01', 2),
        createEntry('2024-01-02', 2),
        // Gap of 1 day
        createEntry('2024-01-04', 1), // Light flow after gap
        createEntry('2024-01-05', 1),
      ];
      const cycles = extractCycles(entries);

      expect(cycles.length).toBe(1);
      expect(cycles[0].startDate).toBe('2024-01-01');
      expect(cycles[0].endDate).toBe('2024-01-05');
    });

    it('starts new cycle with gap > 2 days', () => {
      const entries = [
        createEntry('2024-01-01', 2),
        createEntry('2024-01-02', 2),
        // Gap of 4 days - new cycle
        createEntry('2024-01-07', 2),
        createEntry('2024-01-08', 2),
      ];
      const cycles = extractCycles(entries);

      expect(cycles.length).toBe(2);
      expect(cycles[0].startDate).toBe('2024-01-01');
      expect(cycles[1].startDate).toBe('2024-01-07');
    });

    it('calculates correct cycle length', () => {
      const entries = [
        ...createPeriod('2024-01-01', 5),
        ...createPeriod('2024-01-31', 5), // 30 days later
      ];
      const cycles = extractCycles(entries);

      expect(cycles[0].length).toBe(30);
    });
  });

  describe('detectOvulation', () => {
    it('returns null with insufficient temperature data', () => {
      const entries = [
        createEntry('2024-01-01', 0, 36.5),
        createEntry('2024-01-02', 0, 36.4),
        createEntry('2024-01-03', 0, 36.5),
      ];
      const result = detectOvulation(entries);
      expect(result).toBeNull();
    });

    it('detects ovulation with 3-over-6 temperature shift', () => {
      // 6 low temps followed by 3 high temps (0.2+ higher)
      const entries = [
        createEntry('2024-01-01', 0, 36.3),
        createEntry('2024-01-02', 0, 36.4),
        createEntry('2024-01-03', 0, 36.3),
        createEntry('2024-01-04', 0, 36.5),
        createEntry('2024-01-05', 0, 36.4),
        createEntry('2024-01-06', 0, 36.3), // Day before shift
        // Temperature shift - 0.2+ higher
        createEntry('2024-01-07', 0, 36.7),
        createEntry('2024-01-08', 0, 36.8),
        createEntry('2024-01-09', 0, 36.7),
      ];

      const result = detectOvulation(entries);

      expect(result).not.toBeNull();
      expect(result?.date).toBe('2024-01-06'); // Day before shift
    });

    it('confirms ovulation with egg-white mucus', () => {
      const entries = [
        createEntry('2024-01-01', 0, 36.3, 0),
        createEntry('2024-01-02', 0, 36.4, 1),
        createEntry('2024-01-03', 0, 36.3, 2),
        createEntry('2024-01-04', 0, 36.5, 3),
        createEntry('2024-01-05', 0, 36.4, 4), // Egg-white mucus
        createEntry('2024-01-06', 0, 36.3, 4), // Egg-white mucus
        createEntry('2024-01-07', 0, 36.7, 2),
        createEntry('2024-01-08', 0, 36.8, 1),
        createEntry('2024-01-09', 0, 36.7, 0),
      ];

      const result = detectOvulation(entries);

      expect(result).not.toBeNull();
      expect(result?.confirmed).toBe(true);
    });

    it('returns unconfirmed without mucus data', () => {
      const entries = [
        createEntry('2024-01-01', 0, 36.3),
        createEntry('2024-01-02', 0, 36.4),
        createEntry('2024-01-03', 0, 36.3),
        createEntry('2024-01-04', 0, 36.5),
        createEntry('2024-01-05', 0, 36.4),
        createEntry('2024-01-06', 0, 36.3),
        createEntry('2024-01-07', 0, 36.7),
        createEntry('2024-01-08', 0, 36.8),
        createEntry('2024-01-09', 0, 36.7),
      ];

      const result = detectOvulation(entries);

      expect(result).not.toBeNull();
      expect(result?.confirmed).toBe(false);
    });

    it('returns null if shift threshold not met', () => {
      // Temps rise but not by 0.2 degrees
      const entries = [
        createEntry('2024-01-01', 0, 36.3),
        createEntry('2024-01-02', 0, 36.4),
        createEntry('2024-01-03', 0, 36.3),
        createEntry('2024-01-04', 0, 36.4),
        createEntry('2024-01-05', 0, 36.4),
        createEntry('2024-01-06', 0, 36.4),
        // Only 0.1 higher
        createEntry('2024-01-07', 0, 36.5),
        createEntry('2024-01-08', 0, 36.5),
        createEntry('2024-01-09', 0, 36.5),
      ];

      const result = detectOvulation(entries);
      expect(result).toBeNull();
    });
  });

  describe('predictNext', () => {
    it('returns null with fewer than 3 completed cycles', () => {
      const cycles: Cycle[] = [
        { startDate: '2024-01-01', endDate: '2024-01-05', length: 28, duration: 5 },
        { startDate: '2024-01-29', endDate: '2024-02-02', length: 0, duration: 5 }, // Ongoing
      ];
      const prediction = predictNext(cycles);
      expect(prediction).toBeNull();
    });

    it('predicts using average cycle length', () => {
      const cycles: Cycle[] = [
        { startDate: '2024-01-01', endDate: '2024-01-05', length: 28, duration: 5 },
        { startDate: '2024-01-29', endDate: '2024-02-02', length: 28, duration: 5 },
        { startDate: '2024-02-26', endDate: '2024-03-01', length: 30, duration: 5 },
        { startDate: '2024-03-27', endDate: '2024-03-31', length: 0, duration: 5 }, // Ongoing
      ];

      const prediction = predictNext(cycles);

      expect(prediction).not.toBeNull();
      expect(prediction?.start).toBeDefined();
      expect(prediction?.end).toBeDefined();
      expect(prediction?.confidence).toBe('low'); // < 6 cycles without ovulation data
    });

    it('uses luteal phase method when ovulation data available', () => {
      const cycles: Cycle[] = [
        {
          startDate: '2024-01-01',
          endDate: '2024-01-05',
          length: 28,
          duration: 5,
          ovulationDate: '2024-01-14',
          lutealLength: 14,
        },
        {
          startDate: '2024-01-29',
          endDate: '2024-02-02',
          length: 28,
          duration: 5,
          ovulationDate: '2024-02-12',
          lutealLength: 14,
        },
        {
          startDate: '2024-02-26',
          endDate: '2024-03-01',
          length: 28,
          duration: 5,
          ovulationDate: '2024-03-11',
          lutealLength: 14,
        },
        { startDate: '2024-03-25', endDate: '2024-03-29', length: 0, duration: 5 },
      ];

      const prediction = predictNext(cycles);

      expect(prediction).not.toBeNull();
      expect(prediction?.confidence).toBe('medium'); // 2-3 cycles with ovulation
      expect(prediction?.ovulationDate).toBeDefined();
    });

    it('returns high confidence with 4+ cycles with ovulation data', () => {
      const cycles: Cycle[] = [
        { startDate: '2024-01-01', endDate: '2024-01-05', length: 28, duration: 5, ovulationDate: '2024-01-14', lutealLength: 14 },
        { startDate: '2024-01-29', endDate: '2024-02-02', length: 28, duration: 5, ovulationDate: '2024-02-12', lutealLength: 14 },
        { startDate: '2024-02-26', endDate: '2024-03-01', length: 28, duration: 5, ovulationDate: '2024-03-11', lutealLength: 14 },
        { startDate: '2024-03-25', endDate: '2024-03-29', length: 28, duration: 5, ovulationDate: '2024-04-08', lutealLength: 14 },
        { startDate: '2024-04-22', endDate: '2024-04-26', length: 0, duration: 5 },
      ];

      const prediction = predictNext(cycles);

      expect(prediction?.confidence).toBe('high');
    });
  });

  describe('calculateStats', () => {
    it('returns null with no completed cycles', () => {
      const cycles: Cycle[] = [
        { startDate: '2024-01-01', endDate: '2024-01-05', length: 0, duration: 5 },
      ];
      const stats = calculateStats(cycles);
      expect(stats).toBeNull();
    });

    it('calculates correct statistics', () => {
      const cycles: Cycle[] = [
        { startDate: '2024-01-01', endDate: '2024-01-05', length: 28, duration: 5 },
        { startDate: '2024-01-29', endDate: '2024-02-03', length: 30, duration: 6 },
        { startDate: '2024-02-28', endDate: '2024-03-03', length: 26, duration: 4 },
        { startDate: '2024-03-25', endDate: '2024-03-29', length: 0, duration: 5 }, // Ongoing, excluded
      ];

      const stats = calculateStats(cycles);

      expect(stats).not.toBeNull();
      expect(stats?.cycleCount).toBe(3);
      expect(stats?.averageCycleLength).toBe(28); // (28+30+26)/3 = 28
      expect(stats?.averagePeriodDuration).toBe(5); // (5+6+4)/3 = 5
      expect(stats?.shortestCycle).toBe(26);
      expect(stats?.longestCycle).toBe(30);
    });

    it('includes luteal length when available', () => {
      const cycles: Cycle[] = [
        { startDate: '2024-01-01', endDate: '2024-01-05', length: 28, duration: 5, lutealLength: 14 },
        { startDate: '2024-01-29', endDate: '2024-02-02', length: 28, duration: 5, lutealLength: 13 },
        { startDate: '2024-02-26', endDate: '2024-03-01', length: 28, duration: 5, lutealLength: 15 },
      ];

      const stats = calculateStats(cycles);

      expect(stats?.averageLutealLength).toBe(14); // (14+13+15)/3 = 14
    });
  });

  describe('incremental data (day-by-day logging)', () => {
    it('produces same cycles whether entries come all at once or incrementally', () => {
      // Simulate 3 periods added one entry at a time
      const allEntries = [
        ...createPeriod('2024-01-01', 5),
        ...createPeriod('2024-01-29', 5),
        ...createPeriod('2024-02-26', 5),
      ];

      // Build up entries incrementally and check each step
      const incremental: Entry[] = [];
      let lastCycles: ReturnType<typeof extractCycles> = [];

      for (const entry of allEntries) {
        incremental.push(entry);
        lastCycles = extractCycles([...incremental]);
      }

      // Final incremental result should match batch result
      const batchCycles = extractCycles(allEntries);
      expect(lastCycles).toEqual(batchCycles);
    });

    it('handles single ongoing cycle growing day by day', () => {
      // Day 1: first flow entry
      let entries = [createEntry('2024-01-01', 2)];
      let cycles = extractCycles(entries);
      expect(cycles.length).toBe(1);
      expect(cycles[0].length).toBe(0); // Ongoing
      expect(cycles[0].duration).toBe(1);

      // Day 2: another flow entry
      entries.push(createEntry('2024-01-02', 3));
      cycles = extractCycles(entries);
      expect(cycles.length).toBe(1);
      expect(cycles[0].duration).toBe(2);

      // Day 4: flow entry after 1-day gap (gap=2, still same period)
      entries.push(createEntry('2024-01-04', 1));
      cycles = extractCycles(entries);
      expect(cycles.length).toBe(1);
      expect(cycles[0].duration).toBe(4); // Jan 1 to Jan 4

      // Day 8: flow entry after 3-day gap (gap=4 > 2, new cycle)
      entries.push(createEntry('2024-01-08', 2));
      cycles = extractCycles(entries);
      expect(cycles.length).toBe(2);
      expect(cycles[0].startDate).toBe('2024-01-01');
      expect(cycles[0].length).toBe(7); // Jan 1 to Jan 8
      expect(cycles[1].startDate).toBe('2024-01-08');
      expect(cycles[1].length).toBe(0); // Ongoing
    });

    it('stats and predictions grow as more cycles complete', () => {
      const entries: Entry[] = [];

      // Period 1 (ongoing)
      entries.push(...createPeriod('2024-01-01', 5));
      let cycles = extractCycles(entries);
      expect(calculateStats(cycles)).toBeNull(); // No completed cycles
      expect(predictNext(cycles)).toBeNull();

      // Period 2 starts — completes cycle 1
      entries.push(...createPeriod('2024-01-29', 5));
      cycles = extractCycles(entries);
      let stats = calculateStats(cycles);
      expect(stats?.cycleCount).toBe(1);
      expect(predictNext(cycles)).toBeNull(); // Need 3 completed

      // Period 3 starts — completes cycle 2
      entries.push(...createPeriod('2024-02-26', 5));
      cycles = extractCycles(entries);
      stats = calculateStats(cycles);
      expect(stats?.cycleCount).toBe(2);
      expect(predictNext(cycles)).toBeNull(); // Still need 3 completed

      // Period 4 starts — completes cycle 3, predictions unlock
      entries.push(...createPeriod('2024-03-26', 5));
      cycles = extractCycles(entries);
      stats = calculateStats(cycles);
      expect(stats?.cycleCount).toBe(3);
      expect(predictNext(cycles)).not.toBeNull(); // Predictions now available!
      expect(predictNext(cycles)?.start).toBeDefined();
    });

    it('temp chart data grows as entries accumulate', () => {
      const entries: Entry[] = [];

      // 1 temp entry — not enough for chart
      entries.push(createEntry('2024-01-01', 0, 36.5));
      let tempEntries = entries.filter(e => e.temp !== null && e.temp > 0);
      expect(tempEntries.length).toBe(1); // TempChart needs >= 2

      // 2 temp entries — chart can render
      entries.push(createEntry('2024-01-02', 0, 36.4));
      tempEntries = entries.filter(e => e.temp !== null && e.temp > 0);
      expect(tempEntries.length).toBe(2);
    });

    it('ovulation detection works as temp entries accumulate', () => {
      const entries: Entry[] = [];

      // Add 6 low temps
      for (let i = 1; i <= 6; i++) {
        entries.push(createEntry(`2024-01-${String(i).padStart(2, '0')}`, 0, 36.3 + (i % 2) * 0.1));
      }
      expect(detectOvulation(entries)).toBeNull(); // Need 9 entries

      // Add 3 high temps (shift of 0.2+)
      entries.push(createEntry('2024-01-07', 0, 36.7));
      entries.push(createEntry('2024-01-08', 0, 36.8));
      entries.push(createEntry('2024-01-09', 0, 36.7));

      const result = detectOvulation(entries);
      expect(result).not.toBeNull();
    });
  });

  describe('getCurrentPhase', () => {
    const baseCycles: Cycle[] = [
      { startDate: '2024-01-01', endDate: '2024-01-05', length: 28, duration: 5 },
    ];

    it('returns menstrual during period', () => {
      expect(getCurrentPhase(baseCycles, 1)).toBe('menstrual');
      expect(getCurrentPhase(baseCycles, 5)).toBe('menstrual');
    });

    it('returns follicular after period before ovulation', () => {
      expect(getCurrentPhase(baseCycles, 6)).toBe('follicular');
      expect(getCurrentPhase(baseCycles, 10)).toBe('follicular');
    });

    it('returns ovulation around day 14 without data', () => {
      expect(getCurrentPhase(baseCycles, 13)).toBe('ovulation');
      expect(getCurrentPhase(baseCycles, 14)).toBe('ovulation');
      expect(getCurrentPhase(baseCycles, 15)).toBe('ovulation');
    });

    it('returns luteal after ovulation', () => {
      expect(getCurrentPhase(baseCycles, 16)).toBe('luteal');
      expect(getCurrentPhase(baseCycles, 25)).toBe('luteal');
    });

    it('uses ovulation data when available', () => {
      const cyclesWithOvulation: Cycle[] = [
        {
          startDate: '2024-01-01',
          endDate: '2024-01-05',
          length: 0,
          duration: 5,
          ovulationDate: '2024-01-16', // Day 16
        },
      ];

      // Day 15 should be ovulation window (day 16 ± 1)
      expect(getCurrentPhase(cyclesWithOvulation, 15)).toBe('ovulation');
      expect(getCurrentPhase(cyclesWithOvulation, 16)).toBe('ovulation');
      expect(getCurrentPhase(cyclesWithOvulation, 17)).toBe('ovulation');

      // Day 18 should be luteal
      expect(getCurrentPhase(cyclesWithOvulation, 18)).toBe('luteal');
    });
  });

});
