import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";

function SettingsRow({
  icon,
  label,
  sublabel,
  right,
  onPress,
  showChevron = false,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}18` }]}>
        <Feather name={icon as any} size={16} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        {sublabel && (
          <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
            {sublabel}
          </Text>
        )}
      </View>
      {right}
      {showChevron && !right && (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
      {title}
    </Text>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { theme, isDark, toggleTheme, setTheme } = useTheme();
  const { profile, updateProfile, workoutLogs, streak, weightLogs } = useWorkout();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((n) => n[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("")
    : "KN";

  const totalSets = workoutLogs.reduce(
    (t, l) => t + l.entries.reduce((e, en) => e + en.sets.length, 0),
    0
  );

  const handleToggleUnit = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateProfile({ weightUnit: profile.weightUnit === "kg" ? "lbs" : "kg" });
  };

  const handleThemeToggle = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleTheme();
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 12, paddingBottom: botPad + 80 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>

      <View style={[styles.avatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
            {initials}
          </Text>
        </View>
        <View style={styles.avatarInfo}>
          <Text style={[styles.userName, { color: colors.foreground }]}>
            {profile.name || "Athlete"}
          </Text>
          <Text style={[styles.userSub, { color: colors.mutedForeground }]}>
            KINETIC Member
          </Text>
        </View>
      </View>

      <View style={[styles.statsRow]}>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {workoutLogs.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Workouts
          </Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {streak}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Day Streak
          </Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {totalSets}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Total Sets
          </Text>
        </View>
      </View>

      <SectionHeader title="APPEARANCE" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingsRow
          icon="moon"
          label="Dark Mode"
          sublabel={isDark ? "Currently dark" : "Currently light"}
          right={
            <Switch
              value={isDark}
              onValueChange={handleThemeToggle}
              trackColor={{ false: colors.muted, true: `${colors.primary}88` }}
              thumbColor={isDark ? colors.primary : colors.mutedForeground}
              ios_backgroundColor={colors.muted}
            />
          }
        />
        <View style={[styles.themeToggleRow, { borderBottomColor: colors.border }]}>
          <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}18` }]}>
            <Feather name="sun" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.rowLabel, { color: colors.foreground, flex: 1 }]}>
            Theme
          </Text>
          <View style={[styles.segmented, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.segment,
                theme === "light" && { backgroundColor: colors.primary },
              ]}
              onPress={async () => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                await setTheme("light");
              }}
              activeOpacity={0.7}
            >
              <Feather
                name="sun"
                size={14}
                color={theme === "light" ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: theme === "light" ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                Light
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segment,
                theme === "dark" && { backgroundColor: colors.primary },
              ]}
              onPress={async () => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                await setTheme("dark");
              }}
              activeOpacity={0.7}
            >
              <Feather
                name="moon"
                size={14}
                color={theme === "dark" ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: theme === "dark" ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                Dark
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <SectionHeader title="UNITS" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingsRow
          icon="activity"
          label="Weight Unit"
          sublabel={`Currently showing ${profile.weightUnit}`}
          right={
            <View style={[styles.segmented, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  profile.weightUnit === "kg" && { backgroundColor: colors.primary },
                ]}
                onPress={async () => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  await updateProfile({ weightUnit: "kg" });
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: profile.weightUnit === "kg"
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  kg
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segment,
                  profile.weightUnit === "lbs" && { backgroundColor: colors.primary },
                ]}
                onPress={async () => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  await updateProfile({ weightUnit: "lbs" });
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: profile.weightUnit === "lbs"
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  lbs
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      <SectionHeader title="DATA" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingsRow
          icon="database"
          label="Weight Logs"
          sublabel={`${weightLogs.length} entries stored`}
        />
        <SettingsRow
          icon="clock"
          label="Workout History"
          sublabel={`${workoutLogs.length} sessions recorded`}
        />
      </View>

      <SectionHeader title="ABOUT" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingsRow icon="zap" label="KINETIC" sublabel="Gym Progress Tracker" />
        <SettingsRow icon="code" label="Version" sublabel="1.0.0" />
        <SettingsRow
          icon="shield"
          label="Data Storage"
          sublabel="All data is stored locally on your device"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 12 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },

  avatarCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 24, fontFamily: "Inter_700Bold" },
  avatarInfo: { flex: 1, gap: 4 },
  userName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  userSub: { fontSize: 13, fontFamily: "Inter_400Regular" },

  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginTop: 4,
    marginLeft: 4,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  themeToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular" },

  segmented: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    padding: 3,
    gap: 2,
  },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
    gap: 4,
  },
  segmentText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
