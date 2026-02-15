import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, List, Button } from 'react-native-paper';

import { colors, spacing } from '../../theme';

interface DebugSectionProps {
  loadAllEntries: () => Promise<void>;
}

export function DebugSection({ loadAllEntries }: DebugSectionProps) {
  return (
    <List.Section>
      <List.Subheader style={styles.sectionHeader}>Debug (Dev Only)</List.Subheader>

      <Text style={styles.subheader}>Screenshot Data</Text>
      <View style={styles.buttons}>
        <Button
          mode="contained"
          onPress={async () => {
            const { generateScreenshotData } = await import('../../lib/testData');
            await generateScreenshotData('calendar-menstrual');
            await loadAllEntries();
            Alert.alert('Done', 'Calendar: Day 2 of period');
          }}
          style={styles.button}
          buttonColor={colors.deepTarn}
        >
          Period Day
        </Button>
        <Button
          mode="contained"
          onPress={async () => {
            const { generateScreenshotData } = await import('../../lib/testData');
            await generateScreenshotData('calendar-ovulation');
            await loadAllEntries();
            Alert.alert('Done', 'Calendar: Ovulation day');
          }}
          style={styles.button}
          buttonColor={colors.deepTarn}
        >
          Ovulation
        </Button>
        <Button
          mode="contained"
          onPress={async () => {
            const { generateScreenshotData } = await import('../../lib/testData');
            await generateScreenshotData('log-detailed');
            await loadAllEntries();
            Alert.alert('Done', 'Log: Detailed entry for today');
          }}
          style={styles.button}
          buttonColor={colors.deepTarn}
        >
          Log Entry
        </Button>
        <Button
          mode="contained"
          onPress={async () => {
            const { generateScreenshotData } = await import('../../lib/testData');
            await generateScreenshotData('stats-complete');
            await loadAllEntries();
            Alert.alert('Done', 'Stats: Full data with patterns');
          }}
          style={styles.button}
          buttonColor={colors.deepTarn}
        >
          Stats Full
        </Button>
      </View>

      <Text style={styles.subheader}>Set Phase</Text>
      <View style={styles.buttons}>
        <Button
          mode="outlined"
          onPress={async () => {
            const { generatePhaseData } = await import('../../lib/testData');
            await generatePhaseData('menstrual');
            await loadAllEntries();
            Alert.alert('Done', 'Today is now in menstrual phase');
          }}
          style={styles.button}
        >
          Menstrual
        </Button>
        <Button
          mode="outlined"
          onPress={async () => {
            const { generatePhaseData } = await import('../../lib/testData');
            await generatePhaseData('follicular');
            await loadAllEntries();
            Alert.alert('Done', 'Today is now in follicular phase');
          }}
          style={styles.button}
        >
          Follicular
        </Button>
        <Button
          mode="outlined"
          onPress={async () => {
            const { generatePhaseData } = await import('../../lib/testData');
            await generatePhaseData('ovulation');
            await loadAllEntries();
            Alert.alert('Done', 'Today is now in ovulation phase');
          }}
          style={styles.button}
        >
          Ovulation
        </Button>
        <Button
          mode="outlined"
          onPress={async () => {
            const { generatePhaseData } = await import('../../lib/testData');
            await generatePhaseData('luteal');
            await loadAllEntries();
            Alert.alert('Done', 'Today is now in luteal phase');
          }}
          style={styles.button}
        >
          Luteal
        </Button>
      </View>
    </List.Section>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    color: colors.stone,
    fontWeight: '600',
  },
  subheader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.stone,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    textTransform: 'uppercase',
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
  },
  button: {
    marginBottom: spacing.xs,
  },
});
