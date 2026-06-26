import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";
import type { RoutineType } from "@/types/workout";

const TEMPLATES: { type: RoutineType; name: string; subtitle: string; icon: string }[] = [
  {
    type: "push-pull-legs",
    name: "Push/Pull/\nLegs",
    subtitle: "3–6 Days · Hypertrophy",
    icon: "trending-up",
  },
  {
    type: "full-body",
    name: "Full Body",
    subtitle: "3 Days · Efficiency",
    icon: "zap",
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { updateProfile } = useWorkout();

  const [step, setStep] = useState<"welcome" | "routine">("welcome");
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState<RoutineType | null>(null);

  const handleNext = async () => {
    if (step === "welcome") {
      if (!name.trim()) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStep("routine");
    } else {
      if (!selectedType) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await updateProfile({
        name: name.trim(),
        onboardingComplete: true,
        selectedRoutineType: selectedType,
      });
      router.replace("/(tabs)");
    }
  };

  const handleCustom = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await updateProfile({
      name: name.trim(),
      onboardingComplete: true,
      selectedRoutineType: "custom",
    });
    router.replace("/create-routine");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === "welcome" ? (
          <>
            <View style={styles.logoRow}>
              <Feather name="zap" size={20} color={colors.primary} />
              <Text style={[styles.logoText, { color: colors.primary }]}>KINETIC</Text>
            </View>

            <View style={[styles.heroBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.heroImage}
                contentFit="cover"
              />
              <View style={styles.heroOverlay}>
                <Text style={[styles.heroSubtitle, { color: colors.primary }]}>
                  READY TO EVOLVE
                </Text>
                <Text style={[styles.heroTitle, { color: colors.foreground }]}>
                  WELCOME
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              IDENTIFY YOURSELF
            </Text>

            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="What's your name?"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleNext}
              />
              <Feather name="user" size={18} color={colors.mutedForeground} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.logoRow}>
              <Feather name="zap" size={20} color={colors.primary} />
              <Text style={[styles.logoText, { color: colors.primary }]}>KINETIC</Text>
            </View>

            <Text style={[styles.pickTitle, { color: colors.foreground }]}>
              Pick your path
            </Text>
            <Text style={[styles.pickSub, { color: colors.mutedForeground }]}>
              {name}, choose your training style
            </Text>

            <View style={styles.templatesGrid}>
              {TEMPLATES.map((t) => (
                <TouchableOpacity
                  key={t.type}
                  style={[
                    styles.templateCard,
                    {
                      backgroundColor: selectedType === t.type ? `${colors.primary}15` : colors.card,
                      borderColor: selectedType === t.type ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedType(t.type);
                  }}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={t.icon as "trending-up" | "zap"}
                    size={22}
                    color={selectedType === t.type ? colors.primary : colors.mutedForeground}
                  />
                  <Text style={[styles.templateName, { color: colors.foreground }]}>
                    {t.name}
                  </Text>
                  <Text style={[styles.templateSub, { color: colors.mutedForeground }]}>
                    {t.subtitle}
                  </Text>
                  {selectedType === t.type && (
                    <View style={[styles.checkDot, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={10} color={colors.primaryForeground} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.customCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleCustom}
              activeOpacity={0.7}
            >
              <View style={[styles.customIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Feather name="edit-2" size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.customTitle, { color: colors.foreground }]}>
                  Custom Routine
                </Text>
                <Text style={[styles.customSub, { color: colors.mutedForeground }]}>
                  Build your own from scratch
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={styles.customArrow} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.ctaButton,
            {
              backgroundColor:
                (step === "welcome" && !name.trim()) || (step === "routine" && !selectedType)
                  ? `${colors.primary}50`
                  : colors.primary,
            },
          ]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>
            {step === "welcome" ? "CONTINUE" : "GET STARTED"}
          </Text>
          <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
        <Text style={[styles.terms, { color: colors.mutedForeground }]}>
          By continuing, you agree to our Terms of Performance.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 20 },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logoText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  heroBox: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    height: 200,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  heroSubtitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  pickTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginTop: 8,
  },
  pickSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: -8,
  },
  templatesGrid: {
    flexDirection: "row",
    gap: 12,
  },
  templateCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    minHeight: 120,
    position: "relative",
  },
  templateName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  templateSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  checkDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  customCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  customIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  customTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  customSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  customArrow: {
    marginLeft: "auto",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  ctaText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  terms: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
