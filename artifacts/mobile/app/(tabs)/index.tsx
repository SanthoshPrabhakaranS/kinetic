import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { Redirect, router } from "expo-router";
import type { Href } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LogEntryCard } from "@/components/LogEntryCard";
import { LogWeightModal } from "@/components/LogWeightModal";
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
  const startKey = toDateInputValue(startOfWeek);
  const todayKey = toDateInputValue(now);
  return workoutLogs.filter(
    (log) => log.date >= startKey && log.date <= todayKey,
  ).length;
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
  streakCard: {
    borderRadius: 14,
    overflow: "hidden",
  },
  streakMain: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  streakIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  streakInfo: {
    flex: 1,
    gap: 2,
  },
  streakValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  streakValue: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    lineHeight: 38,
  },
  streakUnit: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  streakBest: {
    fontSize: 11,
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
  pickerWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
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
    streakInfo,
    totalVolumeToday,
    workoutLogs,
    addWeightEntry,
  } = useWorkout();
  const { loading: authLoading, session } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
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
        entry.sets.reduce((sum: any, set: any) => sum + (set.weight ?? 0), 0),
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
              setShowDatePicker(true);
            }}
          >
            <Text style={[styles.today, { color: colors.mutedForeground }]}>
              {selectedDateKey === toDateInputValue(new Date())
                ? "TODAY"
                : "SELECTED DAY"}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Text style={[styles.date, { color: colors.foreground }]}>
                {getDayName(selectedDate)}, {getFormattedDate(selectedDate)}
              </Text>
              <Feather
                style={{ marginLeft: 5, marginTop: 5 }}
                name="chevron-down"
                size={18}
                color={colors.mutedForeground}
              />
            </View>
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
        <View style={styles.streakCard}>
          <TouchableOpacity
            style={[
              styles.streakMain,
              {
                backgroundColor: colors.card,
                borderColor: `${colors.primary}20`,
              },
            ]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/streak" as Href);
            }}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.streakIconWrap,
                { backgroundColor: `${colors.primary}15` },
              ]}
            >
              <Feather name="zap" size={22} color={colors.primary} />
            </View>
            <View style={styles.streakInfo}>
              <View style={styles.streakValueRow}>
                <Text
                  style={[styles.streakValue, { color: colors.foreground }]}
                >
                  {streak}
                </Text>
                <Text
                  style={[styles.streakUnit, { color: colors.mutedForeground }]}
                >
                  DAY STREAK
                </Text>
              </View>
              <Text
                style={[styles.streakBest, { color: colors.mutedForeground }]}
              >
                {streakInfo.best > 0
                  ? `Personal best: ${streakInfo.best} ${
                      streakInfo.best === 1 ? "day" : "days"
                    }`
                  : "Start your streak with a workout"}
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={18}
              color={colors.mutedForeground}
            />
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
            label="This Week"
            value={weekWorkouts > 0 ? `${weekWorkouts}/5` : "—"}
            accent={weekWorkouts > 0}
          >
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
          </StatCard>
        </View>
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
                    pathname: "/quick-log",
                    params: {
                      exerciseId: entry.exerciseId,
                      entryId: entry.id,
                      selectedDate: selectedDateKey,
                    },
                  })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>

      {showDatePicker && (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(_, nextDate) => {
              if (nextDate) {
                setSelectedDate(nextDate);
              }
              setShowDatePicker(false);
            }}
          />
        </View>
      )}

      <LogWeightModal
        visible={showWeightModal}
        onClose={() => setShowWeightModal(false)}
        onSave={(w, selectedDate) => void addWeightEntry(w, selectedDate)}
      />
    </View>
  );
}
