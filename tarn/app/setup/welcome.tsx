import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors, spacing } from '@/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>
            Set up a PIN to protect your data.
          </Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.infoText}>
            Your PIN encrypts all data stored on this device. Without the correct PIN, the data cannot be accessed.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() => router.push('/setup/create-pin')}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Get Started
        </Button>
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
    paddingHorizontal: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.deepTarn,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: 18,
    color: colors.stone,
    textAlign: 'center',
  },
  info: {
    backgroundColor: colors.mist,
    padding: spacing.lg,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 15,
    color: colors.stone,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.deepTarn,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
