import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";
import type { WorkoutLog } from "@/types/workout";

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dateStr === today.toISOString().split("T")[0]) return "Today";
  if (dateStr === yesterday.toISOString().split("T")[0]) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function calcVolume(log: WorkoutLog) {
  return log.entries.reduce(
    (t, e) =>
      t +
      e.sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 1), 0),
    0
  );
}

function WorkoutLogCard({ log }: { log: WorkoutLog }) {
  const colors = useColors();
  const volume = calcVolume(log);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.dateText, { color: colors.foreground }]}>
            {formatDate(log.date)}
          </Text>
          <Text style={[styles.fullDate, { color: colors.mutedForeground }]}>
            {new Date(log.date + "T00:00:00").toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </View>
        <View style={[styles.volumeTag, { backgroundColor: `${colors.primary}15` }]}>
          <Text style={[styles.volumeText, { color: colors.primary }]}>
            {Math.round(volume).toLocaleString()} kg
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Feather name="activity" size={13} color={colors.mutedForeground} />
          <Text style={[styles.statText, { color: colors.mutedForeground }]}>
            {log.entries.length} exercises
          </Text>
        </View>
        <View style={styles.stat}>
          <Feather name="layers" size={13} color={colors.mutedForeground} />
          <Text style={[styles.statText, { color: colors.mutedForeground }]}>
            {log.entries.reduce((s, e) => s + e.sets.length, 0)} sets
          </Text>
        </View>
      </View>

      <View style={styles.exerciseList}>
        {log.entries.slice(0, 3).map((entry, i) => (
          <Text key={i} style={[styles.exerciseName, { color: colors.mutedForeground }]}>
            · {entry.exerciseName}
          </Text>
        ))}
        {log.entries.length > 3 && (
          <Text style={[styles.exerciseName, { color: colors.mutedForeground }]}>
            +{log.entries.length - 3} more
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { workoutLogs } = useWorkout();

  const sortedLogs = [...workoutLogs].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={sortedLogs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingTop: topPad + 12, paddingBottom: botPad + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!sortedLogs.length}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
              {workoutLogs.length} sessions total
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Feather name="clock" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No history yet
            </Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
              Your completed workouts will appear here
            </Text>
          </View>
        }
        renderItem={({ item }) => <WorkoutLogCard log={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: {
    paddingHorizontal: 20,
    gap: 12,
  },
  header: {
    marginBottom: 4,
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  count: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dateText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  fullDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  volumeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  volumeText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  divider: {
    height: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  exerciseList: {
    gap: 2,
  },
  exerciseName: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  emptyBox: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
