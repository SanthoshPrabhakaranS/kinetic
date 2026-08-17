import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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

function formatDuration(
  seconds?: number | null,
  unit: "seconds" | "minutes" = "seconds",
) {
  if (seconds == null || Number.isNaN(seconds)) return "0s";
  if (unit === "minutes") {
    const minutes = seconds / 60;
    const rounded = Math.round(minutes * 100) / 100;
    return Number.isInteger(rounded) ? `${rounded}m` : `${rounded}m`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

function EntryCard({ entry }: { entry: WorkoutEntry }) {
  const colors = useColors();

  const hasDuration = entry.sets.some((set) => set.duration != null);
  const maxWeight = Math.max(...entry.sets.map((s) => s.weight ?? 0));
  const totalReps = entry.sets.reduce((t, s) => t + (s.reps ?? 0), 0);
  const volume = entry.sets.reduce((t, s) => t + (s.weight ?? 0), 0);
  const totalDuration = entry.sets.reduce((t, s) => t + (s.duration ?? 0), 0);
  const longestDuration = Math.max(
    ...entry.sets.map((s) => s.duration ?? 0),
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
            {hasDuration
              ? formatDuration(totalDuration, entry.sets[0]?.durationUnit)
              : `${Math.round(volume)} kg`}
          </Text>
          <Text
            style={[styles.entryVolLabel, { color: colors.mutedForeground }]}
          >
            {hasDuration ? "total time" : "volume"}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {hasDuration ? (
        <View style={[styles.setsTable, { borderColor: colors.border }]}>
          <View
            style={[styles.tableHead, { borderBottomColor: colors.border }]}
          >
            <Text
              style={[styles.th, { color: colors.mutedForeground, width: 36 }]}
            >
              SET
            </Text>
            <Text
              style={[styles.th, { color: colors.mutedForeground, flex: 1 }]}
            >
              DURATION
            </Text>
            <Text
              style={[styles.th, { color: colors.mutedForeground, flex: 1 }]}
            >
              UNIT
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
                {formatDuration(set.duration, set.durationUnit)}
              </Text>
              <Text style={[styles.td, { color: colors.foreground, flex: 1 }]}>
                {set.durationUnit === "minutes" ? "min" : "sec"}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.setsTable, { borderColor: colors.border }]}>
          <View
            style={[styles.tableHead, { borderBottomColor: colors.border }]}
          >
            <Text
              style={[styles.th, { color: colors.mutedForeground, width: 36 }]}
            >
              SET
            </Text>
            <Text
              style={[styles.th, { color: colors.mutedForeground, flex: 1 }]}
            >
              WEIGHT
            </Text>
            <Text
              style={[styles.th, { color: colors.mutedForeground, flex: 1 }]}
            >
              REPS
            </Text>
            <Text
              style={[styles.th, { color: colors.mutedForeground, flex: 1 }]}
            >
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
      )}

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
            {hasDuration
              ? formatDuration(longestDuration, entry.sets[0]?.durationUnit)
              : `${maxWeight} kg`}
          </Text>
          <Text
            style={[styles.summaryLabel, { color: colors.mutedForeground }]}
          >
            {hasDuration ? "Longest set" : "Best set"}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>
            {hasDuration
              ? formatDuration(totalDuration, entry.sets[0]?.durationUnit)
              : totalReps}
          </Text>
          <Text
            style={[styles.summaryLabel, { color: colors.mutedForeground }]}
          >
            {hasDuration ? "Total time" : "Total reps"}
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
  const { getLogById, deleteWorkoutLog } = useWorkout();
  const [deleting, setDeleting] = useState(false);

  const log = getLogById(logId);
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleDeleteLog = () => {
    if (!log) return;
    Alert.alert(
      "Delete Workout",
      "This will permanently delete this workout log.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => setDeleting(true),
        },
      ],
    );
  };

  useEffect(() => {
    if (!deleting) return;
    let cancelled = false;
    (async () => {
      try {
        await deleteWorkoutLog(logId);
        if (!cancelled) router.back();
      } finally {
        if (!cancelled) setDeleting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deleting, deleteWorkoutLog, logId]);

  const totalVolume = log
    ? log.entries.reduce(
        (t, e) => t + e.sets.reduce((s, set) => s + (set.weight ?? 0), 0),
        0,
      )
    : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Modal transparent visible={deleting} animationType="fade">
        <View style={styles.loadingOverlay}>
          <View
            style={[styles.loadingCard, { backgroundColor: colors.card }]}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.foreground }]}>
              Deleting log...
            </Text>
          </View>
        </View>
      </Modal>

      {log ? (
        <>
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
        <TouchableOpacity onPress={handleDeleteLog} hitSlop={12}>
          <Feather name="trash-2" size={20} color={colors.destructive} />
        </TouchableOpacity>
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
        </>
      ) : (
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
      )}
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
  loadingOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  loadingCard: {
    paddingHorizontal: 28,
    paddingVertical: 24,
    borderRadius: 14,
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
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
