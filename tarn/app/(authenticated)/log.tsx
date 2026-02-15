import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Localization from 'expo-localization';

import { colors, spacing, radii } from '@/theme';
import { FlowSelector, FlowLevel } from '@/components/FlowSelector';
import { TempInput, TempUnit } from '@/components/TempInput';
import { MucusSelector, MucusLevel } from '@/components/MucusSelector';
import { SymptomPicker } from '@/components/SymptomPicker';
import { useCyclesStore } from '@/lib/store/cycles';
import { formatDisplayDate, isToday } from '@/lib/utils/dates';
import { useAuthStore } from '@/lib/store/auth';

// Temperature is always stored in Celsius
// Convert to/from display unit as needed
function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9 / 5 + 32) * 10) / 10;
}

function fahrenheitToCelsius(f: number): number {
  return Math.round(((f - 32) * 5 / 9) * 10) / 10;
}

export default function LogScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { state: authState } = useAuthStore();
  const isDuress = authState === 'duress';

  const { symptoms, getEntryForDate, saveEntry, removeEntry, loadSymptoms } = useCyclesStore();

  // Form state
  const [flow, setFlow] = useState<FlowLevel>(0);
  const [temp, setTemp] = useState<number | null>(null);
  const [tempUnit, setTempUnit] = useState<TempUnit>('C');
  const [mucus, setMucus] = useState<MucusLevel>(0);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Detect locale for temperature unit
  const defaultUnit: TempUnit = useMemo(() => {
    const fahrenheitRegions = ['US', 'LR', 'MM', 'KY', 'PW', 'BS', 'BZ'];
    const region = Localization.getLocales()[0]?.regionCode ?? 'US';
    return fahrenheitRegions.includes(region) ? 'F' : 'C';
  }, []);

  // Snapshot of loaded values — compared against to detect real changes
  const initial = useRef<{
    flow: FlowLevel;
    temp: number | null;
    mucus: MucusLevel;
    symptoms: string[];
    note: string;
  }>({ flow: 0, temp: null, mucus: 0, symptoms: [], note: '' });
  const loaded = useRef(false);

  // Load existing entry and symptoms
  useEffect(() => {
    if (isDuress) return;

    loadSymptoms();
    setTempUnit(defaultUnit);

    let initFlow: FlowLevel = 0;
    let initTemp: number | null = null;
    let initMucus: MucusLevel = 0;
    let initSymptoms: string[] = [];
    let initNote = '';

    if (date) {
      const existingEntry = getEntryForDate(date);
      if (existingEntry) {
        initFlow = existingEntry.flow as FlowLevel;
        if (existingEntry.temp !== null) {
          initTemp = defaultUnit === 'F'
            ? celsiusToFahrenheit(existingEntry.temp)
            : existingEntry.temp;
        }
        initMucus = existingEntry.mucus as MucusLevel;
        initSymptoms = existingEntry.symptoms;
        initNote = existingEntry.note;
      }
    }

    setFlow(initFlow);
    setTemp(initTemp);
    setMucus(initMucus);
    setSelectedSymptoms(initSymptoms);
    setNote(initNote);

    initial.current = {
      flow: initFlow,
      temp: initTemp,
      mucus: initMucus,
      symptoms: initSymptoms,
      note: initNote,
    };
    loaded.current = true;
  }, [date, isDuress, defaultUnit]);

  // Track changes — compare current form state against the loaded snapshot
  useEffect(() => {
    if (!loaded.current || isDuress) {
      setHasChanges(false);
      return;
    }

    const init = initial.current;
    const changed =
      flow !== init.flow ||
      temp !== init.temp ||
      mucus !== init.mucus ||
      JSON.stringify([...selectedSymptoms].sort()) !==
        JSON.stringify([...init.symptoms].sort()) ||
      note !== init.note;

    setHasChanges(changed);
  }, [flow, temp, mucus, selectedSymptoms, note, isDuress]);

  const handleSave = useCallback(async () => {
    if (!date || isDuress || isSaving) return;

    // Don't save if nothing to save
    if (flow === 0 && temp === null && mucus === 0 && selectedSymptoms.length === 0 && note.length === 0) {
      router.back();
      return;
    }

    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Convert display temp back to Celsius for storage
      const tempCelsius = temp !== null && tempUnit === 'F'
        ? fahrenheitToCelsius(temp)
        : temp;

      await saveEntry({
        date,
        flow,
        temp: tempCelsius,
        mucus,
        symptoms: selectedSymptoms,
        note,
      });
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [date, flow, temp, mucus, selectedSymptoms, note, isDuress, isSaving, saveEntry, router]);

  const handleDelete = useCallback(() => {
    if (!date || isDuress) return;

    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeEntry(date);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete entry.');
            }
          },
        },
      ]
    );
  }, [date, isDuress, removeEntry, router]);

  const handleBack = useCallback(() => {
    if (hasChanges && !isDuress) {
      Alert.alert(
        'Unsaved Changes',
        'Do you want to save your changes?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
          { text: 'Save', onPress: handleSave },
        ]
      );
    } else {
      router.back();
    }
  }, [hasChanges, isDuress, handleSave, router]);

  if (!date) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>No date selected</Text>
      </SafeAreaView>
    );
  }

  const dateLabel = isToday(date) ? 'Today' : formatDisplayDate(date, 'long');
  const existingEntry = getEntryForDate(date);
  const hasExistingData = existingEntry && (existingEntry.flow > 0 || existingEntry.temp !== null || existingEntry.symptoms.length > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={handleBack}
              iconColor={colors.deepTarn}
            />
          </View>
          <Text style={styles.dateText}>{dateLabel}</Text>
          <View style={styles.headerRight}>
            {hasExistingData && !isDuress && (
              <IconButton
                icon="delete-outline"
                size={24}
                onPress={handleDelete}
                iconColor={colors.alert}
              />
            )}
          </View>
        </View>

        {isDuress ? (
          // Duress mode - show empty state
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No data for this day</Text>
          </View>
        ) : (
          // Normal mode - show form
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <FlowSelector value={flow} onChange={setFlow} />

            <TempInput
              value={temp}
              onChange={setTemp}
              unit={tempUnit}
              onUnitChange={setTempUnit}
            />

            <MucusSelector value={mucus} onChange={setMucus} />

            <SymptomPicker
              symptoms={symptoms}
              selectedIds={selectedSymptoms}
              onChange={setSelectedSymptoms}
            />

            {/* Notes */}
            <View style={styles.notesContainer}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                mode="outlined"
                value={note}
                onChangeText={setNote}
                placeholder="Optional notes..."
                multiline
                numberOfLines={3}
                style={styles.notesInput}
                outlineColor={colors.mist}
                activeOutlineColor={colors.deepTarn}
              />
            </View>

            {/* Done button — saves changes and goes back */}
            <Button
              mode="contained"
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving}
              style={styles.doneButton}
              contentStyle={styles.doneButtonContent}
            >
              Done
            </Button>

            <View style={styles.bottomPadding} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.mist,
  },
  headerLeft: {
    width: 48,
  },
  headerRight: {
    width: 48,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.deepTarn,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.stone,
  },
  notesContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.deepTarn,
    marginBottom: spacing.sm,
  },
  notesInput: {
    backgroundColor: colors.white,
  },
  doneButton: {
    backgroundColor: colors.deepTarn,
    marginTop: spacing.md,
  },
  doneButtonContent: {
    paddingVertical: spacing.xs,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});
