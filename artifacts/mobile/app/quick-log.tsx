import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NumberPad } from "@/components/NumberPad";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";
import type { Exercise, SetEntry } from "@/types/workout";

type ActiveField = "weight" | "reps" | "duration";

type DurationUnit = "seconds" | "minutes";

interface SetRow {
  id: string;
  weight: string;
  reps: string;
  duration: string;
  durationUnit: DurationUnit;
}

function makeSet(weight = "0", reps = "8"): SetRow {
  return {
    id: Math.random().toString(36).substr(2, 9),
    weight,
    reps,
    duration: "30",
    durationUnit: "seconds",
  };
}

function makeDurationSet(
  duration = "30",
  durationUnit: DurationUnit = "seconds",
): SetRow {
  return {
    id: Math.random().toString(36).substr(2, 9),
    weight: "0",
    reps: "0",
    duration,
    durationUnit,
  };
}

function applyKey(current: string, key: string): string {
  if (key === "⌫") return current.length > 1 ? current.slice(0, -1) : "0";
  if (key === ".") return current.includes(".") ? current : current + ".";
  if (current === "0") return key;
  if (current.length >= 6) return current;
  return current + key;
}

function durationToSeconds(value: string, unit: DurationUnit) {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed) || parsed <= 0) return undefined;
  if (unit === "minutes") {
    return Math.round(parsed * 60);
  }
  return Math.round(parsed);
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
  const seconds = durationToSeconds(value, fromUnit);
  if (seconds == null) return value;
  return secondsToDurationInput(seconds, toUnit);
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

function shiftDurationValue(
  value: string,
  unit: DurationUnit,
  deltaSeconds: number,
) {
  const currentSeconds = durationToSeconds(value, unit) ?? 0;
  return secondsToDurationInput(
    Math.max(0, currentSeconds + deltaSeconds),
    unit,
  );
}

export default function QuickLogScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { exerciseId, selectedDate } = useLocalSearchParams<{
    exerciseId?: string;
    selectedDate?: string;
  }>();
  const { exercises, addWorkoutEntry, getLastEntryForExercise } = useWorkout();

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  );
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  const [sets, setSets] = useState<SetRow[]>([makeSet()]);
  const [activeSetId, setActiveSetId] = useState<string>(sets[0]!.id);
  const [activeField, setActiveField] = useState<ActiveField>("weight");
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [durationRunning, setDurationRunning] = useState(false);
  const [defaultDurationUnit, setDefaultDurationUnit] =
    useState<DurationUnit>("seconds");
  const durationStartedAtRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const isDurationExercise = selectedExercise?.measurementUnit === "Duration";

  const lastEntry = useMemo(
    () =>
      selectedExercise ? getLastEntryForExercise(selectedExercise.id) : null,
    [selectedExercise, getLastEntryForExercise],
  );

  useEffect(() => {
    if (exerciseId) {
      const ex = exercises.find((e) => e.id === exerciseId);
      if (ex) setSelectedExercise(ex);
    } else {
      setShowPicker(true);
    }
  }, [exerciseId, exercises]);

  useEffect(() => {
    if (lastEntry && lastEntry.sets.length > 0) {
      const lastDurationUnit =
        lastEntry.sets.find((set) => set.durationUnit)?.durationUnit ??
        defaultDurationUnit;
      setDefaultDurationUnit(lastDurationUnit);
      const prefilled = lastEntry.sets.map((s) =>
        isDurationExercise
          ? makeDurationSet(
              s.duration != null ? s.duration.toString() : "30",
              s.durationUnit ?? lastDurationUnit,
            )
          : makeSet(
              s.weight != null ? s.weight.toString() : "0",
              s.reps != null ? s.reps.toString() : "8",
            ),
      );
      setSets(prefilled);
      setActiveSetId(prefilled[0]!.id);
    }
  }, [isDurationExercise, lastEntry]);

  useEffect(() => {
    if (!isDurationExercise) {
      setDurationRunning(false);
      durationStartedAtRef.current = null;
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      return;
    }

    setSets((prev) => {
      if (prev.length > 0 && prev[0]?.duration != null) return prev;
      return [makeDurationSet("30", defaultDurationUnit)];
    });
    setActiveSetId((prev) => prev ?? sets[0]!.id);
    setActiveField("duration");
  }, [defaultDurationUnit, isDurationExercise]);

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  const handleNumPad = useCallback(
    (key: string) => {
      setSets((prev) =>
        prev.map((s) => {
          if (s.id !== activeSetId) return s;
          if (activeField === "weight")
            return { ...s, weight: applyKey(s.weight, key) };
          if (activeField === "reps")
            return { ...s, reps: applyKey(s.reps, key) };
          return { ...s, duration: applyKey(s.duration, key) };
        }),
      );
    },
    [activeSetId, activeField],
  );

  const handleActivate = (setId: string, field: ActiveField) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSetId(setId);
    setActiveField(field);
  };

  const handleAddSet = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const lastSet = sets[sets.length - 1];
    const newSet = isDurationExercise
      ? makeDurationSet(
          lastSet?.duration ?? "30",
          lastSet?.durationUnit ?? defaultDurationUnit,
        )
      : makeSet(lastSet?.weight ?? "0", lastSet?.reps ?? "8");
    setSets((prev) => [...prev, newSet]);
    setActiveSetId(newSet.id);
    setActiveField(isDurationExercise ? "duration" : "weight");
  };

  const handleDeleteSet = (setId: string) => {
    if (sets.length <= 1) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const remaining = sets.filter((s) => s.id !== setId);
    setSets(remaining);
    if (activeSetId === setId) {
      setActiveSetId(remaining[remaining.length - 1]!.id);
    }
  };

  const handleQuickFill = (delta: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSets((prev) =>
      prev.map((s) => {
        if (s.id !== activeSetId) return s;
        const cur = parseFloat(s.weight) || 0;
        return { ...s, weight: Math.max(0, cur + delta).toString() };
      }),
    );
  };

  const handleCopyPrev = () => {
    const idx = sets.findIndex((s) => s.id === activeSetId);
    if (idx <= 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prev = sets[idx - 1]!;
    setSets((old) =>
      old.map((s) =>
        s.id === activeSetId
          ? isDurationExercise
            ? { ...s, duration: prev.duration, durationUnit: prev.durationUnit }
            : { ...s, weight: prev.weight, reps: prev.reps }
          : s,
      ),
    );
  };

  const handleToggleDurationTimer = () => {
    if (!isDurationExercise) return;

    const activeDuration = sets.find((s) => s.id === activeSetId);
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
    const currentSeconds =
      durationToSeconds(activeDuration.duration, activeDuration.durationUnit) ??
      0;
    durationStartedAtRef.current = Date.now() - currentSeconds * 1000;
    setDurationRunning(true);
    durationIntervalRef.current = setInterval(() => {
      const startedAt = durationStartedAtRef.current;
      if (!startedAt) return;
      const nextSeconds = Math.max(
        0,
        Math.floor((Date.now() - startedAt) / 1000),
      );
      setSets((prev) =>
        prev.map((item) =>
          item.id === activeSetId
            ? {
                ...item,
                duration: secondsToDurationInput(
                  nextSeconds,
                  item.durationUnit ?? "seconds",
                ),
              }
            : item,
        ),
      );
    }, 1000);
  };

  const handleResetDurationTimer = () => {
    if (!isDurationExercise) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    durationStartedAtRef.current = null;
    setDurationRunning(false);
    setSets((prev) =>
      prev.map((item) =>
        item.id === activeSetId
          ? {
              ...item,
              duration: "30",
              durationUnit: defaultDurationUnit,
            }
          : item,
      ),
    );
  };

  const updateDurationUnit = (setId: string, unit: DurationUnit) => {
    setDefaultDurationUnit(unit);
    setSets((prev) =>
      prev.map((item) =>
        item.id === setId
          ? {
              ...item,
              duration: convertDurationInput(
                item.duration,
                item.durationUnit,
                unit,
              ),
              durationUnit: unit,
            }
          : item,
      ),
    );
  };

  const shiftActiveDuration = (deltaSeconds: number) => {
    setSets((prev) =>
      prev.map((item) => {
        if (item.id !== activeSetId) return item;
        const unit = item.durationUnit ?? defaultDurationUnit;
        return {
          ...item,
          duration: shiftDurationValue(item.duration, unit, deltaSeconds),
        };
      }),
    );
  };

  const handleSave = async () => {
    if (!selectedExercise || sets.length === 0 || isSaving || saved) return;
    setIsSaving(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const setsData: SetEntry[] = sets.map((s, i) =>
      isDurationExercise
        ? {
            setNumber: i + 1,
            duration: durationToSeconds(s.duration, s.durationUnit),
            durationUnit: s.durationUnit,
          }
        : {
            setNumber: i + 1,
            weight: parseFloat(s.weight) || undefined,
            reps: parseInt(s.reps) || undefined,
          },
    );

    try {
      await addWorkoutEntry(
        {
          exerciseId: selectedExercise.id,
          exerciseName: selectedExercise.name,
          muscleGroup: selectedExercise.muscleGroup,
          equipment: selectedExercise.equipment,
          sets: setsData,
        },
        typeof selectedDate === "string" && selectedDate.trim()
          ? selectedDate
          : undefined,
      );

      setSaved(true);
      setTimeout(() => router.back(), 500);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredExercises = exercises.filter(
    (ex) =>
      pickerQuery.trim() === "" ||
      ex.name.toLowerCase().includes(pickerQuery.toLowerCase()) ||
      ex.muscleGroup.toLowerCase().includes(pickerQuery.toLowerCase()),
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const activeSet = sets.find((s) => s.id === activeSetId);
  const activeSetIndex = sets.findIndex((s) => s.id === activeSetId);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Quick Log
          </Text>
        </View>
        {selectedExercise && (
          <TouchableOpacity
            style={[
              styles.saveHeaderBtn,
              {
                backgroundColor:
                  saved || isSaving ? colors.muted : colors.primary,
              },
            ]}
            onPress={handleSave}
            disabled={saved || isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator
                size="small"
                color={colors.primaryForeground}
              />
            ) : (
              <Text
                style={[
                  styles.saveHeaderText,
                  { color: colors.primaryForeground },
                ]}
              >
                {saved ? "Saved!" : "Save"}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={[
            styles.exerciseRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.exerciseIcon,
              { backgroundColor: `${colors.primary}15` },
            ]}
          >
            <Feather name="activity" size={18} color={colors.primary} />
          </View>
          <View style={styles.exerciseInfo}>
            {selectedExercise ? (
              <>
                <Text
                  style={[styles.exerciseName, { color: colors.foreground }]}
                >
                  {selectedExercise.name}
                </Text>
                <Text
                  style={[
                    styles.exerciseMeta,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {selectedExercise.muscleGroup} · {selectedExercise.equipment}
                </Text>
              </>
            ) : (
              <Text
                style={[styles.placeholder, { color: colors.mutedForeground }]}
              >
                Select an exercise...
              </Text>
            )}
          </View>
          <Feather
            name="chevron-down"
            size={16}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>

        {lastEntry && (
          <View
            style={[
              styles.lastSession,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text
              style={[
                styles.lastSessionText,
                { color: colors.mutedForeground },
              ]}
            >
              Last session:
              {selectedExercise?.measurementUnit === "Duration"
                ? lastEntry.sets
                    .map((s) => formatDuration(s.duration))
                    .join(", ")
                : lastEntry.sets
                    .map((s) => `${s.weight ?? "—"}kg × ${s.reps ?? "—"}`)
                    .join(", ")}
            </Text>
          </View>
        )}

        {selectedExercise && isDurationExercise && (
          <>
            <View style={styles.setsHeader}>
              <Text style={[styles.setsTitle, { color: colors.foreground }]}>
                DURATION
              </Text>
              <Text
                style={[styles.setsCount, { color: colors.mutedForeground }]}
              >
                {sets.length} {sets.length === 1 ? "interval" : "intervals"}
              </Text>
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
                <View style={styles.thDel} />
              </View>

              {sets.map((set, index) => {
                const isActive = set.id === activeSetId;
                return (
                  <View
                    key={set.id}
                    style={[
                      styles.tableRow,
                      index < sets.length - 1 && {
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

                    <TouchableOpacity
                      style={[
                        styles.cellBtn,
                        isActive &&
                          activeField === "duration" && {
                            backgroundColor: `${colors.primary}20`,
                            borderColor: colors.primary,
                          },
                        { borderColor: colors.border },
                      ]}
                      onPress={() => handleActivate(set.id, "duration")}
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
                        {set.duration}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.unitCell}>
                      <TouchableOpacity
                        style={[
                          styles.unitPill,
                          {
                            backgroundColor:
                              set.durationUnit === "seconds"
                                ? `${colors.primary}20`
                                : colors.muted,
                            borderColor:
                              set.durationUnit === "seconds"
                                ? colors.primary
                                : colors.border,
                          },
                        ]}
                        onPress={() => updateDurationUnit(set.id, "seconds")}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.unitPillText,
                            {
                              color:
                                set.durationUnit === "seconds"
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
                          styles.unitPill,
                          {
                            backgroundColor:
                              set.durationUnit === "minutes"
                                ? `${colors.primary}20`
                                : colors.muted,
                            borderColor:
                              set.durationUnit === "minutes"
                                ? colors.primary
                                : colors.border,
                          },
                        ]}
                        onPress={() => updateDurationUnit(set.id, "minutes")}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.unitPillText,
                            {
                              color:
                                set.durationUnit === "minutes"
                                  ? colors.primary
                                  : colors.foreground,
                            },
                          ]}
                        >
                          min
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.delBtn}
                      onPress={() => handleDeleteSet(set.id)}
                      hitSlop={8}
                      disabled={sets.length <= 1}
                    >
                      <Feather
                        name="x"
                        size={14}
                        color={
                          sets.length <= 1
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
                  Add Interval
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.durationTools}>
              <TouchableOpacity
                style={[
                  styles.durationToolBtn,
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
                    styles.durationToolText,
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
                  styles.durationToolBtn,
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
                    styles.durationToolText,
                    { color: colors.foreground },
                  ]}
                >
                  Reset
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.quickRow}>
              <Text
                style={[styles.quickLabel, { color: colors.mutedForeground }]}
              >
                Quick adjust interval {activeSetIndex + 1}:
              </Text>
              <View style={styles.quickBtns}>
                <TouchableOpacity
                  style={[
                    styles.quickBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => shiftActiveDuration(10)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.quickBtnText, { color: colors.foreground }]}
                  >
                    +10s
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.quickBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => shiftActiveDuration(60)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.quickBtnText, { color: colors.foreground }]}
                  >
                    +1m
                  </Text>
                </TouchableOpacity>
                {activeSetIndex > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.quickBtn,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={handleCopyPrev}
                    activeOpacity={0.7}
                  >
                    <Feather name="copy" size={12} color={colors.foreground} />
                    <Text
                      style={[
                        styles.quickBtnText,
                        { color: colors.foreground },
                      ]}
                    >
                      Copy prev
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.numPadSection}>
              <View style={styles.numPadLabel}>
                <Text
                  style={[
                    styles.numPadTitle,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Set {activeSetIndex + 1} · Duration
                </Text>
                <Text style={[styles.numPadValue, { color: colors.primary }]}>
                  {activeSet?.duration ?? "30"}
                </Text>
              </View>
              <NumberPad onPress={handleNumPad} />
            </View>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor:
                    saved || isSaving ? colors.muted : colors.primary,
                },
              ]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={saved || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primaryForeground}
                />
              ) : (
                <Feather
                  name={saved ? "check-circle" : "check"}
                  size={18}
                  color={colors.primaryForeground}
                />
              )}
              <Text
                style={[
                  styles.saveBtnText,
                  { color: colors.primaryForeground },
                ]}
              >
                {isSaving
                  ? "Saving..."
                  : saved
                    ? "Saved!"
                    : `Save ${sets.length} ${sets.length === 1 ? "Interval" : "Intervals"}`}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {selectedExercise && !isDurationExercise && (
          <>
            <View style={styles.setsHeader}>
              <Text style={[styles.setsTitle, { color: colors.foreground }]}>
                SETS
              </Text>
              <Text
                style={[styles.setsCount, { color: colors.mutedForeground }]}
              >
                {sets.length} {sets.length === 1 ? "set" : "sets"}
              </Text>
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
                <View style={styles.thDel} />
              </View>

              {sets.map((set, index) => {
                const isActive = set.id === activeSetId;
                return (
                  <View
                    key={set.id}
                    style={[
                      styles.tableRow,
                      index < sets.length - 1 && {
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

                    <TouchableOpacity
                      style={[
                        styles.cellBtn,
                        isActive &&
                          activeField === "weight" && {
                            backgroundColor: `${colors.primary}20`,
                            borderColor: colors.primary,
                          },
                        { borderColor: colors.border },
                      ]}
                      onPress={() => handleActivate(set.id, "weight")}
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
                        {set.weight}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.cellBtn,
                        isActive &&
                          activeField === "reps" && {
                            backgroundColor: `${colors.primary}20`,
                            borderColor: colors.primary,
                          },
                        { borderColor: colors.border },
                      ]}
                      onPress={() => handleActivate(set.id, "reps")}
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
                        {set.reps}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.delBtn}
                      onPress={() => handleDeleteSet(set.id)}
                      hitSlop={8}
                      disabled={sets.length <= 1}
                    >
                      <Feather
                        name="x"
                        size={14}
                        color={
                          sets.length <= 1
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

            <View style={styles.quickRow}>
              <Text
                style={[styles.quickLabel, { color: colors.mutedForeground }]}
              >
                Quick fill set {activeSetIndex + 1}:
              </Text>
              <View style={styles.quickBtns}>
                <TouchableOpacity
                  style={[
                    styles.quickBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handleQuickFill(2.5)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.quickBtnText, { color: colors.foreground }]}
                  >
                    +2.5kg
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.quickBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handleQuickFill(5)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.quickBtnText, { color: colors.foreground }]}
                  >
                    +5kg
                  </Text>
                </TouchableOpacity>
                {activeSetIndex > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.quickBtn,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={handleCopyPrev}
                    activeOpacity={0.7}
                  >
                    <Feather name="copy" size={12} color={colors.foreground} />
                    <Text
                      style={[
                        styles.quickBtnText,
                        { color: colors.foreground },
                      ]}
                    >
                      Copy prev
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.numPadSection}>
              <View style={styles.numPadLabel}>
                <Text
                  style={[
                    styles.numPadTitle,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Set {activeSetIndex + 1} ·
                  {activeField === "weight" ? "Weight (kg)" : "Reps"}
                </Text>
                <Text style={[styles.numPadValue, { color: colors.primary }]}>
                  {activeField === "weight"
                    ? activeSet?.weight
                    : activeSet?.reps}
                </Text>
              </View>
              <NumberPad onPress={handleNumPad} />
            </View>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor:
                    saved || isSaving ? colors.muted : colors.primary,
                },
              ]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={saved || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primaryForeground}
                />
              ) : (
                <Feather
                  name={saved ? "check-circle" : "check"}
                  size={18}
                  color={colors.primaryForeground}
                />
              )}
              <Text
                style={[
                  styles.saveBtnText,
                  { color: colors.primaryForeground },
                ]}
              >
                {isSaving
                  ? "Saving..."
                  : saved
                    ? "Saved!"
                    : `Save ${sets.length} ${sets.length === 1 ? "Set" : "Sets"}`}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {!selectedExercise && (
          <View style={styles.emptyBox}>
            <Feather name="activity" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Select an exercise to start logging
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Select Exercise
            </Text>
            <TouchableOpacity onPress={() => setShowPicker(false)} hitSlop={12}>
              <Feather
                style={{
                  marginTop: 20,
                }}
                name="x"
                size={22}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.modalSearch,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.modalSearchInput, { color: colors.foreground }]}
              placeholder="Search exercises..."
              placeholderTextColor={colors.mutedForeground}
              value={pickerQuery}
              onChangeText={setPickerQuery}
              autoCapitalize="none"
              autoFocus
            />
          </View>
          <FlatList
            data={filteredExercises}
            keyExtractor={(item: Exercise) => item.id}
            contentContainerStyle={styles.modalList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }: { item: Exercise }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  {
                    backgroundColor:
                      selectedExercise?.id === item.id
                        ? `${colors.primary}12`
                        : colors.card,
                    borderColor:
                      selectedExercise?.id === item.id
                        ? colors.primary
                        : colors.border,
                  },
                ]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedExercise(item);
                  setShowPicker(false);
                  setPickerQuery("");
                }}
                activeOpacity={0.7}
              >
                <View style={styles.modalItemInfo}>
                  <Text
                    style={[styles.modalItemName, { color: colors.foreground }]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.modalItemMeta,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {item.muscleGroup} · {item.equipment}
                  </Text>
                </View>
                {selectedExercise?.id === item.id && (
                  <Feather name="check" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
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
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  saveHeaderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveHeaderText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  exerciseIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseInfo: { flex: 1, gap: 2 },
  exerciseName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  exerciseMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  placeholder: { fontSize: 15, fontFamily: "Inter_400Regular" },
  lastSession: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  lastSessionText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  setsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  setsTitle: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  setsCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
  setsTable: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
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
  unitPill: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  unitPillText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  addSetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 6,
  },
  addSetText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  quickRow: { gap: 8 },
  quickLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  quickBtns: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  quickBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  numPadSection: { gap: 10 },
  durationTools: {
    flexDirection: "row",
    gap: 8,
  },
  durationToolBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  durationToolText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  numPadLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  numPadTitle: { fontSize: 12, fontFamily: "Inter_500Medium" },
  numPadValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 20 },
  modalSearch: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  modalSearchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  modalList: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  modalItemInfo: { flex: 1, gap: 3 },
  modalItemName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalItemMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
