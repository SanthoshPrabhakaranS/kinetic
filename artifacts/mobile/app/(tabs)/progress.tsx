import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExercisePicker } from "@/components/ExercisePicker";
import { LogWeightModal } from "@/components/LogWeightModal";
import { ProgressLineChart } from "@/components/ProgressLineChart";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";
import { toDateKey } from "@/lib/streaks";
import {
  calcConsistency,
  getExerciseProgress,
  getTopExercises,
} from "@/lib/stats";
import {
  convertWeight,
  formatWeight,
  formatWeightDelta,
  kgToLbs,
  lbsToKg,
  type WeightUnit,
} from "@/lib/weightUnits";
import type { WeightEntry, WorkoutLog } from "@/types/workout";

function getWeekVolumes(logs: WorkoutLog[]) {
  const days: { label: string; volume: number }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = toDateKey(d);
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const log = logs.find((l) => l.date === dateStr);
    const volume = log
      ? log.entries.reduce(
          (t, e) => t + e.sets.reduce((s, set) => s + (set.weight ?? 0), 0),
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
    const dt = new Date(`${entry.date}T12:00:00`);
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
  unit,
}: {
  entry: WeightEntry;
  prevWeight: number | null;
  onDelete: () => void;
  unit: WeightUnit;
}) {
  const colors = useColors();
  const dt = new Date(`${entry.date}T12:00:00`);
  const dayNum = dt.getDate();
  const dayName = dt
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();
  const dateLabel = dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const displayWeight = unit === "kg" ? entry.weight : kgToLbs(entry.weight);
  const rawDelta = prevWeight != null ? entry.weight - prevWeight : null;
  const delta = rawDelta != null ? convertWeight(rawDelta, "kg", unit) : null;
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
          {dateLabel}
        </Text>
      </View>
      <View style={styles.weightRight}>
        <Text style={[styles.weightValue, { color: colors.foreground }]}>
          {formatWeight(displayWeight, unit)}
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
              {formatWeightDelta(delta, unit)} {unit}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
    streakInfo,
    weightGoalDirection,
    weightDeltaToGoal,
    weightGoalProgress,
    addWeightEntry,
    deleteWeightEntry,
    updateProfile,
    profile,
  } = useWorkout();

  const unit = profile.weightUnit;

  const [showAddWeight, setShowAddWeight] = useState(false);
  const [visibleWeightEntries, setVisibleWeightEntries] = useState(5);
  const [visiblePrLimit, setVisiblePrLimit] = useState(10);
  const [isWeightExpanded, setIsWeightExpanded] = useState(false);
  const [isPrExpanded, setIsPrExpanded] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [showDetail, setShowDetail] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const [targetKeypadActive, setTargetKeypadActive] = useState(false);
  const [goalTypeInput, setGoalTypeInput] = useState<"loss" | "gain" | null>(
    null,
  );

  const weekData = useMemo(() => getWeekVolumes(workoutLogs), [workoutLogs]);
  const prs = useMemo(() => getPersonalRecords(workoutLogs), [workoutLogs]);
  const maxVolume = Math.max(...weekData.map((d) => d.volume), 1);
  const weightGroups = useMemo(
    () => groupWeightByMonth(weightLogs),
    [weightLogs],
  );

  const consistency = useMemo(
    () => calcConsistency(workoutLogs),
    [workoutLogs],
  );
  const topExercises = useMemo(
    () => getTopExercises(workoutLogs),
    [workoutLogs],
  );
  const activeExerciseId = useMemo(() => {
    if (selectedExerciseId) return selectedExerciseId;
    return topExercises.length > 0 ? topExercises[0]!.id : null;
  }, [selectedExerciseId, topExercises]);
  const exerciseProgress = useMemo(
    () =>
      activeExerciseId
        ? getExerciseProgress(workoutLogs, activeExerciseId)
        : [],
    [workoutLogs, activeExerciseId],
  );
  const activeExerciseName = useMemo(
    () => topExercises.find((e) => e.id === activeExerciseId)?.name ?? "",
    [topExercises, activeExerciseId],
  );

  const detailTrend = useMemo(() => {
    if (exerciseProgress.length < 2) return null;
    const first = exerciseProgress[0]!;
    const last = exerciseProgress[exerciseProgress.length - 1]!;
    const delta = last.bestWeight - first.bestWeight;
    const pct = first.bestWeight > 0 ? (delta / first.bestWeight) * 100 : 0;
    return {
      firstWeight: first.bestWeight,
      lastWeight: last.bestWeight,
      delta,
      pct: Math.abs(Math.round(pct)),
      direction:
        delta > 0
          ? ("up" as const)
          : delta < 0
            ? ("down" as const)
            : ("flat" as const),
      weeks: exerciseProgress.length,
    };
  }, [exerciseProgress]);

  const totalWorkouts = workoutLogs.length;
  const visibleWeightGroups = useMemo(() => {
    const flatEntries = weightLogs.slice(
      0,
      isWeightExpanded ? weightLogs.length : visibleWeightEntries,
    );
    if (flatEntries.length === 0) return [];

    const groups: { label: string; entries: WeightEntry[] }[] = [];
    for (const entry of flatEntries) {
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
  }, [isWeightExpanded, visibleWeightEntries, weightLogs]);
  const visiblePrs = prs.slice(0, isPrExpanded ? prs.length : visiblePrLimit);
  const hasMoreWeightEntries = weightLogs.length > visibleWeightEntries;
  const hasMorePrs = prs.length > visiblePrLimit;
  const totalVolume = useMemo(
    () =>
      workoutLogs.reduce(
        (t, log) =>
          t +
          log.entries.reduce(
            (et, e) => et + e.sets.reduce((s, set) => s + (set.weight ?? 0), 0),
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
      : weightGoalDirection != null
        ? (weightGoalDirection === "loss" && weeklyWeightChange < 0) ||
          (weightGoalDirection === "gain" && weeklyWeightChange > 0)
          ? "#4ADE80"
          : weeklyWeightChange === 0
            ? colors.mutedForeground
            : "#FF6B6B"
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

        <View style={styles.statGrid}>
          <View style={styles.statRow}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather name="activity" size={16} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {totalWorkouts}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.mutedForeground }]}
              >
                Workouts
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather name="calendar" size={16} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {consistency.percentage}%
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.mutedForeground }]}
              >
                Consistency
              </Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="flame" size={16} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {streakInfo.best}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.mutedForeground }]}
              >
                Best Streak
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather name="trending-up" size={16} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {Math.round(totalVolume / 1000)}k
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.mutedForeground }]}
              >
                kg Total
              </Text>
            </View>
          </View>
        </View>

        {topExercises.length > 0 && (
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitleV2, { color: colors.foreground }]}>
              Exercise Progress
            </Text>
            <ExercisePicker
              exercises={topExercises}
              selectedId={activeExerciseId}
              onSelect={setSelectedExerciseId}
            />
            {exerciseProgress.length > 0 ? (
              <View style={{ paddingBottom: 12 }}>
                <ProgressLineChart
                  data={exerciseProgress.map((p) => ({
                    label: p.weekLabel,
                    value: p.bestWeight,
                  }))}
                  yUnit="kg"
                  onPress={() => setShowDetail(true)}
                />
                <Text
                  style={[styles.tapHint, { color: colors.mutedForeground }]}
                >
                  Tap chart for details
                </Text>
              </View>
            ) : (
              <View style={styles.emptyChart}>
                <Text
                  style={[styles.emptyText, { color: colors.mutedForeground }]}
                >
                  Log workouts with {activeExerciseName} to see progress
                </Text>
              </View>
            )}
          </View>
        )}

        <Modal
          visible={showDetail}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDetail(false)}
        >
          <Pressable
            style={styles.detailOverlay}
            onPress={() => setShowDetail(false)}
          >
            <Pressable
              style={[
                styles.detailSheet,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={[
                  styles.detailHandle,
                  { backgroundColor: colors.mutedForeground },
                ]}
              />
              <Text
                style={[styles.detailTitle, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {activeExerciseName}
              </Text>

              {detailTrend && (
                <View
                  style={[
                    styles.trendCard,
                    {
                      backgroundColor:
                        detailTrend.direction === "up"
                          ? "#0f2e1a"
                          : detailTrend.direction === "down"
                            ? "#2e0f1a"
                            : colors.muted,
                      borderColor:
                        detailTrend.direction === "up"
                          ? "#16a34a"
                          : detailTrend.direction === "down"
                            ? "#dc2626"
                            : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 24,
                    }}
                  >
                    {detailTrend.direction === "up"
                      ? "📈"
                      : detailTrend.direction === "down"
                        ? "📉"
                        : "➡️"}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.trendLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {detailTrend.direction === "up"
                        ? "Increased"
                        : detailTrend.direction === "down"
                          ? "Decreased"
                          : "No change"}{" "}
                      by {detailTrend.pct}% over {detailTrend.weeks} weeks
                    </Text>
                    <Text
                      style={[styles.trendValues, { color: colors.foreground }]}
                    >
                      {detailTrend.firstWeight}kg → {detailTrend.lastWeight}kg
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.detailHeader}>
                <Text
                  style={[
                    styles.detailColLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Week
                </Text>
                <Text
                  style={[
                    styles.detailColLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Weight
                </Text>
                <Text
                  style={[
                    styles.detailColLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Change
                </Text>
              </View>

              <FlatList
                data={exerciseProgress}
                keyExtractor={(_, i) => String(i)}
                renderItem={({ item, index }) => {
                  const prev = index > 0 ? exerciseProgress[index - 1] : null;
                  const delta = prev ? item.bestWeight - prev.bestWeight : null;
                  const isUp = delta != null && delta > 0;
                  const isDown = delta != null && delta < 0;
                  return (
                    <View
                      style={[
                        styles.detailRow,
                        {
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailWeek,
                          { color: colors.foreground },
                        ]}
                      >
                        {item.weekLabel}
                      </Text>
                      <Text
                        style={[
                          styles.detailWeight,
                          { color: colors.foreground },
                        ]}
                      >
                        {item.bestWeight}kg
                      </Text>
                      {delta != null ? (
                        <View
                          style={[
                            styles.detailDelta,
                            {
                              backgroundColor: isUp
                                ? "#16a34a20"
                                : isDown
                                  ? "#dc262620"
                                  : colors.muted,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              color: isUp
                                ? "#4ade80"
                                : isDown
                                  ? "#f87171"
                                  : colors.mutedForeground,
                              fontFamily: "Inter_600SemiBold",
                            }}
                          >
                            {isUp ? "+" : ""}
                            {delta}kg
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.detailDelta} />
                      )}
                    </View>
                  );
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>

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
              <Text
                style={[styles.cwAddText, { color: colors.primaryForeground }]}
              >
                Log Weight
              </Text>
            </TouchableOpacity>
          </View>

          {lastWeight != null ? (
            <>
              <View style={styles.cwWeightRow}>
                <Text style={[styles.cwWeight, { color: colors.foreground }]}>
                  {formatWeight(convertWeight(lastWeight, "kg", unit), unit)}
                </Text>
                <Text
                  style={[styles.cwUnit, { color: colors.mutedForeground }]}
                >
                  {unit === "kg" ? "KG" : "LBS"}
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
                    {formatWeightDelta(
                      convertWeight(weeklyWeightChange, "kg", unit),
                      unit,
                    )}{" "}
                    {unit} this week
                  </Text>
                </View>
              )}

              {profile.targetWeight != null ? (
                <View style={{ marginTop: 8 }}>
                  <View style={styles.goalBarTrack}>
                    <View
                      style={[
                        styles.goalBarFill,
                        {
                          width: `${Math.max(weightGoalProgress ?? 0, 2)}%`,
                          backgroundColor:
                            weeklyWeightChange != null &&
                            ((weightGoalDirection === "loss" &&
                              weeklyWeightChange < 0) ||
                              (weightGoalDirection === "gain" &&
                                weeklyWeightChange > 0))
                              ? "#16a34a"
                              : weeklyWeightChange != null &&
                                  weeklyWeightChange !== 0
                                ? "#dc2626"
                                : colors.mutedForeground,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.goalRow}>
                    <Text
                      style={[
                        styles.goalDistance,
                        {
                          color:
                            weightDeltaToGoal != null &&
                            Math.abs(weightDeltaToGoal) < 1
                              ? "#16a34a"
                              : colors.mutedForeground,
                        },
                      ]}
                    >
                      {weightDeltaToGoal != null
                        ? `${Math.abs(convertWeight(weightDeltaToGoal, "kg", unit))} ${unit} to goal`
                        : ""}
                    </Text>
                    <Text
                      style={[
                        styles.goalTarget,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Target:{" "}
                      {formatWeight(
                        convertWeight(profile.targetWeight, "kg", unit),
                        unit,
                      )}{" "}
                      {unit}
                    </Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.setGoalBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    void Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Light,
                    );
                    setTargetInput("");
                    setGoalTypeInput(profile.weightGoalType);
                    setShowTargetModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="target" size={13} color={colors.primary} />
                  <Text
                    style={[styles.setGoalText, { color: colors.primary }]}
                  >
                    Set a target weight
                  </Text>
                </TouchableOpacity>
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
                Tap Log Weight to add your first entry
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

            {visibleWeightGroups.map((group) => (
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
                      unit={unit}
                      onDelete={() => {
                        Alert.alert(
                          "Delete Entry",
                          `Remove ${formatWeight(convertWeight(entry.weight, "kg", unit), unit)} ${unit} entry?`,
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
            {hasMoreWeightEntries && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => {
                  if (isWeightExpanded) {
                    setIsWeightExpanded(false);
                    setVisibleWeightEntries(5);
                  } else {
                    setIsWeightExpanded(true);
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                  {isWeightExpanded ? "View Less" : "View More"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitleV2, { color: colors.foreground }]}>
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
          <Text style={[styles.sectionTitleV2, { color: colors.foreground }]}>
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
            <>
              <View style={styles.prList}>
                {visiblePrs.map((pr, i) => (
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
                      <Text
                        style={[styles.prName, { color: colors.foreground }]}
                      >
                        {pr.name}
                      </Text>
                      <Text
                        style={[
                          styles.prDate,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {new Date(pr.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                    <View style={styles.prWeight}>
                      <Text
                        style={[
                          styles.prWeightValue,
                          { color: colors.primary },
                        ]}
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
              {hasMorePrs && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={() => {
                    if (isPrExpanded) {
                      setIsPrExpanded(false);
                      setVisiblePrLimit(10);
                    } else {
                      setIsPrExpanded(true);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.loadMoreText, { color: colors.primary }]}
                  >
                    {isPrExpanded ? "View Less" : "View More"}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <LogWeightModal
        visible={showAddWeight}
        onClose={() => setShowAddWeight(false)}
        onSave={(w, selectedDate) => void addWeightEntry(w, selectedDate)}
      />

      <Modal
        visible={showTargetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTargetModal(false)}
      >
        <Pressable
          style={styles.detailOverlay}
          onPress={() => setShowTargetModal(false)}
        >
          <Pressable
            style={[
              styles.targetSheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.detailHandle,
                { backgroundColor: colors.mutedForeground },
              ]}
            />
            <Text
              style={[styles.detailTitle, { color: colors.foreground }]}
            >
              Target Weight
            </Text>

            <View style={styles.goalTypeRow}>
              <TouchableOpacity
                style={[
                  styles.goalTypeBtn,
                  {
                    backgroundColor:
                      goalTypeInput === "loss" ? "#16a34a20" : colors.muted,
                    borderColor:
                      goalTypeInput === "loss" ? "#16a34a" : colors.border,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  void Haptics.impactAsync(
                    Haptics.ImpactFeedbackStyle.Light,
                  );
                  setGoalTypeInput("loss");
                }}
              >
                <Feather
                  name="trending-down"
                  size={14}
                  color={goalTypeInput === "loss" ? "#4ade80" : colors.mutedForeground}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color:
                      goalTypeInput === "loss" ? "#4ade80" : colors.mutedForeground,
                  }}
                >
                  Weight Loss
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.goalTypeBtn,
                  {
                    backgroundColor:
                      goalTypeInput === "gain" ? "#16a34a20" : colors.muted,
                    borderColor:
                      goalTypeInput === "gain" ? "#16a34a" : colors.border,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  void Haptics.impactAsync(
                    Haptics.ImpactFeedbackStyle.Light,
                  );
                  setGoalTypeInput("gain");
                }}
              >
                <Feather
                  name="trending-up"
                  size={14}
                  color={goalTypeInput === "gain" ? "#4ade80" : colors.mutedForeground}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color:
                      goalTypeInput === "gain" ? "#4ade80" : colors.mutedForeground,
                  }}
                >
                  Weight Gain
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.targetDisplay}>
              <Text
                style={[
                  styles.targetValue,
                  { color: targetInput ? colors.foreground : colors.mutedForeground },
                ]}
              >
                {targetInput || "—"}
              </Text>
              <Text
                style={[styles.targetUnit, { color: colors.mutedForeground }]}
              >
                {unit}
              </Text>
            </View>

            <View style={styles.targetKeypad}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "←"].map(
                (key) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.targetKey,
                      { backgroundColor: colors.muted, borderColor: colors.border },
                    ]}
                    activeOpacity={0.6}
                    onPress={() => {
                      void Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light,
                      );
                      if (key === "←") {
                        setTargetInput((p) => p.slice(0, -1));
                      } else if (key === "." && targetInput.includes(".")) {
                        return;
                      } else {
                        setTargetInput((p) => {
                          if (p.includes(".") && key === ".") return p;
                          const next = p + key;
                          if (next.includes(".")) {
                            const dec = next.split(".")[1];
                            if (dec && dec.length > 1) return p;
                          }
                          return next;
                        });
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.targetKeyText,
                        { color: colors.foreground },
                      ]}
                    >
                      {key}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>

            <View style={styles.targetActions}>
              {profile.targetWeight != null && (
                <TouchableOpacity
                  style={[styles.targetClearBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    void Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Medium,
                    );
                    void updateProfile({
                      targetWeight: null,
                      weightGoalType: null,
                    });
                    setShowTargetModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.targetClearText, { color: colors.foreground }]}
                  >
                    Clear Goal
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.targetSaveBtn,
                  {
                    backgroundColor:
                      targetInput && goalTypeInput
                        ? colors.primary
                        : colors.muted,
                    opacity: targetInput && goalTypeInput ? 1 : 0.5,
                  },
                ]}
                disabled={!targetInput || !goalTypeInput}
                onPress={() => {
                  const parsed = parseFloat(targetInput);
                  if (isNaN(parsed) || parsed <= 0 || !goalTypeInput) return;
                  void Haptics.impactAsync(
                    Haptics.ImpactFeedbackStyle.Medium,
                  );
                  const kgVal = unit === "lbs" ? lbsToKg(parsed) : parsed;
                  void updateProfile({
                    targetWeight: Math.round(kgVal * 10) / 10,
                    weightGoalType: goalTypeInput,
                  });
                  setShowTargetModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.targetSaveText,
                    {
                      color:
                        targetInput && goalTypeInput
                          ? colors.primaryForeground
                          : colors.foreground,
                    },
                  ]}
                >
                  Save Target
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },

  statGrid: { gap: 10 },
  statRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

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
    // padding: 16,
    paddingBottom: 0,
  },
  sectionTitleV2: {
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
  loadMoreButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  loadMoreText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },

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

  tapHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingTop: 10,
    paddingBottom: 2,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  detailSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    maxHeight: "70%",
    paddingBottom: 16,
  },
  detailHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
    opacity: 0.4,
  },
  detailTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  trendCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  trendLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  trendValues: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  detailHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 2,
  },
  detailColLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailWeek: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  detailWeight: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  detailDelta: {
    flex: 1,
    alignItems: "flex-end",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },

  goalBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(128,128,128,0.15)",
    overflow: "hidden",
  },
  goalBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  goalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  goalDistance: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  goalTarget: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  setGoalBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  setGoalText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  targetSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingBottom: 16,
  },
  goalTypeRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 4,
  },
  goalTypeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  targetDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  targetValue: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
  },
  targetUnit: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
  },
  targetKeypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 14,
  },
  targetKey: {
    width: "30%",
    aspectRatio: 2,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  targetKeyText: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  targetActions: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 10,
  },
  targetClearBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  targetClearText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  targetSaveBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  targetSaveText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
