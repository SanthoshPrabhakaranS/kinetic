import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
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

import { NumberPad } from "@/components/NumberPad";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";
import type { WeightEntry, WorkoutLog } from "@/types/workout";

function applyKey(current: string, key: string): string {
  if (key === "⌫") return current.length > 1 ? current.slice(0, -1) : "0";
  if (key === ".") return current.includes(".") ? current : current + ".";
  if (current === "0") return key;
  if (current.length >= 6) return current;
  return current + key;
}

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
              0,
            ),
          0,
        )
      : 0;
    days.push({ label, volume });
  }
  return days;
}

function getPersonalRecords(logs: WorkoutLog[]) {
  const records: Record<
    string,
    { name: string; weight: number; date: string }
  > = {};
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

function groupWeightByMonth(entries: WeightEntry[]) {
  const groups: { label: string; entries: WeightEntry[] }[] = [];
  for (const entry of entries) {
    const dt = new Date(entry.timestamp);
    const label = dt
      .toLocaleDateString("en-US", { month: "long", year: "numeric" })
      .toUpperCase();
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.entries.push(entry);
    } else {
      groups.push({ label, entries: [entry] });
    }
  }
  return groups;
}

function WeightEntryRow({
  entry,
  prevWeight,
  onDelete,
}: {
  entry: WeightEntry;
  prevWeight: number | null;
  onDelete: () => void;
}) {
  const colors = useColors();
  const dt = new Date(entry.timestamp);
  const dayNum = dt.getDate();
  const dayName = dt
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();
  const timeStr = dt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const delta =
    prevWeight != null
      ? Math.round((entry.weight - prevWeight) * 10) / 10
      : null;
  const isLoss = delta != null && delta < 0;
  const isGain = delta != null && delta > 0;
  const deltaColor = isLoss
    ? "#4ADE80"
    : isGain
      ? "#FF6B6B"
      : colors.mutedForeground;

  return (
    <TouchableOpacity
      style={[styles.weightRow, { borderBottomColor: colors.border }]}
      onLongPress={onDelete}
      activeOpacity={0.7}
      delayLongPress={600}
    >
      <View style={[styles.dayBadge, { backgroundColor: colors.primary }]}>
        <Text style={[styles.dayNum, { color: colors.primaryForeground }]}>
          {dayNum}
        </Text>
      </View>
      <View style={styles.weightInfo}>
        <Text style={[styles.dayName, { color: colors.foreground }]}>
          {dayName}
        </Text>
        <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
          {timeStr}
        </Text>
      </View>
      <View style={styles.weightRight}>
        <Text style={[styles.weightValue, { color: colors.foreground }]}>
          {entry.weight}
        </Text>
        {delta != null && (
          <View
            style={[styles.deltaBadge, { backgroundColor: `${deltaColor}18` }]}
          >
            <Feather
              name={isLoss ? "trending-down" : isGain ? "trending-up" : "minus"}
              size={10}
              color={deltaColor}
            />
            <Text style={[styles.deltaText, { color: deltaColor }]}>
              {isLoss ? "" : "+"}
              {delta} kg
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function AddWeightModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (weight: number) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState("70");

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleKey = (key: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setValue((v) => applyKey(v, key));
  };

  const handleSave = () => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave(parsed);
      setValue("70");
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <View
          style={[styles.modalHeader, { borderBottomColor: colors.border }]}
        >
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text
              style={[styles.modalCancel, { color: colors.mutedForeground }]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            Log Weight
          </Text>
          <TouchableOpacity onPress={handleSave} hitSlop={12}>
            <Text style={[styles.modalSave, { color: colors.primary }]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <View
            style={[
              styles.dateTimeRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="calendar" size={14} color={colors.mutedForeground} />
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
              {dateStr}
            </Text>
            <View
              style={[styles.timeDot, { backgroundColor: colors.border }]}
            />
            <Feather name="clock" size={14} color={colors.mutedForeground} />
            <Text style={[styles.timeText2, { color: colors.mutedForeground }]}>
              {timeStr}
            </Text>
          </View>

          <View style={styles.weightDisplay}>
            <Text style={[styles.weightBig, { color: colors.primary }]}>
              {value}
            </Text>
            <Text
              style={[styles.weightUnitBig, { color: colors.mutedForeground }]}
            >
              kg
            </Text>
          </View>

          <NumberPad onPress={handleKey} />

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Feather name="check" size={18} color={colors.primaryForeground} />
            <Text
              style={[styles.saveBtnText, { color: colors.primaryForeground }]}
            >
              Log Weight
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const {
    workoutLogs,
    weightLogs,
    lastWeight,
    weeklyWeightChange,
    addWeightEntry,
    deleteWeightEntry,
  } = useWorkout();

  const [showAddWeight, setShowAddWeight] = useState(false);

  const weekData = useMemo(() => getWeekVolumes(workoutLogs), [workoutLogs]);
  const prs = useMemo(() => getPersonalRecords(workoutLogs), [workoutLogs]);
  const maxVolume = Math.max(...weekData.map((d) => d.volume), 1);
  const weightGroups = useMemo(
    () => groupWeightByMonth(weightLogs),
    [weightLogs],
  );

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
                0,
              ),
            0,
          ),
        0,
      ),
    [workoutLogs],
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const changeColor =
    weeklyWeightChange == null
      ? colors.mutedForeground
      : weeklyWeightChange < 0
        ? "#4ADE80"
        : weeklyWeightChange > 0
          ? "#FF6B6B"
          : colors.mutedForeground;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 12, paddingBottom: botPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Progress
        </Text>

        <View style={styles.overallRow}>
          <View
            style={[
              styles.overallCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="activity" size={18} color={colors.primary} />
            <Text style={[styles.overallValue, { color: colors.foreground }]}>
              {totalWorkouts}
            </Text>
            <Text
              style={[styles.overallLabel, { color: colors.mutedForeground }]}
            >
              Workouts
            </Text>
          </View>
          <View
            style={[
              styles.overallCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="trending-up" size={18} color={colors.primary} />
            <Text style={[styles.overallValue, { color: colors.foreground }]}>
              {Math.round(totalVolume / 1000)}k
            </Text>
            <Text
              style={[styles.overallLabel, { color: colors.mutedForeground }]}
            >
              kg Total
            </Text>
          </View>
          <View
            style={[
              styles.overallCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="award" size={18} color={colors.primary} />
            <Text style={[styles.overallValue, { color: colors.foreground }]}>
              {prs.length}
            </Text>
            <Text
              style={[styles.overallLabel, { color: colors.mutedForeground }]}
            >
              PRs Set
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.currentWeightCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.cwHeader}>
            <Text style={[styles.cwLabel, { color: colors.mutedForeground }]}>
              CURRENT WEIGHT
            </Text>
            <TouchableOpacity
              style={[styles.cwAddBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowAddWeight(true);
              }}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={14} color={colors.primaryForeground} />
              <Text
                style={[styles.cwAddText, { color: colors.primaryForeground }]}
              >
                Log
              </Text>
            </TouchableOpacity>
          </View>

          {lastWeight != null ? (
            <>
              <View style={styles.cwWeightRow}>
                <Text style={[styles.cwWeight, { color: colors.foreground }]}>
                  {lastWeight}
                </Text>
                <Text
                  style={[styles.cwUnit, { color: colors.mutedForeground }]}
                >
                  KG
                </Text>
              </View>
              {weeklyWeightChange != null && (
                <View
                  style={[
                    styles.cwChangePill,
                    { backgroundColor: `${changeColor}15` },
                  ]}
                >
                  <Feather
                    name={
                      weeklyWeightChange < 0
                        ? "trending-down"
                        : weeklyWeightChange > 0
                          ? "trending-up"
                          : "minus"
                    }
                    size={12}
                    color={changeColor}
                  />
                  <Text style={[styles.cwChangeText, { color: changeColor }]}>
                    {weeklyWeightChange > 0 ? "+" : ""}
                    {weeklyWeightChange} kg this week
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.cwEmpty}>
              <Text
                style={[styles.cwEmptyText, { color: colors.mutedForeground }]}
              >
                No weight logged yet
              </Text>
              <Text
                style={[styles.cwEmptyHint, { color: colors.mutedForeground }]}
              >
                Tap Log to add your first entry
              </Text>
            </View>
          )}
        </View>

        {weightLogs.length > 0 && (
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Weight Log
              </Text>
              <Text
                style={[styles.sectionHint, { color: colors.mutedForeground }]}
              >
                Hold to delete
              </Text>
            </View>

            {weightGroups.map((group) => (
              <View key={group.label}>
                <View
                  style={[
                    styles.monthHeader,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.monthLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {group.label}
                  </Text>
                </View>
                {group.entries.map((entry, i) => {
                  const prevEntry =
                    group.entries[i + 1] ??
                    weightLogs[weightLogs.indexOf(entry) + 1] ??
                    null;
                  return (
                    <WeightEntryRow
                      key={entry.id}
                      entry={entry}
                      prevWeight={prevEntry?.weight ?? null}
                      onDelete={() => {
                        Alert.alert(
                          "Delete Entry",
                          `Remove ${entry.weight} kg entry?`,
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Delete",
                              style: "destructive",
                              onPress: () => void deleteWeightEntry(entry.id),
                            },
                          ],
                        );
                      }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Weekly Volume
          </Text>
          {workoutLogs.length === 0 ? (
            <View style={styles.emptyChart}>
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
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
                  <Text
                    style={[styles.barLabel, { color: colors.mutedForeground }]}
                  >
                    {day.label}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Personal Records
          </Text>
          {prs.length === 0 ? (
            <View style={styles.emptyChart}>
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
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
                    i < prs.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.prRank,
                      { backgroundColor: `${colors.primary}15` },
                    ]}
                  >
                    <Text
                      style={[styles.prRankText, { color: colors.primary }]}
                    >
                      #{i + 1}
                    </Text>
                  </View>
                  <View style={styles.prInfo}>
                    <Text style={[styles.prName, { color: colors.foreground }]}>
                      {pr.name}
                    </Text>
                    <Text
                      style={[styles.prDate, { color: colors.mutedForeground }]}
                    >
                      {new Date(pr.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                  <View style={styles.prWeight}>
                    <Text
                      style={[styles.prWeightValue, { color: colors.primary }]}
                    >
                      {pr.weight}
                    </Text>
                    <Text
                      style={[
                        styles.prWeightUnit,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      kg
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.primary, bottom: botPad + 80 },
        ]}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowAddWeight(true);
        }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color={colors.primaryForeground} />
      </TouchableOpacity>

      <AddWeightModal
        visible={showAddWeight}
        onClose={() => setShowAddWeight(false)}
        onSave={(w) => void addWeightEntry(w)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },

  overallRow: { flexDirection: "row", gap: 10 },
  overallCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  overallValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  overallLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  currentWeightCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  cwHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cwLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  cwAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  cwAddText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  cwWeightRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  cwWeight: { fontSize: 52, fontFamily: "Inter_700Bold", lineHeight: 56 },
  cwUnit: { fontSize: 18, fontFamily: "Inter_400Regular" },
  cwChangePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  cwChangeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cwEmpty: { paddingVertical: 16, gap: 4 },
  cwEmptyText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  cwEmptyHint: { fontSize: 13, fontFamily: "Inter_400Regular" },

  section: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    padding: 16,
    paddingBottom: 0,
  },
  sectionHint: { fontSize: 11, fontFamily: "Inter_400Regular" },

  monthHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginTop: 4,
  },
  monthLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  dayBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNum: { fontSize: 17, fontFamily: "Inter_700Bold" },
  weightInfo: { flex: 1, gap: 3 },
  dayName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  timeText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  weightRight: { alignItems: "flex-end", gap: 4 },
  weightValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  deltaBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  deltaText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  emptyChart: {
    paddingVertical: 32,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },

  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    height: 120,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  bar: { flex: 1, alignItems: "center", gap: 6, height: "100%" },
  barTrack: {
    flex: 1,
    width: "100%",
    borderRadius: 4,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: { width: "100%", borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },

  prList: { gap: 0, paddingHorizontal: 16, paddingBottom: 8 },
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
  prRankText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  prInfo: { flex: 1, gap: 2 },
  prName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  prDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  prWeight: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  prWeightValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  prWeightUnit: { fontSize: 12, fontFamily: "Inter_400Regular" },

  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D4FF00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalCancel: { fontSize: 15, fontFamily: "Inter_400Regular" },
  modalSave: { fontSize: 15, fontFamily: "Inter_700Bold" },
  modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 24, gap: 20 },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  dateText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  timeDot: { width: 4, height: 4, borderRadius: 2 },
  timeText2: { fontSize: 13, fontFamily: "Inter_500Medium" },
  weightDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 8,
  },
  weightBig: { fontSize: 72, fontFamily: "Inter_700Bold", lineHeight: 80 },
  weightUnitBig: { fontSize: 24, fontFamily: "Inter_400Regular" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
