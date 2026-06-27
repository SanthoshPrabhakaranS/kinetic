import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LogEntryCard } from "@/components/LogEntryCard";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/context/AuthContext";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";

function getDayName(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function getFormattedDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekWorkouts(workoutLogs: { date: string }[]) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  return workoutLogs.filter((log) => {
    const logDate = new Date(log.date);
    return logDate >= startOfWeek && logDate <= now;
  }).length;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  today: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  date: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  progressCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  progressSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  dotRow: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  quickLogBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 14,
    gap: 8,
  },
  quickLogText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  weightActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  weightActionText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  summaryTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  viewAll: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  emptyHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  summaryList: {
    borderTopWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  modalBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalBtnPrimary: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const {
    loading,
    profile,
    todayLog,
    streak,
    totalVolumeToday,
    workoutLogs,
    addWeightEntry,
  } = useWorkout();
  const { loading: authLoading, session } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [pickerDraft, setPickerDraft] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [weightDraft, setWeightDraft] = useState("70");
  const weekWorkouts = getWeekWorkouts(workoutLogs);

  const selectedDateKey = useMemo(
    () => toDateInputValue(selectedDate),
    [selectedDate],
  );
  const selectedLog = useMemo(
    () => workoutLogs.find((log: any) => log.date === selectedDateKey) ?? null,
    [selectedDateKey, workoutLogs],
  );
  const selectedVolume = useMemo(() => {
    if (!selectedLog) return 0;
    return selectedLog.entries.reduce(
      (total: any, entry: any) =>
        total +
        entry.sets.reduce(
          (sum: any, set: any) => sum + (set.weight ?? 0) * (set.reps ?? 1),
          0,
        ),
      0,
    );
  }, [selectedLog]);

  if (loading || authLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session || !profile.onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 12, paddingBottom: botPad + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (Platform.OS === "web") {
                const picker = document.createElement("input");
                picker.type = "date";
                picker.value = selectedDateKey;
                picker.onchange = () => {
                  const next = picker.value;
                  if (!next) return;
                  setSelectedDate(new Date(`${next}T12:00:00`));
                };
                picker.click();
                return;
              }
              setPickerDraft(selectedDateKey);
              setShowDatePicker(true);
            }}
          >
            <Text style={[styles.today, { color: colors.mutedForeground }]}>
              {selectedDateKey === toDateInputValue(new Date())
                ? "TODAY"
                : "SELECTED DAY"}
            </Text>
            <Text style={[styles.date, { color: colors.foreground }]}>
              {getDayName(selectedDate)}, {getFormattedDate(selectedDate)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.settingsBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            activeOpacity={0.7}
          >
            <Feather name="user" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <StatCard
            label="Total Volume"
            value={
              selectedVolume > 0
                ? Math.round(selectedVolume).toLocaleString()
                : "—"
            }
            unit={selectedVolume > 0 ? "kg" : undefined}
            accent={selectedVolume > 0}
          />
          <StatCard
            label="Streak"
            value={streak > 0 ? `${streak} Days` : "—"}
          />
          <StatCard
            label="This Week"
            value={weekWorkouts > 0 ? `${weekWorkouts}/5` : "—"}
          />
        </View>
        {workoutLogs.length > 0 && (
          <View
            style={[
              styles.progressCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.progressHeader}>
              <Text
                style={[styles.progressTitle, { color: colors.foreground }]}
              >
                WEEKLY PROGRESS
              </Text>
              <Text
                style={[styles.progressSub, { color: colors.mutedForeground }]}
              >
                {weekWorkouts} / 5 Workouts
              </Text>
            </View>
            <View style={styles.dotRow}>
              {[...Array(5)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i < weekWorkouts ? colors.primary : colors.muted,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.quickLogBtn,
              { backgroundColor: colors.primary, flex: 1 },
            ]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({
                pathname: "/quick-log",
                params: { selectedDate: selectedDateKey },
              });
            }}
            activeOpacity={0.85}
          >
            <Feather name="zap" size={18} color={colors.primaryForeground} />
            <Text
              style={[styles.quickLogText, { color: colors.primaryForeground }]}
            >
              QUICK LOG
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.weightActionBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => {
              setWeightDraft("");
              setShowWeightModal(true);
            }}
            activeOpacity={0.85}
          >
            <Feather name="activity" size={16} color={colors.foreground} />
            <Text
              style={[styles.weightActionText, { color: colors.foreground }]}
            >
              Weight
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.summaryHeader}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>
            {selectedDateKey === toDateInputValue(new Date())
              ? "Today's Summary"
              : "Selected Day Summary"}
          </Text>
          {workoutLogs.length > 0 && (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/log",
                  params: { selectedDate: selectedDateKey },
                })
              }
            >
              <Text style={[styles.viewAll, { color: colors.primary }]}>
                View All
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {!selectedLog || selectedLog.entries.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="activity" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No exercises logged yet
            </Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
              Tap Quick Log to start your workout
            </Text>
          </View>
        ) : (
          <View style={[styles.summaryList, { borderColor: colors.border }]}>
            {selectedLog.entries.slice(0, 5).map((entry: any) => (
              <LogEntryCard
                key={entry.id}
                entry={entry}
                onPress={() =>
                  router.push({
                    pathname: "/exercise-detail",
                    params: { entryId: entry.id },
                  })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Choose Date
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { color: colors.foreground, borderColor: colors.border },
              ]}
              value={pickerDraft}
              onChangeText={setPickerDraft}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text
                  style={[styles.modalBtnText, { color: colors.foreground }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtnPrimary,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  const next = pickerDraft.trim();
                  if (!next) return;
                  const parsed = new Date(`${next}T12:00:00`);
                  if (!Number.isNaN(parsed.getTime())) {
                    setSelectedDate(parsed);
                  }
                  setShowDatePicker(false);
                }}
              >
                <Text
                  style={[
                    styles.modalBtnText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Apply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showWeightModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWeightModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Log Weight
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { color: colors.foreground, borderColor: colors.border },
              ]}
              value={weightDraft}
              onChangeText={setWeightDraft}
              placeholder="Enter weight"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => setShowWeightModal(false)}
              >
                <Text
                  style={[styles.modalBtnText, { color: colors.foreground }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtnPrimary,
                  { backgroundColor: colors.primary },
                ]}
                onPress={async () => {
                  const nextWeight = Number.parseFloat(weightDraft);
                  if (!Number.isNaN(nextWeight)) {
                    await addWeightEntry(nextWeight, selectedDateKey);
                  }
                  setShowWeightModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalBtnText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
