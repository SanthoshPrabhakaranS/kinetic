import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { NumberPad } from "@/components/NumberPad";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";
import {
  convertWeight,
  formatWeight,
  lbsToKg,
  type WeightUnit,
} from "@/lib/weightUnits";

function applyKey(current: string, key: string): string {
  if (key === "⌫") return current.length > 1 ? current.slice(0, -1) : "0";
  if (key === ".") return current.includes(".") ? current : current + ".";
  if (current === "0") return key;
  if (current.length >= 6) return current;
  return current + key;
}

export function LogWeightModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (weight: number, selectedDate?: string) => void;
}) {
  const colors = useColors();
  const { profile, updateProfile } = useWorkout();
  const [value, setValue] = useState("0");
  const [unit, setUnit] = useState<WeightUnit>(profile.weightUnit);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setUnit(profile.weightUnit);
    }
  }, [visible, profile.weightUnit]);

  const dateStr = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = selectedDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const selectedDateKey = useMemo(
    () =>
      `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`,
    [selectedDate],
  );

  const handleKey = (key: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setValue((v) => applyKey(v, key));
  };

  const handleToggleUnit = (next: WeightUnit) => {
    if (next === unit) return;
    const current = parseFloat(value);
    if (!Number.isNaN(current)) {
      setValue(formatWeight(convertWeight(current, unit, next), next));
    }
    setUnit(next);
    void updateProfile({ weightUnit: next });
  };

  const handleSave = () => {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed) && parsed > 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const kgValue = unit === "lbs" ? lbsToKg(parsed) : parsed;
      onSave(kgValue, selectedDateKey);
      setValue("0");
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            Log Weight
          </Text>
          <TouchableOpacity onPress={handleSave} hitSlop={12}>
            <Text style={[styles.modalSave, { color: colors.primary }]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <View>
            <TouchableOpacity
              style={[
                styles.dateTimeRow,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Feather
                name="calendar"
                size={14}
                color={colors.mutedForeground}
              />
              <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                {dateStr}
              </Text>
              <View
                style={[styles.timeDot, { backgroundColor: colors.border }]}
              />
              <Feather name="clock" size={14} color={colors.mutedForeground} />
              <Text
                style={[styles.timeText2, { color: colors.mutedForeground }]}
              >
                {timeStr}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <View style={styles.inlinePickerWrap}>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  onChange={(_, nextDate) => {
                    setShowDatePicker(false);
                    if (nextDate) {
                      setSelectedDate(nextDate);
                    }
                  }}
                />
              </View>
            )}
          </View>

          <View style={styles.weightArea}>
            <View style={styles.weightDisplay}>
              <Text style={[styles.weightBig, { color: colors.primary }]}>
                {value}
              </Text>
              <Text
                style={[styles.weightUnitBig, { color: colors.mutedForeground }]}
              >
                {unit === "kg" ? "kg" : "lbs"}
              </Text>
            </View>
            <View
              style={[
                styles.unitSegmented,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.unitSegment,
                  unit === "kg" && { backgroundColor: colors.primary },
                ]}
                onPress={() => handleToggleUnit("kg")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.unitSegmentText,
                    {
                      color:
                        unit === "kg"
                          ? colors.primaryForeground
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  kg
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitSegment,
                  unit === "lbs" && { backgroundColor: colors.primary },
                ]}
                onPress={() => handleToggleUnit("lbs")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.unitSegmentText,
                    {
                      color:
                        unit === "lbs"
                          ? colors.primaryForeground
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  lbs
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.numPadWrap}>
            <NumberPad onPress={handleKey} />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Feather name="check" size={18} color={colors.primaryForeground} />
            <Text
              style={[styles.saveBtnText, { color: colors.primaryForeground }]}
            >
              Log Weight
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalCancel: { fontSize: 15, fontFamily: "Inter_400Regular" },
  modalSave: { fontSize: 15, fontFamily: "Inter_700Bold" },
  modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 24, gap: 20 },
  inlinePickerWrap: {
    marginTop: 10,
    alignItems: "center",
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  dateText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  timeDot: { width: 4, height: 4, borderRadius: 2 },
  timeText2: { fontSize: 13, fontFamily: "Inter_500Medium" },
  numPadWrap: { marginTop: "auto" },
  weightArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  weightDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 8,
  },
  weightBig: { fontSize: 100, fontFamily: "Inter_700Bold", lineHeight: 80 },
  weightUnitBig: { fontSize: 24, fontFamily: "Inter_400Regular" },
  unitSegmented: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  unitSegment: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unitSegmentText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 10,
  },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
