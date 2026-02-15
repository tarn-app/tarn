import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, spacing, radii } from '../theme';
import { CyclePhase } from '../lib/predictions/engine';
import { getPhaseInfo, PhaseInfo } from '../lib/predictions/phases';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface PhaseCardProps {
  phase: CyclePhase;
  cycleDay: number;
}

export function PhaseCard({ phase, cycleDay }: PhaseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const phaseInfo = getPhaseInfo(phase);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: phaseInfo.color }]}
      onPress={toggleExpanded}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Day ${cycleDay}, ${phaseInfo.shortName} phase`}
      accessibilityHint={expanded ? 'Tap to collapse' : 'Tap to expand for more information'}
      accessibilityState={{ expanded }}
    >
      {/* Header - always visible */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.dayText}>Day {cycleDay}</Text>
          <Text style={styles.phaseText}>{phaseInfo.shortName}</Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={colors.stone}
        />
      </View>

      {/* Expanded content */}
      {expanded && (
        <View style={styles.content}>
          {/* Body */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What's happening</Text>
            <Text style={styles.sectionText}>{phaseInfo.body}</Text>
          </View>

          {/* Movement */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="run" size={16} color={colors.stone} />
              <Text style={styles.sectionTitle}>Movement</Text>
            </View>
            <Text style={styles.sectionText}>{phaseInfo.movement}</Text>
          </View>

          {/* Nutrition */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="food-apple" size={16} color={colors.stone} />
              <Text style={styles.sectionTitle}>Nutrition</Text>
            </View>
            <Text style={styles.sectionText}>{phaseInfo.nutrition}</Text>
          </View>

          {/* Mindset */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="head-heart" size={16} color={colors.stone} />
              <Text style={styles.sectionTitle}>Mindset</Text>
            </View>
            <Text style={styles.sectionText}>{phaseInfo.mindset}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.deepTarn,
  },
  phaseText: {
    fontSize: 14,
    color: colors.stone,
  },
  content: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.mist,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.stone,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionText: {
    fontSize: 14,
    color: colors.stone,
    lineHeight: 20,
  },
});
