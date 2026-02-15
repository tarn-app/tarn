import React, { useMemo, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { colors, spacing, radii } from '../theme';
import {
  getCalendarGrid,
  isToday,
  isInMonth,
  isFuture,
  formatMonthYear,
  getPrevMonth,
  getNextMonth,
} from '../lib/utils/dates';
import { Entry } from '../lib/db/queries';

interface PredictedDates {
  period: Set<string>;
  fertile: Set<string>;
  ovulation: Set<string>;
}

interface CalendarGridProps {
  year: number;
  month: number;
  entries: Map<string, Entry>;
  onDatePress: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
  predictedDates?: PredictedDates;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const emptyPredictions: PredictedDates = {
  period: new Set(),
  fertile: new Set(),
  ovulation: new Set(),
};

const SWIPE_THRESHOLD = 50;

export function CalendarGrid({
  year,
  month,
  entries,
  onDatePress,
  onMonthChange,
  predictedDates = emptyPredictions,
}: CalendarGridProps) {

  const grid = useMemo(() => getCalendarGrid(year, month), [year, month]);

  const handlePrevMonth = useCallback(() => {
    const { year: newYear, month: newMonth } = getPrevMonth(year, month);
    onMonthChange(newYear, newMonth);
  }, [year, month, onMonthChange]);

  const handleNextMonth = useCallback(() => {
    const { year: newYear, month: newMonth } = getNextMonth(year, month);
    onMonthChange(newYear, newMonth);
  }, [year, month, onMonthChange]);

  // Swipe gesture for month navigation
  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(handlePrevMonth)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        runOnJS(handleNextMonth)();
      }
    });

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container}>
      {/* Month Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle} accessibilityRole="header">
          {formatMonthYear(year, month)}
        </Text>
        <TouchableOpacity
          onPress={handleNextMonth}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday Headers */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.grid}>
        {grid.map((date, index) => {
          const inCurrentMonth = isInMonth(date, year, month);
          const isCurrentDay = isToday(date);
          const isFutureDate = isFuture(date);
          const entry = entries.get(date);
          const hasFlow = entry && entry.flow > 0;
          const hasSymptoms = entry && entry.symptoms.length > 0;

          // Check prediction types (only show if no logged flow)
          const isPredictedPeriod = !hasFlow && predictedDates.period.has(date);
          const isPredictedFertile = !hasFlow && predictedDates.fertile.has(date);
          const isPredictedOvulation = !hasFlow && predictedDates.ovulation.has(date);
          const dayNumber = parseInt(date.split('-')[2], 10);

          const accessibilityParts = [
            `${dayNumber}`,
            isCurrentDay ? 'Today' : '',
            isFutureDate ? 'Future date' : '',
            hasFlow ? 'Has logged data' : '',
            isPredictedPeriod ? 'Predicted period' : '',
            isPredictedOvulation ? 'Predicted ovulation' : '',
            isPredictedFertile ? 'Fertile window' : '',
            hasSymptoms ? 'Has symptoms' : '',
          ].filter(Boolean);

          return (
            <TouchableOpacity
              key={date}
              style={[
                styles.dayCell,
                !inCurrentMonth && styles.dayCellOutside,
                isFutureDate && styles.dayCellFuture,
              ]}
              onPress={() => !isFutureDate && onDatePress(date)}
              activeOpacity={isFutureDate ? 1 : 0.7}
              accessibilityRole="button"
              accessibilityLabel={accessibilityParts.join(', ')}
              accessibilityHint={isFutureDate ? 'Cannot log future dates' : 'Tap to view or log entry'}
            >
              <View
                style={[
                  styles.dayContent,
                  hasFlow && styles.dayContentPeriod,
                  isPredictedPeriod && styles.dayContentPredictedPeriod,
                  isPredictedFertile && styles.dayContentPredictedFertile,
                  isPredictedOvulation && styles.dayContentPredictedOvulation,
                  isCurrentDay && styles.dayContentToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    !inCurrentMonth && styles.dayTextOutside,
                    hasFlow && styles.dayTextPeriod,
                    isCurrentDay && !hasFlow && styles.dayTextToday,
                    isCurrentDay && hasFlow && styles.dayTextTodayWithFlow,
                  ]}
                >
                  {dayNumber}
                </Text>
                {hasSymptoms && (
                  <View style={styles.symptomDot} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      </View>
    </GestureDetector>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  navButton: {
    padding: spacing.sm,
  },
  navText: {
    fontSize: 28,
    color: colors.deepTarn,
    fontWeight: '300',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.deepTarn,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.stone,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  dayCellOutside: {
    opacity: 0.3,
  },
  dayCellFuture: {
    opacity: 0.4,
  },
  dayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.full,
  },
  dayContentPeriod: {
    backgroundColor: colors.period,
  },
  dayContentPredictedPeriod: {
    backgroundColor: colors.phaseMenstrual + '30', // 30 = ~19% opacity
  },
  dayContentPredictedFertile: {
    backgroundColor: colors.phaseFollicular + '25', // 25 = ~15% opacity
  },
  dayContentPredictedOvulation: {
    backgroundColor: colors.phaseOvulation + '35', // 35 = ~21% opacity
    borderWidth: 2,
    borderColor: colors.phaseOvulation,
  },
  dayContentToday: {
    borderWidth: 2,
    borderColor: colors.currentDay,
  },
  dayText: {
    fontSize: 16,
    color: colors.stone,
  },
  dayTextOutside: {
    color: colors.predicted,
  },
  dayTextPeriod: {
    color: colors.white,
    fontWeight: '600',
  },
  dayTextToday: {
    fontWeight: '700',
    color: colors.currentDay,
  },
  dayTextTodayWithFlow: {
    fontWeight: '700',
    color: colors.white,
  },
  symptomDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.stone,
  },
});
