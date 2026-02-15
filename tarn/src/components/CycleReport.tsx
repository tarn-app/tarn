import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Divider } from 'react-native-paper';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';

import { colors, spacing, radii } from '../theme';
import { Entry } from '../lib/db/queries';
import { Cycle, CycleStats } from '../lib/predictions/engine';
import { formatDisplayDate } from '../lib/utils/dates';
import { secureWipeFile } from '../lib/utils/wipe';
import { SYMPTOM_LABELS } from '../lib/constants';

interface CycleReportProps {
  entries: Entry[];
  cycles: Cycle[];
  stats: CycleStats | null;
}

export function CycleReport({ entries, cycles, stats }: CycleReportProps) {
  const reportData = useMemo(() => {
    // Get last 6 cycles
    const recentCycles = cycles.slice(-6);

    // Get symptom frequency
    const symptomCounts: Record<string, number> = {};
    entries.forEach((entry) => {
      entry.symptoms.forEach((s) => {
        symptomCounts[s] = (symptomCounts[s] || 0) + 1;
      });
    });

    const topSymptoms = Object.entries(symptomCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([symptom, count]) => ({
        name: SYMPTOM_LABELS[symptom] || symptom,
        count,
      }));

    // Temperature data
    const tempsEntries = entries.filter((e) => e.temp !== null && e.temp > 0);
    const temps = tempsEntries.map((e) => e.temp as number);
    const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;

    return {
      recentCycles,
      topSymptoms,
      avgTemp,
      tempCount: temps.length,
    };
  }, [entries, cycles]);

  const generateTextReport = () => {
    const lines: string[] = [];
    lines.push('CYCLE HISTORY REPORT');
    lines.push(`Generated: ${new Date().toLocaleDateString()}`);
    lines.push('');
    lines.push('=' .repeat(40));
    lines.push('');

    if (stats) {
      lines.push('SUMMARY');
      lines.push(`Total cycles tracked: ${stats.cycleCount}`);
      lines.push(`Average cycle length: ${stats.averageCycleLength} days`);
      lines.push(`Cycle range: ${stats.shortestCycle}-${stats.longestCycle} days`);
      lines.push(`Average flow duration: ${stats.averagePeriodDuration} days`);
      if (stats.averageLutealLength) {
        lines.push(`Average luteal phase: ${stats.averageLutealLength} days`);
      }
      lines.push('');
    }

    lines.push('RECENT CYCLES');
    reportData.recentCycles.forEach((cycle, i) => {
      lines.push(`${i + 1}. Started: ${formatDisplayDate(cycle.startDate, 'long')}`);
      lines.push(`   Duration: ${cycle.duration} days`);
      if (cycle.length > 0) {
        lines.push(`   Cycle length: ${cycle.length} days`);
      }
      if (cycle.ovulationDate) {
        lines.push(`   Ovulation: ${formatDisplayDate(cycle.ovulationDate, 'long')}`);
      }
    });
    lines.push('');

    if (reportData.topSymptoms.length > 0) {
      lines.push('MOST COMMON SYMPTOMS');
      reportData.topSymptoms.forEach((s) => {
        lines.push(`- ${s.name}: ${s.count} occurrences`);
      });
      lines.push('');
    }

    if (reportData.avgTemp) {
      lines.push('TEMPERATURE DATA');
      lines.push(`Average BBT: ${reportData.avgTemp.toFixed(2)}°`);
      lines.push(`Data points: ${reportData.tempCount}`);
      lines.push('');
    }

    lines.push('=' .repeat(40));
    lines.push('This report was generated from personal tracking data.');

    return lines.join('\n');
  };

  const handleShare = async () => {
    // Show warning about sharing sensitive data
    Alert.alert(
      'Share Report',
      'This report contains sensitive health data. The file will be securely deleted after sharing, but the recipient will have access to this information.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: async () => {
            await doShare();
          },
        },
      ]
    );
  };

  const doShare = async () => {
    let filePath: string | null = null;
    try {
      const report = generateTextReport();

      // Use random filename to avoid leaking date information
      const randomBytes = await Crypto.getRandomBytesAsync(8);
      const randomHex = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const fileName = `report-${randomHex}.txt`;
      const cacheUri = Paths.cache.uri.endsWith('/') ? Paths.cache.uri : Paths.cache.uri + '/';
      filePath = `${cacheUri}${fileName}`;
      const file = new File(filePath);

      await file.write(report);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/plain',
          dialogTitle: 'Share Cycle Report',
        });
      }

      // Secure cleanup - overwrite with random data before deletion
      await secureWipeFile(filePath);
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to share report:', error);
      }
      // Still try to clean up on error
      if (filePath) {
        try {
          await secureWipeFile(filePath);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  };

  if (cycles.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Cycle Report</Text>
        <Text style={styles.emptyText}>
          Log at least one complete cycle to generate a report
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cycle Report</Text>
      <Text style={styles.subtitle}>Summary for healthcare provider</Text>

      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.cycleCount}</Text>
              <Text style={styles.statLabel}>Cycles</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.averageCycleLength}</Text>
              <Text style={styles.statLabel}>Avg Length</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.shortestCycle}-{stats.longestCycle}</Text>
              <Text style={styles.statLabel}>Range</Text>
            </View>
          </View>
        </View>
      )}

      <Divider style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Cycles</Text>
        {reportData.recentCycles.slice(-3).reverse().map((cycle, i) => (
          <View key={cycle.startDate} style={styles.cycleItem}>
            <Text style={styles.cycleDate}>
              {formatDisplayDate(cycle.startDate, 'long')}
            </Text>
            <Text style={styles.cycleDetails}>
              {cycle.duration} days • {cycle.length > 0 ? `${cycle.length} day cycle` : 'Ongoing'}
            </Text>
          </View>
        ))}
      </View>

      {reportData.topSymptoms.length > 0 && (
        <>
          <Divider style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Common Symptoms</Text>
            {reportData.topSymptoms.slice(0, 3).map((s) => (
              <Text key={s.name} style={styles.symptomItem}>
                • {s.name} ({s.count}x)
              </Text>
            ))}
          </View>
        </>
      )}

      <Button
        mode="contained"
        onPress={handleShare}
        style={styles.shareButton}
        icon="share"
      >
        Share Report
      </Button>
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
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.stone,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.deepTarn,
  },
  statLabel: {
    fontSize: 12,
    color: colors.stone,
  },
  divider: {
    marginVertical: spacing.md,
  },
  cycleItem: {
    marginBottom: spacing.sm,
  },
  cycleDate: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.deepTarn,
  },
  cycleDetails: {
    fontSize: 13,
    color: colors.stone,
  },
  symptomItem: {
    fontSize: 14,
    color: colors.deepTarn,
    marginBottom: spacing.xs,
  },
  shareButton: {
    marginTop: spacing.md,
    backgroundColor: colors.deepTarn,
  },
});
