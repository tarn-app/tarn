import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useShallow } from 'zustand/react/shallow';
import { PinPad } from '@/components/PinPad';
import { useAuthStore } from '@/lib/store/auth';
import { colors, spacing } from '@/theme';

export default function PinEntryScreen() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const { submitPin, attemptsRemaining, showAttempts, state } = useAuthStore(
    useShallow((s) => ({
      submitPin: s.submitPin,
      attemptsRemaining: s.attemptsRemaining,
      showAttempts: s.showAttempts,
      state: s.state,
    }))
  );

  const handleSubmit = useCallback(async () => {
    if (loading || pin.length < 4) return;

    setLoading(true);
    setError(false);

    const result = await submitPin(pin);

    if (result === 'WRONG_PIN') {
      setError(true);
      setPin('');
      // Reset error state after animation
      setTimeout(() => setError(false), 500);
    }
    // UNLOCKED, DURESS_MODE, DESTRUCTED are handled by the auth store
    // which triggers navigation in _layout.tsx

    setLoading(false);
  }, [pin, submitPin, loading]);

  // Show destructed state
  if (state === 'destructed') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorTitle}>Data Corrupted</Text>
          <Text style={styles.errorText}>
            The app data appears to be corrupted. Please reinstall to continue.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Minimal, generic header - no branding */}
        <View style={styles.header}>
          <Text style={styles.title}>Enter PIN</Text>
        </View>

        {/* Attempts remaining (only if setting is enabled) */}
        {showAttempts && attemptsRemaining !== null && (
          <View style={styles.attemptsContainer}>
            <Text style={[
              styles.attemptsText,
              attemptsRemaining <= 2 && styles.attemptsWarning
            ]}>
              {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining
            </Text>
            {attemptsRemaining <= 2 && (
              <Text style={styles.warningText}>
                Data will be erased after failed attempts
              </Text>
            )}
          </View>
        )}

        <PinPad
          value={pin}
          onChange={setPin}
          onSubmit={handleSubmit}
          error={error}
          disabled={loading}
          minLength={4}
          maxLength={6}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.deepTarn,
  },
  attemptsContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  attemptsText: {
    textAlign: 'center',
    color: colors.stone,
    fontSize: 14,
  },
  attemptsWarning: {
    color: colors.alert,
    fontWeight: '600',
  },
  warningText: {
    textAlign: 'center',
    color: colors.alert,
    fontSize: 12,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.alert,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 16,
    color: colors.stone,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
