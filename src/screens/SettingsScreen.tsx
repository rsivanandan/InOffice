import { useState, useEffect, useRef, useContext } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, Share, Platform } from "react-native";
import { TabIndexContext } from "../utils/TabIndexContext";
import { getSetting, setSetting, initDb, deleteAllData, exportToExcel, importFromExcel, downloadSampleExcel, backupDatabase, restoreDatabase } from "../db";
import HelpModal from "../components/HelpModal";
import {
  performBackup,
  restoreFromCloudBackup,
  getLastBackupDate,
  isAutoBackupEnabled,
  setAutoBackupEnabled,
  listCloudBackups,
  deleteAllCloudBackups,
} from "../utils/backup";
import { format } from "date-fns";

const MY_INDEX = 3;

const LEGEND: { label: string; color: string; desc: string }[] = [
  { label: "In Office", color: "#22c55e", desc: "You came to the office" },
  { label: "Absent", color: "transparent", desc: "No entry (default)" },
  { label: "Public Holiday", color: "#ec4899", desc: "National / company holiday" },
  { label: "Personal Leave", color: "#3b82f6", desc: "Planned time off" },
  { label: "Sick Leave", color: "#ef4444", desc: "Unplanned sick day" },
];

function ActionRow({
  label,
  description,
  color,
  onPress,
  border = true,
}: Readonly<{
  label: string;
  description: string;
  color: string;
  onPress: () => void;
  border?: boolean;
}>) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 12,
        ...(border ? { borderBottomWidth: 1, borderBottomColor: "#334155" } : {}),
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "600", color }}>{label}</Text>
      <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{description}</Text>
    </TouchableOpacity>
  );
}

function handleRestore(fileName: string) {
  Alert.alert(
    "Restore from backup",
    `Restore data from ${fileName}? This will overwrite your current data.`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Restore",
        style: "destructive",
        onPress: async () => {
          const result = await restoreFromCloudBackup(fileName);
          if (result.success) {
            Alert.alert("Restore Complete", result.message);
          } else {
            Alert.alert("Restore Failed", result.message);
          }
        },
      },
    ]
  );
}

export default function SettingsScreen() {
  const [targetPct, setTargetPct] = useState(60);
  const [helpVisible, setHelpVisible] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [autoBackup, setAutoBackup] = useState(false);
  const [cloudBackups, setCloudBackups] = useState<string[]>([]);
  const [backingUp, setBackingUp] = useState(false);
  const tabIndex = useContext(TabIndexContext);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (tabIndex !== MY_INDEX) return;
    cancelledRef.current = false;
    initDb()
      .then(async () => {
        if (cancelledRef.current) return;
        const t = await getSetting("targetPct");
        if (!cancelledRef.current && t) setTargetPct(Number.parseInt(t, 10));
        if (!cancelledRef.current) {
          const lastDate = await getLastBackupDate();
          if (lastDate) setLastBackupDate(lastDate);
          const auto = await isAutoBackupEnabled();
          setAutoBackup(auto);
          const backups = await listCloudBackups();
          setCloudBackups(backups);
        }
      })
      .catch(() => {});
    return () => {
      cancelledRef.current = true;
    };
  }, [tabIndex]);

  async function updateTarget(val: number) {
    setTargetPct(val);
    await setSetting("targetPct", String(val));
  }

  async function handleBackupNow() {
    if (backingUp) return;
    setBackingUp(true);
    const result = await performBackup();
    setBackingUp(false);
    if (result.success) {
      const lastDate = await getLastBackupDate();
      if (lastDate) setLastBackupDate(lastDate);
      const backups = await listCloudBackups();
      setCloudBackups(backups);
      Alert.alert("Backup Complete", result.message);
    } else {
      Alert.alert("Backup Failed", result.message);
    }
  }

  async function toggleAutoBackup(val: boolean) {
    setAutoBackup(val);
    await setAutoBackupEnabled(val);
    if (val) {
      const result = await performBackup();
      Alert.alert(result.success ? "Backup complete" : "Backup failed", result.message);
      if (result.success) {
        const lastDate = await getLastBackupDate();
        if (lastDate) setLastBackupDate(lastDate);
        const backups = await listCloudBackups();
        setCloudBackups(backups);
      }
    }
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
        <View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>
          {presets.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => updateTarget(p)}
              activeOpacity={0.7}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: targetPct === p ? "#3b82f6" : "#334155",
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "700", color: targetPct === p ? "white" : "#94a3b8" }}>
                {p}%
              </Text>
            </TouchableOpacity>
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
        <ActionRow
          label="Export to Excel"
          description="Shares .xlsx file with all attendance records"
          color="#3b82f6"
          onPress={async () => { try { await exportToExcel(); } catch { Alert.alert("Error", "Could not export data."); } }}
          border
        />
        <ActionRow
          label="Import from Excel"
          description="Pick a .xlsx file to import attendance records"
          color="#3b82f6"
          onPress={async () => { try { const count = await importFromExcel(); if (count > 0) Alert.alert("Imported", `${count} records imported or updated.`); } catch { Alert.alert("Error", "Could not import file. Make sure it's a valid .xlsx file with Date and Status columns."); } }}
          border={false}
        />
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
          Auto Backup
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#334155" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#f8fafc" }}>
              Daily auto backup
            </Text>
            <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {Platform.OS === "ios" ? "Backup to iCloud Drive daily" : "Backup to Google Drive daily"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => toggleAutoBackup(!autoBackup)}
            style={{
              width: 48,
              height: 28,
              borderRadius: 14,
              backgroundColor: autoBackup ? "#22c55e" : "#475569",
              justifyContent: "center",
              paddingHorizontal: 3,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: "#fff",
                alignSelf: autoBackup ? "flex-end" : "flex-start",
              }}
            />
          </TouchableOpacity>
        </View>
        {lastBackupDate && (
          <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#334155" }}>
            <Text style={{ fontSize: 12, color: "#94a3b8" }}>
              Last backup: {format(new Date(lastBackupDate), "MMM d, yyyy h:mm a")}
            </Text>
          </View>
        )}
        <TouchableOpacity
          onPress={handleBackupNow}
          disabled={backingUp}
          activeOpacity={0.85}
          style={{
            backgroundColor: backingUp ? "#475569" : "#22c55e",
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
            {backingUp ? "Backing up..." : "Backup Now"}
          </Text>
        </TouchableOpacity>
        {cloudBackups.length > 0 && (
          <View style={{ paddingTop: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#94a3b8", marginBottom: 6 }}>
              Cloud backups ({cloudBackups.length})
            </Text>
            {cloudBackups.slice(0, 5).map((name) => (
              <View
                key={name}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: "#1e293b",
                }}
              >
                <Text style={{ fontSize: 12, color: "#cbd5e1", flex: 1 }}>
                  {name.replace("inoffice_backup_", "").replace(".db", "")}
                </Text>
                <TouchableOpacity onPress={() => handleRestore(name)}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#3b82f6" }}>
                    Restore
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#334155", marginTop: 20 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#94a3b8", marginBottom: 12 }}>
          Local Backup / Restore
        </Text>
        <ActionRow
          label="Backup to local file"
          description="Save a backup file to share or store manually"
          color="#3b82f6"
          onPress={async () => { try { await backupDatabase(); } catch { Alert.alert("Error", "Could not backup database."); } }}
          border
        />
        <ActionRow
          label="Restore from local file"
          description="Pick a previously saved backup file to restore"
          color="#3b82f6"
          onPress={async () => { try { const ok = await restoreDatabase(); if (ok) Alert.alert("Restored", "Database restored from backup."); else Alert.alert("Canceled", "No file was selected."); } catch { Alert.alert("Error", "Could not restore database. Make sure it's a valid .db file."); } }}
          border={false}
        />
      </View>

      <TouchableOpacity
        onPress={() => setHelpVisible(true)}
        style={{
          backgroundColor: "#1e293b",
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: "#334155",
          marginTop: 20,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#3b82f6" }}>
          Help
        </Text>
      </TouchableOpacity>

      <View style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#ef4444", marginTop: 20, marginBottom: 24 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#ef4444", marginBottom: 8 }}>
          ⚠ Danger Zone
        </Text>
        <Text style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
          This will remove all attendance records, settings, AND cloud backups. This cannot be undone.
        </Text>
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "Delete all data?",
              "This will remove all attendance records, settings, AND cloud backups. This cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    await deleteAllData();
                    const result = await deleteAllCloudBackups();
                    setCloudBackups([]);
                    setTargetPct(60);
                    Alert.alert("Deleted", "All data deleted" + (result.message !== "No cloud backups to delete" ? " and " + result.message : "") + ".");
                  },
                },
              ]
            )
          }
          activeOpacity={0.85}
          style={{
            backgroundColor: "#ef4444",
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
            Delete All Data
          </Text>
        </TouchableOpacity>
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
