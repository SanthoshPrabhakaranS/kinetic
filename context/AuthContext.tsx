import Constants from "expo-constants";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error) {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }
      setLoading(false);
    };

    const initializeGoogle = () => {
      const googleWebClientId = Constants.expoConfig?.extra
        ?.googleWebClientId as string | undefined;
      if (googleWebClientId) {
        GoogleSignin.configure({
          webClientId: googleWebClientId,
          offlineAccess: true,
          scopes: ["profile", "email"],
        });
      }
    };

    initializeGoogle();
    void init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      },
    );

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    setAuthError(null);

    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const response = await GoogleSignin.signIn();
      const idToken =
        (response as { idToken?: string }).idToken ??
        (response as { data?: { idToken?: string } }).data?.idToken;

      if (!idToken) {
        setAuthError(
          "Google sign-in did not return an ID token. Please try again.",
        );
        setSession(null);
        setUser(null);
        return;
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (error) {
        throw error;
      }

      if (!data.session?.user) {
        throw new Error("Authenticated session was not returned after login.");
      }

      setSession(data.session);
      setUser(data.session.user);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during login.";
      console.warn("Google sign-in failed", message);
      setAuthError(message);
      setSession(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setAuthError(null);
    setLoading(false);
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const value = useMemo(
    () => ({
      loading,
      session,
      user,
      authError,
      signInWithGoogle,
      signOut,
      clearAuthError,
    }),
    [
      loading,
      session,
      user,
      authError,
      signInWithGoogle,
      signOut,
      clearAuthError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
