import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { colors, radii, shadow } from "../theme";
import { Avatar, Button, ErrorBanner, Text } from "../ui";

export default function LockScreen() {
  const { user, biometricCapability, unlockWithBiometrics, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attemptUnlock = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await unlockWithBiometrics();
    if (!res.ok && !res.cancelled && res.error) {
      setError(res.error);
    }
    setBusy(false);
  };

  useEffect(() => {
    attemptUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.wrap}>
        <View style={s.brand}>
          <View style={s.logoTile}>
            <MaterialCommunityIcons name="flower" size={28} color={colors.white} />
          </View>
          <Text weight="black" style={s.brandTitle}>
            Bloom is Locked
          </Text>
          <Text style={s.brandSub}>Verify your identity to continue</Text>
        </View>

        <View style={s.card}>
          <View style={s.userRow}>
            <Avatar name={user?.displayName || "U"} size={48} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight="bold" numberOfLines={1} style={s.userName}>
                {user?.displayName || "Bloom User"}
              </Text>
              <Text numberOfLines={1} style={s.userEmail}>
                {user?.email}
              </Text>
            </View>
          </View>

          {error ? <ErrorBanner message={error} /> : null}

          <Button
            label={`Unlock with ${biometricCapability.label}`}
            onPress={attemptUnlock}
            busy={busy}
            icon={
              <MaterialCommunityIcons
                name={biometricCapability.icon}
                size={19}
                color={colors.white}
              />
            }
          />

          <TouchableOpacity onPress={logout} style={s.fallbackBtn} accessibilityRole="button">
            <Feather name="log-out" size={14} color={colors.slate500} />
            <Text weight="semibold" style={s.fallbackText}>
              Sign in with password instead
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primaryLight },
  wrap: { flex: 1, justifyContent: "center", padding: 20 },
  brand: { alignItems: "center", marginBottom: 24 },
  logoTile: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  brandTitle: { fontSize: 26, color: colors.text, letterSpacing: -0.6, marginTop: 14 },
  brandSub: { fontSize: 13, color: colors.subtle, marginTop: 3 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.slate100,
    gap: 16,
    ...shadow,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userName: { fontSize: 16, color: colors.text },
  userEmail: { fontSize: 12, color: colors.subtle, marginTop: 1 },
  fallbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  fallbackText: { fontSize: 13, color: colors.slate500 },
});
