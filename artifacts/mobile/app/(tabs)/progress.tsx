import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";
import type { WorkoutLog } from "@/types/workout";

function getWeekVolumes(logs: WorkoutLog[]) {
  const days: { label: string; volume: number }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0]!;
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const log = logs.find((l) => l.date === dateStr);
    const volume = log
      ? log.entries.reduce(
          (t, e) =>
            t +
            e.sets.reduce(
              (s, set) => s + (set.weight ?? 0) * (set.reps ?? 1),
              0
            ),
          0
        )
      : 0;
    days.push({ label, volume });
  }
  return days;
}

function getPersonalRecords(logs: WorkoutLog[]) {
  const records: Record<string, { name: string; weight: number; date: string }> = {};
  for (const log of logs) {
    for (const entry of log.entries) {
      for (const set of entry.sets) {
        if (!set.weight) continue;
        const existing = records[entry.exerciseId];
        if (!existing || set.weight > existing.weight) {
          records[entry.exerciseId] = {
            name: entry.exerciseName,
            weight: set.weight,
            date: log.date,
          };
        }
      }
    }
  }
  return Object.values(records)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8);
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { workoutLogs } = useWorkout();

  const weekData = useMemo(() => getWeekVolumes(workoutLogs), [workoutLogs]);
  const prs = useMemo(() => getPersonalRecords(workoutLogs), [workoutLogs]);
  const maxVolume = Math.max(...weekData.map((d) => d.volume), 1);

  const totalWorkouts = workoutLogs.length;
  const totalVolume = useMemo(
    () =>
      workoutLogs.reduce(
        (t, log) =>
          t +
          log.entries.reduce(
            (et, e) =>
              et +
              e.sets.reduce(
                (s, set) => s + (set.weight ?? 0) * (set.reps ?? 1),
                0
              ),
            0
          ),
        0
      ),
    [workoutLogs]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 12, paddingBottom: botPad + 80 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Progress</Text>

      <View style={styles.overallRow}>
        <View style={[styles.overallCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="activity" size={18} color={colors.primary} />
          <Text style={[styles.overallValue, { color: colors.foreground }]}>
            {totalWorkouts}
          </Text>
          <Text style={[styles.overallLabel, { color: colors.mutedForeground }]}>
            Workouts
          </Text>
        </View>
        <View style={[styles.overallCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="trending-up" size={18} color={colors.primary} />
          <Text style={[styles.overallValue, { color: colors.foreground }]}>
            {Math.round(totalVolume / 1000)}k
          </Text>
          <Text style={[styles.overallLabel, { color: colors.mutedForeground }]}>
            kg Total
          </Text>
        </View>
        <View style={[styles.overallCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="award" size={18} color={colors.primary} />
          <Text style={[styles.overallValue, { color: colors.foreground }]}>
            {prs.length}
          </Text>
          <Text style={[styles.overallLabel, { color: colors.mutedForeground }]}>
            PRs Set
          </Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Weekly Volume
        </Text>
        {workoutLogs.length === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Log workouts to see your progress
            </Text>
          </View>
        ) : (
          <View style={styles.chart}>
            {weekData.map((day, i) => (
              <View key={i} style={styles.bar}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.max((day.volume / maxVolume) * 100, day.volume > 0 ? 4 : 0)}%`,
                        backgroundColor:
                          day.volume > 0 ? colors.primary : colors.muted,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>
                  {day.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Personal Records
        </Text>
        {prs.length === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No personal records yet
            </Text>
          </View>
        ) : (
          <View style={styles.prList}>
            {prs.map((pr, i) => (
              <View
                key={i}
                style={[
                  styles.prRow,
                  i < prs.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <View style={[styles.prRank, { backgroundColor: `${colors.primary}15` }]}>
                  <Text style={[styles.prRankText, { color: colors.primary }]}>
                    #{i + 1}
                  </Text>
                </View>
                <View style={styles.prInfo}>
                  <Text style={[styles.prName, { color: colors.foreground }]}>
                    {pr.name}
                  </Text>
                  <Text style={[styles.prDate, { color: colors.mutedForeground }]}>
                    {new Date(pr.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
                <View style={styles.prWeight}>
                  <Text style={[styles.prWeightValue, { color: colors.primary }]}>
                    {pr.weight}
                  </Text>
                  <Text style={[styles.prWeightUnit, { color: colors.mutedForeground }]}>
                    kg
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  overallRow: {
    flexDirection: "row",
    gap: 10,
  },
  overallCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  overallValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  overallLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  emptyChart: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    height: 120,
  },
  bar: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    height: "100%",
  },
  barTrack: {
    flex: 1,
    width: "100%",
    borderRadius: 4,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  prList: {
    gap: 0,
  },
  prRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  prRank: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  prRankText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  prInfo: {
    flex: 1,
    gap: 2,
  },
  prName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  prDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  prWeight: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  prWeightValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  prWeightUnit: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
