import { Entry } from '../db/queries';
import { daysBetween, addDays, parseDate } from '../utils/dates';

export interface Cycle {
  startDate: string;      // First day of flow
  endDate: string;        // Last consecutive flow day
  length: number;         // Days from this start to next start (0 if ongoing)
  duration: number;       // Days of flow
  ovulationDate?: string; // Detected via temp shift
  lutealLength?: number;  // Days from ovulation to next period start
}

export interface Prediction {
  start: string;          // Predicted start date
  end: string;            // Predicted end date
  confidence: 'low' | 'medium' | 'high';
  ovulationDate?: string; // Predicted ovulation date
}

interface PredictedDates {
  period: Set<string>;      // Predicted period days
  fertile: Set<string>;     // Fertile window (5 days before ovulation)
  ovulation: Set<string>;   // Ovulation day(s)
}

export interface CycleStats {
  averageCycleLength: number;
  averagePeriodDuration: number;
  averageLutealLength?: number;
  shortestCycle: number;
  longestCycle: number;
  cycleCount: number;
}

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export function extractCycles(entries: Entry[]): Cycle[] {
  // Filter to entries with flow and sort by date
  const flowEntries = entries
    .filter(e => e.flow > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (flowEntries.length === 0) return [];

  const cycles: Cycle[] = [];
  let currentCycleStart: string | null = null;
  let currentCycleEnd: string | null = null;
  let lastFlowDate: string | null = null;

  for (const entry of flowEntries) {
    if (lastFlowDate === null) {
      // First entry - start new cycle
      currentCycleStart = entry.date;
      currentCycleEnd = entry.date;
      lastFlowDate = entry.date;
      continue;
    }

    const gap = daysBetween(lastFlowDate, entry.date);

    if (gap <= 2) {
      // Consecutive or nearly consecutive - extend current period
      currentCycleEnd = entry.date;
    } else {
      // Gap > 2 days - this is a new period/cycle
      // Close the previous cycle
      if (currentCycleStart && currentCycleEnd) {
        const duration = daysBetween(currentCycleStart, currentCycleEnd) + 1;
        const length = daysBetween(currentCycleStart, entry.date);

        cycles.push({
          startDate: currentCycleStart,
          endDate: currentCycleEnd,
          length,
          duration,
        });
      }

      // Start new cycle
      currentCycleStart = entry.date;
      currentCycleEnd = entry.date;
    }

    lastFlowDate = entry.date;
  }

  // Add the current (possibly ongoing) cycle
  if (currentCycleStart && currentCycleEnd) {
    const duration = daysBetween(currentCycleStart, currentCycleEnd) + 1;

    cycles.push({
      startDate: currentCycleStart,
      endDate: currentCycleEnd,
      length: 0, // Ongoing
      duration,
    });
  }

  // Try to detect ovulation for each cycle
  return cycles.map((cycle, index) => {
    const nextCycleStart = cycles[index + 1]?.startDate;
    const cycleEntries = entries.filter(
      e => e.date >= cycle.startDate &&
           (nextCycleStart ? e.date < nextCycleStart : true)
    );

    const ovulation = detectOvulation(cycleEntries);

    if (ovulation && nextCycleStart) {
      const lutealLength = daysBetween(ovulation.date, nextCycleStart);
      return {
        ...cycle,
        ovulationDate: ovulation.date,
        lutealLength,
      };
    }

    return cycle;
  });
}

// 3-over-6 rule: 3 consecutive temps must exceed the previous 6 by >= 0.2°C.
// Cross-referenced with egg-white mucus (level 4) for confirmation.
export function detectOvulation(entries: Entry[]): { date: string; confirmed: boolean } | null {
  // Filter to entries with temperature data
  const tempEntries = entries
    .filter(e => e.temp !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (tempEntries.length < 9) return null; // Need at least 6 + 3 temps

  const SHIFT_THRESHOLD = 0.2; // Celsius

  // Find the temperature shift point
  for (let i = 6; i < tempEntries.length - 2; i++) {
    // Get the 6 temps before this point
    const lowTemps = tempEntries.slice(i - 6, i).map(e => e.temp!);
    const maxLowTemp = Math.max(...lowTemps);

    // Get the 3 temps starting at this point
    const highTemps = tempEntries.slice(i, i + 3).map(e => e.temp!);
    const minHighTemp = Math.min(...highTemps);

    // Check if all 3 high temps are above the threshold
    if (minHighTemp >= maxLowTemp + SHIFT_THRESHOLD) {
      // Temperature shift detected!
      // Ovulation likely occurred on the day before the shift
      const ovulationDate = tempEntries[i - 1].date;

      // Check for mucus confirmation
      // Look for egg-white mucus (level 4) in the days leading up to shift
      const mucusEntries = entries.filter(
        e => e.mucus === 4 && e.date <= ovulationDate && e.date >= tempEntries[i - 6].date
      );

      const confirmed = mucusEntries.length > 0;

      return { date: ovulationDate, confirmed };
    }
  }

  return null;
}

export function predictNext(cycles: Cycle[]): Prediction | null {
  // Need at least 3 completed cycles
  const completedCycles = cycles.filter(c => c.length > 0);

  if (completedCycles.length < 3) return null;

  const lastCycle = cycles[cycles.length - 1];

  // Check if we have luteal phase data
  const cyclesWithOvulation = completedCycles.filter(c => c.lutealLength);

  if (cyclesWithOvulation.length >= 2) {
    // Use luteal phase method
    const avgLutealLength = mean(cyclesWithOvulation.map(c => c.lutealLength!));
    const avgCycleLength = mean(completedCycles.map(c => c.length));
    const avgDuration = mean(completedCycles.map(c => c.duration));

    // Estimate ovulation for current cycle (cycle length - luteal length)
    const estimatedOvulationDay = Math.round(avgCycleLength - avgLutealLength);
    const estimatedOvulation = addDays(lastCycle.startDate, estimatedOvulationDay);

    // Predicted period start
    const predictedStart = addDays(estimatedOvulation, Math.round(avgLutealLength));
    const predictedEnd = addDays(predictedStart, Math.round(avgDuration) - 1);

    return {
      start: predictedStart,
      end: predictedEnd,
      confidence: cyclesWithOvulation.length >= 4 ? 'high' : 'medium',
      ovulationDate: estimatedOvulation,
    };
  }

  // Fallback: use average cycle length
  const avgCycleLength = mean(completedCycles.map(c => c.length));
  const avgDuration = mean(completedCycles.map(c => c.duration));

  const predictedStart = addDays(lastCycle.startDate, Math.round(avgCycleLength));
  const predictedEnd = addDays(predictedStart, Math.round(avgDuration) - 1);

  return {
    start: predictedStart,
    end: predictedEnd,
    confidence: completedCycles.length >= 6 ? 'medium' : 'low',
  };
}

export function calculateStats(cycles: Cycle[]): CycleStats | null {
  const completedCycles = cycles.filter(c => c.length > 0);

  if (completedCycles.length === 0) return null;

  const cycleLengths = completedCycles.map(c => c.length);
  const periodDurations = completedCycles.map(c => c.duration);
  const lutealLengths = completedCycles
    .filter(c => c.lutealLength)
    .map(c => c.lutealLength!);

  return {
    averageCycleLength: Math.round(mean(cycleLengths)),
    averagePeriodDuration: Math.round(mean(periodDurations) * 10) / 10,
    averageLutealLength: lutealLengths.length > 0
      ? Math.round(mean(lutealLengths))
      : undefined,
    shortestCycle: Math.min(...cycleLengths),
    longestCycle: Math.max(...cycleLengths),
    cycleCount: completedCycles.length,
  };
}

export function getCurrentPhase(
  cycles: Cycle[],
  cycleDay: number,
  prediction?: Prediction
): CyclePhase {
  const currentCycle = cycles[cycles.length - 1];

  if (!currentCycle) return 'follicular';

  // If we're in the period duration, it's menstrual
  if (cycleDay <= currentCycle.duration) {
    return 'menstrual';
  }

  // If we have ovulation data or prediction
  const ovulationDay = currentCycle.ovulationDate
    ? daysBetween(currentCycle.startDate, currentCycle.ovulationDate) + 1
    : prediction?.ovulationDate
      ? daysBetween(currentCycle.startDate, prediction.ovulationDate) + 1
      : null;

  if (ovulationDay) {
    if (cycleDay >= ovulationDay - 1 && cycleDay <= ovulationDay + 1) {
      return 'ovulation';
    }
    if (cycleDay > ovulationDay + 1) {
      return 'luteal';
    }
    return 'follicular';
  }

  // Without ovulation data, estimate based on typical 28-day cycle
  // Ovulation typically around day 14
  if (cycleDay >= 13 && cycleDay <= 15) {
    return 'ovulation';
  }
  if (cycleDay > 15) {
    return 'luteal';
  }
  return 'follicular';
}

function predictMultipleCycles(cycles: Cycle[]): Prediction[] {
  const completedCycles = cycles.filter(c => c.length > 0);
  if (completedCycles.length < 3) return [];

  const predictions: Prediction[] = [];
  const firstPrediction = predictNext(cycles);

  if (!firstPrediction) return [];

  predictions.push(firstPrediction);

  // Determine how many cycles to predict based on confidence
  const cyclesWithOvulation = completedCycles.filter(c => c.lutealLength);
  let cyclesToPredict: number;

  if (cyclesWithOvulation.length >= 4) {
    cyclesToPredict = 3; // High confidence
  } else if (completedCycles.length >= 3) {
    cyclesToPredict = 2; // Medium confidence
  } else {
    cyclesToPredict = 1; // Low confidence
  }

  // Calculate average values for subsequent predictions
  const avgCycleLength = Math.round(mean(completedCycles.map(c => c.length)));
  const avgDuration = Math.round(mean(completedCycles.map(c => c.duration)));
  const avgLutealLength = cyclesWithOvulation.length >= 2
    ? Math.round(mean(cyclesWithOvulation.map(c => c.lutealLength!)))
    : null;

  // Generate additional predictions
  for (let i = 1; i < cyclesToPredict; i++) {
    const prevPrediction = predictions[i - 1];
    const nextStart = addDays(prevPrediction.start, avgCycleLength);
    const nextEnd = addDays(nextStart, avgDuration - 1);

    const nextOvulation = avgLutealLength
      ? addDays(nextStart, avgCycleLength - avgLutealLength)
      : undefined;

    predictions.push({
      start: nextStart,
      end: nextEnd,
      confidence: firstPrediction.confidence,
      ovulationDate: nextOvulation,
    });
  }

  return predictions;
}

export function getAllPredictedDates(cycles: Cycle[]): PredictedDates {
  const result: PredictedDates = {
    period: new Set(),
    fertile: new Set(),
    ovulation: new Set(),
  };

  const predictions = predictMultipleCycles(cycles);

  for (const prediction of predictions) {
    // Add period days
    let current = prediction.start;
    while (current <= prediction.end) {
      result.period.add(current);
      current = addDays(current, 1);
    }

    // Add ovulation and fertile window
    if (prediction.ovulationDate) {
      result.ovulation.add(prediction.ovulationDate);

      // Fertile window: 5 days before ovulation through ovulation day
      for (let i = 5; i >= 1; i--) {
        result.fertile.add(addDays(prediction.ovulationDate, -i));
      }
    }
  }

  return result;
}

// Helper function
function mean(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}
