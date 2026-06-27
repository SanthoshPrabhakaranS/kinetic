import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";
import type { Exercise, MuscleGroup } from "@/types/workout";

const MUSCLE_FILTERS: (MuscleGroup | "All")[] = [
  "All", "CHEST", "BACK", "LEGS", "SHOULDERS", "ARMS", "CORE",
];

const LABEL: Record<string, string> = {
  All: "All", CHEST: "Chest", BACK: "Back", LEGS: "Legs",
  SHOULDERS: "Shoulders", ARMS: "Arms", CORE: "Core", GLUTES: "Glutes",
};

const MUSCLE_COLORS: Record<string, string> = {
  CHEST: "#FF6B6B", BACK: "#4ECDC4", LEGS: "#45B7D1", SHOULDERS: "#96CEB4",
  ARMS: "#FFEAA7", CORE: "#DDA0DD", GLUTES: "#F0A500", CARDIO: "#FF8C69",
};

function ExerciseRow({
  exercise,
  bestWeight,
  onLog,
  onEdit,
}: {
  exercise: Exercise;
  bestWeight?: number | null;
  onLog: () => void;
  onEdit: () => void;
}) {
  const colors = useColors();
  const muscleColor = MUSCLE_COLORS[exercise.muscleGroup] ?? colors.primary;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onLog}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: `${muscleColor}18` }]}>
        <Feather name="activity" size={18} color={muscleColor} />
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {exercise.name}
          </Text>
          {exercise.isCustom && (
            <View style={[styles.customBadge, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[styles.customBadgeText, { color: colors.primary }]}>
                Custom
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {exercise.muscleGroup} · {exercise.equipment}
        </Text>
      </View>

      {bestWeight != null && (
        <View style={styles.bestBox}>
          <Text style={[styles.bestLabel, { color: colors.mutedForeground }]}>BEST</Text>
          <Text style={[styles.bestWeight, { color: colors.primary }]}>
            {bestWeight}kg
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.editBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
        onPress={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        hitSlop={8}
        activeOpacity={0.7}
      >
        <Feather name="edit-2" size={13} color={colors.mutedForeground} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { exercises, getBestSetForExercise } = useWorkout();

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<MuscleGroup | "All">("All");

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesQuery =
        query.trim() === "" ||
        ex.name.toLowerCase().includes(query.toLowerCase()) ||
        ex.muscleGroup.toLowerCase().includes(query.toLowerCase());
      const matchesFilter =
        activeFilter === "All" || ex.muscleGroup === activeFilter;
      return matchesQuery && matchesFilter;
    });
  }, [exercises, query, activeFilter]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
        <View style={styles.titleRow}>
          <View style={styles.logoRow}>
            <Feather name="zap" size={16} color={colors.primary} />
            <Text style={[styles.appName, { color: colors.primary }]}>KINETIC</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/new-exercise");
            }}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search exercises..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={MUSCLE_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === item ? colors.primary : colors.card,
                  borderColor: activeFilter === item ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveFilter(item);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterLabel,
                  {
                    color: activeFilter === item ? colors.primaryForeground : colors.mutedForeground,
                  },
                ]}
              >
                {LABEL[item] ?? item}
              </Text>
            </TouchableOpacity>
          )}
        />

        <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>
          Library ({filtered.length})
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: botPad + 80 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Feather name="search" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No exercises found
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const best = getBestSetForExercise(item.id);
          return (
            <ExerciseRow
              exercise={item}
              bestWeight={best?.weight}
              onLog={() => {
                router.push({ pathname: "/quick-log", params: { exerciseId: item.id } });
              }}
              onEdit={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: "/edit-exercise", params: { exerciseId: item.id } });
              }}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, gap: 12, paddingBottom: 4 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  appName: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  filterList: { gap: 8, paddingRight: 20 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  countLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  customBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  customBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bestBox: { alignItems: "flex-end", marginRight: 2 },
  bestLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  bestWeight: { fontSize: 13, fontFamily: "Inter_700Bold" },
  editBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
