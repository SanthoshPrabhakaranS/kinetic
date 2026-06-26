import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LogEntryCard } from "@/components/LogEntryCard";
import { StatCard } from "@/components/StatCard";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";

function getDayName() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

function getFormattedDate() {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { loading, profile, todayLog, streak, totalVolumeToday, workoutLogs } =
    useWorkout();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!profile.onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  const weekWorkouts = getWeekWorkouts(workoutLogs);
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
          <View>
            <Text style={[styles.today, { color: colors.mutedForeground }]}>
              TODAY
            </Text>
            <Text style={[styles.date, { color: colors.foreground }]}>
              {getDayName()}, {getFormattedDate()}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.settingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Feather name="settings" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label="Total Volume"
            value={totalVolumeToday > 0 ? Math.round(totalVolumeToday).toLocaleString() : "—"}
            unit={totalVolumeToday > 0 ? "kg" : undefined}
            accent={totalVolumeToday > 0}
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
          <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: colors.foreground }]}>
                WEEKLY PROGRESS
              </Text>
              <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>
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

        <TouchableOpacity
          style={[styles.quickLogBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/quick-log");
          }}
          activeOpacity={0.85}
        >
          <Feather name="zap" size={18} color={colors.primaryForeground} />
          <Text style={[styles.quickLogText, { color: colors.primaryForeground }]}>
            QUICK LOG
          </Text>
        </TouchableOpacity>

        <View style={styles.summaryHeader}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>
            Today's Summary
          </Text>
          {todayLog && todayLog.entries.length > 0 && (
            <TouchableOpacity onPress={() => router.push("/(tabs)/log")}>
              <Text style={[styles.viewAll, { color: colors.primary }]}>
                View All
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {!todayLog || todayLog.entries.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
            {todayLog.entries.slice(0, 5).map((entry) => (
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
    </View>
  );
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
});
