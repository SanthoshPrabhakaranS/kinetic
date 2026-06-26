import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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

type ActiveField = "weight" | "reps" | "sets";

function applyKey(current: string, key: string): string {
  if (key === "⌫") return current.length > 1 ? current.slice(0, -1) : "0";
  if (key === ".") {
    if (current.includes(".")) return current;
    return current + ".";
  }
  if (current === "0") return key;
  if (current.length >= 6) return current;
  return current + key;
}

export default function QuickLogScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const { exercises, addWorkoutEntry, getLastEntryForExercise, todayLog } = useWorkout();

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [activeField, setActiveField] = useState<ActiveField>("weight");

  const [weight, setWeight] = useState("0");
  const [reps, setReps] = useState("8");
  const [sets, setSets] = useState("4");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (exerciseId) {
      const ex = exercises.find((e) => e.id === exerciseId);
      if (ex) setSelectedExercise(ex);
    } else if (exercises.length > 0 && !selectedExercise) {
      setShowPicker(true);
    }
  }, [exerciseId, exercises]);

  const lastEntry = useMemo(
    () => (selectedExercise ? getLastEntryForExercise(selectedExercise.id) : null),
    [selectedExercise, getLastEntryForExercise]
  );

  const todayEntry = useMemo(() => {
    if (!selectedExercise || !todayLog) return null;
    return todayLog.entries.find((e) => e.exerciseId === selectedExercise.id) ?? null;
  }, [selectedExercise, todayLog]);

  const lastWeight = lastEntry?.sets[0]?.weight;
  const lastReps = lastEntry?.sets[0]?.reps;

  useEffect(() => {
    if (lastWeight != null) setWeight(lastWeight.toString());
    if (lastReps != null) setReps(lastReps.toString());
    if (lastEntry?.sets.length) setSets(lastEntry.sets.length.toString());
  }, [lastEntry]);

  const handleNumPad = useCallback(
    (key: string) => {
      if (activeField === "weight") setWeight((v) => applyKey(v, key));
      else if (activeField === "reps") setReps((v) => applyKey(v, key));
      else setSets((v) => applyKey(v, key));
    },
    [activeField]
  );

  const handleQuickAdjust = (delta: number) => {
    const current = parseFloat(weight) || 0;
    setWeight(Math.max(0, current + delta).toString());
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSameAsLast = () => {
    if (lastWeight != null) setWeight(lastWeight.toString());
    if (lastReps != null) setReps(lastReps.toString());
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    if (!selectedExercise) return;
    const numWeight = parseFloat(weight);
    const numReps = parseInt(reps);
    const numSets = parseInt(sets);

    if (isNaN(numSets) || numSets <= 0) return;

    const setsArray: SetEntry[] = Array.from({ length: numSets }, (_, i) => ({
      setNumber: i + 1,
      weight: isNaN(numWeight) ? undefined : numWeight,
      reps: isNaN(numReps) ? undefined : numReps,
    }));

    await addWorkoutEntry({
      exerciseId: selectedExercise.id,
      exerciseName: selectedExercise.name,
      muscleGroup: selectedExercise.muscleGroup,
      equipment: selectedExercise.equipment,
      sets: setsArray,
    });

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTimeout(() => {
      router.back();
    }, 600);
  };

  const filteredExercises = exercises.filter(
    (ex) =>
      pickerQuery.trim() === "" ||
      ex.name.toLowerCase().includes(pickerQuery.toLowerCase()) ||
      ex.muscleGroup.toLowerCase().includes(pickerQuery.toLowerCase())
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const FieldBtn = ({
    field,
    value,
    label,
    extra,
  }: {
    field: ActiveField;
    value: string;
    label: string;
    extra?: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.fieldBtn,
        {
          backgroundColor: activeField === field ? `${colors.primary}15` : colors.card,
          borderColor: activeField === field ? colors.primary : colors.border,
        },
      ]}
      onPress={() => setActiveField(field)}
      activeOpacity={0.7}
    >
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color: activeField === field ? colors.primary : colors.foreground }]}>
        {value}
      </Text>
      {extra && (
        <Text style={[styles.fieldExtra, { color: colors.mutedForeground }]}>{extra}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Quick Log</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Update your routine performance
          </Text>
        </View>
        <Feather name="search" size={20} color={colors.mutedForeground} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>EXERCISE</Text>
        <TouchableOpacity
          style={[styles.exerciseRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.7}
        >
          <View style={styles.exerciseInfo}>
            {selectedExercise ? (
              <>
                <Text style={[styles.exerciseName, { color: colors.foreground }]}>
                  {selectedExercise.name}
                </Text>
                <Text style={[styles.exerciseMeta, { color: colors.mutedForeground }]}>
                  {selectedExercise.muscleGroup} · {selectedExercise.equipment}
                </Text>
              </>
            ) : (
              <Text style={[styles.exercisePlaceholder, { color: colors.mutedForeground }]}>
                Select an exercise...
              </Text>
            )}
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        {selectedExercise && (
          <>
            <View style={styles.weightSection}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>WEIGHT</Text>
              <TouchableOpacity
                style={[
                  styles.weightDisplay,
                  {
                    backgroundColor: activeField === "weight" ? `${colors.primary}08` : "transparent",
                  },
                ]}
                onPress={() => setActiveField("weight")}
                activeOpacity={0.7}
              >
                <Text style={[styles.weightValue, { color: activeField === "weight" ? colors.primary : colors.foreground }]}>
                  {weight}
                </Text>
                <View style={styles.weightRight}>
                  <Text style={[styles.weightUnit, { color: colors.mutedForeground }]}>kg</Text>
                  {lastWeight != null && (
                    <Text style={[styles.prevText, { color: colors.mutedForeground }]}>
                      Previous: {lastWeight}kg
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.repsRow}>
              <FieldBtn
                field="reps"
                value={reps}
                label="REPS"
                extra={lastReps != null ? `Prev: ${lastReps}` : undefined}
              />
              <FieldBtn
                field="sets"
                value={sets}
                label="SETS"
                extra={todayEntry ? `Today: ${todayEntry.sets.length}` : undefined}
              />
            </View>

            <View style={styles.quickRow}>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleQuickAdjust(2.5)}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickBtnText, { color: colors.foreground }]}>+2.5kg</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleQuickAdjust(5)}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickBtnText, { color: colors.foreground }]}>+5kg</Text>
              </TouchableOpacity>
              {lastWeight != null && (
                <TouchableOpacity
                  style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={handleSameAsLast}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickBtnText, { color: colors.foreground }]}>Same as last</Text>
                </TouchableOpacity>
              )}
            </View>

            <NumberPad onPress={handleNumPad} />

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: saved ? colors.primary : colors.primary },
              ]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={saved}
            >
              <Feather
                name={saved ? "check-circle" : "check"}
                size={18}
                color={colors.primaryForeground}
              />
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                {saved ? "Saved!" : "Save Workout"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {!selectedExercise && (
          <View style={styles.noExerciseBox}>
            <Feather name="activity" size={40} color={colors.mutedForeground} />
            <Text style={[styles.noExerciseText, { color: colors.mutedForeground }]}>
              Select an exercise to start logging
            </Text>
            <TouchableOpacity
              style={[styles.selectBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.selectBtnText, { color: colors.primaryForeground }]}>
                Browse Exercises
              </Text>
            </TouchableOpacity>
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
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Select Exercise
            </Text>
            <TouchableOpacity onPress={() => setShowPicker(false)} hitSlop={12}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={[styles.modalSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
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
                  <Text style={[styles.modalItemName, { color: colors.foreground }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.modalItemMeta, { color: colors.mutedForeground }]}>
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
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerCenter: { flex: 1, gap: 2 },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: -8,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  exerciseInfo: { flex: 1, gap: 3 },
  exerciseName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  exerciseMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  exercisePlaceholder: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  weightSection: { gap: 8 },
  weightDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  weightValue: {
    fontSize: 56,
    fontFamily: "Inter_700Bold",
  },
  weightRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  weightUnit: {
    fontSize: 18,
    fontFamily: "Inter_400Regular",
  },
  prevText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  repsRow: {
    flexDirection: "row",
    gap: 12,
  },
  fieldBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  fieldValue: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
  fieldExtra: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
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
  noExerciseBox: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  noExerciseText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  selectBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  selectBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
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
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  modalList: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 8,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  modalItemInfo: { flex: 1, gap: 3 },
  modalItemName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  modalItemMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
