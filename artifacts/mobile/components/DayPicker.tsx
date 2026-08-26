import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

const DAYS = [
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
  { value: 0, label: "S" },
];

interface DayPickerProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
}

export function DayPicker({ selectedDays, onChange }: DayPickerProps) {
  const colors = useColors();

  const toggleDay = (day: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter((value) => value !== day)
      : [...selectedDays, day].sort((a, b) => a - b);
    onChange(nextDays);
  };

  return (
    <View style={styles.row}>
      {DAYS.map((day) => {
        const selected = selectedDays.includes(day.value);
        return (
          <TouchableOpacity
            key={day.value}
            style={[
              styles.day,
              {
                backgroundColor: selected ? colors.primary : colors.muted,
                borderColor: selected ? colors.primary : colors.border,
              },
            ]}
            onPress={() => toggleDay(day.value)}
            activeOpacity={0.75}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${day.label} day`}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected
                    ? colors.primaryForeground
                    : colors.mutedForeground,
                },
              ]}
            >
              {day.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
