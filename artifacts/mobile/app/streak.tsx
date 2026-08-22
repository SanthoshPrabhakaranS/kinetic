import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
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

function buildMonthCalendar(monthDate: Date) {
  const firstOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1,
  );
  const firstWeekOffset = (firstOfMonth.getDay() + 7) % 7;
  const gridStart = addDays(firstOfMonth, -firstWeekOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    const key = toDateKey(date);
    return {
      key,
      date,
      inMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

export default function StreakScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { workoutLogs, streakInfo } = useWorkout();
  const [viewMonth, setViewMonth] = useState(() => new Date());

  const activeDates = useMemo(() => getActiveDates(workoutLogs), [workoutLogs]);

  const todayKey = toDateKey(new Date());
  const monthCalendar = useMemo(
    () => buildMonthCalendar(viewMonth),
    [viewMonth],
  );
  const monthRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, rowIndex) =>
        monthCalendar.slice(rowIndex * 7, rowIndex * 7 + 7),
      ),
    [monthCalendar],
  );
  const monthTitle = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(viewMonth),
    [viewMonth],
  );

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
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 24 }]}
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
            <Ionicons name="flame" size={28} color={colors.primary} />
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
          <View style={styles.activityHeader}>
            <TouchableOpacity
              onPress={() =>
                setViewMonth(
                  (prev) =>
                    new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                )
              }
              hitSlop={10}
            >
              <Feather
                name="chevron-left"
                size={18}
                color={colors.foreground}
              />
            </TouchableOpacity>

            <Text
              style={[styles.monthHeaderText, { color: colors.foreground }]}
            >
              {monthTitle.toUpperCase()}
            </Text>

            <TouchableOpacity
              onPress={() =>
                setViewMonth(
                  (prev) =>
                    new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                )
              }
              hitSlop={10}
            >
              <Feather
                name="chevron-right"
                size={18}
                color={colors.foreground}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {DAY_KEYS.map((day) => (
              <Text
                key={day}
                style={[styles.weekdayText, { color: colors.mutedForeground }]}
              >
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.monthGrid}>
            {monthRows.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.dateRow}>
                {row.map(({ key, date, inMonth }) => {
                  const isToday = key === todayKey;
                  const isActive = activeDates.has(key);
                  const showFilled = inMonth && isActive;

                  return (
                    <View
                      key={key}
                      style={[
                        styles.dateCell,
                        {
                          backgroundColor: showFilled
                            ? colors.primary
                            : isToday && inMonth
                              ? `${colors.primary}18`
                              : inMonth
                                ? colors.muted
                                : "transparent",
                          borderWidth: isToday && inMonth ? 1 : 0,
                          borderColor:
                            isToday && inMonth ? colors.primary : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dateText,
                          {
                            color:
                              showFilled || (isToday && inMonth)
                                ? colors.primaryForeground
                                : inMonth
                                  ? colors.foreground
                                  : colors.mutedForeground,
                          },
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
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
          <Text
            style={[styles.logBtnText, { color: colors.primaryForeground }]}
          >
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
    gap: 10,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  monthHeaderText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  weekdayText: {
    width: 28,
    textAlign: "center",
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
  },
  monthGrid: {
    gap: 6,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 6,
  },
  dateCell: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  dateText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
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
