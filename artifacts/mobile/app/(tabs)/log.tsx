import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LogEntryCard } from "@/components/LogEntryCard";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";

function getFormattedDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function calcTotalVolume(entries: { sets: { weight?: number; reps?: number }[] }[]) {
  return entries.reduce((total, entry) => {
    return (
      total +
      entry.sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 1), 0)
    );
  }, 0);
}

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { todayLog } = useWorkout();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const entries = todayLog?.entries ?? [];
  const totalVolume = calcTotalVolume(entries);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>
              Today's Log
            </Text>
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
              {getFormattedDate()}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/quick-log");
            }}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>

        {entries.length > 0 && (
          <View style={styles.statsRow}>
            <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {entries.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                exercises
              </Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {entries.reduce((s, e) => s + e.sets.length, 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                sets
              </Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {Math.round(totalVolume).toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                kg total
              </Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: botPad + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {entries.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="clipboard" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No workout logged
            </Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
              Start logging your exercises to track your progress
            </Text>
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/quick-log")}
              activeOpacity={0.8}
            >
              <Feather name="zap" size={16} color={colors.primaryForeground} />
              <Text style={[styles.startBtnText, { color: colors.primaryForeground }]}>
                Start Workout
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.entriesList, { borderTopColor: colors.border }]}>
            {entries.map((entry) => (
              <LogEntryCard
                key={entry.id}
                entry={entry}
                onPress={() => {
                  router.push({
                    pathname: "/quick-log",
                    params: { exerciseId: entry.exerciseId },
                  });
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  dateText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  startBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  entriesList: {
    borderTopWidth: 1,
  },
});
