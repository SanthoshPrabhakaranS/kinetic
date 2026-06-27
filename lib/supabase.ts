import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";

const EXPO_EXTRA = Constants.expoConfig?.extra ?? {};
const SUPABASE_URL = EXPO_EXTRA.supabaseUrl as string | undefined;
const SUPABASE_ANON_KEY = EXPO_EXTRA.supabaseAnonKey as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "Supabase client requires expo.extra.supabaseUrl and expo.extra.supabaseAnonKey in app.json. " +
      "Set them before signing in.",
  );
}

export const supabase = createClient(
  SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY ?? "",
  {
    auth: {
      storage: AsyncStorage as any,
      persistSession: true,
      detectSessionInUrl: false,
      autoRefreshToken: true,
    },
  },
);
