import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  accent?: boolean;
}

export function StatCard({ label, value, unit, accent = false }: StatCardProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: accent ? `${colors.primary}15` : colors.card,
          borderColor: accent ? `${colors.primary}30` : colors.border,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={styles.row}>
        <Text style={[styles.value, { color: accent ? colors.primary : colors.foreground }]}>
          {value}
        </Text>
        {unit && (
          <Text style={[styles.unit, { color: colors.mutedForeground }]}>{unit}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  value: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  unit: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
