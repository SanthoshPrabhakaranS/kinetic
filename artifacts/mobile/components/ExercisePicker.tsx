import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import type { TopExercise } from "@/lib/stats";

interface Props {
  exercises: TopExercise[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ExercisePicker({ exercises, selectedId, onSelect }: Props) {
  const colors = useColors();
  const [open, setOpen] = useState(false);

  if (exercises.length === 0) return null;

  const selected = exercises.find((e) => e.id === selectedId);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setOpen(true);
        }}
        style={[
          styles.trigger,
          {
            backgroundColor: colors.muted,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          style={[styles.triggerText, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {selected?.name ?? "Select exercise"}
        </Text>
        <Text style={[styles.chevron, { color: colors.mutedForeground }]}>
          ▾
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.handle,
                { backgroundColor: colors.mutedForeground },
              ]}
            />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              Select Exercise
            </Text>
            <FlatList
              data={exercises}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isActive = item.id === selectedId;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      void Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light,
                      );
                      onSelect(item.id);
                      setOpen(false);
                    }}
                    style={[
                      styles.option,
                      {
                        backgroundColor: isActive
                          ? `${colors.primary}18`
                          : "transparent",
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.optionLeft}>
                      <Text
                        style={[
                          styles.optionName,
                          {
                            color: isActive ? colors.primary : colors.foreground,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.optionMeta,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {item.muscleGroup} · {item.sessions} sessions
                      </Text>
                    </View>
                    {isActive && (
                      <Text style={[styles.check, { color: colors.primary }]}>
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  triggerText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  chevron: {
    fontSize: 14,
    marginLeft: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    maxHeight: "60%",
    paddingBottom: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
    opacity: 0.4,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLeft: {
    flex: 1,
    gap: 2,
  },
  optionName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  optionMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  check: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginLeft: 8,
  },
});
