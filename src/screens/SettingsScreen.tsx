import { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, Share } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getSetting, setSetting, initDb, deleteAllData, exportToExcel, importFromExcel, downloadSampleExcel, backupDatabase, restoreDatabase } from "../db";
import HelpModal from "../components/HelpModal";

const LEGEND: { label: string; color: string; desc: string }[] = [
  { label: "In Office", color: "#22c55e", desc: "You came to the office" },
  { label: "Absent", color: "transparent", desc: "No entry (default)" },
  { label: "Public Holiday", color: "#ec4899", desc: "National / company holiday" },
  { label: "Personal Leave", color: "#3b82f6", desc: "Planned time off" },
  { label: "Sick Leave", color: "#ef4444", desc: "Unplanned sick day" },
];

export default function SettingsScreen() {
  const [targetPct, setTargetPct] = useState(60);
  const [helpVisible, setHelpVisible] = useState(false);


  useFocusEffect(
    useCallback(() => {
      initDb().then(async () => {
        const t = await getSetting("targetPct");
        if (t) setTargetPct(parseInt(t, 10));

      });
    }, [])
  );

  async function updateTarget(val: number) {
    setTargetPct(val);
    await setSetting("targetPct", String(val));
  }

  const presets = [50, 60, 70, 80, 100];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0f172a" }} contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 20, color: "#f8fafc" }}>
        Settings
      </Text>

      <View style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#334155", marginBottom: 20 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#94a3b8", marginBottom: 8 }}>
          Target Attendance
        </Text>
        <Text style={{ fontSize: 40, fontWeight: "800", color: "#3b82f6", textAlign: "center", marginBottom: 12 }}>
          {targetPct}%
        </Text>
        <View style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
          {presets.map((p) => (
            <View
              key={p}
              onTouchEnd={() => updateTarget(p)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: targetPct === p ? "#3b82f6" : "#334155",
              }}
            >
              <Text style={{ fontWeight: "700", color: targetPct === p ? "white" : "#94a3b8" }}>
                {p}%
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#334155" }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#94a3b8", marginBottom: 12 }}>
          Day Status Legend
        </Text>
        {LEGEND.map((item) => (
          <View
            key={item.label}
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#334155" }}
          >
            {item.color === "transparent" ? (
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "#64748b", marginRight: 12 }} />
            ) : (
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: item.color, marginRight: 12 }} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#f8fafc" }}>{item.label}</Text>
              <Text style={{ fontSize: 12, color: "#64748b" }}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#334155", marginTop: 20 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#94a3b8", marginBottom: 12 }}>
          Import / Export
        </Text>
        <TouchableOpacity
          onPress={async () => {
            try {
              await exportToExcel();
            } catch {
              Alert.alert("Error", "Could not export data.");
            }
          }}
          style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#334155" }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#3b82f6" }}>
            Export to Excel
          </Text>
          <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Shares .xlsx file with all attendance records
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            try {
              const count = await importFromExcel();
              if (count > 0) {
                Alert.alert("Imported", `${count} records imported or updated.`);
              }
            } catch {
              Alert.alert("Error", "Could not import file. Make sure it's a valid .xlsx file with Date and Status columns.");
            }
          }}
          style={{ paddingVertical: 12 }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#3b82f6" }}>
            Import from Excel
          </Text>
          <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Pick a .xlsx file to import attendance records
          </Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Excel Format Help",
                "Your .xlsx file must have two columns:\n\n" +
                "• Date — format YYYY-MM-DD (e.g. 2026-05-01)\n" +
                "• Status — one of:\n" +
                "  in-office\n  absent\n  public-holiday\n  personal-leave\n  sick-leave\n\n" +
                "Example row:\n" +
                "2026-05-01  │  in-office\n" +
                "2026-05-05  │  public-holiday\n\n" +
                "First row should be headers (Date, Status). Duplicate dates are overwritten."
              )
            }
          >
            <Text style={{ fontSize: 12, color: "#94a3b8" }}>
              Need help? See format
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 12, color: "#475569", marginHorizontal: 8 }}>·</Text>
          <TouchableOpacity
            onPress={async () => {
              try {
                await downloadSampleExcel();
              } catch {
                Alert.alert("Error", "Could not generate sample file.");
              }
            }}
          >
            <Text style={{ fontSize: 12, color: "#94a3b8" }}>
              Download Sample
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#334155", marginTop: 20 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#94a3b8", marginBottom: 12 }}>
          Backup / Restore
        </Text>
        <TouchableOpacity
          onPress={async () => {
            try {
              await backupDatabase();
            } catch {
              Alert.alert("Error", "Could not backup database.");
            }
          }}
          style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#334155" }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#3b82f6" }}>
            Backup Database
          </Text>
          <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Share a copy of your entire database
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            try {
              await restoreDatabase();
              Alert.alert("Restored", "Database restored from backup.");
            } catch {
              Alert.alert("Error", "Could not restore database. Make sure it's a valid .db file.");
            }
          }}
          style={{ paddingVertical: 12 }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#f59e0b" }}>
            Restore Database
          </Text>
          <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Pick a .db backup file to restore from
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#334155", marginTop: 20, marginBottom: 24 }}>
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity
            onPress={() => setHelpVisible(true)}
            style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRightWidth: 1, borderRightColor: "#334155" }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#3b82f6" }}>
              Help
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Delete all data?",
                "This will remove all attendance records and settings. This cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      await deleteAllData();
                      setTargetPct(60);
                    },
                  },
                ]
              )
            }
            style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#ef4444" }}>
              Delete All Data
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 32, marginBottom: 16 }}>
        <TouchableOpacity onPress={() => Share.share({ message: "Track your office attendance with InOffice! 🏢" })}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#3b82f6" }}>
            📤 Tell a friend
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL("https://apps.apple.com/app/id")}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#f59e0b" }}>
            ⭐ Rate the app
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 1, backgroundColor: "#334155", marginHorizontal: 60, marginBottom: 16 }} />

      <Text style={{ fontSize: 11, color: "#f8fafc", textAlign: "center", marginBottom: 40 }}>
        © {new Date().getFullYear()} Rajesh T Sivanandan. All rights reserved.
      </Text>

      <HelpModal visible={helpVisible} onDismiss={() => setHelpVisible(false)} />
    </ScrollView>
  );
}
