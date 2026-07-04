import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import type { SetEntry } from "@/types/workout";

type ActiveField = "weight" | "reps" | "duration";
type DurationUnit = "seconds" | "minutes";

interface EditableSet extends SetEntry {
  _id: string;
  durationUnit?: DurationUnit;
}

function applyKey(current: string, key: string): string {
  if (key === "⌫") return current.length > 1 ? current.slice(0, -1) : "0";
  if (key === ".") return current.includes(".") ? current : current + ".";
  if (current === "0") return key;
  if (current.length >= 6) return current;
  return current + key;
}

function formatDuration(seconds?: number | null) {
  if (seconds == null || Number.isNaN(seconds)) return "0s";
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

function formatDurationByUnit(
  seconds?: number | null,
  unit: DurationUnit = "seconds",
) {
  if (seconds == null || Number.isNaN(seconds)) return "0";
  if (unit === "minutes") {
    const minutes = seconds / 60;
    const rounded = Math.round(minutes * 100) / 100;
    return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
  }
  return `${seconds}`;
}

function durationToSeconds(value: string, unit: DurationUnit) {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed) || parsed <= 0) return 0;
  return Math.round(unit === "minutes" ? parsed * 60 : parsed);
}

function secondsToDurationInput(seconds: number, unit: DurationUnit) {
  const converted = unit === "minutes" ? seconds / 60 : seconds;
  const rounded = Math.round(converted * 100) / 100;
  return Number.isInteger(rounded)
    ? rounded.toString()
    : rounded.toFixed(2).replace(/\.0+$/, "").replace(/0+$/, "");
}

function convertDurationInput(
  value: string,
  fromUnit: DurationUnit,
  toUnit: DurationUnit,
) {
  return secondsToDurationInput(durationToSeconds(value, fromUnit), toUnit);
}

export default function ExerciseDetailScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { entryId, selectedDate } = useLocalSearchParams<{
    entryId?: string | string[];
    selectedDate?: string | string[];
  }>();
  const { getEntryById, updateWorkoutEntry, deleteWorkoutEntry, exercises } =
    useWorkout();

  const resolvedEntryId = Array.isArray(entryId)
    ? (entryId[0] ?? "")
    : (entryId ?? "");
  const resolvedSelectedDate = Array.isArray(selectedDate)
    ? (selectedDate[0] ?? "")
    : (selectedDate ?? "");

  const entry = getEntryById(resolvedEntryId);
  const exercise = exercises.find((item) => item.id === entry?.exerciseId);
  const isDurationEntry =
    exercise?.measurementUnit === "Duration" ||
    entry?.sets.some((set) => set.duration != null) ||
    false;

  const [editableSets, setEditableSets] = useState<EditableSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string>("");
  const [activeField, setActiveField] = useState<ActiveField>("weight");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [durationRunning, setDurationRunning] = useState(false);
  const durationStartedAtRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const activeSetIdRef = useRef(activeSetId);

  useEffect(() => {
    activeSetIdRef.current = activeSetId;
  }, [activeSetId]);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (resolvedSelectedDate.trim()) {
      router.replace({
        pathname: "/(tabs)/log",
        params: { selectedDate: resolvedSelectedDate },
      });
      return;
    }

    router.replace("/(tabs)");
  };

  useEffect(() => {
    if (entry) {
      const mapped: EditableSet[] = entry.sets.map((s) => ({
        ...s,
        weight: s.weight ?? 0,
        reps: s.reps ?? 0,
        duration: s.duration ?? 0,
        durationUnit: s.durationUnit ?? "seconds",
        _id: s.setNumber.toString() + Math.random().toString(36).substr(2, 6),
      }));
      setEditableSets(mapped);
      if (mapped.length > 0) setActiveSetId(mapped[0]!._id);
      setActiveField(isDurationEntry ? "duration" : "weight");
    }
  }, [isDurationEntry, resolvedEntryId]);

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
  }, []);

  if (!entry) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>
          Entry not found
        </Text>
        <TouchableOpacity onPress={handleGoBack}>
          <Text style={[styles.backLink, { color: colors.primary }]}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getFieldStr = (set: EditableSet, field: ActiveField) => {
    const val =
      field === "weight"
        ? set.weight
        : field === "reps"
          ? set.reps
          : set.duration;
    if (field === "duration") {
      return formatDurationByUnit(val ?? 0, set.durationUnit ?? "seconds");
    }
    return val != null ? val.toString() : "0";
  };

  const handleNumPad = (key: string) => {
    setHasChanges(true);
    setEditableSets((prev) =>
      prev.map((s) => {
        if (s._id !== activeSetId) return s;
        const current = getFieldStr(s, activeField);
        const next = applyKey(current, key);
        if (activeField === "weight")
          return { ...s, weight: parseFloat(next) || 0 };
        if (activeField === "reps") return { ...s, reps: parseInt(next) || 0 };
        return {
          ...s,
          duration: durationToSeconds(next, s.durationUnit ?? "seconds"),
        };
      }),
    );
  };

  const handleActivate = (setId: string, field: ActiveField) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSetId(setId);
    setActiveField(field);
  };

  const handleAddSet = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const last = editableSets[editableSets.length - 1];
    const newSet: EditableSet = {
      setNumber: editableSets.length + 1,
      weight: last?.weight ?? 0,
      reps: last?.reps ?? 8,
      duration: last?.duration ?? 30,
      durationUnit: last?.durationUnit ?? "seconds",
      _id: Math.random().toString(36).substr(2, 9),
    };
    setEditableSets((prev) => [...prev, newSet]);
    setActiveSetId(newSet._id);
    setActiveField(isDurationEntry ? "duration" : "weight");
    setHasChanges(true);
  };

  const handleDeleteSet = (setId: string) => {
    if (editableSets.length <= 1) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const remaining = editableSets
      .filter((s) => s._id !== setId)
      .map((s, i) => ({ ...s, setNumber: i + 1 }));
    setEditableSets(remaining);
    if (activeSetId === setId) setActiveSetId(remaining[0]!._id);
    setHasChanges(true);
  };

  const handleToggleDurationTimer = () => {
    if (!isDurationEntry) return;

    const activeDuration = editableSets.find(
      (set) => set._id === activeSetIdRef.current,
    );
    if (!activeDuration) return;

    if (durationRunning) {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      durationStartedAtRef.current = null;
      setDurationRunning(false);
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentSeconds = activeDuration.duration ?? 0;
    durationStartedAtRef.current = Date.now() - currentSeconds * 1000;
    setDurationRunning(true);
    durationIntervalRef.current = setInterval(() => {
      const startedAt = durationStartedAtRef.current;
      const currentSetId = activeSetIdRef.current;
      if (!startedAt || !currentSetId) return;
      const nextSeconds = Math.max(
        0,
        Math.floor((Date.now() - startedAt) / 1000),
      );
      setEditableSets((prev) =>
        prev.map((item) =>
          item._id === currentSetId ? { ...item, duration: nextSeconds } : item,
        ),
      );
    }, 1000);
  };

  const handleResetDurationTimer = () => {
    if (!isDurationEntry) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    durationStartedAtRef.current = null;
    setDurationRunning(false);
    setEditableSets((prev) =>
      prev.map((item) =>
        item._id === activeSetId
          ? {
              ...item,
              duration: 30,
              durationUnit: item.durationUnit ?? "seconds",
            }
          : item,
      ),
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const sets: SetEntry[] = editableSets.map((s) => ({
      setNumber: s.setNumber,
      weight: isDurationEntry ? undefined : s.weight,
      reps: isDurationEntry ? undefined : s.reps,
      duration: isDurationEntry ? s.duration : undefined,
      durationUnit: isDurationEntry ? (s.durationUnit ?? "seconds") : undefined,
    }));
    try {
      await updateWorkoutEntry(resolvedEntryId, sets);
      setHasChanges(false);
      handleGoBack();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Exercise",
      `Remove ${entry.exerciseName} from today's log?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning,
            );
            await deleteWorkoutEntry(resolvedEntryId);
            handleGoBack();
          },
        },
      ],
    );
  };

  const topPad = Platform.OS === "web" ? 0 : 0;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const activeSet = editableSets.find((s) => s._id === activeSetId);
  const activeSetIndex = editableSets.findIndex((s) => s._id === activeSetId);

  const totalVolume = editableSets.reduce(
    (t, s) => t + (s.weight ?? 0) * (s.reps ?? 1),
    0,
  );
  const totalDuration = editableSets.reduce((t, s) => t + (s.duration ?? 0), 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleGoBack} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text
            style={[styles.exerciseName, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {entry.exerciseName}
          </Text>
          <Text
            style={[styles.exerciseMeta, { color: colors.mutedForeground }]}
          >
            {entry.muscleGroup} · {entry.equipment}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDelete} hitSlop={8}>
          <Feather name="trash-2" size={18} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statChip,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {editableSets.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Sets
            </Text>
          </View>
          <View
            style={[
              styles.statChip,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {isDurationEntry
                ? formatDuration(totalDuration)
                : Math.round(totalVolume)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {isDurationEntry ? "Total time" : "kg Vol."}
            </Text>
          </View>
          <View
            style={[
              styles.statChip,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {isDurationEntry
                ? formatDuration(
                    editableSets.reduce(
                      (m, s) => Math.max(m, s.duration ?? 0),
                      0,
                    ),
                  )
                : editableSets.reduce((m, s) => Math.max(m, s.weight ?? 0), 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {isDurationEntry ? "Longest set" : "kg Best"}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.setsTable,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[styles.tableHead, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.thSet, { color: colors.mutedForeground }]}>
              SET
            </Text>
            {isDurationEntry ? (
              <>
                <Text
                  style={[styles.thField, { color: colors.mutedForeground }]}
                >
                  DURATION
                </Text>
                <Text
                  style={[styles.thField, { color: colors.mutedForeground }]}
                >
                  UNIT
                </Text>
              </>
            ) : (
              <>
                <Text
                  style={[styles.thField, { color: colors.mutedForeground }]}
                >
                  WEIGHT (kg)
                </Text>
                <Text
                  style={[styles.thField, { color: colors.mutedForeground }]}
                >
                  REPS
                </Text>
              </>
            )}
            <View style={styles.thDel} />
          </View>

          {editableSets.map((set, index) => {
            const isActive = set._id === activeSetId;
            return (
              <View
                key={set._id}
                style={[
                  styles.tableRow,
                  index < editableSets.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                  isActive && { backgroundColor: `${colors.primary}08` },
                ]}
              >
                <View style={styles.setNumBox}>
                  <Text
                    style={[
                      styles.setNum,
                      {
                        color: isActive
                          ? colors.primary
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>

                {isDurationEntry ? (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.cellBtn,
                        {
                          borderColor:
                            isActive && activeField === "duration"
                              ? colors.primary
                              : colors.border,
                        },
                        isActive &&
                          activeField === "duration" && {
                            backgroundColor: `${colors.primary}20`,
                          },
                      ]}
                      onPress={() => handleActivate(set._id, "duration")}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.cellValue,
                          {
                            color:
                              isActive && activeField === "duration"
                                ? colors.primary
                                : colors.foreground,
                          },
                        ]}
                      >
                        {formatDurationByUnit(
                          set.duration,
                          set.durationUnit ?? "seconds",
                        )}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.unitCell}>
                      <TouchableOpacity
                        style={[
                          styles.unitBtn,
                          {
                            backgroundColor:
                              (set.durationUnit ?? "seconds") === "seconds"
                                ? `${colors.primary}20`
                                : colors.card,
                            borderColor:
                              (set.durationUnit ?? "seconds") === "seconds"
                                ? colors.primary
                                : colors.border,
                          },
                        ]}
                        onPress={() =>
                          setEditableSets((prev) =>
                            prev.map((item) =>
                              item._id === set._id
                                ? { ...item, durationUnit: "seconds" }
                                : item,
                            ),
                          )
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.unitBtnText,
                            {
                              color:
                                (set.durationUnit ?? "seconds") === "seconds"
                                  ? colors.primary
                                  : colors.foreground,
                            },
                          ]}
                        >
                          sec
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.unitBtn,
                          {
                            backgroundColor:
                              (set.durationUnit ?? "seconds") === "minutes"
                                ? `${colors.primary}20`
                                : colors.card,
                            borderColor:
                              (set.durationUnit ?? "seconds") === "minutes"
                                ? colors.primary
                                : colors.border,
                          },
                        ]}
                        onPress={() =>
                          setEditableSets((prev) =>
                            prev.map((item) =>
                              item._id === set._id
                                ? { ...item, durationUnit: "minutes" }
                                : item,
                            ),
                          )
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.unitBtnText,
                            {
                              color:
                                (set.durationUnit ?? "seconds") === "minutes"
                                  ? colors.primary
                                  : colors.foreground,
                            },
                          ]}
                        >
                          min
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.cellBtn,
                        {
                          borderColor:
                            isActive && activeField === "weight"
                              ? colors.primary
                              : colors.border,
                        },
                        isActive &&
                          activeField === "weight" && {
                            backgroundColor: `${colors.primary}20`,
                          },
                      ]}
                      onPress={() => handleActivate(set._id, "weight")}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.cellValue,
                          {
                            color:
                              isActive && activeField === "weight"
                                ? colors.primary
                                : colors.foreground,
                          },
                        ]}
                      >
                        {set.weight ?? 0}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.cellBtn,
                        {
                          borderColor:
                            isActive && activeField === "reps"
                              ? colors.primary
                              : colors.border,
                        },
                        isActive &&
                          activeField === "reps" && {
                            backgroundColor: `${colors.primary}20`,
                          },
                      ]}
                      onPress={() => handleActivate(set._id, "reps")}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.cellValue,
                          {
                            color:
                              isActive && activeField === "reps"
                                ? colors.primary
                                : colors.foreground,
                          },
                        ]}
                      >
                        {set.reps ?? 0}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={styles.delBtn}
                  onPress={() => handleDeleteSet(set._id)}
                  hitSlop={8}
                  disabled={editableSets.length <= 1}
                >
                  <Feather
                    name="x"
                    size={14}
                    color={
                      editableSets.length <= 1
                        ? "transparent"
                        : colors.mutedForeground
                    }
                  />
                </TouchableOpacity>
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.addSetRow, { borderTopColor: colors.border }]}
            onPress={handleAddSet}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={16} color={colors.primary} />
            <Text style={[styles.addSetText, { color: colors.primary }]}>
              Add Set
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.numPadSection}>
          <View style={styles.numPadHeader}>
            <Text
              style={[styles.numPadLabel, { color: colors.mutedForeground }]}
            >
              Set {activeSetIndex + 1} ·{" "}
              {isDurationEntry
                ? `Duration (${activeSet?.durationUnit ?? "seconds"})`
                : activeField === "weight"
                  ? "Weight (kg)"
                  : "Reps"}
            </Text>
            <Text style={[styles.numPadValue, { color: colors.primary }]}>
              {isDurationEntry
                ? formatDurationByUnit(
                    activeSet?.duration,
                    activeSet?.durationUnit ?? "seconds",
                  )
                : activeField === "weight"
                  ? (activeSet?.weight ?? 0)
                  : (activeSet?.reps ?? 0)}
            </Text>
          </View>
          {isDurationEntry && (
            <View style={styles.durationControls}>
              <TouchableOpacity
                style={[
                  styles.durationControlBtn,
                  {
                    backgroundColor: durationRunning
                      ? colors.primary
                      : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleToggleDurationTimer}
                activeOpacity={0.8}
              >
                <Feather
                  name={durationRunning ? "pause" : "play"}
                  size={14}
                  color={
                    durationRunning
                      ? colors.primaryForeground
                      : colors.foreground
                  }
                />
                <Text
                  style={[
                    styles.durationControlText,
                    {
                      color: durationRunning
                        ? colors.primaryForeground
                        : colors.foreground,
                    },
                  ]}
                >
                  {durationRunning ? "Stop Timer" : "Start Timer"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.durationControlBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={handleResetDurationTimer}
                activeOpacity={0.8}
              >
                <Feather
                  name="rotate-ccw"
                  size={14}
                  color={colors.foreground}
                />
                <Text
                  style={[
                    styles.durationControlText,
                    { color: colors.foreground },
                  ]}
                >
                  Reset
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <NumberPad onPress={handleNumPad} />
        </View>

        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor:
                hasChanges && !isSaving
                  ? colors.primary
                  : `${colors.primary}50`,
            },
          ]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Feather name="check" size={18} color={colors.primaryForeground} />
          )}
          <Text
            style={[styles.saveBtnText, { color: colors.primaryForeground }]}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
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
    paddingTop: 35,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerCenter: { flex: 1, gap: 2 },
  exerciseName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  exerciseMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  statsRow: { flexDirection: "row", gap: 10 },
  statChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
    gap: 2,
  },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  setsTable: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  thSet: {
    width: 32,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  thField: {
    flex: 1,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  thDel: { width: 28 },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  setNumBox: { width: 32, alignItems: "center" },
  setNum: { fontSize: 14, fontFamily: "Inter_700Bold" },
  cellBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cellValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  delBtn: { width: 28, alignItems: "center", justifyContent: "center" },
  unitCell: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  unitBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  unitBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  addSetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 6,
  },
  addSetText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  numPadSection: { gap: 10 },
  numPadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  numPadLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  numPadValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  durationControls: { flexDirection: "row", gap: 8 },
  durationControlBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  durationControlText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
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
