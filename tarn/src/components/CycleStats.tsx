import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { colors, spacing, radii } from '../theme';
import { CycleStats as CycleStatsType, Prediction } from '../lib/predictions/engine';
import { formatDisplayDate } from '../lib/utils/dates';

interface CycleStatsProps {
  stats: CycleStatsType | null;
  prediction: Prediction | null;
}

export function CycleStats({ stats, prediction }: CycleStatsProps) {
  if (!stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Cycle Statistics</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Log more cycles for statistics</Text>
          <Text style={styles.emptySubtext}>
            Statistics appear after 3+ cycles are recorded
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cycle Statistics</Text>

      {/* Prediction */}
      {prediction && (
        <View style={styles.predictionCard}>
          <Text style={styles.predictionLabel}>Next period expected</Text>
          <Text style={styles.predictionDate}>
            {formatDisplayDate(prediction.start, 'long')}
          </Text>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>
              {prediction.confidence === 'high' ? 'High' :
               prediction.confidence === 'medium' ? 'Medium' : 'Low'} confidence
            </Text>
          </View>
        </View>
      )}

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.averageCycleLength}</Text>
          <Text style={styles.statLabel}>Avg cycle length</Text>
          <Text style={styles.statUnit}>days</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.averagePeriodDuration}</Text>
          <Text style={styles.statLabel}>Avg period</Text>
          <Text style={styles.statUnit}>days</Text>
        </View>

        {stats.averageLutealLength && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.averageLutealLength}</Text>
            <Text style={styles.statLabel}>Avg luteal</Text>
            <Text style={styles.statUnit}>days</Text>
          </View>
        )}

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.cycleCount}</Text>
          <Text style={styles.statLabel}>Cycles logged</Text>
          <Text style={styles.statUnit}>total</Text>
        </View>
      </View>

      {/* Range */}
      <View style={styles.rangeCard}>
        <Text style={styles.rangeLabel}>Cycle length range</Text>
        <Text style={styles.rangeValue}>
          {stats.shortestCycle} - {stats.longestCycle} days
        </Text>
      </View>

      {/* Hints */}
      {!stats.averageLutealLength && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            Track daily temperature to detect ovulation and improve predictions
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.deepTarn,
    marginBottom: spacing.md,
  },
  emptyState: {
    backgroundColor: colors.mist,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.stone,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.predicted,
    textAlign: 'center',
  },
  predictionCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.currentDay,
  },
  predictionLabel: {
    fontSize: 14,
    color: colors.stone,
    marginBottom: spacing.xs,
  },
  predictionDate: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.deepTarn,
    marginBottom: spacing.sm,
  },
  confidenceBadge: {
    backgroundColor: colors.mist,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  confidenceText: {
    fontSize: 12,
    color: colors.stone,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.deepTarn,
  },
  statLabel: {
    fontSize: 12,
    color: colors.stone,
    marginTop: spacing.xs,
  },
  statUnit: {
    fontSize: 11,
    color: colors.predicted,
  },
  rangeCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  rangeLabel: {
    fontSize: 14,
    color: colors.stone,
  },
  rangeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.deepTarn,
  },
  hint: {
    backgroundColor: colors.mist,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  hintText: {
    fontSize: 13,
    color: colors.stone,
    textAlign: 'center',
  },
});
