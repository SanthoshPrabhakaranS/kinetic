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
import type { Routine } from "@/types/workout";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ManageRoutinesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { profile, routines, updateProfile } = useWorkout();
  const [query, setQuery] = useState("");

  const filteredRoutines = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return routines.filter((routine) =>
      normalizedQuery === ""
        ? true
        : routine.name.toLowerCase().includes(normalizedQuery),
    );
  }, [query, routines]);

  const selectRoutine = async (routine: Routine) => {
    if (routine.id === profile.activeRoutineId) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateProfile({ activeRoutineId: routine.id });
  };

  const renderRoutine = ({ item }: { item: Routine }) => {
    const isActive = item.id === profile.activeRoutineId;
    const schedule = item.weekdays
      .slice()
      .sort((a, b) => a - b)
      .map((day) => DAY_LABELS[day])
      .join(" ");

    return (
      <View
        style={[
          styles.routineCard,
          {
            backgroundColor: colors.card,
            borderColor: isActive ? colors.primary : colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.routineMain}
          onPress={() => void selectRoutine(item)}
          activeOpacity={0.75}
        >
          <View
            style={[
              styles.routineIcon,
              { backgroundColor: isActive ? colors.primary : colors.muted },
            ]}
          >
            <Feather
              name={isActive ? "check" : "calendar"}
              size={17}
              color={isActive ? colors.primaryForeground : colors.primary}
            />
          </View>
          <View style={styles.routineInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.routineName, { color: colors.foreground }]}>
                {item.name}
              </Text>
              {isActive && (
                <Text style={[styles.activeLabel, { color: colors.primary }]}>
                  ACTIVE
                </Text>
              )}
            </View>
            <Text
              style={[styles.routineMeta, { color: colors.mutedForeground }]}
            >
              {item.exercises.length}{" "}
              {item.exercises.length === 1 ? "exercise" : "exercises"}
              {schedule ? `  ·  ${schedule}` : ""}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({
              pathname: "/create-routine",
              params: { routineId: item.id },
            });
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.name}`}
        >
          <Feather name="edit-2" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    );
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Manage Routines
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.introRow}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>
              Your routines
            </Text>
            <Text
              style={[styles.pageSubtitle, { color: colors.mutedForeground }]}
            >
              Choose which schedule guides your workouts.
            </Text>
          </View>
          <Text style={[styles.count, { color: colors.primary }]}>
            {routines.length}
          </Text>
        </View>

        <View
          style={[
            styles.searchWrap,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search routines..."
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filteredRoutines}
          keyExtractor={(item) => item.id}
          renderItem={renderRoutine}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: botPad + 92 },
            filteredRoutines.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather
                name="calendar"
                size={36}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No routines found
              </Text>
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                Create a routine to organize your training days.
              </Text>
            </View>
          }
        />
      </View>

      <TouchableOpacity
        style={[
          styles.createButton,
          { backgroundColor: colors.primary, bottom: botPad + 16 },
        ]}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/create-routine");
        }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={18} color={colors.primaryForeground} />
        <Text
          style={[styles.createButtonText, { color: colors.primaryForeground }]}
        >
          Create Routine
        </Text>
      </TouchableOpacity>
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
  headerTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold" },
  headerSpacer: { width: 22 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  introRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  pageSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  count: { fontSize: 22, fontFamily: "Inter_700Bold" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  list: { gap: 10 },
  emptyList: { flex: 1 },
  routineCard: {
    minHeight: 78,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  routineMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  routineIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  routineInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  routineName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  activeLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  routineMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  editButton: { padding: 8 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 70,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  createButton: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  createButtonText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
