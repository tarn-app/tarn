import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, List, Switch, Divider } from 'react-native-paper';
import Slider from '@react-native-community/slider';

import { colors, spacing } from '../../theme';
import { DuressBehavior } from '../../lib/store/auth';

interface SecuritySectionProps {
  showAttempts: boolean;
  setShowAttempts: (show: boolean) => void;
  duressBehavior: DuressBehavior;
  setDuressBehavior: (behavior: DuressBehavior) => void;
  hasDuress: boolean;
  threshold: number;
  onThresholdChange: (value: number) => void;
  onChangePinStart: () => void;
  onDuressSetup: () => void;
  onRemoveDuress: () => void;
}

export function SecuritySection({
  showAttempts,
  setShowAttempts,
  duressBehavior,
  setDuressBehavior,
  hasDuress,
  threshold,
  onThresholdChange,
  onChangePinStart,
  onDuressSetup,
  onRemoveDuress,
}: SecuritySectionProps) {
  return (
    <List.Section>
      <List.Subheader style={styles.sectionHeader}>Security</List.Subheader>

      <List.Item
        title="Change PIN"
        description="Update your access PIN"
        left={(props) => <List.Icon {...props} icon="lock-reset" />}
        onPress={onChangePinStart}
        style={styles.listItem}
      />

      <List.Item
        title={hasDuress ? "Safety PIN configured" : "Set up Safety PIN"}
        description={hasDuress ? "Tap to remove" : duressBehavior === 'wipe' ? "Wipes all data when entered" : "Shows empty app when entered"}
        left={(props) => <List.Icon {...props} icon="shield-account" />}
        onPress={hasDuress ? onRemoveDuress : onDuressSetup}
        style={styles.listItem}
      />

      {hasDuress && (
        <List.Item
          title="Safety PIN action"
          description={duressBehavior === 'wipe' ? 'Permanently wipe all data' : 'Hide data (can recover)'}
          left={(props) => <List.Icon {...props} icon="shield-alert" />}
          onPress={() => {
            if (duressBehavior === 'hide') {
              Alert.alert(
                'Enable Permanent Wipe?',
                'When wipe mode is enabled, entering the Safety PIN will permanently delete ALL your data. This cannot be undone.\n\nMake sure you remember which PIN is your real PIN and which is your Safety PIN.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Enable Wipe',
                    style: 'destructive',
                    onPress: () => setDuressBehavior('wipe'),
                  },
                ]
              );
            } else {
              setDuressBehavior('hide');
            }
          }}
          style={styles.listItem}
        />
      )}

      <Divider />

      <View style={styles.sliderContainer}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Self-destruct after</Text>
          <Text style={styles.sliderValue}>{threshold} failed attempts</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={5}
          maximumValue={15}
          step={1}
          value={threshold}
          onSlidingComplete={onThresholdChange}
          minimumTrackTintColor={colors.deepTarn}
          maximumTrackTintColor={colors.mist}
          thumbTintColor={colors.deepTarn}
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderMinMax}>5</Text>
          <Text style={styles.sliderMinMax}>15</Text>
        </View>
      </View>

      <Divider />

      <List.Item
        title="Show remaining attempts"
        description="Display how many PIN attempts remain"
        left={(props) => <List.Icon {...props} icon="counter" />}
        right={() => (
          <Switch
            value={showAttempts}
            onValueChange={setShowAttempts}
            color={colors.currentDay}
          />
        )}
        style={styles.listItem}
      />
    </List.Section>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    color: colors.stone,
    fontWeight: '600',
  },
  listItem: {
    backgroundColor: colors.white,
  },
  sliderContainer: {
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sliderLabel: {
    fontSize: 16,
    color: colors.stone,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.deepTarn,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderMinMax: {
    fontSize: 12,
    color: colors.predicted,
  },
});
