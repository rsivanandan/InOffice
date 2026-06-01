import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TabView, SceneMap } from "react-native-tab-view";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import DashboardScreen from "./src/screens/DashboardScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
import InsightsScreen from "./src/screens/InsightsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import WelcomeModal from "./src/components/WelcomeModal";
import { TabIndexContext } from "./src/utils/TabIndexContext";
import { initDb, getSetting, setSetting } from "./src/db";
import { performBackup, hasCloudBackups, isAutoBackupEnabled } from "./src/utils/backup";

const BACKGROUND_BACKUP_TASK = "background-daily-backup";

TaskManager.defineTask(BACKGROUND_BACKUP_TASK, async () => {
  try {
    const autoBackup = await isAutoBackupEnabled();
    if (!autoBackup) return BackgroundFetch.BackgroundFetchResult.NoData;

    const result = await performBackup();
    return result.success
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.Failed;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

async function registerBackgroundBackup() {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundFetchStatus.Denied) return;

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_BACKUP_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_BACKUP_TASK, {
        minimumInterval: 24 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch {
  }
}

const TABS = [
  { key: "dashboard", label: "Dashboard", iconOutline: "home-outline", iconFilled: "home" },
  { key: "calendar", label: "Calendar", iconOutline: "calendar-outline", iconFilled: "calendar" },
  { key: "insights", label: "Insights", iconOutline: "bar-chart-outline", iconFilled: "bar-chart" },
  { key: "settings", label: "Settings", iconOutline: "settings-outline", iconFilled: "settings" },
];

const ROUTES = TABS.map((t) => ({ key: t.key, title: t.label }));

const renderScene = SceneMap({
  dashboard: DashboardScreen,
  calendar: CalendarScreen,
  insights: InsightsScreen,
  settings: SettingsScreen,
});

function BottomTabBar({ index, onTabPress }: Readonly<{ index: number; onTabPress: (i: number) => void }>) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#1e293b",
        borderTopWidth: 1,
        borderTopColor: "#334155",
        paddingBottom: insets.bottom + 4,
        paddingTop: 6,
      }}
    >
      {TABS.map((tab, i) => {
        const focused = i === index;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onTabPress(i)}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 4,
            }}
          >
            <Ionicons
              name={(focused ? tab.iconFilled : tab.iconOutline) as any}
              size={focused ? 24 : 22}
              color={focused ? "#3b82f6" : "#9ca3af"}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: focused ? "600" : "500",
                color: focused ? "#3b82f6" : "#9ca3af",
                marginTop: 2,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function AppContent() {
  const [index, setIndex] = useState(0);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    initDb().then(async () => {
      const hasLaunched = await getSetting("hasLaunched");
      if (!hasLaunched) {
        setWelcomeVisible(true);
        const hasCloud = await hasCloudBackups();
        if (hasCloud) {
          Alert.alert(
            "Restore from backup?",
            "We found existing cloud backups. Would you like to restore your data?",
            [
              { text: "Not now", style: "cancel" },
              {
                text: "View backups",
                onPress: () => setIndex(3),
              },
            ]
          );
        }
      }
      setReady(true);
      registerBackgroundBackup();
    });
  }, []);

  return (
    <TabIndexContext.Provider value={index}>
      <View style={{ flex: 1, backgroundColor: "#0f172a", paddingTop: insets.top }}>
        <StatusBar style="light" />
        <TabView
          navigationState={{ index, routes: ROUTES }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          renderTabBar={() => null}
          swipeEnabled
          animationEnabled
        />
        <BottomTabBar index={index} onTabPress={setIndex} />
        {ready && (
          <WelcomeModal
            visible={welcomeVisible}
            onDismiss={(name) => {
              setWelcomeVisible(false);
              setSetting("hasLaunched", "true");
              if (name) setSetting("userName", name);
            }}
          />
        )}
      </View>
    </TabIndexContext.Provider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
