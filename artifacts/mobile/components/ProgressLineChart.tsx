import React, { useMemo, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface DataPoint {
  label: string;
  value: number;
  subLabel?: string;
}

interface Props {
  data: DataPoint[];
  yUnit?: string;
  height?: number;
  pointSpacing?: number;
  onPress?: () => void;
}

const CHART_PADDING = 40;
const X_LABEL_HEIGHT = 25;
const Y_LABEL_WIDTH = 40;
const DOT_SIZE = 8;
const LINE_HEIGHT = 2;

function niceRound(value: number): number {
  if (value <= 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

export function ProgressLineChart({
  data,
  yUnit = "",
  height = 160,
  pointSpacing = 56,
  onPress,
}: Props) {
  const colors = useColors();
  const scrollRef = useRef<ScrollView>(null);

  const { yMin, yMax, yMid, points, chartWidth } = useMemo(() => {
    if (data.length === 0) {
      return {
        yMin: 0,
        yMax: 0,
        yMid: 0,
        points: [],
        chartWidth: 0,
      };
    }

    const values = data.map((d) => d.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);

    const niceMax = niceRound(rawMax);
    const niceMin =
      rawMin === niceMax ? Math.max(0, niceMax - niceRound(niceMax / 5)) : 0;

    const mid = Math.round((niceMin + niceMax) / 2);
    const range = niceMax - niceMin || 1;
    const chartH = height - CHART_PADDING;

    const pts = data.map((d, i) => ({
      x: CHART_PADDING + i * pointSpacing,
      y: CHART_PADDING / 2 + chartH - ((d.value - niceMin) / range) * chartH,
      value: d.value,
      label: d.label,
    }));

    return {
      yMin: niceMin,
      yMax: niceMax,
      yMid: mid,
      points: pts,
      chartWidth: pts.length > 0 ? pts[pts.length - 1]!.x + CHART_PADDING : 0,
    };
  }, [data, height, pointSpacing]);

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No data to chart
        </Text>
      </View>
    );
  }

  const chartH = height - CHART_PADDING;

  const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    segments.push({
      x1: points[i]!.x,
      y1: points[i]!.y,
      x2: points[i + 1]!.x,
      y2: points[i + 1]!.y,
    });
  }

  const chartContent = (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 16 }}
      scrollEnabled={!!onPress ? false : true}
    >
      <View
        style={[
          styles.container,
          { height: height + X_LABEL_HEIGHT, width: chartWidth + 20 },
        ]}
      >
        <View style={[styles.yAxis, { height: chartH + CHART_PADDING / 2 }]}>
          {[yMax, yMid, yMin].map((val, i) => (
            <Text
              key={i}
              style={[styles.yLabel, { color: colors.mutedForeground }]}
            >
              {val}
              {yUnit}
            </Text>
          ))}
        </View>

        <View
          style={[
            styles.chartArea,
            {
              height: chartH + CHART_PADDING + X_LABEL_HEIGHT,
              width: chartWidth + 10,
            },
          ]}
        >
          {[yMax, yMid, yMin].map((val, i) => {
            const yPos =
              CHART_PADDING / 2 +
              chartH -
              ((val - yMin) / (yMax - yMin || 1)) * chartH;
            return (
              <View
                key={i}
                style={[
                  styles.gridLine,
                  {
                    top: yPos,
                    width: "100%",
                    borderBottomColor: colors.border,
                  },
                ]}
              />
            );
          })}

          {segments.map((seg, i) => {
            const dx = seg.x2 - seg.x1;
            const dy = seg.y2 - seg.y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            return (
              <View
                key={`line-${i}`}
                style={
                  {
                    position: "absolute",
                    left: seg.x1,
                    top: seg.y1,
                    width: len,
                    height: LINE_HEIGHT,
                    backgroundColor: colors.primary,
                    borderRadius: 1,
                    transformOrigin: "left center",
                    transform: [{ rotate: `${angle}deg` }],
                  } as ViewStyle
                }
              />
            );
          })}

          {points.map((pt, i) => (
            <View
              key={`dot-${i}`}
              style={[
                styles.dot,
                {
                  left: pt.x - DOT_SIZE / 2,
                  top: pt.y - DOT_SIZE / 2,
                  backgroundColor: colors.primary,
                  borderColor: colors.background,
                },
              ]}
            />
          ))}

          {points.map((pt, i) => (
            <Text
              key={`lbl-${i}`}
              style={[
                styles.xLabel,
                {
                  left: pt.x - 20,
                  color: colors.mutedForeground,
                },
              ]}
              numberOfLines={1}
            >
              {pt.label}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {chartContent}
      </TouchableOpacity>
    );
  }

  return chartContent;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 4,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  yAxis: {
    width: Y_LABEL_WIDTH,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 8,
  },
  yLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  chartArea: {
    position: "relative",
  },
  gridLine: {
    position: "absolute",
    height: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    position: "absolute",
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    zIndex: 2,
  },
  xLabel: {
    position: "absolute",
    bottom: 7,
    width: 44,
    height: X_LABEL_HEIGHT,
    textAlign: "center",
    textAlignVertical: "bottom",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
});
