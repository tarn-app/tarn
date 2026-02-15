import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip } from 'react-native-paper';

import { colors, spacing, radii } from '../theme';
import { Entry } from '../lib/db/queries';
import { Cycle } from '../lib/predictions/engine';
import { SYMPTOM_LABELS } from '../lib/constants';
import { daysBetween, addDays } from '../lib/utils/dates';

interface SymptomInsightsProps {
  entries: Entry[];
  cycles: Cycle[];
}

interface SymptomPattern {
  symptom: string;
  frequency: number; // percentage of cycles it appears
  avgDayInCycle: number; // average day in cycle when it appears
  dayRange: string; // e.g., "days 12-15"
}

export function SymptomInsights({ entries, cycles }: SymptomInsightsProps) {
  const patterns = useMemo(() => {
    if (cycles.length < 2 || entries.length === 0) {
      return [];
    }

    // Group entries by symptom and track which day of cycle they appear
    const symptomOccurrences: Record<string, { cycleDays: number[]; cycleCount: number }> = {};

    // For each cycle, find symptoms and their day in cycle
    cycles.forEach((cycle) => {
      if (cycle.length === 0) return; // Skip ongoing cycle

      const cycleEndDate = addDays(cycle.startDate, cycle.length);

      entries.forEach((entry) => {
        if (entry.date >= cycle.startDate && entry.date < cycleEndDate) {
          const dayInCycle = daysBetween(cycle.startDate, entry.date) + 1;

          entry.symptoms.forEach((symptom) => {
            if (!symptomOccurrences[symptom]) {
              symptomOccurrences[symptom] = { cycleDays: [], cycleCount: 0 };
            }
            symptomOccurrences[symptom].cycleDays.push(dayInCycle);
          });
        }
      });

      // Track how many cycles we've analyzed for each symptom
      Object.keys(symptomOccurrences).forEach((symptom) => {
        // Check if this symptom appeared in this cycle
        const cycleSymptoms = entries
          .filter((e) => e.date >= cycle.startDate && e.date < cycleEndDate)
          .flatMap((e) => e.symptoms);

        if (cycleSymptoms.includes(symptom)) {
          symptomOccurrences[symptom].cycleCount++;
        }
      });
    });

    // Calculate patterns
    const completedCycles = cycles.filter((c) => c.length > 0).length;
    const results: SymptomPattern[] = [];

    Object.entries(symptomOccurrences).forEach(([symptom, data]) => {
      if (data.cycleDays.length < 2) return; // Need at least 2 occurrences

      const avgDay = Math.round(data.cycleDays.reduce((a, b) => a + b, 0) / data.cycleDays.length);
      const minDay = Math.min(...data.cycleDays);
      const maxDay = Math.max(...data.cycleDays);
      const frequency = Math.round((data.cycleCount / completedCycles) * 100);

      if (frequency >= 30) { // Only show if appears in at least 30% of cycles
        results.push({
          symptom,
          frequency,
          avgDayInCycle: avgDay,
          dayRange: minDay === maxDay ? `day ${minDay}` : `days ${minDay}-${maxDay}`,
        });
      }
    });

    // Sort by frequency
    return results.sort((a, b) => b.frequency - a.frequency);
  }, [entries, cycles]);

  if (patterns.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Symptom Patterns</Text>
        <Text style={styles.emptyText}>
          Log symptoms across multiple cycles to discover patterns
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Symptom Patterns</Text>
      <Text style={styles.subtitle}>Based on your logged data</Text>

      {patterns.map((pattern) => (
        <View key={pattern.symptom} style={styles.patternCard}>
          <View style={styles.patternHeader}>
            <Text style={styles.symptomName}>
              {SYMPTOM_LABELS[pattern.symptom] || pattern.symptom}
            </Text>
            <Chip compact style={styles.frequencyChip}>
              {pattern.frequency}% of cycles
            </Chip>
          </View>
          <Text style={styles.patternDetail}>
            Typically appears on {pattern.dayRange} of your cycle
          </Text>
        </View>
      ))}

      <Text style={styles.disclaimer}>
        Patterns are based on your logged data and may change as you log more cycles.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.deepTarn,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 12,
    color: colors.stone,
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.stone,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  patternCard: {
    backgroundColor: colors.mist,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  symptomName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.deepTarn,
  },
  frequencyChip: {
    backgroundColor: colors.white,
  },
  patternDetail: {
    fontSize: 13,
    color: colors.stone,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.predicted,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
