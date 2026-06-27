import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
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
import type { WorkoutEntry } from "@/types/workout";

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayStr = today.toISOString().split("T")[0];
  const yestStr = yesterday.toISOString().split("T")[0];
  if (dateStr === todayStr) return "Today";
  if (dateStr === yestStr) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function EntryCard({ entry }: { entry: WorkoutEntry }) {
  const colors = useColors();

  const maxWeight = Math.max(...entry.sets.map((s) => s.weight ?? 0));
  const totalReps = entry.sets.reduce((t, s) => t + (s.reps ?? 0), 0);
  const volume = entry.sets.reduce(
    (t, s) => t + (s.weight ?? 0) * (s.reps ?? 1),
    0,
  );

  return (
    <View
      style={[
        styles.entryCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.entryHeader}>
        <View>
          <Text style={[styles.entryName, { color: colors.foreground }]}>
            {entry.exerciseName}
          </Text>
          <Text style={[styles.entryMeta, { color: colors.mutedForeground }]}>
            {entry.muscleGroup} · {entry.equipment}
          </Text>
        </View>
        <View style={styles.entryStats}>
          <Text style={[styles.entryVolume, { color: colors.primary }]}>
            {Math.round(volume)} kg
          </Text>
          <Text
            style={[styles.entryVolLabel, { color: colors.mutedForeground }]}
          >
            volume
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={[styles.setsTable, { borderColor: colors.border }]}>
        <View style={[styles.tableHead, { borderBottomColor: colors.border }]}>
          <Text
            style={[styles.th, { color: colors.mutedForeground, width: 36 }]}
          >
            SET
          </Text>
          <Text style={[styles.th, { color: colors.mutedForeground, flex: 1 }]}>
            WEIGHT
          </Text>
          <Text style={[styles.th, { color: colors.mutedForeground, flex: 1 }]}>
            REPS
          </Text>
          <Text style={[styles.th, { color: colors.mutedForeground, flex: 1 }]}>
            VOLUME
          </Text>
        </View>
        {entry.sets.map((set) => (
          <View
            key={set.setNumber}
            style={[styles.tableRow, { borderBottomColor: colors.border }]}
          >
            <View
              style={[
                styles.setNumBadge,
                { backgroundColor: `${colors.primary}15` },
              ]}
            >
              <Text style={[styles.setNumText, { color: colors.primary }]}>
                {set.setNumber}
              </Text>
            </View>
            <Text style={[styles.td, { color: colors.foreground, flex: 1 }]}>
              {set.weight != null ? `${set.weight} kg` : "—"}
            </Text>
            <Text style={[styles.td, { color: colors.foreground, flex: 1 }]}>
              {set.reps != null ? `${set.reps}` : "—"}
            </Text>
            <Text
              style={[styles.td, { color: colors.mutedForeground, flex: 1 }]}
            >
              {set.weight != null && set.reps != null
                ? `${Math.round(set.weight * set.reps)} kg`
                : "—"}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>
            {entry.sets.length}
          </Text>
          <Text
            style={[styles.summaryLabel, { color: colors.mutedForeground }]}
          >
            Sets
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>
            {maxWeight} kg
          </Text>
          <Text
            style={[styles.summaryLabel, { color: colors.mutedForeground }]}
          >
            Best set
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>
            {totalReps}
          </Text>
          <Text
            style={[styles.summaryLabel, { color: colors.mutedForeground }]}
          >
            Total reps
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function WorkoutDetailScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const { getLogById } = useWorkout();

  const log = getLogById(logId);
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!log) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>
          Workout not found
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalVolume = log.entries.reduce(
    (t, e) =>
      t + e.sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 1), 0),
    0,
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {formatDate(log.date)}
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {log.entries.length} exercises ·{" "}
            {Math.round(totalVolume).toLocaleString()} kg total
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.overviewRow}>
          <View
            style={[
              styles.overviewCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="activity" size={16} color={colors.primary} />
            <Text style={[styles.overviewValue, { color: colors.foreground }]}>
              {log.entries.length}
            </Text>
            <Text
              style={[styles.overviewLabel, { color: colors.mutedForeground }]}
            >
              Exercises
            </Text>
          </View>
          <View
            style={[
              styles.overviewCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="layers" size={16} color={colors.primary} />
            <Text style={[styles.overviewValue, { color: colors.foreground }]}>
              {log.entries.reduce((s, e) => s + e.sets.length, 0)}
            </Text>
            <Text
              style={[styles.overviewLabel, { color: colors.mutedForeground }]}
            >
              Total Sets
            </Text>
          </View>
          <View
            style={[
              styles.overviewCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="trending-up" size={16} color={colors.primary} />
            <Text style={[styles.overviewValue, { color: colors.foreground }]}>
              {Math.round((totalVolume / 1000) * 10) / 10}k
            </Text>
            <Text
              style={[styles.overviewLabel, { color: colors.mutedForeground }]}
            >
              kg Volume
            </Text>
          </View>
        </View>

        {log.entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFound: { fontSize: 15, fontFamily: "Inter_400Regular" },
  backLink: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerCenter: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  overviewRow: { flexDirection: "row", gap: 10 },
  overviewCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  overviewValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  overviewLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  entryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  entryName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  entryMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  entryStats: { alignItems: "flex-end" },
  entryVolume: { fontSize: 16, fontFamily: "Inter_700Bold" },
  entryVolLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  divider: { height: 1 },
  setsTable: { borderRadius: 8, overflow: "hidden" },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    gap: 4,
  },
  th: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    gap: 4,
  },
  setNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  setNumText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  td: { fontSize: 14, fontFamily: "Inter_500Medium" },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: { alignItems: "center", gap: 2 },
  summaryValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
