import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Exercise } from "@/types/workout";

interface ExerciseCardProps {
  exercise: Exercise;
  bestWeight?: number | null;
  onPress?: () => void;
  rightIcon?: React.ReactNode;
}

const MUSCLE_COLORS: Record<string, string> = {
  CHEST: "#FF6B6B",
  BACK: "#4ECDC4",
  LEGS: "#45B7D1",
  SHOULDERS: "#96CEB4",
  ARMS: "#FFEAA7",
  CORE: "#DDA0DD",
  GLUTES: "#F0A500",
  CARDIO: "#FF8C69",
};

export function ExerciseCard({
  exercise,
  bestWeight,
  onPress,
  rightIcon,
}: ExerciseCardProps) {
  const colors = useColors();
  const muscleColor = MUSCLE_COLORS[exercise.muscleGroup] ?? colors.primary;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: `${muscleColor}18` }]}>
        <Feather name="activity" size={18} color={muscleColor} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {exercise.muscleGroup} · {exercise.equipment}
        </Text>
      </View>
      {bestWeight != null && (
        <View style={styles.bestBox}>
          <Text style={[styles.bestLabel, { color: colors.mutedForeground }]}>BEST</Text>
          <Text style={[styles.bestWeight, { color: colors.primary }]}>
            {bestWeight} lbs
          </Text>
        </View>
      )}
      {rightIcon ?? (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  meta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  bestBox: {
    alignItems: "flex-end",
    marginRight: 4,
  },
  bestLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  bestWeight: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
