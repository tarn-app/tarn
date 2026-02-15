import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, List, Divider, Button, Dialog, Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import Constants from 'expo-constants';
import { colors, spacing } from '@/theme';
import { useAuthStore } from '@/lib/store/auth';
import { hasDuressPin, clearDuressPin, setDuressPin, isMainPin, isDuressPin } from '@/lib/crypto/duress';
import { getThreshold, setThreshold } from '@/lib/crypto/attempts';
import { getOrCreateSalt } from '@/lib/crypto/keys';
import { PinEntryFlow } from '@/components/PinEntryFlow';
import { PinPad } from '@/components/PinPad';
import { useCyclesStore } from '@/lib/store/cycles';
import { SecuritySection } from '@/components/settings/SecuritySection';
import { PrivacySection } from '@/components/settings/PrivacySection';
import { DataSection } from '@/components/settings/DataSection';
import { CustomSymptomsSection } from '@/components/settings/CustomSymptomsSection';
import { AppearanceSection } from '@/components/settings/AppearanceSection';
import { DangerSection } from '@/components/settings/DangerSection';
import { DebugSection } from '@/components/settings/DebugSection';

type SettingsDialog =
  | 'none'
  | 'duress-setup'
  | 'change-pin';

export default function SettingsScreen() {
  const { state, showAttempts, setShowAttempts, duressBehavior, setDuressBehavior, screenshotProtection, setScreenshotProtection, lock, reset, changePin, verifyPin, getDerivedKey } = useAuthStore(
    useShallow((s) => ({
      state: s.state,
      showAttempts: s.showAttempts,
      setShowAttempts: s.setShowAttempts,
      duressBehavior: s.duressBehavior,
      setDuressBehavior: s.setDuressBehavior,
      screenshotProtection: s.screenshotProtection,
      setScreenshotProtection: s.setScreenshotProtection,
      lock: s.lock,
      reset: s.reset,
      changePin: s.changePin,
      verifyPin: s.verifyPin,
      getDerivedKey: s.getDerivedKey,
    }))
  );
  const loadAllEntries = useCyclesStore((s) => s.loadAllEntries);
  const isDuress = state === 'duress';

  // Dialog and PIN state
  const [hasDuress, setHasDuress] = useState(false);
  const [threshold, setThresholdState] = useState(7);
  const [dialogType, setDialogType] = useState<SettingsDialog>('none');
  const [currentPinForChange, setCurrentPinForChange] = useState('');
  const [currentPinVerified, setCurrentPinVerified] = useState(false);
  const [currentPinError, setCurrentPinError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const duressExists = await hasDuressPin();
    setHasDuress(duressExists);

    const currentThreshold = await getThreshold();
    setThresholdState(currentThreshold);
  };

  const handleThresholdChange = async (value: number) => {
    const rounded = Math.round(value);
    setThresholdState(rounded);
    await setThreshold(rounded);
  };

  const closeDialog = () => {
    setDialogType('none');
    setCurrentPinForChange('');
    setCurrentPinVerified(false);
    setCurrentPinError(false);
    setIsProcessing(false);
  };

  // Duress PIN handlers
  const handleDuressSetup = () => {
    setDialogType('duress-setup');
  };

  const handleRemoveDuress = () => {
    Alert.alert(
      'Remove Safety PIN',
      'Are you sure you want to remove the safety PIN?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await clearDuressPin();
            setHasDuress(false);
          },
        },
      ]
    );
  };

  const validateDuressPin = async (pin: string): Promise<string | null> => {
    const salt = await getOrCreateSalt();
    const mainKey = getDerivedKey();
    if (!mainKey) {
      return 'Unable to verify';
    }
    if (await isMainPin(pin, salt, mainKey)) {
      return 'Please choose a different PIN';
    }
    return null;
  };

  const handleDuressComplete = async (pin: string) => {
    setIsProcessing(true);
    try {
      const salt = await getOrCreateSalt();
      const mainKey = getDerivedKey();
      if (!mainKey) {
        Alert.alert('Error', 'Unable to verify main PIN.');
        return;
      }
      await setDuressPin(pin, salt, mainKey);
      setHasDuress(true);
      closeDialog();
      Alert.alert('Success', 'Safety PIN has been set up.');
    } catch (error) {
      Alert.alert('Error', 'Failed to set up safety PIN.');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  // Change PIN handlers
  const handleChangePinStart = () => {
    setCurrentPinForChange('');
    setCurrentPinVerified(false);
    setCurrentPinError(false);
    setDialogType('change-pin');
  };

  const handleCurrentPinSubmit = async () => {
    if (currentPinForChange.length < 4) return;

    setIsProcessing(true);
    try {
      const result = await verifyPin(currentPinForChange);
      if (result === 'UNLOCKED') {
        setCurrentPinVerified(true);
      } else if (result === 'DESTRUCTED' || result === 'DURESS_MODE') {
        closeDialog();
      } else {
        setCurrentPinError(true);
        setCurrentPinForChange('');
        setTimeout(() => setCurrentPinError(false), 500);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const validateNewPin = async (pin: string): Promise<string | null> => {
    const salt = await getOrCreateSalt();
    if (await isDuressPin(pin, salt)) {
      return 'Please choose a different PIN';
    }
    return null;
  };

  const handleNewPinComplete = async (newPin: string) => {
    setIsProcessing(true);
    try {
      const result = await changePin(currentPinForChange, newPin);

      if (result === 'SUCCESS') {
        closeDialog();
        Alert.alert('Success', 'Your PIN has been changed.');
      } else if (result === 'WRONG_CURRENT_PIN') {
        setCurrentPinVerified(false);
        setCurrentPinForChange('');
        setCurrentPinError(true);
        setTimeout(() => setCurrentPinError(false), 500);
        Alert.alert('Incorrect PIN', 'The current PIN you entered is wrong.');
      } else {
        Alert.alert('Error', 'Failed to change PIN. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <SecuritySection
          showAttempts={showAttempts}
          setShowAttempts={setShowAttempts}
          duressBehavior={duressBehavior}
          setDuressBehavior={setDuressBehavior}
          hasDuress={hasDuress}
          threshold={threshold}
          onThresholdChange={handleThresholdChange}
          onChangePinStart={handleChangePinStart}
          onDuressSetup={handleDuressSetup}
          onRemoveDuress={handleRemoveDuress}
        />

        <PrivacySection
          screenshotProtection={screenshotProtection}
          setScreenshotProtection={setScreenshotProtection}
        />

        <DataSection
          getDerivedKey={getDerivedKey}
          loadAllEntries={loadAllEntries}
        />

        <CustomSymptomsSection isDuress={isDuress} />

        <AppearanceSection />

        <DangerSection onLock={lock} onReset={reset} />

        {__DEV__ && <DebugSection loadAllEntries={loadAllEntries} />}

        {/* About Section */}
        <List.Section>
          <List.Subheader style={styles.sectionHeader}>About</List.Subheader>
          <List.Item
            title="Version"
            description={Constants.expoConfig?.version ?? 'unknown'}
            left={(props) => <List.Icon {...props} icon="information" />}
            style={styles.listItem}
          />
          <List.Item
            title="Source Code"
            description="github.com/tarn-app/tarn"
            left={(props) => <List.Icon {...props} icon="github" />}
            style={styles.listItem}
          />
          <List.Item
            title="Security Model"
            description="github.com/tarn-app/tarn/blob/main/SECURITY.md"
            left={(props) => <List.Icon {...props} icon="shield-check" />}
            style={styles.listItem}
          />
          <Divider />
          <View style={styles.legalContainer}>
            <Text style={styles.legalText}>
              Tarn is a personal health journal. It is not medical software and does not provide medical advice.
              Predictions are estimates based on your logged data and may not be accurate.
            </Text>
            <Text style={styles.legalText}>
              Your data is stored locally on your device and encrypted with your PIN.
              No data is ever sent to external servers.
            </Text>
          </View>
        </List.Section>

        <View style={styles.footer} />
      </ScrollView>

      {/* Safety PIN Setup Dialog */}
      <Portal>
        <Dialog visible={dialogType === 'duress-setup'} onDismiss={closeDialog}>
          <Dialog.Title>Set Up Safety PIN</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Choose a PIN that {duressBehavior === 'wipe' ? 'wipes all data' : 'shows an empty app'} when entered.
            </Text>
            <View style={styles.dialogPinPad}>
              <PinEntryFlow
                title="Choose Safety PIN"
                subtitle="4-6 digits"
                onComplete={handleDuressComplete}
                onValidate={validateDuressPin}
                onBack={closeDialog}
                disabled={isProcessing}
                loadingText="Setting up..."
              />
            </View>
          </Dialog.Content>
        </Dialog>

        {/* Change PIN Dialog */}
        <Dialog visible={dialogType === 'change-pin'} onDismiss={closeDialog}>
          <Dialog.Title>Change PIN</Dialog.Title>
          <Dialog.Content>
            {!currentPinVerified ? (
              <>
                <Text style={styles.dialogText}>
                  Enter your current PIN to continue.
                </Text>
                <View style={styles.dialogPinPad}>
                  <PinPad
                    value={currentPinForChange}
                    onChange={setCurrentPinForChange}
                    onSubmit={handleCurrentPinSubmit}
                    error={currentPinError}
                    disabled={isProcessing}
                    minLength={4}
                    maxLength={6}
                  />
                </View>
                <Button onPress={closeDialog} style={styles.dialogBackButton}>Cancel</Button>
              </>
            ) : (
              <View style={styles.dialogPinPad}>
                <PinEntryFlow
                  title="New PIN"
                  subtitle="4-6 digits"
                  onComplete={handleNewPinComplete}
                  onValidate={validateNewPin}
                  onBack={() => {
                    setCurrentPinVerified(false);
                    setCurrentPinForChange('');
                  }}
                  disabled={isProcessing}
                  loadingText="Updating..."
                />
              </View>
            )}
          </Dialog.Content>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.deepTarn,
  },
  sectionHeader: {
    color: colors.stone,
    fontWeight: '600',
  },
  listItem: {
    backgroundColor: colors.white,
  },
  footer: {
    height: spacing.xxl,
  },
  dialogText: {
    fontSize: 14,
    color: colors.stone,
    marginBottom: spacing.md,
  },
  dialogPinPad: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  dialogBackButton: {
    marginTop: spacing.md,
  },
  legalContainer: {
    padding: spacing.lg,
  },
  legalText: {
    fontSize: 12,
    color: colors.stone,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
});
