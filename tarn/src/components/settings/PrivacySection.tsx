import React from 'react';
import { StyleSheet } from 'react-native';
import { List, Switch } from 'react-native-paper';

import { colors } from '../../theme';

interface PrivacySectionProps {
  screenshotProtection: boolean;
  setScreenshotProtection: (enabled: boolean) => void;
}

export function PrivacySection({
  screenshotProtection,
  setScreenshotProtection,
}: PrivacySectionProps) {
  return (
    <List.Section>
      <List.Subheader style={styles.sectionHeader}>Privacy</List.Subheader>

      <List.Item
        title="Screenshot protection"
        description="Prevent screenshots and screen recording"
        left={(props) => <List.Icon {...props} icon="cellphone-screenshot" />}
        right={() => (
          <Switch
            value={screenshotProtection}
            onValueChange={setScreenshotProtection}
            color={colors.currentDay}
          />
        )}
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
