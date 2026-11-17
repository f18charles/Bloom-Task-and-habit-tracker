import React from "react";
import { ActivityIndicator, StyleSheet, Text as RNText, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator, BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import BoardScreen from "./src/screens/BoardScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
import HabitsScreen from "./src/screens/HabitsScreen";
import ProgressScreen from "./src/screens/ProgressScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import { colors } from "./src/theme";
import { Text } from "./src/ui";

const Tab = createBottomTabNavigator();

const TAB_META: Record<string, { icon: keyof typeof Feather.glyphMap; label: string }> = {
  Dashboard: { icon: "home", label: "Dashboard" },
  Board: { icon: "columns", label: "Board" },
  Calendar: { icon: "calendar", label: "Calendar" },
  Habits: { icon: "check-circle", label: "Habits" },
  Progress: { icon: "bar-chart-2", label: "Progress" },
  Settings: { icon: "settings", label: "Settings" },
};

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

function BloomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = TAB_META[route.name] ?? { icon: "circle" as const, label: route.name };
        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };
        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            style={[s.tabItem, focused && s.tabItemActive]}
          >
            {focused ? <View style={s.tabDot} /> : null}
            <Feather
              name={meta.icon}
              size={18}
              color={focused ? colors.primary : colors.slate500}
            />
            <Text
              weight={focused ? "bold" : "semibold"}
              numberOfLines={1}
              style={[s.tabLabel, focused && { color: colors.primary }]}
            >
              {meta.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={s.boot}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.muted, marginTop: 12 }}>Loading Bloom...</Text>
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <NavigationContainer theme={theme}>
      <Tab.Navigator
        tabBar={(props) => <BloomTabBar {...props} />}
        screenOptions={{ headerShown: false, lazy: true }}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Board" component={BoardScreen} />
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="Habits" component={HabitsScreen} />
        <Tab.Screen name="Progress" component={ProgressScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={[s.boot, { backgroundColor: colors.primaryLight }]}>
        <MaterialCommunityIcons name="flower" size={42} color={colors.green} />
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
        <RNText style={{ marginTop: 12, color: colors.slate500 }}>Bloom</RNText>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  boot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    paddingHorizontal: 4,
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 1,
    borderRadius: 12,
    minHeight: 46,
  },
  tabItemActive: { backgroundColor: colors.primarySoft },
  tabDot: {
    position: "absolute",
    top: 0,
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  tabLabel: { fontSize: 9, color: colors.slate500, letterSpacing: -0.1 },
});
