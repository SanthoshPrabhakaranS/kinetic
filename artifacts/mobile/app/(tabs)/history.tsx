import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
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
import type { WorkoutLog } from "@/types/workout";

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
      t + e.sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 1), 0),
    0,
  );
}

function WorkoutLogCard({ log }: { log: WorkoutLog }) {
  const colors = useColors();
  const volume = calcVolume(log);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      activeOpacity={0.7}
      onPress={() =>
        router.push({ pathname: "/workout-detail", params: { logId: log.id } })
      }
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
        <View style={styles.rightCol}>
          <View
            style={[
              styles.volumeTag,
              { backgroundColor: `${colors.primary}15` },
            ]}
          >
            <Text style={[styles.volumeText, { color: colors.primary }]}>
              {Math.round(volume).toLocaleString()} kg
            </Text>
          </View>
          <Feather
            name="chevron-right"
            size={16}
            color={colors.mutedForeground}
          />
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
          <View key={i} style={styles.exerciseRow}>
            <View
              style={[styles.exerciseDot, { backgroundColor: colors.primary }]}
            />
            <Text
              style={[styles.exerciseName, { color: colors.mutedForeground }]}
            >
              {entry.exerciseName}
            </Text>
            <Text
              style={[styles.exerciseSets, { color: colors.mutedForeground }]}
            >
              {entry.sets.length} sets
            </Text>
          </View>
        ))}
        {log.entries.length > 3 && (
          <Text style={[styles.moreText, { color: colors.mutedForeground }]}>
            +{log.entries.length - 3} more exercises
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
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [visibleDays, setVisibleDays] = useState(10);
  const [activeDateFilter, setActiveDateFilter] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const sortedLogs: WorkoutLog[] = [...workoutLogs].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const selectedDateKey = useMemo(
    () => toDateInputValue(selectedDate),
    [selectedDate],
  );
  const visibleLogs = useMemo(() => {
    if (activeDateFilter) {
      return sortedLogs.filter((log) => log.date === activeDateFilter);
    }

    return sortedLogs.slice(0, isExpanded ? sortedLogs.length : visibleDays);
  }, [activeDateFilter, isExpanded, sortedLogs, visibleDays]);
  const hasMoreDays = !activeDateFilter && sortedLogs.length > visibleDays;
  const filterLabel = activeDateFilter
    ? new Date(`${activeDateFilter}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "All Days";

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingTop: topPad + 12, paddingBottom: botPad + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              History
            </Text>
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
              {workoutLogs.length} sessions total · tap to view details
            </Text>
          </View>

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => {
                setShowDatePicker(true);
              }}
              activeOpacity={0.8}
            >
              <Feather name="calendar" size={14} color={colors.foreground} />
              <Text
                style={[styles.filterButtonText, { color: colors.foreground }]}
              >
                {filterLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {sortedLogs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="clock" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No history yet
            </Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
              Your completed workouts will appear here
            </Text>
          </View>
        ) : visibleLogs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="calendar" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No sessions for this day
            </Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
              Choose another date to browse your history
            </Text>
          </View>
        ) : (
          <>
            {visibleLogs.map((log) => (
              <WorkoutLogCard key={log.id} log={log} />
            ))}
            {hasMoreDays && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => {
                  if (isExpanded) {
                    setIsExpanded(false);
                    setVisibleDays(10);
                  } else {
                    setIsExpanded(true);
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                  {isExpanded ? "View Less" : "View More"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Choose Date
            </Text>
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={(_, nextDate) => {
                  if (nextDate) {
                    setSelectedDate(nextDate);
                    setActiveDateFilter(toDateInputValue(nextDate));
                  }
                  setShowDatePicker(false);
                }}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text
                  style={[styles.modalBtnText, { color: colors.foreground }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: 20, gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  headerTextBlock: { flex: 1, gap: 4 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  count: { fontSize: 10, fontFamily: "Inter_400Regular" },
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
  dateText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  fullDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  rightCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  volumeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  volumeText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  divider: { height: 1 },
  statsRow: { flexDirection: "row", gap: 16 },
  stat: { flexDirection: "row", alignItems: "center", gap: 5 },
  statText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  exerciseList: { gap: 6 },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exerciseDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  exerciseName: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  exerciseSets: { fontSize: 12, fontFamily: "Inter_400Regular" },
  moreText: { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: 13 },
  emptyBox: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 8 },
  emptyHint: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterButtonText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  loadMoreButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  loadMoreText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  pickerWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  modalBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
