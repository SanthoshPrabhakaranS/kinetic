import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
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
import type { Equipment, MeasurementUnit, MuscleGroup } from "@/types/workout";

const MUSCLE_GROUPS: MuscleGroup[] = [
  "CHEST", "BACK", "LEGS", "SHOULDERS", "ARMS", "CORE", "GLUTES", "CARDIO",
];

const EQUIPMENT_TYPES: Equipment[] = [
  "Barbell", "Dumbbell", "Machine", "Bodyweight", "Kettlebell", "Cable",
];

const MEASUREMENT_UNITS: { value: MeasurementUnit; label: string }[] = [
  { value: "Weight & Reps", label: "Weight & Reps" },
  { value: "Reps Only", label: "Reps Only" },
  { value: "Duration", label: "Duration" },
];

const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  CHEST: "Chest", BACK: "Back", LEGS: "Legs", SHOULDERS: "Shoulders",
  ARMS: "Arms", CORE: "Core", GLUTES: "Glutes", CARDIO: "Cardio",
};

export default function EditExerciseScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const { exercises, updateExercise } = useWorkout();

  const exercise = exercises.find((e) => e.id === exerciseId);

  const [name, setName] = useState(exercise?.name ?? "");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(exercise?.muscleGroup ?? null);
  const [equipment, setEquipment] = useState<Equipment | null>(exercise?.equipment ?? null);
  const [measurementUnit, setMeasurementUnit] = useState<MeasurementUnit>(
    exercise?.measurementUnit ?? "Weight & Reps"
  );
  const [instructions, setInstructions] = useState(exercise?.instructions ?? "");
  const [saving, setSaving] = useState(false);

  const isReadOnly = !exercise?.isCustom;
  const isValid = name.trim().length > 0 && muscleGroup !== null && equipment !== null;

  if (!exercise) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>
          Exercise not found
        </Text>
      </View>
    );
  }

  const handleSave = async () => {
    if (!isValid || !muscleGroup || !equipment || isReadOnly) return;
    setSaving(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateExercise(exerciseId, {
      name: name.trim(),
      muscleGroup,
      equipment,
      measurementUnit,
      instructions: instructions.trim() || undefined,
    });
    router.back();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {isReadOnly && (
        <View style={[styles.readOnlyBanner, { backgroundColor: `${colors.primary}15`, borderBottomColor: `${colors.primary}30` }]}>
          <Feather name="lock" size={13} color={colors.primary} />
          <Text style={[styles.readOnlyText, { color: colors.primary }]}>
            Built-in exercises are read-only. Duplicate it to create a custom version.
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>EXERCISE NAME</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border, opacity: isReadOnly ? 0.5 : 1 }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={name}
              onChangeText={setName}
              editable={!isReadOnly}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>MUSCLE GROUP</Text>
          <View style={[styles.chipGrid, { opacity: isReadOnly ? 0.5 : 1 }]}>
            {MUSCLE_GROUPS.map((mg) => (
              <TouchableOpacity
                key={mg}
                style={[
                  styles.chip,
                  {
                    backgroundColor: muscleGroup === mg ? colors.primary : colors.card,
                    borderColor: muscleGroup === mg ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  if (isReadOnly) return;
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMuscleGroup(mg);
                }}
                activeOpacity={isReadOnly ? 1 : 0.7}
              >
                <Text style={[styles.chipText, { color: muscleGroup === mg ? colors.primaryForeground : colors.mutedForeground }]}>
                  {MUSCLE_LABEL[mg]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>EQUIPMENT</Text>
          <View style={[styles.chipGrid, { opacity: isReadOnly ? 0.5 : 1 }]}>
            {EQUIPMENT_TYPES.map((eq) => (
              <TouchableOpacity
                key={eq}
                style={[
                  styles.chip,
                  {
                    backgroundColor: equipment === eq ? colors.primary : colors.card,
                    borderColor: equipment === eq ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  if (isReadOnly) return;
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEquipment(eq);
                }}
                activeOpacity={isReadOnly ? 1 : 0.7}
              >
                <Text style={[styles.chipText, { color: equipment === eq ? colors.primaryForeground : colors.mutedForeground }]}>
                  {eq}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>MEASUREMENT</Text>
          <View style={[styles.unitRow, { opacity: isReadOnly ? 0.5 : 1 }]}>
            {MEASUREMENT_UNITS.map((u) => (
              <TouchableOpacity
                key={u.value}
                style={[
                  styles.unitBtn,
                  {
                    backgroundColor: measurementUnit === u.value ? colors.primary : colors.card,
                    borderColor: measurementUnit === u.value ? colors.primary : colors.border,
                    flex: 1,
                  },
                ]}
                onPress={() => {
                  if (isReadOnly) return;
                  setMeasurementUnit(u.value);
                }}
                activeOpacity={isReadOnly ? 1 : 0.7}
              >
                <Text style={[styles.unitBtnText, { color: measurementUnit === u.value ? colors.primaryForeground : colors.mutedForeground }]}>
                  {u.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>INSTRUCTIONS</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border, opacity: isReadOnly ? 0.5 : 1 }]}>
            <TextInput
              style={[styles.textarea, { color: colors.foreground }]}
              placeholder="Form cues and tips..."
              placeholderTextColor={colors.mutedForeground}
              value={instructions}
              onChangeText={setInstructions}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isReadOnly}
            />
          </View>
        </View>
      </ScrollView>

      {!isReadOnly && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: isValid ? colors.primary : `${colors.primary}40` }]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={!isValid || saving}
          >
            <Feather name="check" size={18} color={colors.primaryForeground} />
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
              Save Changes
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { fontSize: 15, fontFamily: "Inter_400Regular" },
  readOnlyBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  readOnlyText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  content: { padding: 20, gap: 22 },
  field: { gap: 10 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  inputWrap: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  input: { fontSize: 15, fontFamily: "Inter_400Regular" },
  textarea: { fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 70 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  unitRow: { flexDirection: "row", gap: 8 },
  unitBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  unitBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
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
