import { View, Text, TouchableOpacity, Modal } from "react-native";
import type { DayStatus } from "../types";

const OPTIONS: { status: DayStatus; label: string; color: string }[] = [
  { status: "in-office", label: "In Office", color: "#22c55e" },
  { status: "absent", label: "Absent", color: "#475569" },
  { status: "public-holiday", label: "Public Holiday", color: "#ec4899" },
  { status: "personal-leave", label: "Personal Leave", color: "#3b82f6" },
  { status: "sick-leave", label: "Sick Leave", color: "#ef4444" },
];

interface Props {
  visible: boolean;
  dateLabel: string;
  onSelect: (status: DayStatus) => void;
  onClose: () => void;
}

export default function StatusPicker({
  visible,
  dateLabel,
  onSelect,
  onClose,
}: Readonly<Props>) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        onPress={onClose}
        testID="status-picker-backdrop"
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 20, width: 280, borderWidth: 1, borderColor: "#334155" }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 12, textAlign: "center", color: "#f8fafc" }}>
            {dateLabel}
          </Text>
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.status}
              onPress={() => onSelect(opt.status)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                paddingHorizontal: 8,
                borderBottomWidth: 1,
                borderBottomColor: "#334155",
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: opt.color,
                  marginRight: 12,
                }}
              />
              <Text style={{ fontSize: 15, color: "#f8fafc" }}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
