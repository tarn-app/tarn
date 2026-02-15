import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Text } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radii } from '../theme';

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  maxLength?: number;
  minLength?: number;
  error?: boolean;
  disabled?: boolean;
}

const BUTTONS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'backspace'],
];

export function PinPad({
  value,
  onChange,
  onSubmit,
  maxLength = 6,
  minLength = 4,
  error = false,
  disabled = false,
}: PinPadProps) {
  const shakeAnimation = React.useRef(new Animated.Value(0)).current;

  // Trigger shake animation on error
  React.useEffect(() => {
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [error, shakeAnimation]);

  const handlePress = (key: string) => {
    if (disabled) return;

    if (key === 'backspace') {
      if (value.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange(value.slice(0, -1));
      }
    } else if (key !== '') {
      if (value.length < maxLength) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onChange(value + key);
      }
    }
  };

  const handleSubmit = () => {
    if (value.length >= minLength) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onSubmit();
    }
  };

  return (
    <View style={styles.container}>
      {/* PIN Dots */}
      <Animated.View
        style={[
          styles.dotsContainer,
          { transform: [{ translateX: shakeAnimation }] },
        ]}
        accessibilityRole="text"
        accessibilityLabel={`PIN entry: ${value.length} of ${maxLength} digits entered`}
        accessibilityLiveRegion="polite"
      >
        {Array.from({ length: maxLength }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < value.length && styles.dotFilled,
              error && styles.dotError,
            ]}
            accessibilityElementsHidden
          />
        ))}
      </Animated.View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {BUTTONS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((key) => (
              <TouchableOpacity
                key={key || 'empty'}
                style={[
                  styles.button,
                  key === '' && styles.buttonEmpty,
                  disabled && styles.buttonDisabled,
                ]}
                onPress={() => handlePress(key)}
                disabled={disabled || key === ''}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={
                  key === 'backspace' ? 'Delete' : key === '' ? undefined : `${key}`
                }
                accessibilityHint={
                  key === 'backspace' ? 'Removes the last digit' : key === '' ? undefined : 'Adds this digit to your PIN'
                }
              >
                {key === 'backspace' ? (
                  <Text style={styles.backspaceText}>⌫</Text>
                ) : (
                  <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
                    {key}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Submit button - always visible, disabled until minLength reached */}
      <TouchableOpacity
          style={[
            styles.submitButton,
            value.length < minLength && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={disabled || value.length < minLength}
          accessibilityRole="button"
          accessibilityLabel="Submit PIN"
          accessibilityHint={value.length < minLength ? `Enter at least ${minLength} digits` : "Submits the entered PIN"}
        >
          <Text style={[
            styles.submitText,
            value.length < minLength && styles.submitTextDisabled,
          ]}>Enter</Text>
      </TouchableOpacity>
    </View>
  );
}

const BUTTON_SIZE = 72;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.stone,
    marginHorizontal: spacing.sm,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: colors.deepTarn,
    borderColor: colors.deepTarn,
  },
  dotError: {
    borderColor: colors.alert,
    backgroundColor: colors.alert,
  },
  keypad: {
    width: '100%',
    maxWidth: 300,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radii.full,
    backgroundColor: colors.mist,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  buttonEmpty: {
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 28,
    fontWeight: '500',
    color: colors.deepTarn,
  },
  buttonTextDisabled: {
    color: colors.stone,
  },
  backspaceText: {
    fontSize: 24,
    color: colors.stone,
  },
  submitButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    backgroundColor: colors.deepTarn,
    borderRadius: radii.lg,
  },
  submitButtonDisabled: {
    backgroundColor: colors.mist,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  submitTextDisabled: {
    color: colors.stone,
  },
});
