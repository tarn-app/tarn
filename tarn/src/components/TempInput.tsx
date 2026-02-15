import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Text } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

import { colors, spacing, radii } from '../theme';

export type TempUnit = 'C' | 'F';

interface TempInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  unit: TempUnit;
  onUnitChange: (unit: TempUnit) => void;
}

// Typical BBT ranges
const TEMP_RANGES = {
  C: { min: 35.5, max: 38.0, step: 0.1, placeholder: '36.5' },
  F: { min: 96.0, max: 100.5, step: 0.1, placeholder: '97.7' },
};

export function TempInput({ value, onChange, unit, onUnitChange }: TempInputProps) {
  const range = TEMP_RANGES[unit];

  // Use string state for text input to allow partial typing
  const [inputText, setInputText] = useState(value !== null ? value.toFixed(1) : '');
  const [isFocused, setIsFocused] = useState(false);

  // Sync inputText when value changes externally (e.g., from +/- buttons or unit change)
  useEffect(() => {
    if (!isFocused) {
      setInputText(value !== null ? value.toFixed(1) : '');
    }
  }, [value, isFocused]);

  const handleIncrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value === null) {
      onChange(unit === 'C' ? 36.5 : 97.7);
    } else if (value < range.max) {
      onChange(Math.round((value + range.step) * 10) / 10);
    }
  };

  const handleDecrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value === null) {
      onChange(unit === 'C' ? 36.5 : 97.7);
    } else if (value > range.min) {
      onChange(Math.round((value - range.step) * 10) / 10);
    }
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText('');
    onChange(null);
  };

  const handleTextChange = (text: string) => {
    // Allow typing any number-like input
    // Only allow digits, decimal point, and limit to reasonable length
    const cleaned = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    const sanitized = parts.length > 2
      ? parts[0] + '.' + parts.slice(1).join('')
      : cleaned;
    setInputText(sanitized);
  };

  const handleBlur = () => {
    setIsFocused(false);

    if (inputText === '') {
      onChange(null);
      return;
    }

    const parsed = parseFloat(inputText);
    if (!isNaN(parsed)) {
      // Clamp to valid range
      const clamped = Math.min(Math.max(parsed, range.min), range.max);
      const rounded = Math.round(clamped * 10) / 10;
      onChange(rounded);
      setInputText(rounded.toFixed(1));
    } else {
      // Invalid input - reset to current value
      setInputText(value !== null ? value.toFixed(1) : '');
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const toggleUnit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newUnit = unit === 'C' ? 'F' : 'C';

    // Convert the value
    if (value !== null) {
      if (newUnit === 'F') {
        // C to F: (C × 9/5) + 32
        onChange(Math.round((value * 9 / 5 + 32) * 10) / 10);
      } else {
        // F to C: (F − 32) × 5/9
        onChange(Math.round(((value - 32) * 5 / 9) * 10) / 10);
      }
    }

    onUnitChange(newUnit);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Temperature</Text>
        {value !== null && (
          <TouchableOpacity
            onPress={handleClear}
            accessibilityRole="button"
            accessibilityLabel="Clear temperature"
          >
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inputRow}>
        {/* Decrement button */}
        <TouchableOpacity
          style={styles.stepButton}
          onPress={handleDecrement}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Decrease temperature"
        >
          <Text style={styles.stepButtonText}>−</Text>
        </TouchableOpacity>

        {/* Value input */}
        <View style={styles.valueContainer}>
          <TextInput
            style={styles.valueInput}
            value={inputText}
            onChangeText={handleTextChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={range.placeholder}
            placeholderTextColor={colors.predicted}
            keyboardType="decimal-pad"
            maxLength={5}
            selectTextOnFocus
            accessibilityLabel={`Temperature value${value !== null ? `: ${value.toFixed(1)} degrees ${unit === 'C' ? 'Celsius' : 'Fahrenheit'}` : ''}`}
          />
          <TouchableOpacity
            onPress={toggleUnit}
            style={styles.unitButton}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${unit === 'C' ? 'Fahrenheit' : 'Celsius'}`}
          >
            <Text style={styles.unitText}>°{unit}</Text>
          </TouchableOpacity>
        </View>

        {/* Increment button */}
        <TouchableOpacity
          style={styles.stepButton}
          onPress={handleIncrement}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Increase temperature"
        >
          <Text style={styles.stepButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        {value === null
          ? 'Optional: Track basal body temperature'
          : `Range: ${range.min}°${unit} - ${range.max}°${unit}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.deepTarn,
  },
  clearText: {
    fontSize: 14,
    color: colors.alert,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.mist,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepButtonText: {
    fontSize: 24,
    color: colors.deepTarn,
    fontWeight: '300',
  },
  valueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mist,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  valueInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '500',
    color: colors.deepTarn,
    textAlign: 'center',
  },
  unitButton: {
    paddingLeft: spacing.sm,
  },
  unitText: {
    fontSize: 16,
    color: colors.stone,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    color: colors.stone,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
