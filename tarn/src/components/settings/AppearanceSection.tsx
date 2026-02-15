import React, { useState, useEffect } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { List } from 'react-native-paper';
import * as AlternateIcons from 'expo-alternate-app-icons';

import { colors } from '../../theme';

export function AppearanceSection() {
  const [currentIcon, setCurrentIcon] = useState<string | null>(null);

  useEffect(() => {
    setCurrentIcon(AlternateIcons.getAppIconName());
  }, []);

  const handleIconChange = async (iconName: string | null) => {
    try {
      if (iconName === null) {
        await AlternateIcons.resetAppIcon();
      } else {
        await AlternateIcons.setAlternateAppIcon(iconName);
      }
      setCurrentIcon(iconName);
    } catch (error) {
      Alert.alert('Error', 'Failed to change app icon.');
    }
  };

  return (
    <List.Section>
      <List.Subheader style={styles.sectionHeader}>Appearance</List.Subheader>

      <List.Item
        title="Default"
        description="Original app icon"
        left={(props) => <List.Icon {...props} icon="checkbox-blank-circle" />}
        right={() => currentIcon === null ? <List.Icon icon="check" color={colors.currentDay} /> : null}
        onPress={() => handleIconChange(null)}
        style={styles.listItem}
      />

      <List.Item
        title="Calculator"
        description="Disguise as calculator"
        left={(props) => <List.Icon {...props} icon="calculator" />}
        right={() => currentIcon === 'calculator' ? <List.Icon icon="check" color={colors.currentDay} /> : null}
        onPress={() => handleIconChange('calculator')}
        style={styles.listItem}
      />

      <List.Item
        title="Notes"
        description="Disguise as notes app"
        left={(props) => <List.Icon {...props} icon="note-text" />}
        right={() => currentIcon === 'notes' ? <List.Icon icon="check" color={colors.currentDay} /> : null}
        onPress={() => handleIconChange('notes')}
        style={styles.listItem}
      />

      <List.Item
        title="Weather"
        description="Disguise as weather app"
        left={(props) => <List.Icon {...props} icon="weather-partly-cloudy" />}
        right={() => currentIcon === 'weather' ? <List.Icon icon="check" color={colors.currentDay} /> : null}
        onPress={() => handleIconChange('weather')}
        style={styles.listItem}
      />
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
});
