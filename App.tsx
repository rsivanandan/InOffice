import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import DashboardScreen from "./src/screens/DashboardScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
import InsightsScreen from "./src/screens/InsightsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import WelcomeModal from "./src/components/WelcomeModal";
import { initDb, getSetting, setSetting } from "./src/db";

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: Readonly<{ label: string; focused: boolean }>) {
  const icons: Record<string, { name: string; focusedName: string }> = {
    Dashboard: { name: "home-outline", focusedName: "home" },
    Calendar: { name: "calendar-outline", focusedName: "calendar" },
    Insights: { name: "bar-chart-outline", focusedName: "bar-chart" },
    Settings: { name: "settings-outline", focusedName: "settings" },
  };
  const icon = icons[label] ?? { name: "ellipse-outline" as const, focusedName: "ellipse" as const };
  return (
    <Ionicons
      name={(focused ? icon.focusedName : icon.name) as any}
      size={focused ? 24 : 22}
      color={focused ? "#3b82f6" : "#9ca3af"}
    />
  );
}

function DashboardTabIcon({ focused }: Readonly<{ focused: boolean }>) {
  return <TabIcon label="Dashboard" focused={focused} />;
}

function CalendarTabIcon({ focused }: Readonly<{ focused: boolean }>) {
  return <TabIcon label="Calendar" focused={focused} />;
}

function InsightsTabIcon({ focused }: Readonly<{ focused: boolean }>) {
  return <TabIcon label="Insights" focused={focused} />;
}

function SettingsTabIcon({ focused }: Readonly<{ focused: boolean }>) {
  return <TabIcon label="Settings" focused={focused} />;
}

const screenOptions = {
  tabBarActiveTintColor: "#3b82f6",
  tabBarInactiveTintColor: "#9ca3af",
  headerShown: true,
  headerStyle: { backgroundColor: "#fff" },
  headerTitleStyle: { fontWeight: "700" },
};

export default function App() {
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initDb().then(async () => {
      const hasLaunched = await getSetting("hasLaunched");
      if (!hasLaunched) {
        setWelcomeVisible(true);
      }
      setReady(true);
    });
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator screenOptions={screenOptions}>
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: "InOffice Dashboard", tabBarLabel: "Dashboard", tabBarIcon: DashboardTabIcon }}
        />
        <Tab.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{ title: "Calendar", tabBarIcon: CalendarTabIcon }}
        />
        <Tab.Screen
          name="Insights"
          component={InsightsScreen}
          options={{ title: "Insights", tabBarIcon: InsightsTabIcon }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Settings", tabBarIcon: SettingsTabIcon }}
        />
      </Tab.Navigator>

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
    </NavigationContainer>
  );
}
