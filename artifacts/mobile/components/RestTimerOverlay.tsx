import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { usePathname } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { REST_PRESETS, useRestTimer } from "@/context/RestTimerContext";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

const NO_TAB_BAR_ROUTES = [
  "/quick-log",
  "/new-exercise",
  "/create-routine",
  "/exercise-detail",
  "/workout-detail",
  "/edit-exercise",
  "/onboarding",
];

const BOTTOM_BAR_ROUTES = [
  "/quick-log",
  "/new-exercise",
  "/create-routine",
  "/edit-exercise",
];

function formatTime(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatPreset(seconds: number) {
  if (seconds >= 60 && seconds % 60 === 0) {
    return `${seconds / 60}m`;
  }
  return `${seconds}s`;
}

export function RestTimerOverlay() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { theme } = useTheme();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const prevActive = useRef(false);

  const {
    remaining,
    total,
    running,
    active,
    justFinished,
    soundEnabled,
    pause,
    resume,
    skip,
    addTime,
    setPreset,
    setSoundEnabled,
  } = useRestTimer();

  useEffect(() => {
    if (active && !prevActive.current) {
      setExpanded(true);
    }
    prevActive.current = active;
  }, [active]);

  if (!active) return null;

  const hasTabBar = !NO_TAB_BAR_ROUTES.includes(pathname);
  const hasBottomBar = BOTTOM_BAR_ROUTES.includes(pathname);
  const bottomSafe =
    Platform.OS === "web" ? 34 : insets.bottom;
  const bottomOffset = hasTabBar
    ? bottomSafe + 74
    : hasBottomBar
      ? bottomSafe + 96
      : insets.bottom + 24;

  const progress = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;

  const handleToggleRunning = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (running) {
      pause();
    } else {
      resume();
    }
  };

  const handleAddTime = (seconds: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addTime(seconds);
  };

  const handleSkip = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    skip();
  };

  const handleSetPreset = (seconds: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreset(seconds);
  };

  const handleSoundToggle = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void setSoundEnabled(!soundEnabled);
  };

  const renderExpandedContent = () => (
    <>
      <View style={styles.expandedHeader}>
        <View style={styles.expandedTitleRow}>
          <Feather name="clock" size={14} color={colors.primary} />
          <Text style={[styles.expandedTitle, { color: colors.foreground }]}>
            {justFinished ? "REST OVER" : "REST TIMER"}
          </Text>
        </View>
        <View style={styles.expandedHeaderActions}>
          <TouchableOpacity
            onPress={handleSoundToggle}
            hitSlop={8}
            style={[styles.iconBtn, { borderColor: colors.border }]}
          >
            <Feather
              name={soundEnabled ? "volume-2" : "volume-x"}
              size={16}
              color={soundEnabled ? colors.foreground : colors.mutedForeground}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setExpanded(false)}
            hitSlop={8}
            style={[styles.iconBtn, { borderColor: colors.border }]}
          >
            <Feather
              name="chevron-down"
              size={16}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.timeWrap}>
        {justFinished && (
          <Feather name="check-circle" size={22} color={colors.primary} />
        )}
        <Text
          style={[
            styles.timeText,
            { color: justFinished ? colors.primary : colors.foreground },
          ]}
        >
          {justFinished ? "0:00" : formatTime(remaining)}
        </Text>
        {!justFinished && (
          <Text style={[styles.timeHint, { color: colors.mutedForeground }]}>
            {running ? "Resting…" : "Paused"}
          </Text>
        )}
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>

      <View style={styles.presetRow}>
        {REST_PRESETS.map((preset) => {
          const isActive = preset === total;
          return (
            <TouchableOpacity
              key={preset}
              onPress={() => handleSetPreset(preset)}
              activeOpacity={0.7}
              style={[
                styles.presetChip,
                {
                  backgroundColor: isActive
                    ? `${colors.primary}22`
                    : colors.muted,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.presetChipText,
                  { color: isActive ? colors.primary : colors.foreground },
                ]}
              >
                {formatPreset(preset)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          onPress={() => handleAddTime(30)}
          activeOpacity={0.8}
          style={[
            styles.controlBtn,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          <Feather name="plus" size={16} color={colors.foreground} />
          <Text style={[styles.controlBtnText, { color: colors.foreground }]}>
            30s
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleToggleRunning}
          activeOpacity={0.85}
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        >
          <Feather
            name={running ? "pause" : "play"}
            size={18}
            color={colors.primaryForeground}
          />
          <Text
            style={[styles.primaryBtnText, { color: colors.primaryForeground }]}
          >
            {justFinished ? "Done" : running ? "Pause" : "Resume"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          activeOpacity={0.8}
          style={[
            styles.controlBtn,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          <Feather name="x" size={16} color={colors.foreground} />
          <Text style={[styles.controlBtnText, { color: colors.foreground }]}>
            Skip
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {expanded ? (
        <View style={StyleSheet.absoluteFill}>
          <BlurView
            intensity={35}
            tint={theme === "dark" ? "dark" : "light"}
            experimentalBlurMethod={
              Platform.OS === "android" ? "dimezisBlurView" : undefined
            }
            style={StyleSheet.absoluteFill}
          />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setExpanded(false);
            }}
          />
          <View style={styles.modalCenter} pointerEvents="box-none">
            <View
              onStartShouldSetResponder={() => true}
              style={[
                styles.expandedCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              {renderExpandedContent()}
            </View>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.card,
            {
              bottom: bottomOffset,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setExpanded(true);
            }}
            activeOpacity={0.8}
            style={styles.collapsedRow}
          >
            <Feather name="clock" size={16} color={colors.primary} />
            <Text
              style={[
                styles.collapsedTime,
                { color: justFinished ? colors.primary : colors.foreground },
              ]}
            >
              {justFinished ? "Done!" : formatTime(remaining)}
            </Text>
            <View style={styles.collapsedSpacer} />
            <View style={styles.collapsedActions}>
              <TouchableOpacity
                onPress={handleToggleRunning}
                hitSlop={6}
                style={[
                  styles.collapsedActionBtn,
                  { borderColor: colors.border },
                ]}
              >
                <Feather
                  name={running ? "pause" : "play"}
                  size={14}
                  color={colors.foreground}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAddTime(30)}
                hitSlop={6}
                style={[
                  styles.collapsedActionBtn,
                  { borderColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.collapsedAddText, { color: colors.primary }]}
                >
                  +30s
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSkip}
                hitSlop={6}
                style={[
                  styles.collapsedActionBtn,
                  { borderColor: colors.border },
                ]}
              >
                <Feather name="x" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modalCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  expandedCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  card: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  collapsedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  collapsedTime: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  collapsedSpacer: { flex: 1 },
  collapsedActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  collapsedActionBtn: {
    width: 40,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  collapsedAddText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  progressTrack: {
    height: 3,
    backgroundColor: "transparent",
  },
  progressFill: {
    height: 3,
  },
  expandedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  expandedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  expandedTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  expandedHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timeWrap: {
    alignItems: "center",
    paddingVertical: 10,
    gap: 2,
  },
  timeText: {
    fontSize: 50,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
    lineHeight: 60,
  },
  timeHint: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  presetRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  presetChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  controlsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  controlBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  controlBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  primaryBtn: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
