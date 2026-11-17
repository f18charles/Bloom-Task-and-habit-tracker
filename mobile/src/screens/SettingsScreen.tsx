import React, { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { api, errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useSync } from "../offline/SyncContext";
import {
  fetchCalendarStatusOfflineFirst,
  submitFeedbackOfflineFirst,
} from "../offline/offlineApi";
import { CalendarStatus } from "../types";
import { colors, radii } from "../theme";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Divider,
  ErrorBanner,
  Input,
  Label,
  Screen,
  Text,
} from "../ui";

const CATEGORIES = [
  { label: "General", value: "GENERAL" },
  { label: "Feature", value: "FEATURE" },
  { label: "Bug", value: "BUG" },
  { label: "Improvement", value: "IMPROVEMENT" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

export default function SettingsScreen() {
  const {
    user,
    logout,
    biometricCapability,
    biometricSettings,
    enableBiometrics,
    disableBiometrics,
    toggleRequireOnLaunch,
    refreshBiometricState,
  } = useAuth();

  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncedAt,
    summary,
    triggerSync,
    clearLocalCache,
    refreshStats,
  } = useSync();

  const [calendar, setCalendar] = useState<CalendarStatus>({ connected: false });
  const [refreshing, setRefreshing] = useState(false);
  const [syncingCal, setSyncingCal] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<Category>("GENERAL");
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const [calRes] = await Promise.all([
        fetchCalendarStatusOfflineFirst(user.id),
        refreshBiometricState(),
        refreshStats(),
      ]);
      setCalendar(calRes.status);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [user, refreshBiometricState, refreshStats]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleBiometricLogin = async (next: boolean) => {
    if (bioBusy) return;
    setBioBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (next) {
        const res = await enableBiometrics(biometricSettings.requireOnLaunch);
        if (res.ok) {
          setNotice(`${biometricCapability.label} login enabled for your account.`);
        } else if (res.error) {
          setError(res.error);
        }
      } else {
        await disableBiometrics();
        setNotice(`${biometricCapability.label} login disabled.`);
      }
    } finally {
      setBioBusy(false);
    }
  };

  const handleManualSync = async () => {
    setError(null);
    setNotice(null);
    const ok = await triggerSync();
    if (ok) {
      setNotice("All device data synced with Bloom server.");
    } else if (!isOnline) {
      setError("You're currently offline. Changes remain queued on your phone.");
    }
  };

  const handleClearCache = () => {
    const warn =
      pendingCount > 0
        ? `You have ${pendingCount} unsynced ${pendingCount === 1 ? "change" : "changes"} queued offline. Clearing local data will discard them.`
        : "This clears cached tasks, habits, and events stored on your phone and re-fetches them when online.";

    Alert.alert("Clear Local Storage?", warn, [
      { text: "Cancel", style: "cancel" },
      {
        text: pendingCount > 0 ? "Discard & Clear" : "Clear Cache",
        style: "destructive",
        onPress: async () => {
          await clearLocalCache(true);
          setNotice("Local SQLite cache cleared.");
          if (isOnline) {
            await triggerSync();
          }
        },
      },
    ]);
  };

  const connectCalendar = async () => {
    try {
      const { url } = await api.get<{ url: string }>("/calendar/auth-url");
      await Linking.openURL(url);
      setNotice("Complete the Google sign-in, then come back and refresh.");
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const syncNow = async () => {
    setSyncingCal(true);
    try {
      await api.post("/calendar/sync");
      await load();
      setNotice("Calendar sync completed.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSyncingCal(false);
    }
  };

  const disconnect = () => {
    Alert.alert("Disconnect Google Calendar?", "Your Bloom data stays intact.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          try {
            await api.del("/calendar/disconnect");
            setCalendar({ connected: false });
          } catch (e) {
            setError(errorMessage(e));
          }
        },
      },
    ]);
  };

  const submitFeedback = async () => {
    if (!message.trim() || submitting || !user) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const { queuedOffline } = await submitFeedbackOfflineFirst(user.id, {
        category,
        rating: rating > 0 ? rating : undefined,
        title: title.trim() || undefined,
        message: message.trim(),
        pageUrl: "/settings",
        extraData: { platform: "android", includeSpecs: true },
      });
      setNotice(
        queuedOffline
          ? "You're offline — feedback saved on your phone and will send automatically once reconnected."
          : "Thank you for your feedback! Your submission has been saved."
      );
      setTitle("");
      setMessage("");
      setRating(0);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Settings" subtitle="Account, security, offline sync and feedback.">
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {error ? <ErrorBanner message={error} onRetry={load} /> : null}
        {notice ? (
          <View style={s.notice}>
            <Feather name="check-circle" size={16} color={colors.green} />
            <Text style={s.noticeText}>{notice}</Text>
          </View>
        ) : null}

        <SectionLabel>ACCOUNT SETTINGS</SectionLabel>
        <Card style={s.accountCard}>
          <View style={s.accountLeft}>
            <Avatar name={user?.displayName || "U"} size={52} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight="bold" numberOfLines={1} style={s.accountName}>
                {user?.displayName}
              </Text>
              <Text numberOfLines={1} style={s.accountEmail}>
                {user?.email}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout} style={s.signOut} accessibilityRole="button">
            <Feather name="log-out" size={15} color={colors.danger} />
            <Text weight="bold" style={s.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </Card>

        <SectionLabel>SECURITY & BIOMETRICS</SectionLabel>
        <Card style={{ gap: 14 }}>
          <View style={s.integrationRow}>
            <View
              style={[
                s.integrationIcon,
                {
                  backgroundColor: biometricSettings.enabled
                    ? colors.greenLight
                    : colors.slate100,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={biometricCapability.icon}
                size={22}
                color={biometricSettings.enabled ? colors.green : colors.slate500}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight="bold" style={s.integrationTitle}>
                {biometricCapability.label} Login
              </Text>
              <Text style={s.integrationSub}>
                {!biometricCapability.hasHardware
                  ? "Biometric hardware not detected on this device"
                  : !biometricCapability.isEnrolled
                    ? `Set up ${biometricCapability.label.toLowerCase()} in phone Settings first`
                    : biometricSettings.enabled
                      ? "Active · sign in and unlock with biometrics"
                      : `Use ${biometricCapability.label} to sign in quickly`}
              </Text>
            </View>
            <Switch
              value={biometricSettings.enabled}
              onValueChange={toggleBiometricLogin}
              disabled={!biometricCapability.available || bioBusy}
              trackColor={{ true: colors.green, false: colors.slate200 }}
              thumbColor={colors.white}
            />
          </View>

          {biometricSettings.enabled && biometricCapability.available ? (
            <>
              <Divider />
              <View style={s.integrationRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text weight="semibold" style={s.subToggleTitle}>
                    Lock App on Launch
                  </Text>
                  <Text style={s.integrationSub}>
                    Require {biometricCapability.label} when opening or returning to Bloom
                  </Text>
                </View>
                <Switch
                  value={biometricSettings.requireOnLaunch}
                  onValueChange={toggleRequireOnLaunch}
                  trackColor={{ true: colors.green, false: colors.slate200 }}
                  thumbColor={colors.white}
                />
              </View>
            </>
          ) : null}
        </Card>

        <SectionLabel>OFFLINE STORAGE & SYNC</SectionLabel>
        <Card style={{ gap: 14 }}>
          <View style={s.integrationRow}>
            <View
              style={[
                s.integrationIcon,
                {
                  backgroundColor: isOnline ? colors.greenLight : colors.warningBg,
                },
              ]}
            >
              <Feather
                name={isOnline ? "database" : "wifi-off"}
                size={20}
                color={isOnline ? colors.green : colors.warning}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight="bold" style={s.integrationTitle}>
                {isSyncing
                  ? "Syncing with Server..."
                  : isOnline
                    ? "On-Device SQLite · Online"
                    : "On-Device SQLite · Offline"}
              </Text>
              <Text style={s.integrationSub}>
                {lastSyncedAt
                  ? `Last synced ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}`
                  : "Waiting for first sync"}
              </Text>
            </View>
          </View>

          <View style={s.statsGrid}>
            <View style={s.statCell}>
              <Text weight="black" style={s.statNum}>{summary.tasks}</Text>
              <Text weight="bold" style={s.statLabel}>TASKS</Text>
            </View>
            <View style={s.statCell}>
              <Text weight="black" style={s.statNum}>{summary.habits}</Text>
              <Text weight="bold" style={s.statLabel}>HABITS</Text>
            </View>
            <View style={s.statCell}>
              <Text weight="black" style={s.statNum}>{summary.events}</Text>
              <Text weight="bold" style={s.statLabel}>EVENTS</Text>
            </View>
            <View
              style={[
                s.statCell,
                pendingCount > 0 && { backgroundColor: colors.warningBg, borderColor: "#fed7aa" },
              ]}
            >
              <Text
                weight="black"
                style={[s.statNum, pendingCount > 0 && { color: colors.warning }]}
              >
                {pendingCount}
              </Text>
              <Text
                weight="bold"
                style={[s.statLabel, pendingCount > 0 && { color: "#9a3412" }]}
              >
                QUEUED
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 9 }}>
            <Button
              label={isSyncing ? "Syncing..." : "Sync Now"}
              small
              onPress={handleManualSync}
              busy={isSyncing}
              disabled={!isOnline}
              icon={<Feather name="refresh-cw" size={14} color={colors.white} />}
              style={{ flex: 1 }}
            />
            <Button
              label="Clear Cache"
              small
              variant="outline"
              onPress={handleClearCache}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        <SectionLabel>CONNECTED ACCOUNTS</SectionLabel>
        <Card style={{ gap: 14 }}>
          <View style={s.integrationRow}>
            <View
              style={[
                s.integrationIcon,
                { backgroundColor: calendar.connected ? colors.primaryLight : colors.slate100 },
              ]}
            >
              <MaterialCommunityIcons
                name="calendar-month"
                size={22}
                color={calendar.connected ? colors.primary : colors.slate400}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight="bold" style={s.integrationTitle}>Google Calendar</Text>
              <Text style={[s.integrationSub, calendar.connected && { color: colors.green }]}>
                {calendar.connected
                  ? `Connected${calendar.lastSyncedAt ? ` · synced ${new Date(calendar.lastSyncedAt).toLocaleDateString()}` : ""}`
                  : "Not connected"}
              </Text>
            </View>
          </View>

          {calendar.connected ? (
            <View style={{ flexDirection: "row", gap: 9 }}>
              <Button
                label="Sync Now"
                small
                onPress={syncNow}
                busy={syncingCal}
                icon={<Feather name="refresh-cw" size={14} color={colors.white} />}
                style={{ flex: 1 }}
              />
              <Button label="Disconnect" small variant="danger" onPress={disconnect} style={{ flex: 1 }} />
            </View>
          ) : (
            <Button
              label="Connect Google Calendar"
              onPress={connectCalendar}
              icon={<Feather name="link" size={15} color={colors.white} />}
            />
          )}
        </Card>

        <SectionLabel>FEEDBACK</SectionLabel>
        <Card style={{ gap: 15 }}>
          <View>
            <Label>Category</Label>
            <View style={s.chipRow}>
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.value}
                  label={c.label}
                  selected={category === c.value}
                  onPress={() => setCategory(c.value)}
                />
              ))}
            </View>
          </View>

          <View>
            <Label>How is Bloom feeling?</Label>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={6}>
                  <MaterialCommunityIcons
                    name={n <= rating ? "star" : "star-outline"}
                    size={26}
                    color={n <= rating ? "#f59e0b" : colors.slate300}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Label>Title (optional)</Label>
            <Input value={title} onChangeText={setTitle} placeholder="A short summary" />
          </View>

          <View>
            <Label>Message</Label>
            <Input
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us what's working or what we can improve..."
              multiline
              style={{ minHeight: 92, textAlignVertical: "top" }}
            />
          </View>

          <Button
            label="Submit Feedback"
            onPress={submitFeedback}
            busy={submitting}
            disabled={!message.trim()}
            icon={<Feather name="send" size={15} color={colors.white} />}
          />
        </Card>

        <SectionLabel>ABOUT</SectionLabel>
        <Card style={s.aboutCard}>
          <View style={s.aboutLogo}>
            <MaterialCommunityIcons name="flower" size={22} color={colors.darkGreen} />
          </View>
          <View style={{ flex: 1 }}>
            <Text weight="bold" style={s.integrationTitle}>Bloom Productivity</Text>
            <Text style={s.integrationSub}>Version 1.0.0 · Offline-Ready Mobile Edition</Text>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text weight="bold" style={s.sectionLabel}>
      {children}
    </Text>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30, gap: 12 },
  notice: {
    backgroundColor: colors.greenLight,
    borderColor: colors.greenSoft,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeText: { color: colors.darkGreen, fontSize: 13, flex: 1 },
  sectionLabel: { fontSize: 13, color: colors.slate800, marginTop: 8, marginLeft: 2 },
  accountCard: { gap: 15 },
  accountLeft: { flexDirection: "row", alignItems: "center", gap: 13 },
  accountName: { fontSize: 17, color: colors.text },
  accountEmail: { fontSize: 12, color: colors.subtle, marginTop: 2 },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: colors.dangerBg,
    borderRadius: radii.md,
    paddingVertical: 10,
  },
  signOutText: { color: colors.danger, fontSize: 13 },
  integrationRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  integrationIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  integrationTitle: { fontSize: 15, color: colors.text },
  subToggleTitle: { fontSize: 14, color: colors.text },
  integrationSub: { fontSize: 12, color: colors.subtle, marginTop: 2 },
  statsGrid: { flexDirection: "row", gap: 8 },
  statCell: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statNum: { fontSize: 16, color: colors.text },
  statLabel: { fontSize: 8, color: colors.subtle, letterSpacing: 0.7, marginTop: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  aboutCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  aboutLogo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
});
