import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { WorkoutEntry } from "@/types/workout";

interface LogEntryCardProps {
  entry: WorkoutEntry;
  onPress?: () => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(
  seconds?: number | null,
  unit: "seconds" | "minutes" = "seconds",
) {
  if (seconds == null || Number.isNaN(seconds)) return "0s";
  if (unit === "minutes") {
    const minutes = seconds / 60;
    const rounded = Math.round(minutes * 100) / 100;
    return Number.isInteger(rounded) ? `${rounded}m` : `${rounded}m`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

function formatSets(entry: WorkoutEntry) {
  if (entry.sets.length === 0) return "No sets";
  if (entry.sets.some((set) => set.duration != null)) {
    return entry.sets
      .map((set) => formatDuration(set.duration, set.durationUnit))
      .join(", ");
  }
  const weights = entry.sets
    .filter((s) => s.weight != null)
    .map((s) => s.weight);
  const reps = entry.sets.filter((s) => s.reps != null).map((s) => s.reps);

  if (weights.length > 0) {
    const weightStr = [...new Set(weights)].join("/");
    const repsStr = reps.join(", ");
    return `${weightStr}kg × ${repsStr}`;
  }
  const repsStr = reps.join(", ");
  return `${repsStr} reps`;
}

export function LogEntryCard({ entry, onPress }: LogEntryCardProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.accent, { backgroundColor: colors.primary }]} />
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {entry.exerciseName}
        </Text>
        <Text style={[styles.sets, { color: colors.mutedForeground }]}>
          {formatSets(entry)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {formatTime(entry.timestamp)}
        </Text>
        <Feather
          name="chevron-right"
          size={14}
          color={colors.mutedForeground}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  accent: {
    width: 3,
    height: 36,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  sets: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
