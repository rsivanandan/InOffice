import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

const SECTIONS = [
  {
    title: "Dashboard",
    items: [
      "Mark Today to log your day",
      "Progress ring shows month-to-date %",
      "Toggle Incl./Excl. for holiday-adjusted stats",
    ],
  },
  {
    title: "Calendar",
    items: [
      "Tap a day → Status Picker to set any status",
      "Long-press a day → toggle In Office / Absent",
      "Pink = Public Holiday · Blue = Personal Leave · Red = Sick Leave",
      "White + green tile = In Office · White only = Absent",
    ],
  },
  {
    title: "Insights",
    items: [
      "Current month card + Year to Date card",
      "Month-by-month breakdown below",
      "Toggle Incl. / Excl. holidays",
      "← and → arrows to change year",
    ],
  },
  {
    title: "Settings",
    items: [
      "Set your Target % (50–100%)",
      "Color Legend explains each status",
      "Export / Import Excel files for backup",
      "Download Sample to get a template",
      "Delete All Data to reset everything",
    ],
  },
  {
    title: "Excel Format",
    items: [
      "Two columns: Date (YYYY-MM-DD) and Status",
      "Valid statuses: in-office, absent, public-holiday, personal-leave, sick-leave",
      "Headers row required: Date, Status",
      "Duplicate dates are overwritten",
    ],
  },
  {
    title: "Privacy",
    items: [
      "All data stays on your device — no cloud, no accounts, no tracking",
      "Uninstalling the app removes all data",
    ],
  },
];

export default function HelpModal({ visible, onDismiss }: Readonly<Props>) {
  return (
    <Modal visible={visible} transparent={false} animationType="fade">
      <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#111827" }}>
            Help
          </Text>
          <TouchableOpacity onPress={onDismiss} style={{ padding: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#3b82f6" }}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          {SECTIONS.map((section) => (
            <View key={section.title} style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb" }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 10 }}>
                {section.title}
              </Text>
              {section.items.map((item) => (
                <View key={item} style={{ flexDirection: "row", marginBottom: 6, alignItems: "flex-start" }}>
                  <Text style={{ color: "#3b82f6", marginRight: 8, fontSize: 14 }}>•</Text>
                  <Text style={{ color: "#6b7280", fontSize: 13, flex: 1, lineHeight: 18 }}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          <Text style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 16 }}>
            © {new Date().getFullYear()} Rajesh T Sivanandan
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}
