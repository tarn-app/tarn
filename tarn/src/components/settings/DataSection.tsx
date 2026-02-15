import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, List, Divider, Button, Dialog, Portal } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';

import { colors, spacing, radii } from '../../theme';
import { shareExport, importData } from '../../lib/backup';
import { deleteEntriesOlderThan } from '../../lib/db/queries';
import { PinPad } from '../PinPad';

const RETENTION_KEY = 'tarn_retention_months';

interface DataSectionProps {
  getDerivedKey: () => string | null;
  loadAllEntries: () => Promise<void>;
}

export function DataSection({ getDerivedKey, loadAllEntries }: DataSectionProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [retentionMonths, setRetentionMonths] = useState(0);
  const [isPurging, setIsPurging] = useState(false);

  // Import PIN prompt state
  const [showImportPin, setShowImportPin] = useState(false);
  const [importPin, setImportPin] = useState('');
  const [importPinError, setImportPinError] = useState(false);

  // Load persisted retention setting
  useEffect(() => {
    SecureStore.getItemAsync(RETENTION_KEY).then((value) => {
      if (value !== null) {
        setRetentionMonths(parseInt(value, 10));
      }
    });
  }, []);

  const updateRetentionMonths = (months: number) => {
    setRetentionMonths(months);
    SecureStore.setItemAsync(RETENTION_KEY, String(months)).catch((e) => {
      if (__DEV__) console.error('Failed to persist retention setting:', e);
    });
  };

  const handleExport = async () => {
    const key = getDerivedKey();
    if (!key) {
      Alert.alert('Error', 'Unable to export. Please lock and unlock the app.');
      return;
    }

    setIsExporting(true);
    try {
      await shareExport(key);
      Alert.alert('Export Complete', 'Your encrypted backup has been saved.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      Alert.alert('Export Failed', message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    Alert.alert(
      'Import Backup',
      'You will need to enter the PIN that was used when the backup was created.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            setImportPin('');
            setImportPinError(false);
            setShowImportPin(true);
          },
        },
      ]
    );
  };

  const handleImportPinSubmit = async () => {
    if (importPin.length < 4) return;

    setIsImporting(true);
    try {
      const count = await importData(importPin);
      await loadAllEntries();
      setShowImportPin(false);
      setImportPin('');
      Alert.alert('Import Complete', `Imported ${count} entries.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      if (message.includes('Cipher') || message.includes('final failed') || message.includes('salt')) {
        setImportPinError(true);
        setImportPin('');
        setTimeout(() => setImportPinError(false), 500);
        Alert.alert('Wrong PIN', 'The PIN does not match the one used to create this backup.');
      } else if (message === 'No file selected') {
        setShowImportPin(false);
        setImportPin('');
      } else {
        Alert.alert('Import Failed', message);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handlePurgeOldData = async () => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    Alert.alert(
      'Delete Old Data',
      `This will permanently delete all entries older than ${retentionMonths} months (before ${cutoffStr}). This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsPurging(true);
            try {
              const count = await deleteEntriesOlderThan(cutoffStr);
              await loadAllEntries();
              Alert.alert('Done', `Deleted ${count} old entries.`);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete old data.');
            } finally {
              setIsPurging(false);
            }
          },
        },
      ]
    );
  };

  return (
    <List.Section>
      <List.Subheader style={styles.sectionHeader}>Data</List.Subheader>

      <List.Item
        title={isExporting ? "Exporting..." : "Export data"}
        description="Encrypted with your current PIN"
        left={(props) => <List.Icon {...props} icon="export" />}
        onPress={handleExport}
        disabled={isExporting || isImporting}
        style={styles.listItem}
      />

      <List.Item
        title={isImporting ? "Importing..." : "Import data"}
        description="Restore from backup"
        left={(props) => <List.Icon {...props} icon="import" />}
        onPress={handleImport}
        disabled={isExporting || isImporting}
        style={styles.listItem}
      />

      <Divider />

      <View style={styles.retentionContainer}>
        <View style={styles.retentionHeader}>
          <List.Icon icon="calendar-clock" />
          <Text style={styles.retentionLabel}>Data retention</Text>
        </View>
        <View style={styles.retentionOptions}>
          {([
            { value: 0, label: 'Forever' },
            { value: 6, label: '6 mo' },
            { value: 12, label: '1 yr' },
            { value: 24, label: '2 yr' },
          ] as const).map((option) => (
            <Button
              key={option.value}
              mode={retentionMonths === option.value ? 'contained' : 'outlined'}
              onPress={() => updateRetentionMonths(option.value)}
              compact
              style={styles.retentionButton}
              buttonColor={retentionMonths === option.value ? colors.deepTarn : undefined}
            >
              {option.label}
            </Button>
          ))}
        </View>
      </View>

      {retentionMonths > 0 && (
        <Button
          mode="outlined"
          onPress={handlePurgeOldData}
          style={styles.purgeButton}
          loading={isPurging}
          disabled={isPurging}
        >
          Delete data older than {retentionMonths} months
        </Button>
      )}

      {/* Import PIN Dialog */}
      <Portal>
        <Dialog visible={showImportPin} onDismiss={() => { setShowImportPin(false); setImportPin(''); }}>
          <Dialog.Title>Enter Backup PIN</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Enter the PIN you used when this backup was created.
            </Text>
            <View style={styles.dialogPinPad}>
              <PinPad
                value={importPin}
                onChange={setImportPin}
                onSubmit={handleImportPinSubmit}
                error={importPinError}
                disabled={isImporting}
                minLength={4}
                maxLength={6}
              />
            </View>
          </Dialog.Content>
        </Dialog>
      </Portal>
    </List.Section>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    color: colors.stone,
    fontWeight: '600',
  },
  listItem: {
    backgroundColor: colors.white,
  },
  retentionContainer: {
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  retentionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  retentionLabel: {
    fontSize: 16,
    color: colors.stone,
  },
  retentionOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingLeft: spacing.xxl,
  },
  retentionButton: {
    borderColor: colors.mist,
    borderRadius: radii.md,
  },
  purgeButton: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderColor: colors.stone,
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
});
