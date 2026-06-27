import { useTheme } from "@/context/ThemeContext";
import colors from "@/constants/colors";

/**
 * Returns the design tokens for the current app theme.
 * Theme is controlled by ThemeContext (user preference, persisted to AsyncStorage).
 */
export function useColors() {
  const { theme } = useTheme();
  const palette = theme === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
