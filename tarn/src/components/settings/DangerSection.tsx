import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, List, Button, TextInput } from 'react-native-paper';

import { colors, spacing } from '../../theme';
import { manualWipe } from '../../lib/crypto/destruct';

interface DangerSectionProps {
  onLock: () => void;
  onReset: () => void;
}

export function DangerSection({ onLock, onReset }: DangerSectionProps) {
  const [wipeConfirm, setWipeConfirm] = useState('');
  const [showWipeInput, setShowWipeInput] = useState(false);

  const handleManualWipe = async () => {
    if (wipeConfirm === 'DELETE') {
      await manualWipe();
      onReset();
    } else {
      Alert.alert('Incorrect', 'Type DELETE exactly to confirm');
    }
    setWipeConfirm('');
    setShowWipeInput(false);
  };

  return (
    <>
      <List.Section>
        <List.Subheader style={[styles.sectionHeader, { color: colors.alert }]}>
          Danger Zone
        </List.Subheader>

        {!showWipeInput ? (
          <Button
            mode="outlined"
            onPress={() => setShowWipeInput(true)}
            style={styles.wipeButton}
            textColor={colors.alert}
          >
            Wipe All Data
          </Button>
        ) : (
          <View style={styles.wipeContainer}>
            <Text style={styles.wipeWarning}>
              This will permanently delete all your data. Type DELETE to confirm.
            </Text>
            <TextInput
              value={wipeConfirm}
              onChangeText={setWipeConfirm}
              placeholder="Type DELETE"
              style={styles.wipeInput}
              autoCapitalize="characters"
            />
            <View style={styles.wipeActions}>
              <Button
                mode="text"
                onPress={() => {
                  setShowWipeInput(false);
                  setWipeConfirm('');
                }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleManualWipe}
                buttonColor={colors.alert}
                disabled={wipeConfirm !== 'DELETE'}
              >
                Confirm Wipe
              </Button>
            </View>
          </View>
        )}
      </List.Section>

      <View style={styles.lockContainer}>
        <Button
          mode="contained"
          onPress={onLock}
          style={styles.lockButton}
          icon="lock"
        >
          Lock App
        </Button>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    color: colors.stone,
    fontWeight: '600',
  },
  wipeButton: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderColor: colors.alert,
  },
  wipeContainer: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.alert,
  },
  wipeWarning: {
    color: colors.alert,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  wipeInput: {
    backgroundColor: colors.mist,
    marginBottom: spacing.md,
  },
  wipeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  lockContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  lockButton: {
    backgroundColor: colors.deepTarn,
  },
});
