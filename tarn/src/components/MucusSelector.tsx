import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

import { colors, spacing, radii } from '../theme';

export type MucusLevel = 0 | 1 | 2 | 3 | 4;

interface MucusSelectorProps {
  value: MucusLevel;
  onChange: (value: MucusLevel) => void;
}

const MUCUS_OPTIONS: { value: MucusLevel; label: string; short: string }[] = [
  { value: 0, label: 'None', short: '—' },
  { value: 1, label: 'Dry', short: 'D' },
  { value: 2, label: 'Sticky', short: 'S' },
  { value: 3, label: 'Creamy', short: 'C' },
  { value: 4, label: 'Egg white', short: 'E' },
];

export function MucusSelector({ value, onChange }: MucusSelectorProps) {
  const handleSelect = (mucusValue: MucusLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(mucusValue);
  };

  return (
    <View style={styles.container} accessibilityRole="radiogroup" accessibilityLabel="Cervical mucus level">
      <Text style={styles.label}>Cervical mucus</Text>
      <Text style={styles.sublabel}>Optional fertility tracking</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.options}
      >
        {MUCUS_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          // Egg white (4) is the most fertile
          const isFertile = option.value === 4;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                isSelected && isFertile && styles.optionFertile,
              ]}
              onPress={() => handleSelect(option.value)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.optionLabel,
                  isSelected && styles.optionLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.deepTarn,
    marginBottom: 2,
  },
  sublabel: {
    fontSize: 12,
    color: colors.stone,
    marginBottom: spacing.sm,
  },
  options: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.mist,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 80,
    alignItems: 'center',
  },
  optionSelected: {
    borderColor: colors.deepTarn,
    backgroundColor: colors.white,
  },
  optionFertile: {
    borderColor: colors.ovulation,
    backgroundColor: `${colors.ovulation}15`,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.stone,
  },
  optionLabelSelected: {
    color: colors.deepTarn,
    fontWeight: '600',
  },
});
