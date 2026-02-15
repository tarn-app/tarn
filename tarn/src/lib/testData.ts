import { upsertEntry } from './db/queries';
import { formatDate } from './utils/dates';

function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Realistic notes for different phases
const MENSTRUAL_NOTES = [
  'Taking it easy today',
  'Hot water bottle helping with cramps',
  'Working from home',
  'Cozy day, lots of tea',
  'Early night tonight',
];

const OVULATION_NOTES = [
  'Feeling great today!',
  'High energy, got a lot done',
  'Great workout this morning',
  'Productive day',
  'Feeling social',
];

const LUTEAL_NOTES = [
  'A bit tired today',
  'Craving chocolate',
  'Need more sleep',
  'Taking it slow',
  '',
];

const PMS_NOTES = [
  'Period coming soon',
  'Feeling sensitive',
  'Extra self-care today',
  'Gentle yoga helped',
  'Early to bed',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type ScreenshotScenario =
  | 'calendar-menstrual'    // Calendar showing period days + predictions
  | 'calendar-ovulation'    // Calendar showing fertile window
  | 'calendar-luteal'       // Calendar showing post-ovulation
  | 'log-detailed'          // Log screen with full entry
  | 'stats-complete'        // Stats with all features populated
  | 'stats-patterns';       // Stats emphasizing symptom patterns

export async function generateScreenshotData(scenario: ScreenshotScenario): Promise<void> {
  switch (scenario) {
    case 'calendar-menstrual':
      await generateCalendarMenstrualData();
      break;
    case 'calendar-ovulation':
      await generateCalendarOvulationData();
      break;
    case 'calendar-luteal':
      await generateCalendarLutealData();
      break;
    case 'log-detailed':
      await generateLogDetailedData();
      break;
    case 'stats-complete':
      await generateStatsCompleteData();
      break;
    case 'stats-patterns':
      await generateStatsPatternsData();
      break;
  }
}

async function generateCalendarMenstrualData(): Promise<void> {
  const targetCycleDay = 2; // Day 2 of period

  // Generate 5 complete cycles to ensure good predictions
  await generateCyclesEndingOnDay(5, targetCycleDay, {
    includeTemps: true,
    includeNotes: true,
    consistentLength: true, // Tight 27-29 day range for confident predictions
  });
}

async function generateCalendarOvulationData(): Promise<void> {
  const targetCycleDay = 14; // Ovulation day

  await generateCyclesEndingOnDay(5, targetCycleDay, {
    includeTemps: true,
    includeNotes: true,
    consistentLength: true,
  });
}

async function generateCalendarLutealData(): Promise<void> {
  const targetCycleDay = 21; // Mid-luteal

  await generateCyclesEndingOnDay(5, targetCycleDay, {
    includeTemps: true,
    includeNotes: true,
    consistentLength: true,
  });
}

async function generateLogDetailedData(): Promise<void> {
  const today = new Date();

  // Generate some background cycles
  await generateCyclesEndingOnDay(4, 8, {
    includeTemps: true,
    includeNotes: false,
    consistentLength: true,
  });

  // Create a detailed entry for today
  await upsertEntry({
    date: formatDate(today),
    flow: 0, // Not on period for cleaner screenshot
    temp: 36.7,
    mucus: 3, // Creamy
    symptoms: ['fatigue', 'bloating', 'mood_high'],
    note: 'Feeling good today! Went for a morning walk.',
  });
}

async function generateStatsCompleteData(): Promise<void> {
  await generateCyclesEndingOnDay(6, 18, {
    includeTemps: true,
    includeNotes: true,
    consistentLength: true,
    richSymptoms: true,
  });
}

async function generateStatsPatternsData(): Promise<void> {
  await generateCyclesEndingOnDay(6, 20, {
    includeTemps: true,
    includeNotes: false,
    consistentLength: true,
    richSymptoms: true,
    consistentSymptoms: true, // Same symptoms at same times each cycle
  });
}

interface GenerateOptions {
  includeTemps: boolean;
  includeNotes: boolean;
  consistentLength: boolean;
  richSymptoms?: boolean;
  consistentSymptoms?: boolean;
}

async function generateCyclesEndingOnDay(
  numCycles: number,
  targetCycleDay: number,
  options: GenerateOptions
): Promise<void> {
  const today = new Date();
  const avgCycleLength = 28;

  // Calculate start date so today is the target day of the last cycle
  const daysBack = (numCycles - 1) * avgCycleLength + (targetCycleDay - 1);
  const startDate = addDaysToDate(today, -daysBack);

  for (let cycle = 0; cycle < numCycles; cycle++) {
    // Vary cycle length slightly
    const cycleLength = options.consistentLength
      ? avgCycleLength + (cycle % 3) - 1 // 27, 28, 29 pattern
      : avgCycleLength + Math.floor(Math.random() * 5) - 2; // 26-30

    const cycleStart = addDaysToDate(startDate, cycle * avgCycleLength);
    const isCurrentCycle = cycle === numCycles - 1;
    const daysToGenerate = isCurrentCycle ? targetCycleDay : cycleLength;

    await generateSingleCycle(cycleStart, daysToGenerate, cycleLength, {
      ...options,
      cycleIndex: cycle,
    });
  }
}

interface CycleOptions extends GenerateOptions {
  cycleIndex: number;
}

async function generateSingleCycle(
  cycleStart: Date,
  daysToGenerate: number,
  fullCycleLength: number,
  options: CycleOptions
): Promise<void> {
  const periodLength = 5;
  const ovulationDay = 14;
  const today = new Date();

  for (let day = 0; day < daysToGenerate; day++) {
    const currentDate = addDaysToDate(cycleStart, day);
    if (currentDate > today) break;

    const dateStr = formatDate(currentDate);
    const cycleDay = day + 1;

    let flow = 0;
    let temp: number | null = null;
    let mucus = 0;
    let symptoms: string[] = [];
    let note = '';

    // === MENSTRUAL PHASE (days 1-5) ===
    if (cycleDay <= periodLength) {
      // Flow pattern: light -> heavy -> medium -> light
      if (cycleDay === 1) flow = 2;
      else if (cycleDay === 2) flow = 3;
      else if (cycleDay === 3) flow = 3;
      else if (cycleDay === 4) flow = 2;
      else flow = 1;

      // Lower temps during period
      if (options.includeTemps) {
        temp = 36.2 + (Math.random() * 0.15);
      }

      mucus = 1; // Dry

      // Menstrual symptoms
      if (options.richSymptoms || options.consistentSymptoms) {
        if (cycleDay <= 3) symptoms.push('cramps');
        if (cycleDay === 1 || cycleDay === 2) symptoms.push('fatigue');
        if (cycleDay === 2) symptoms.push('backache');
      }

      if (options.includeNotes && Math.random() > 0.6) {
        note = pickRandom(MENSTRUAL_NOTES);
      }
    }
    // === FOLLICULAR PHASE (days 6-13) ===
    else if (cycleDay < ovulationDay) {
      if (options.includeTemps) {
        temp = 36.25 + (Math.random() * 0.15);
      }

      // Mucus progresses toward fertile
      if (cycleDay < 10) mucus = 2; // Sticky
      else mucus = 3; // Creamy

      // Generally feeling good
      if (options.richSymptoms && cycleDay >= 10) {
        symptoms.push('mood_high');
      }
    }
    // === OVULATION PHASE (days 14-16) ===
    else if (cycleDay <= ovulationDay + 2) {
      if (options.includeTemps) {
        // Temperature dip then rise
        if (cycleDay === ovulationDay) {
          temp = 36.1 + (Math.random() * 0.1); // Dip
        } else {
          temp = 36.5 + (Math.random() * 0.15); // Rising
        }
      }

      mucus = 4; // Egg white - peak fertility

      if (options.richSymptoms) {
        symptoms.push('mood_high');
      }

      if (options.includeNotes && cycleDay === ovulationDay) {
        note = pickRandom(OVULATION_NOTES);
      }
    }
    // === LUTEAL PHASE (days 17+) ===
    else {
      if (options.includeTemps) {
        // Higher temps after ovulation
        temp = 36.6 + (Math.random() * 0.2);
      }

      // Mucus dries up
      if (cycleDay < ovulationDay + 5) mucus = 3;
      else if (cycleDay < ovulationDay + 8) mucus = 2;
      else mucus = 1;

      // PMS symptoms in late luteal (last 5 days)
      const daysUntilPeriod = fullCycleLength - cycleDay;
      if (daysUntilPeriod <= 5) {
        if (options.richSymptoms || options.consistentSymptoms) {
          if (daysUntilPeriod <= 4) symptoms.push('bloating');
          if (daysUntilPeriod <= 3) symptoms.push('mood_low');
          if (daysUntilPeriod <= 2) symptoms.push('fatigue');
          if (daysUntilPeriod <= 2) symptoms.push('breast_tenderness');
        }

        if (options.includeNotes && Math.random() > 0.7) {
          note = pickRandom(PMS_NOTES);
        }
      } else {
        if (options.includeNotes && Math.random() > 0.8) {
          note = pickRandom(LUTEAL_NOTES);
        }
      }
    }

    // Round temperature
    if (temp !== null) {
      temp = Math.round(temp * 100) / 100;
    }

    await upsertEntry({
      date: dateStr,
      flow,
      temp,
      mucus,
      symptoms,
      note,
    });
  }
}

export async function generatePhaseData(phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal'): Promise<void> {
  let targetCycleDay: number;
  switch (phase) {
    case 'menstrual':
      targetCycleDay = 3;
      break;
    case 'follicular':
      targetCycleDay = 9;
      break;
    case 'ovulation':
      targetCycleDay = 15;
      break;
    case 'luteal':
      targetCycleDay = 23;
      break;
  }

  await generateCyclesEndingOnDay(4, targetCycleDay, {
    includeTemps: true,
    includeNotes: true,
    consistentLength: true,
    richSymptoms: true,
  });
}

