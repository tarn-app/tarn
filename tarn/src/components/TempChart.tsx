import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Path, Line, Circle, G, Text as SvgText } from 'react-native-svg';

import { colors, spacing, radii } from '../theme';
import { Entry } from '../lib/db/queries';
import { formatDisplayDate } from '../lib/utils/dates';

interface TempChartProps {
  entries: Entry[];
  height?: number;
}

const CHART_PADDING = { top: 20, right: 20, bottom: 30, left: 45 };
const COVERLINE_TEMP = 36.5; // Default coverline for BBT

export function TempChart({ entries, height = 200 }: TempChartProps) {
  const width = Dimensions.get('window').width - spacing.lg * 2;

  const chartData = useMemo(() => {
    // Filter entries with temperature data and sort by date
    const tempEntries = entries
      .filter((e) => e.temp !== null && e.temp > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days with temp data

    if (tempEntries.length < 2) {
      return null;
    }

    const temps = tempEntries.map((e) => e.temp as number);
    const minTemp = Math.floor(Math.min(...temps) * 10) / 10 - 0.1;
    const maxTemp = Math.ceil(Math.max(...temps) * 10) / 10 + 0.1;
    const tempRange = maxTemp - minTemp;

    const chartWidth = width - CHART_PADDING.left - CHART_PADDING.right;
    const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;

    // Calculate points
    const points = tempEntries.map((entry, index) => {
      const x = CHART_PADDING.left + (index / (tempEntries.length - 1)) * chartWidth;
      const y = CHART_PADDING.top + chartHeight - ((entry.temp! - minTemp) / tempRange) * chartHeight;
      return { x, y, entry };
    });

    // Create path
    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    // Coverline position
    const coverlineY = CHART_PADDING.top + chartHeight - ((COVERLINE_TEMP - minTemp) / tempRange) * chartHeight;

    // Y-axis labels (temperatures)
    const yLabels: { temp: number; y: number }[] = [];
    const tempStep = 0.2;
    for (let t = Math.ceil(minTemp / tempStep) * tempStep; t <= maxTemp; t += tempStep) {
      const y = CHART_PADDING.top + chartHeight - ((t - minTemp) / tempRange) * chartHeight;
      yLabels.push({ temp: t, y });
    }

    return {
      points,
      pathD,
      coverlineY,
      yLabels,
      minTemp,
      maxTemp,
      tempEntries,
      chartWidth,
      chartHeight,
    };
  }, [entries, width, height]);

  if (!chartData) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.emptyText}>
          Log temperature data for at least 2 days to see your chart
        </Text>
      </View>
    );
  }

  const { points, pathD, coverlineY, yLabels, chartWidth } = chartData;

  const accessibilityDescription = `Temperature chart showing ${points.length} data points. Range: ${chartData.minTemp.toFixed(1)} to ${chartData.maxTemp.toFixed(1)} degrees.`;

  return (
    <View style={styles.container} accessible accessibilityLabel={accessibilityDescription}>
      <Text style={styles.title}>Temperature Trend</Text>
      <Svg width={width} height={height} accessibilityElementsHidden>
        {/* Y-axis labels */}
        {yLabels.map(({ temp, y }) => (
          <G key={temp}>
            <Line
              x1={CHART_PADDING.left}
              y1={y}
              x2={width - CHART_PADDING.right}
              y2={y}
              stroke={colors.mist}
              strokeWidth={1}
            />
            <SvgText
              x={CHART_PADDING.left - 5}
              y={y + 4}
              fontSize={10}
              fill={colors.stone}
              textAnchor="end"
            >
              {temp.toFixed(1)}
            </SvgText>
          </G>
        ))}

        {/* Coverline */}
        {coverlineY > CHART_PADDING.top && coverlineY < height - CHART_PADDING.bottom && (
          <Line
            x1={CHART_PADDING.left}
            y1={coverlineY}
            x2={width - CHART_PADDING.right}
            y2={coverlineY}
            stroke={colors.ovulation}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        )}

        {/* Temperature line */}
        <Path
          d={pathD}
          fill="none"
          stroke={colors.deepTarn}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point) => (
          <Circle
            key={point.entry.date}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={colors.white}
            stroke={colors.deepTarn}
            strokeWidth={2}
          />
        ))}

        {/* X-axis labels (dates) - show first, middle, last */}
        {[0, Math.floor(points.length / 2), points.length - 1].map((idx) => {
          const point = points[idx];
          if (!point) return null;
          return (
            <SvgText
              key={idx}
              x={point.x}
              y={height - 10}
              fontSize={10}
              fill={colors.stone}
              textAnchor="middle"
            >
              {formatDisplayDate(point.entry.date, 'short')}
            </SvgText>
          );
        })}
      </Svg>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.deepTarn }]} />
          <Text style={styles.legendText}>Temperature</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, styles.legendDashed]} />
          <Text style={styles.legendText}>Coverline (36.5°)</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.deepTarn,
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.stone,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendLine: {
    width: 20,
    height: 2,
  },
  legendDashed: {
    backgroundColor: colors.ovulation,
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: 12,
    color: colors.stone,
  },
});
