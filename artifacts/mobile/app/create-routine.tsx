import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";
import type { Exercise, RoutineExercise } from "@/types/workout";

export default function CreateRoutineScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { exercises, addRoutine } = useWorkout();

  const [routineName, setRoutineName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<RoutineExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const isValid = routineName.trim().length > 0 && selectedExercises.length > 0;

  const addExerciseToRoutine = (ex: Exercise) => {
    const already = selectedExercises.some((r) => r.exerciseId === ex.id);
    if (already) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedExercises((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        exerciseName: ex.name,
        muscleGroup: ex.muscleGroup,
        targetSets: 3,
      },
    ]);
  };

  const removeExercise = (exerciseId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedExercises((prev) => prev.filter((r) => r.exerciseId !== exerciseId));
  };

  const adjustSets = (exerciseId: string, delta: number) => {
    setSelectedExercises((prev) =>
      prev.map((r) =>
        r.exerciseId === exerciseId
          ? { ...r, targetSets: Math.max(1, Math.min(10, r.targetSets + delta)) }
          : r
      )
    );
  };

  const handleCreate = async () => {
    if (!isValid) return;
    setSaving(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addRoutine({
      name: routineName.trim(),
      type: "custom",
      exercises: selectedExercises,
    });
    router.replace("/(tabs)");
  };

  const filteredExercises = exercises.filter(
    (ex) =>
      pickerQuery.trim() === "" ||
      ex.name.toLowerCase().includes(pickerQuery.toLowerCase()) ||
      ex.muscleGroup.toLowerCase().includes(pickerQuery.toLowerCase())
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            ROUTINE NAME
          </Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="e.g. Summer Shred"
              placeholderTextColor={colors.mutedForeground}
              value={routineName}
              onChangeText={setRoutineName}
              autoCapitalize="words"
              returnKeyType="done"
            />
            <Feather name="edit-2" size={16} color={colors.mutedForeground} />
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.exercisesHeader}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              EXERCISES
            </Text>
            <Text style={[styles.countBadge, { color: colors.primary }]}>
              {selectedExercises.length} Items
            </Text>
          </View>

          {selectedExercises.map((re) => (
            <View
              key={re.exerciseId}
              style={[styles.exerciseRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="menu" size={16} color={colors.mutedForeground} />
              <View style={styles.exerciseInfo}>
                <Text style={[styles.exerciseName, { color: colors.foreground }]}>
                  {re.exerciseName}
                </Text>
                <Text style={[styles.exerciseMeta, { color: colors.mutedForeground }]}>
                  {re.muscleGroup}
                </Text>
              </View>
              <View style={styles.setsControl}>
                <TouchableOpacity
                  onPress={() => adjustSets(re.exerciseId, -1)}
                  hitSlop={8}
                >
                  <Feather name="minus" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
                <Text style={[styles.setsCount, { color: colors.foreground }]}>
                  {re.targetSets} SETS
                </Text>
                <TouchableOpacity
                  onPress={() => adjustSets(re.exerciseId, 1)}
                  hitSlop={8}
                >
                  <Feather name="plus" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => removeExercise(re.exerciseId)} hitSlop={8}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.addExBtn, { borderColor: colors.border }]}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}
          >
            <Feather name="plus-circle" size={18} color={colors.primary} />
            <Text style={[styles.addExText, { color: colors.primary }]}>
              ADD EXERCISE
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.createBtn,
            { backgroundColor: isValid ? colors.primary : `${colors.primary}40` },
          ]}
          onPress={handleCreate}
          activeOpacity={0.85}
          disabled={!isValid || saving}
        >
          <Feather name="zap" size={18} color={colors.primaryForeground} />
          <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>
            CREATE ROUTINE
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Add Exercise
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
            renderItem={({ item }) => {
              const added = selectedExercises.some((r) => r.exerciseId === item.id);
              return (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    {
                      backgroundColor: added ? `${colors.primary}10` : colors.card,
                      borderColor: added ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    if (!added) {
                      addExerciseToRoutine(item);
                      setShowPicker(false);
                      setPickerQuery("");
                    }
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
                  {added ? (
                    <Feather name="check" size={16} color={colors.primary} />
                  ) : (
                    <Feather name="plus" size={16} color={colors.mutedForeground} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 24 },
  field: { gap: 10 },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  exercisesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  countBadge: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  exerciseInfo: { flex: 1, gap: 2 },
  exerciseName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  exerciseMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  setsControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  setsCount: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    minWidth: 55,
    textAlign: "center",
  },
  addExBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 8,
    marginTop: 4,
  },
  addExText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  createBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
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
