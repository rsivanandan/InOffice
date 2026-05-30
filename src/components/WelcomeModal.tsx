import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Platform } from "react-native";

const LEGEND = [
  { label: "In Office", color: "#22c55e" },
  { label: "Public Holiday", color: "#ec4899" },
  { label: "Personal Leave", color: "#3b82f6" },
  { label: "Sick Leave", color: "#ef4444" },
  { label: "Absent", color: "#d1d5db", border: true },
];

interface Props {
  visible: boolean;
  onDismiss: (name: string) => void;
}

function StepItem({ num, text }: Readonly<{ num: string; text: string }>) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 12, alignItems: "flex-start" }}>
      <Text style={{ color: "#3b82f6", fontWeight: "700", marginRight: 12, fontSize: 14 }}>{num}</Text>
      <Text style={{ color: "#cbd5e1", fontSize: 14, flex: 1, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

export default function WelcomeModal({ visible, onDismiss }: Readonly<Props>) {
  const [name, setName] = useState("");
  return (
    <Modal visible={visible} transparent={false} animationType="fade">
      <View style={{ flex: 1, backgroundColor: "#0f172a", paddingTop: 80, paddingBottom: 40, ...(Platform.OS !== "android" ? { paddingHorizontal: 32 } : {}) }}>
        <ScrollView style={{ flex: 1, ...(Platform.OS === "android" ? { paddingHorizontal: 32 } : {}) }} contentContainerStyle={{ paddingBottom: 24 }}>
          <Text style={{ fontSize: 42, fontWeight: "900", color: "#ffffff", letterSpacing: -1 }}>
            InOffice
          </Text>
          <Text style={{ fontSize: 16, color: "#94a3b8", fontWeight: "500", marginTop: 4, letterSpacing: 0.3 }}>
            Track Your Office Days
          </Text>

          <View style={{ marginTop: 32, backgroundColor: "#1e293b", borderRadius: 16, padding: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#e2e8f0", marginBottom: 16, letterSpacing: 0.5 }}>
              WHAT DO I CALL YOU?
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#64748b"
              autoFocus
              maxLength={40}
              style={{
                backgroundColor: "#0f172a",
                color: "#f8fafc",
                fontSize: 18,
                fontWeight: "600",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#334155",
              }}
            />
          </View>

          <View style={{ marginTop: 24, backgroundColor: "#1e293b", borderRadius: 16, padding: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#e2e8f0", marginBottom: 16, letterSpacing: 0.5 }}>
              HOW IT WORKS
            </Text>

            <StepItem num="01" text="Tap any day to open the status picker and choose how your day went" />
            <StepItem num="02" text="Long-press a day to quickly toggle In Office / Absent" />
            <StepItem num="03" text="Set your attendance target in Settings and track progress on the Dashboard" />
          </View>

          <View style={{ marginTop: 24, backgroundColor: "#1e293b", borderRadius: 16, padding: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#e2e8f0", marginBottom: 16, letterSpacing: 0.5 }}>
              DAY STATUSES
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {LEGEND.map((item) => (
                <View key={item.label} style={{ flexDirection: "row", alignItems: "center" }}>
                  {item.border ? (
                    <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: item.color, marginRight: 6 }} />
                  ) : (
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color, marginRight: 6 }} />
                  )}
                  <Text style={{ color: "#94a3b8", fontSize: 12 }}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity
          onPress={() => onDismiss(name.trim())}
          style={{ backgroundColor: "#3b82f6", paddingVertical: 16, borderRadius: 12, alignItems: "center", ...(Platform.OS === "android" ? { marginHorizontal: 32 } : {}) }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
            Get Started
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 11, color: "#475569", textAlign: "center", marginTop: 16, ...(Platform.OS === "android" ? { marginHorizontal: 32 } : {}) }}>
          © {new Date().getFullYear()} Rajesh T Sivanandan. All rights reserved.
        </Text>
      </View>
    </Modal>
  );
}
