import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { colors, spacing } from '@/theme';
import { formatDisplayDate } from '@/lib/utils/dates';
import { useAuthStore } from '@/lib/store/auth';
import { useCyclesStore, useEntriesArray } from '@/lib/store/cycles';
import { CycleStats } from '@/components/CycleStats';
import { TempChart } from '@/components/TempChart';
import { SymptomInsights } from '@/components/SymptomInsights';
import { CycleReport } from '@/components/CycleReport';
import {
  extractCycles,
  calculateStats,
  predictNext,
} from '@/lib/predictions/engine';

export default function StatsScreen() {
  const { state } = useAuthStore();
  const isDuress = state === 'duress';

  const { loadAllEntries, clearStore } = useCyclesStore();
  const entries = useEntriesArray();

  // Reload entries every time tab gains focus (after log edits, lock/unlock, etc.)
  useFocusEffect(
    useCallback(() => {
      if (isDuress) {
        clearStore();
      } else {
        loadAllEntries();
      }
    }, [isDuress])
  );

  // Calculate cycles, stats, and predictions
  const { cycles, stats, prediction } = useMemo(() => {
    if (isDuress || entries.length === 0) {
      return { cycles: [], stats: null, prediction: null };
    }

    const extractedCycles = extractCycles(entries);
    const calculatedStats = calculateStats(extractedCycles);
    const nextPrediction = predictNext(extractedCycles);

    return {
      cycles: extractedCycles,
      stats: calculatedStats,
      prediction: nextPrediction,
    };
  }, [entries, isDuress]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Stats</Text>
        </View>

        {isDuress ? (
          // Duress mode - show empty state
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No data yet</Text>
            <Text style={styles.emptySubtext}>
              Log at least 3 cycles to see predictions
            </Text>
          </View>
        ) : (
          // Normal mode - show stats
          <View style={styles.content}>
            <CycleStats stats={stats} prediction={prediction} />

            {/* Temperature Chart */}
            <View style={styles.section}>
              <TempChart entries={entries} />
            </View>

            {/* Symptom Insights */}
            <View style={styles.section}>
              <SymptomInsights entries={entries} cycles={cycles} />
            </View>

            {/* Cycle Report */}
            <View style={styles.section}>
              <CycleReport entries={entries} cycles={cycles} stats={stats} />
            </View>

            {/* Cycle History */}
            {cycles.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.sectionTitle}>Cycle History</Text>
                {cycles.slice(-6).reverse().map((cycle, index) => (
                  <View key={cycle.startDate} style={styles.historyItem}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyDate}>
                        {formatDisplayDate(cycle.startDate, 'long')}
                      </Text>
                      <Text style={styles.historyDuration}>
                        {cycle.duration} days
                      </Text>
                    </View>
                    <View style={styles.historyRight}>
                      {cycle.length > 0 ? (
                        <Text style={styles.historyLength}>
                          {cycle.length} day cycle
                        </Text>
                      ) : (
                        <Text style={styles.historyCurrent}>Current</Text>
                      )}
                      {cycle.ovulationDate && (
                        <Text style={styles.historyOvulation}>
                          Ovulation detected
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {entries.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No data yet</Text>
                <Text style={styles.emptySubtext}>
                  Start logging from the Calendar tab
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.deepTarn,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  emptyState: {
    paddingVertical: spacing.xxl * 2,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: colors.stone,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.predicted,
    textAlign: 'center',
  },
  historySection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.deepTarn,
    marginBottom: spacing.md,
  },
  historyItem: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyLeft: {},
  historyRight: {
    alignItems: 'flex-end',
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.deepTarn,
  },
  historyDuration: {
    fontSize: 13,
    color: colors.stone,
    marginTop: 2,
  },
  historyLength: {
    fontSize: 14,
    color: colors.stone,
  },
  historyCurrent: {
    fontSize: 14,
    color: colors.currentDay,
    fontWeight: '500',
  },
  historyOvulation: {
    fontSize: 12,
    color: colors.ovulation,
    marginTop: 2,
  },
});
