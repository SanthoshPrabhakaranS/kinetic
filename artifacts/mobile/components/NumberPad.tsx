import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface NumberPadProps {
  onPress: (key: string) => void;
}

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "⌫"],
];

export function NumberPad({ onPress }: NumberPadProps) {
  const colors = useColors();

  const handlePress = (key: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(key);
  };

  return (
    <View style={styles.container}>
      {KEYS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.key, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handlePress(key)}
              activeOpacity={0.6}
            >
              {key === "⌫" ? (
                <Feather name="delete" size={20} color={colors.foreground} />
              ) : (
                <Text style={[styles.keyText, { color: colors.foreground }]}>
                  {key}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  key: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontSize: 20,
    fontFamily: "Inter_500Medium",
  },
});
