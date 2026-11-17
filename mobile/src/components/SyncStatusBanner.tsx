import React from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSync } from "../offline/SyncContext";
import { colors, radii } from "../theme";
import { Text } from "../ui";

export default function SyncStatusBanner() {
  const { isOnline, isSyncing, pendingCount, triggerSync } = useSync();

  // Stay completely unobtrusive when online and everything is synced.
  if (isOnline && !isSyncing && pendingCount === 0) {
    return null;
  }

  const isOffline = !isOnline;
  const bg = isOffline ? colors.warningBg : colors.greenLight;
  const border = isOffline ? "#fed7aa" : colors.greenSoft;
  const fg = isOffline ? "#9a3412" : colors.darkGreen;

  const label = isSyncing
    ? pendingCount > 0
      ? `Syncing ${pendingCount} ${pendingCount === 1 ? "change" : "changes"}...`
      : "Syncing workspace..."
    : isOffline
      ? pendingCount > 0
        ? `Offline · ${pendingCount} ${pendingCount === 1 ? "change" : "changes"} saved locally`
        : "Offline mode · using phone storage"
      : `${pendingCount} ${pendingCount === 1 ? "change" : "changes"} waiting to sync`;

  return (
    <TouchableOpacity
      onPress={() => isOnline && !isSyncing && triggerSync()}
      disabled={!isOnline || isSyncing}
      activeOpacity={0.8}
      style={[s.bar, { backgroundColor: bg, borderColor: border }]}
    >
      {isSyncing ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <Feather name={isOffline ? "wifi-off" : "upload-cloud"} size={14} color={fg} />
      )}
      <Text weight="semibold" numberOfLines={1} style={[s.text, { color: fg }]}>
        {label}
      </Text>
      {isOnline && !isSyncing && pendingCount > 0 ? (
        <Text weight="bold" style={[s.action, { color: fg }]}>
          Sync
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  text: { fontSize: 12, flex: 1 },
  action: { fontSize: 12 },
});
