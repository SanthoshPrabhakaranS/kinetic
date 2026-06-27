import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
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
  "CHEST",
  "BACK",
  "LEGS",
  "SHOULDERS",
  "ARMS",
  "CORE",
  "GLUTES",
  "CARDIO",
];

const EQUIPMENT_TYPES: Equipment[] = [
  "Barbell",
  "Dumbbell",
  "Machine",
  "Bodyweight",
  "Kettlebell",
  "Cable",
];

const MEASUREMENT_UNITS: { value: MeasurementUnit; label: string; sub: string }[] = [
  {
    value: "Weight & Reps",
    label: "Weight & Reps",
    sub: "Best for strength training",
  },
  { value: "Reps Only", label: "Reps Only", sub: "Best for calisthenics" },
  {
    value: "Duration",
    label: "Duration",
    sub: "Best for cardio or isometric holds",
  },
];

const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  CHEST: "Chest",
  BACK: "Back",
  LEGS: "Legs",
  SHOULDERS: "Shoulders",
  ARMS: "Arms",
  CORE: "Core",
  GLUTES: "Glutes",
  CARDIO: "Cardio",
};

export default function NewExerciseScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { addExercise } = useWorkout();

  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [measurementUnit, setMeasurementUnit] = useState<MeasurementUnit>("Weight & Reps");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  const isValid = name.trim().length > 0 && muscleGroup !== null && equipment !== null;

  const handleSave = async () => {
    if (!isValid || !muscleGroup || !equipment) return;
    setSaving(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addExercise({
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
            EXERCISE NAME
          </Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="e.g. Kettlebell Swing"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              MUSCLE GROUP
            </Text>
            <Text style={[styles.selectOne, { color: colors.primary }]}>
              SELECT ONE
            </Text>
          </View>
          <View style={styles.chipGrid}>
            {MUSCLE_GROUPS.map((mg) => (
              <TouchableOpacity
                key={mg}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      muscleGroup === mg ? colors.primary : colors.card,
                    borderColor:
                      muscleGroup === mg ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMuscleGroup(mg);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color:
                        muscleGroup === mg
                          ? colors.primaryForeground
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  {MUSCLE_LABEL[mg]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            EQUIPMENT TYPE
          </Text>
          <View style={styles.equipGrid}>
            {EQUIPMENT_TYPES.map((eq) => (
              <TouchableOpacity
                key={eq}
                style={[
                  styles.equipCard,
                  {
                    backgroundColor:
                      equipment === eq ? `${colors.primary}15` : colors.card,
                    borderColor:
                      equipment === eq ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEquipment(eq);
                }}
                activeOpacity={0.7}
              >
                <Feather
                  name="box"
                  size={16}
                  color={equipment === eq ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.equipText,
                    {
                      color:
                        equipment === eq ? colors.primary : colors.foreground,
                    },
                  ]}
                >
                  {eq}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            MEASUREMENT UNIT
          </Text>
          <View style={styles.unitList}>
            {MEASUREMENT_UNITS.map((u) => (
              <TouchableOpacity
                key={u.value}
                style={[
                  styles.unitCard,
                  {
                    backgroundColor:
                      measurementUnit === u.value
                        ? `${colors.primary}10`
                        : colors.card,
                    borderColor:
                      measurementUnit === u.value
                        ? colors.primary
                        : colors.border,
                  },
                ]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMeasurementUnit(u.value);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.unitInfo}>
                  <Text
                    style={[
                      styles.unitLabel,
                      {
                        color:
                          measurementUnit === u.value
                            ? colors.foreground
                            : colors.foreground,
                      },
                    ]}
                  >
                    {u.label}
                  </Text>
                  <Text style={[styles.unitSub, { color: colors.mutedForeground }]}>
                    {u.sub}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor:
                        measurementUnit === u.value
                          ? colors.primary
                          : colors.border,
                      backgroundColor:
                        measurementUnit === u.value ? colors.primary : "transparent",
                    },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            INSTRUCTIONS
          </Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.textarea, { color: colors.foreground }]}
              placeholder="Describe the form or any specific cues..."
              placeholderTextColor={colors.mutedForeground}
              value={instructions}
              onChangeText={setInstructions}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor: isValid ? colors.primary : `${colors.primary}40`,
            },
          ]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={!isValid || saving}
        >
          <Feather name="plus" size={18} color={colors.primaryForeground} />
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
            Add to Library
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 24 },
  field: { gap: 10 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  selectOne: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
  },
  inputWrap: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  input: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  textarea: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  equipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  equipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: "45%",
  },
  equipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  unitList: {
    gap: 8,
  },
  unitCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  unitInfo: { flex: 1, gap: 3 },
  unitLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  unitSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
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
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
