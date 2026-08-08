import { Ionicons } from "@expo/vector-icons";
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
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";

function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <Path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <Path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <Path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </Svg>
  );
}

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
          <Ionicons name="flash" size={20} color={colors.primary} />
          <Text style={[styles.logoText, { color: colors.primary }]}>
            LiftLog
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

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[
              styles.googleButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              void signInWithGoogle();
            }}
            activeOpacity={0.85}
          >
            <GoogleLogo size={18} />
            <Text
              style={[styles.googleButtonText, { color: colors.foreground }]}
            >
              Continue with Google
            </Text>
          </TouchableOpacity>

          {authError ? (
            <Text
              style={[
                styles.errorText,
                { color: colors.primary, marginTop: 18 },
              ]}
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    gap: 20,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logoText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
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
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    fontWeight: "condensedBold",
  },
  bottomSection: {
    marginTop: "auto",
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
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
