import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { colors, spacing } from '@/theme';
import { CalendarGrid } from '@/components/CalendarGrid';
import { PhaseCard } from '@/components/PhaseCard';
import { useAuthStore } from '@/lib/store/auth';
import { useCyclesStore, useEntriesArray } from '@/lib/store/cycles';
import { today, getMonthYear, daysBetween } from '@/lib/utils/dates';
import {
  extractCycles,
  predictNext,
  getCurrentPhase,
  getAllPredictedDates,
} from '@/lib/predictions/engine';

export default function CalendarScreen() {
  const router = useRouter();
  const state = useAuthStore((s) => s.state);
  const isDuress = state === 'duress';

  const { loadSymptoms, loadAllEntries, entriesMap } = useCyclesStore(
    useShallow((s) => ({
      loadSymptoms: s.loadSymptoms,
      loadAllEntries: s.loadAllEntries,
      entriesMap: s.entries,
    }))
  );
  const entries = useEntriesArray();

  // Current month state
  const todayDate = today();
  const { year: initialYear, month: initialMonth } = getMonthYear(todayDate);
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  const clearStore = useCyclesStore((s) => s.clearStore);

  // Load data on focus and month change, clear if duress
  useFocusEffect(
    useCallback(() => {
      if (isDuress) {
        clearStore(); // Clear any cached data in duress mode
      } else {
        loadSymptoms();
        loadAllEntries();
      }
    }, [isDuress])
  );

  const handleDatePress = useCallback((date: string) => {
    router.push({
      pathname: '/(authenticated)/log',
      params: { date },
    });
  }, [router]);

  const handleMonthChange = useCallback((year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  }, []);

  // Calculate cycles, predictions, and current phase
  const { cycles, prediction, predictedDates, cycleDay, phase } = useMemo(() => {
    if (isDuress || entries.length === 0) {
      return {
        cycles: [],
        prediction: null,
        predictedDates: { period: new Set<string>(), fertile: new Set<string>(), ovulation: new Set<string>() },
        cycleDay: null,
        phase: null,
      };
    }

    const extractedCycles = extractCycles(entries);
    const nextPrediction = predictNext(extractedCycles);
    const predDates = getAllPredictedDates(extractedCycles);

    // Calculate cycle day
    const currentCycle = extractedCycles[extractedCycles.length - 1];
    let calculatedCycleDay: number | null = null;
    let calculatedPhase = null;

    if (currentCycle) {
      calculatedCycleDay = daysBetween(currentCycle.startDate, todayDate) + 1;

      if (calculatedCycleDay > 0) {
        calculatedPhase = getCurrentPhase(extractedCycles, calculatedCycleDay, nextPrediction ?? undefined);
      }
    }

    return {
      cycles: extractedCycles,
      prediction: nextPrediction,
      predictedDates: predDates,
      cycleDay: calculatedCycleDay,
      phase: calculatedPhase,
    };
  }, [entries, isDuress, todayDate]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Calendar</Text>
          {cycleDay !== null && cycleDay > 0 && (
            <View style={styles.cycleDayBadge}>
              <Text style={styles.cycleDayText}>Day {cycleDay}</Text>
            </View>
          )}
        </View>

        {/* Phase Card - only show if we have cycle data */}
        {!isDuress && phase && cycleDay !== null && cycleDay > 0 && (
          <View style={styles.phaseCardContainer}>
            <PhaseCard phase={phase} cycleDay={cycleDay} />
          </View>
        )}

        {isDuress ? (
          // Duress mode - show empty calendar
          <View style={styles.calendarContainer}>
            <CalendarGrid
              year={currentYear}
              month={currentMonth}
              entries={entriesMap}
              onDatePress={handleDatePress}
              onMonthChange={handleMonthChange}
            />
            <View style={styles.emptyHint}>
              <Text style={styles.emptyHintText}>Tap a day to start logging</Text>
            </View>
          </View>
        ) : (
          // Normal mode
          <View style={styles.calendarContainer}>
            <CalendarGrid
              year={currentYear}
              month={currentMonth}
              entries={entriesMap}
              onDatePress={handleDatePress}
              onMonthChange={handleMonthChange}
              predictedDates={predictedDates}
            />

            {entries.length === 0 && (
              <View style={styles.emptyHint}>
                <Text style={styles.emptyHintText}>Tap a day to start logging</Text>
              </View>
            )}
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendPeriod]} />
            <Text style={styles.legendText}>Logged</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendPredictedPeriod]} />
            <Text style={styles.legendText}>Period</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendFertile]} />
            <Text style={styles.legendText}>Fertile</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendOvulation]} />
            <Text style={styles.legendText}>Ovulation</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendToday]} />
            <Text style={styles.legendText}>Today</Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.deepTarn,
  },
  cycleDayBadge: {
    backgroundColor: colors.mist,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  cycleDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.stone,
  },
  phaseCardContainer: {
    paddingHorizontal: spacing.md,
  },
  calendarContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  emptyHint: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  emptyHintText: {
    fontSize: 14,
    color: colors.stone,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendPeriod: {
    backgroundColor: colors.period,
  },
  legendPredictedPeriod: {
    backgroundColor: colors.phaseMenstrual + '30',
  },
  legendFertile: {
    backgroundColor: colors.phaseFollicular + '25',
  },
  legendOvulation: {
    backgroundColor: colors.phaseOvulation + '35',
    borderWidth: 2,
    borderColor: colors.phaseOvulation,
  },
  legendToday: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.currentDay,
  },
  legendText: {
    fontSize: 12,
    color: colors.stone,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});
