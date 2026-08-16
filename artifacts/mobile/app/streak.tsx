import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";
import {
  addDays,
  DAY_KEYS,
  getActiveDates,
  getEarnedMilestones,
  keyToDate,
  MILESTONES,
  toDateKey,
} from "@/lib/streaks";

const CELL_SIZE = 12;
const CELL_GAP = 3;
const GUTTER = 22;

function monthLabelFor(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

interface WeekColumn {
  cells: (string | null)[];
  monthLabel: string | null;
}

function buildWeeks(todayKey: string): WeekColumn[] {
  const today = keyToDate(todayKey);
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const start = addDays(firstOfMonth, -firstOfMonth.getDay());

  const columns: WeekColumn[] = [];
  let cursor = start;
  let previousMonth: number | null = null;

  while (cursor <= today) {
    const cells: (string | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(cursor, d);
      if (day >= firstOfMonth && day <= today) {
        cells.push(toDateKey(day));
      } else {
        cells.push(null);
      }
    }

    const firstValid = cells.find((c) => c != null);
    const columnMonth = firstValid
      ? keyToDate(firstValid).getMonth()
      : null;
    let label: string | null = null;
    if (columnMonth !== previousMonth) {
      label = firstValid ? monthLabelFor(keyToDate(firstValid)) : null;
      previousMonth = columnMonth;
    }

    columns.push({ cells, monthLabel: label });
    cursor = addDays(cursor, 7);
  }

  return columns;
}

export default function StreakScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { workoutLogs, streakInfo } = useWorkout();

  const activeDates = useMemo(
    () => getActiveDates(workoutLogs),
    [workoutLogs],
  );

  const todayKey = toDateKey(new Date());
  const weeks = useMemo(() => buildWeeks(todayKey), [todayKey]);

  const thisMonthCount = useMemo(() => {
    const prefix = todayKey.slice(0, 7);
    let count = 0;
    for (const key of activeDates) {
      if (key.startsWith(prefix)) count++;
    }
    return count;
  }, [activeDates, todayKey]);

  const earnedMilestones = useMemo(
    () => getEarnedMilestones(streakInfo.best),
    [streakInfo.best],
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const columnWidth = CELL_SIZE + CELL_GAP;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Streak
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: botPad + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.heroIconWrap,
              { backgroundColor: `${colors.primary}15` },
            ]}
          >
            <Feather name="zap" size={28} color={colors.primary} />
          </View>
          <View style={styles.heroText}>
            <View style={styles.heroValueRow}>
              <Text style={[styles.heroValue, { color: colors.foreground }]}>
                {streakInfo.current}
              </Text>
              <Text
                style={[styles.heroUnit, { color: colors.mutedForeground }]}
              >
                DAY STREAK
              </Text>
            </View>
            <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
              {streakInfo.atRisk && streakInfo.current > 0
                ? "Log a workout today to keep it alive"
                : streakInfo.current > 0
                  ? "Keep the momentum going"
                  : "Complete a workout to start your streak"}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View
            style={[
              styles.statChip,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {streakInfo.best}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Best streak
            </Text>
          </View>
          <View
            style={[
              styles.statChip,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {thisMonthCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              This month
            </Text>
          </View>
          <View
            style={[
              styles.statChip,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {activeDates.size}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Total days
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.calendarCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            ACTIVITY
          </Text>
          <Text
            style={[styles.cardSub, { color: colors.mutedForeground }]}
          >
            Last 6 months
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calendarScroll}
          >
            <View style={styles.calendarInner}>
              <View style={styles.monthRow}>
                <View style={{ width: GUTTER }} />
                {weeks.map((week, index) => (
                  <View
                    key={index}
                    style={{ width: columnWidth, alignItems: "flex-start" }}
                  >
                    {week.monthLabel && (
                      <Text
                        style={[
                          styles.monthLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {week.monthLabel}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
              <View style={styles.calendarBody}>
                <View style={styles.dayLabels}>
                  {DAY_KEYS.map((day) => (
                    <Text
                      key={day}
                      style={[
                        styles.dayLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {day}
                    </Text>
                  ))}
                </View>
                {[...Array(7)].map((_, dayIndex) => (
                  <View key={dayIndex} style={styles.calendarRow}>
                    {weeks.map((week, weekIndex) => {
                      const cellKey = week.cells[dayIndex];
                      const isActive =
                        cellKey != null && activeDates.has(cellKey);
                      const isToday = cellKey === todayKey;
                      return (
                        <View
                          key={weekIndex}
                          style={[
                            styles.cell,
                            {
                              backgroundColor: isActive
                                ? colors.primary
                                : cellKey != null
                                  ? colors.muted
                                  : "transparent",
                              borderWidth: isToday ? 1 : 0,
                              borderColor: colors.foreground,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={styles.legendRow}>
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
              Less
            </Text>
            <View style={[styles.legendCell, { backgroundColor: colors.muted }]} />
            <View
              style={[styles.legendCell, { backgroundColor: colors.primary }]}
            />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
              More
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.milestoneCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            MILESTONES
          </Text>
          <View style={styles.milestoneRow}>
            {MILESTONES.map((milestone) => {
              const earned = earnedMilestones.includes(milestone);
              return (
                <View
                  key={milestone}
                  style={[
                    styles.milestoneChip,
                    {
                      backgroundColor: earned
                        ? `${colors.primary}22`
                        : colors.muted,
                      borderColor: earned ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Feather
                    name={earned ? "check-circle" : "circle"}
                    size={12}
                    color={earned ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.milestoneText,
                      {
                        color: earned ? colors.primary : colors.mutedForeground,
                      },
                    ]}
                  >
                    {milestone}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.logBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({
              pathname: "/quick-log",
              params: { selectedDate: todayKey },
            });
          }}
          activeOpacity={0.85}
        >
          <Feather name="zap" size={18} color={colors.primaryForeground} />
          <Text style={[styles.logBtnText, { color: colors.primaryForeground }]}>
            LOG A WORKOUT
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold" },
  headerSpacer: { width: 22 },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: { flex: 1, gap: 2 },
  heroValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  heroValue: { fontSize: 44, fontFamily: "Inter_700Bold", lineHeight: 48 },
  heroUnit: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  heroSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", gap: 10 },
  statChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
    gap: 2,
  },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  calendarCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -4 },
  calendarScroll: { paddingTop: 8 },
  calendarInner: { gap: 4 },
  monthRow: {
    flexDirection: "row",
    height: 16,
  },
  monthLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  calendarBody: { flexDirection: "row", gap: 6 },
  dayLabels: {
    width: GUTTER,
    gap: CELL_GAP,
  },
  dayLabel: { fontSize: 9, fontFamily: "Inter_400Regular", height: CELL_SIZE, lineHeight: CELL_SIZE },
  calendarRow: { flexDirection: "row", gap: CELL_GAP },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 3,
    marginBottom: CELL_GAP,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
  milestoneCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  milestoneRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  milestoneChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  milestoneText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  logBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  logBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
});
