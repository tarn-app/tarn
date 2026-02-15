import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { PinEntryFlow } from '@/components/PinEntryFlow';
import { useAuthStore } from '@/lib/store/auth';
import { colors, spacing } from '@/theme';

export default function CreatePinScreen() {
  const router = useRouter();
  const { completeSetup } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async (pin: string) => {
    setIsLoading(true);
    try {
      await completeSetup(pin);
      router.replace('/setup/done');
    } catch (error) {
      console.error('Setup failed:', error);
      throw error; // Re-throw to trigger error state in PinEntryFlow
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => router.back()}
          iconColor={colors.deepTarn}
        />
      </View>

      <View style={styles.content}>
        <PinEntryFlow
          title="Choose a PIN"
          subtitle="4-6 digits"
          confirmTitle="Confirm PIN"
          confirmSubtitle="Enter your PIN again"
          onComplete={handleComplete}
          onBack={() => router.back()}
          disabled={isLoading}
          loadingText="Setting up..."
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
  },
});
