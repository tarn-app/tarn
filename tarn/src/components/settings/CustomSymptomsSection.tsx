import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, List, Button, TextInput } from 'react-native-paper';

import { colors, spacing } from '../../theme';
import { getAllSymptoms, addSymptom, deleteSymptom, Symptom } from '../../lib/db/queries';

interface CustomSymptomsSectionProps {
  isDuress: boolean;
}

export function CustomSymptomsSection({ isDuress }: CustomSymptomsSectionProps) {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [showAddSymptom, setShowAddSymptom] = useState(false);
  const [newSymptomName, setNewSymptomName] = useState('');

  useEffect(() => {
    if (!isDuress) {
      loadSymptoms();
    }
  }, [isDuress]);

  const loadSymptoms = async () => {
    try {
      const allSymptoms = await getAllSymptoms();
      setSymptoms(allSymptoms.filter((s) => s.id.startsWith('custom_')));
    } catch {
      // Database not open (duress mode)
    }
  };

  const handleAddSymptom = async () => {
    const trimmed = newSymptomName.trim();
    if (!trimmed) return;

    try {
      const newSymptom = await addSymptom(trimmed);
      setSymptoms((prev) => [...prev, newSymptom]);
      setNewSymptomName('');
      setShowAddSymptom(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add symptom.');
    }
  };

  const handleDeleteSymptom = (symptom: Symptom) => {
    Alert.alert(
      'Delete Symptom',
      `Remove "${symptom.name}" from your list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSymptom(symptom.id);
              setSymptoms((prev) => prev.filter((s) => s.id !== symptom.id));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete symptom.');
            }
          },
        },
      ]
    );
  };

  return (
    <List.Section>
      <List.Subheader style={styles.sectionHeader}>Custom Symptoms</List.Subheader>

      {symptoms.length === 0 ? (
        <Text style={styles.emptySymptoms}>No custom symptoms added</Text>
      ) : (
        symptoms.map((symptom) => (
          <List.Item
            key={symptom.id}
            title={symptom.name}
            left={(props) => <List.Icon {...props} icon="tag" />}
            right={(props) => (
              <List.Icon
                {...props}
                icon="close"
                color={colors.stone}
              />
            )}
            onPress={() => handleDeleteSymptom(symptom)}
            style={styles.listItem}
          />
        ))
      )}

      {showAddSymptom ? (
        <View style={styles.addSymptomContainer}>
          <TextInput
            value={newSymptomName}
            onChangeText={setNewSymptomName}
            placeholder="Symptom name"
            style={styles.symptomInput}
            maxLength={30}
            autoFocus
          />
          <View style={styles.addSymptomActions}>
            <Button
              mode="text"
              onPress={() => {
                setShowAddSymptom(false);
                setNewSymptomName('');
              }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleAddSymptom}
              disabled={!newSymptomName.trim()}
              buttonColor={colors.deepTarn}
            >
              Add
            </Button>
          </View>
        </View>
      ) : (
        <Button
          mode="text"
          onPress={() => setShowAddSymptom(true)}
          icon="plus"
          style={styles.addSymptomButton}
        >
          Add custom symptom
        </Button>
      )}
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
  emptySymptoms: {
    color: colors.stone,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontStyle: 'italic',
  },
  addSymptomContainer: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  symptomInput: {
    backgroundColor: colors.mist,
    marginBottom: spacing.md,
  },
  addSymptomActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  addSymptomButton: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
});
