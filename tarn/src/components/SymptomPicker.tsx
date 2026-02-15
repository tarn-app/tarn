import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

import { colors, spacing, radii } from '../theme';
import { Symptom } from '../lib/db/queries';

interface SymptomPickerProps {
  symptoms: Symptom[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}

export function SymptomPicker({ symptoms, selectedIds, onChange }: SymptomPickerProps) {
  const handleToggle = (symptomId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (selectedIds.includes(symptomId)) {
      onChange(selectedIds.filter((id) => id !== symptomId));
    } else {
      onChange([...selectedIds, symptomId]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Symptoms</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {symptoms.map((symptom) => {
          const isSelected = selectedIds.includes(symptom.id);

          return (
            <TouchableOpacity
              key={symptom.id}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
              ]}
              onPress={() => handleToggle(symptom.id)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityLabel={symptom.name}
              accessibilityState={{ checked: isSelected }}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}
              >
                {symptom.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedIds.length > 0 && (
        <Text style={styles.count}>
          {selectedIds.length} selected
        </Text>
      )}
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.mist,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: colors.deepTarn,
    borderColor: colors.deepTarn,
  },
  chipText: {
    fontSize: 14,
    color: colors.stone,
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: '500',
  },
  count: {
    fontSize: 12,
    color: colors.stone,
    marginTop: spacing.xs,
  },
});
