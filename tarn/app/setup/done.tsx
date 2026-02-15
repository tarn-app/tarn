import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors, spacing } from '@/theme';

export default function DoneScreen() {
  const router = useRouter();

  useEffect(() => {
    // Auto-navigate to main app after a brief moment
    const timer = setTimeout(() => {
      router.replace('/(authenticated)/calendar');
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.checkmark}>✓</Text>
        <Text style={styles.title}>You're all set</Text>
        <Text style={styles.subtitle}>Your data is now encrypted</Text>
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
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  checkmark: {
    fontSize: 64,
    color: colors.currentDay,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.deepTarn,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.stone,
  },
});
