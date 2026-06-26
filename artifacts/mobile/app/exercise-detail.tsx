import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NumberPad } from "@/components/NumberPad";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";
import type { SetEntry } from "@/types/workout";

type ActiveField = "weight" | "reps";

interface EditableSet extends SetEntry {
  _id: string;
}

function applyKey(current: string, key: string): string {
  if (key === "⌫") return current.length > 1 ? current.slice(0, -1) : "0";
  if (key === ".") return current.includes(".") ? current : current + ".";
  if (current === "0") return key;
  if (current.length >= 6) return current;
  return current + key;
}

export default function ExerciseDetailScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const { getEntryById, updateWorkoutEntry, deleteWorkoutEntry } = useWorkout();

  const entry = getEntryById(entryId);

  const [editableSets, setEditableSets] = useState<EditableSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string>("");
  const [activeField, setActiveField] = useState<ActiveField>("weight");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (entry) {
      const mapped: EditableSet[] = entry.sets.map((s) => ({
        ...s,
        weight: s.weight ?? 0,
        reps: s.reps ?? 0,
        _id: s.setNumber.toString() + Math.random().toString(36).substr(2, 6),
      }));
      setEditableSets(mapped);
      if (mapped.length > 0) setActiveSetId(mapped[0]!._id);
    }
  }, [entryId]);

  if (!entry) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>
          Entry not found
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getFieldStr = (set: EditableSet, field: ActiveField) => {
    const val = field === "weight" ? set.weight : set.reps;
    return val != null ? val.toString() : "0";
  };

  const handleNumPad = (key: string) => {
    setHasChanges(true);
    setEditableSets((prev) =>
      prev.map((s) => {
        if (s._id !== activeSetId) return s;
        const current = getFieldStr(s, activeField);
        const next = applyKey(current, key);
        if (activeField === "weight")
          return { ...s, weight: parseFloat(next) || 0 };
        return { ...s, reps: parseInt(next) || 0 };
      })
    );
  };

  const handleActivate = (setId: string, field: ActiveField) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSetId(setId);
    setActiveField(field);
  };

  const handleAddSet = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const last = editableSets[editableSets.length - 1];
    const newSet: EditableSet = {
      setNumber: editableSets.length + 1,
      weight: last?.weight ?? 0,
      reps: last?.reps ?? 8,
      _id: Math.random().toString(36).substr(2, 9),
    };
    setEditableSets((prev) => [...prev, newSet]);
    setActiveSetId(newSet._id);
    setHasChanges(true);
  };

  const handleDeleteSet = (setId: string) => {
    if (editableSets.length <= 1) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const remaining = editableSets
      .filter((s) => s._id !== setId)
      .map((s, i) => ({ ...s, setNumber: i + 1 }));
    setEditableSets(remaining);
    if (activeSetId === setId) setActiveSetId(remaining[0]!._id);
    setHasChanges(true);
  };

  const handleSave = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const sets: SetEntry[] = editableSets.map((s) => ({
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
    }));
    await updateWorkoutEntry(entryId, sets);
    setHasChanges(false);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Exercise",
      `Remove ${entry.exerciseName} from today's log?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteWorkoutEntry(entryId);
            router.back();
          },
        },
      ]
    );
  };

  const topPad = Platform.OS === "web" ? 0 : 0;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const activeSet = editableSets.find((s) => s._id === activeSetId);
  const activeSetIndex = editableSets.findIndex((s) => s._id === activeSetId);

  const totalVolume = editableSets.reduce(
    (t, s) => t + (s.weight ?? 0) * (s.reps ?? 1),
    0
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.exerciseName, { color: colors.foreground }]} numberOfLines={1}>
            {entry.exerciseName}
          </Text>
          <Text style={[styles.exerciseMeta, { color: colors.mutedForeground }]}>
            {entry.muscleGroup} · {entry.equipment}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDelete} hitSlop={8}>
          <Feather name="trash-2" size={18} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{editableSets.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Sets</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {Math.round(totalVolume)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>kg Vol.</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {editableSets.reduce((m, s) => Math.max(m, s.weight ?? 0), 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>kg Best</Text>
          </View>
        </View>

        <View style={[styles.setsTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.tableHead, { borderBottomColor: colors.border }]}>
            <Text style={[styles.thSet, { color: colors.mutedForeground }]}>SET</Text>
            <Text style={[styles.thField, { color: colors.mutedForeground }]}>WEIGHT (kg)</Text>
            <Text style={[styles.thField, { color: colors.mutedForeground }]}>REPS</Text>
            <View style={styles.thDel} />
          </View>

          {editableSets.map((set, index) => {
            const isActive = set._id === activeSetId;
            return (
              <View
                key={set._id}
                style={[
                  styles.tableRow,
                  index < editableSets.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                  isActive && { backgroundColor: `${colors.primary}08` },
                ]}
              >
                <View style={styles.setNumBox}>
                  <Text style={[styles.setNum, { color: isActive ? colors.primary : colors.mutedForeground }]}>
                    {index + 1}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.cellBtn,
                    { borderColor: isActive && activeField === "weight" ? colors.primary : colors.border },
                    isActive && activeField === "weight" && { backgroundColor: `${colors.primary}20` },
                  ]}
                  onPress={() => handleActivate(set._id, "weight")}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cellValue, { color: isActive && activeField === "weight" ? colors.primary : colors.foreground }]}>
                    {set.weight ?? 0}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.cellBtn,
                    { borderColor: isActive && activeField === "reps" ? colors.primary : colors.border },
                    isActive && activeField === "reps" && { backgroundColor: `${colors.primary}20` },
                  ]}
                  onPress={() => handleActivate(set._id, "reps")}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cellValue, { color: isActive && activeField === "reps" ? colors.primary : colors.foreground }]}>
                    {set.reps ?? 0}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.delBtn}
                  onPress={() => handleDeleteSet(set._id)}
                  hitSlop={8}
                  disabled={editableSets.length <= 1}
                >
                  <Feather
                    name="x"
                    size={14}
                    color={editableSets.length <= 1 ? "transparent" : colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.addSetRow, { borderTopColor: colors.border }]}
            onPress={handleAddSet}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={16} color={colors.primary} />
            <Text style={[styles.addSetText, { color: colors.primary }]}>Add Set</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.numPadSection}>
          <View style={styles.numPadHeader}>
            <Text style={[styles.numPadLabel, { color: colors.mutedForeground }]}>
              Set {activeSetIndex + 1} · {activeField === "weight" ? "Weight (kg)" : "Reps"}
            </Text>
            <Text style={[styles.numPadValue, { color: colors.primary }]}>
              {activeField === "weight" ? (activeSet?.weight ?? 0) : (activeSet?.reps ?? 0)}
            </Text>
          </View>
          <NumberPad onPress={handleNumPad} />
        </View>

        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: hasChanges ? colors.primary : `${colors.primary}50` },
          ]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={!hasChanges}
        >
          <Feather name="check" size={18} color={colors.primaryForeground} />
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
            Save Changes
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFound: { fontSize: 15, fontFamily: "Inter_400Regular" },
  backLink: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerCenter: { flex: 1, gap: 2 },
  exerciseName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  exerciseMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  statsRow: { flexDirection: "row", gap: 10 },
  statChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
    gap: 2,
  },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  setsTable: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  thSet: { width: 32, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  thField: { flex: 1, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textAlign: "center" },
  thDel: { width: 28 },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  setNumBox: { width: 32, alignItems: "center" },
  setNum: { fontSize: 14, fontFamily: "Inter_700Bold" },
  cellBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cellValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  delBtn: { width: 28, alignItems: "center", justifyContent: "center" },
  addSetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 6,
  },
  addSetText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  numPadSection: { gap: 10 },
  numPadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  numPadLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  numPadValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
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
