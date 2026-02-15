import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

import { colors, spacing, radii } from '../theme';

export type FlowLevel = 0 | 1 | 2 | 3;

interface FlowSelectorProps {
  value: FlowLevel;
  onChange: (value: FlowLevel) => void;
}

const FLOW_OPTIONS: { value: FlowLevel; label: string; description: string }[] = [
  { value: 0, label: 'None', description: 'No flow' },
  { value: 1, label: 'Light', description: 'Spotting' },
  { value: 2, label: 'Medium', description: 'Regular' },
  { value: 3, label: 'Heavy', description: 'Heavy flow' },
];

export function FlowSelector({ value, onChange }: FlowSelectorProps) {
  const handleSelect = (flowValue: FlowLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(flowValue);
  };

  return (
    <View style={styles.container} accessibilityRole="radiogroup" accessibilityLabel="Flow level">
      <Text style={styles.label}>Flow</Text>
      <View style={styles.options}>
        {FLOW_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                option.value > 0 && isSelected && styles.optionSelectedFlow,
              ]}
              onPress={() => handleSelect(option.value)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${option.label}: ${option.description}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.optionLabel,
                  isSelected && styles.optionLabelSelected,
                  option.value > 0 && isSelected && styles.optionLabelSelectedFlow,
                ]}
              >
                {option.label}
              </Text>
              {/* Flow intensity indicator */}
              {option.value > 0 && (
                <View style={styles.intensityContainer}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.intensityDot,
                        i < option.value && styles.intensityDotFilled,
                        isSelected && styles.intensityDotSelected,
                      ]}
                    />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
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
    marginBottom: spacing.sm,
  },
  options: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    backgroundColor: colors.mist,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: colors.deepTarn,
    backgroundColor: colors.white,
  },
  optionSelectedFlow: {
    borderColor: colors.period,
    backgroundColor: colors.period,
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
  optionLabelSelectedFlow: {
    color: colors.white,
  },
  intensityContainer: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: 3,
  },
  intensityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.predicted,
  },
  intensityDotFilled: {
    backgroundColor: colors.stone,
  },
  intensityDotSelected: {
    backgroundColor: colors.white,
  },
});
