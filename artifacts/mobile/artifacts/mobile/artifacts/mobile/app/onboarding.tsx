import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { updateProfile, isReady } = useWorkout();
  const {
    loading: authLoading,
    session,
    authError,
    signInWithGoogle,
    clearAuthError,
  } = useAuth();

  useEffect(() => {
    if (!session || !isReady) return;
    void (async () => {
      try {
        await updateProfile({ onboardingComplete: true });
      } catch (e) {
        console.warn("Failed to mark onboarding complete", e);
      } finally {
        clearAuthError();
        router.replace("/(tabs)");
      }
    })();
  }, [session, isReady]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoRow}>
          <Feather name="zap" size={20} color={colors.primary} />
          <Text style={[styles.logoText, { color: colors.primary }]}>
            KINETIC
          </Text>
        </View>

        <View
          style={[
            styles.heroBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
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
          CONTINUE WITH GOOGLE
        </Text>

        <TouchableOpacity
          style={[
            styles.googleButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={signInWithGoogle}
          activeOpacity={0.85}
        >
          <Feather name="log-in" size={18} color={colors.foreground} />
          <Text style={[styles.googleButtonText, { color: colors.foreground }]}>
            Continue with Google
          </Text>
        </TouchableOpacity>

        {authError ? (
          <Text
            style={[styles.errorText, { color: colors.primary, marginTop: 18 }]}
          >
            {authError}
          </Text>
        ) : authLoading ? (
          <Text
            style={[
              styles.helperText,
              { color: colors.mutedForeground, marginTop: 18 },
            ]}
          >
            Signing you in...
          </Text>
        ) : (
          <Text
            style={[
              styles.helperText,
              { color: colors.mutedForeground, marginTop: 24 },
            ]}
          >
            Sign in with Google to continue.
          </Text>
        )}
      </ScrollView>
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
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    gap: 10,
  },
  googleButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  helperText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
