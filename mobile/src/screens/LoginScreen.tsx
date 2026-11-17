import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { mobileApi, errorMessage } from "../api/client";
import { colors, radii, shadow } from "../theme";
import { Button, ErrorBanner, Input, Label, Text } from "../ui";

type Mode = "login" | "register" | "forgot";

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isLogin = mode === "login";

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (mode === "forgot") {
      if (!email.trim()) return setError("Enter the email for your account.");
      setBusy(true);
      try {
        const res = await mobileApi.post("/auth/forgot-password", { email: email.trim() });
        setNotice(
          res.data?.message || "If that email is registered, we've sent a link to reset your password."
        );
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!email.trim() || !password) return setError("Enter your email and password.");
    if (mode === "register") {
      if (!name.trim()) return setError("Enter a display name.");
      if (password.length < 6) return setError("Password must be at least 6 characters.");
    }
    setBusy(true);
    try {
      if (isLogin) await login(email, password);
      else await register(name, email, password);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <View style={s.brand}>
            <View style={s.logoTile}>
              <MaterialCommunityIcons name="flower" size={30} color={colors.white} />
            </View>
            <Text weight="black" style={s.brandTitle}>
              Bloom
            </Text>
            <Text style={s.brandSub}>
              {mode === "forgot"
                ? "Recover your account"
                : isLogin
                  ? "Welcome back!"
                  : "Join our community"}
            </Text>
          </View>

          <View style={s.card}>
            {notice ? (
              <View style={s.notice}>
                <Feather name="check-circle" size={16} color={colors.green} />
                <Text style={s.noticeText}>{notice}</Text>
              </View>
            ) : null}
            {error ? <ErrorBanner message={error} /> : null}

            <View style={{ gap: 15, marginTop: notice || error ? 14 : 0 }}>
              {mode === "register" ? (
                <View>
                  <Label>Display Name</Label>
                  <Input
                    value={name}
                    onChangeText={setName}
                    placeholder="How should we call you?"
                    autoCapitalize="words"
                    textContentType="name"
                  />
                </View>
              ) : null}

              <View>
                <Label>Email</Label>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  placeholder="hello@bloom.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
              </View>

              {mode !== "forgot" ? (
                <View>
                  <Label>Password</Label>
                  <Input
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry
                    textContentType={isLogin ? "password" : "newPassword"}
                    onSubmitEditing={submit}
                  />
                </View>
              ) : null}

              {isLogin ? (
                <TouchableOpacity onPress={() => switchMode("forgot")} style={{ alignSelf: "flex-end" }}>
                  <Text weight="semibold" style={s.link}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              ) : null}

              <Button
                label={mode === "forgot" ? (busy ? "Sending..." : "Send Reset Link") : isLogin ? "Sign In" : "Get Started"}
                onPress={submit}
                busy={busy}
                disabled={mode === "forgot" ? !email.trim() : !email.trim() || !password}
                style={{ marginTop: 4 }}
              />

              {mode === "forgot" ? (
                <TouchableOpacity onPress={() => switchMode("login")} style={{ alignItems: "center" }}>
                  <Text weight="semibold" style={s.link}>
                    ← Back to Sign In
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => switchMode(isLogin ? "register" : "login")}
                  style={{ alignItems: "center", marginTop: 4 }}
                >
                  <Text weight="semibold" style={s.link}>
                    {isLogin ? "New here? Create an account" : "Already have an account? Sign in"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={s.footer}>Small steps, big blooms.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primaryLight },
  body: { flexGrow: 1, justifyContent: "center", padding: 20, paddingVertical: 36 },
  brand: { alignItems: "center", marginBottom: 24 },
  logoTile: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "3deg" }],
    ...shadow,
  },
  brandTitle: { fontSize: 34, color: colors.text, letterSpacing: -1, marginTop: 14 },
  brandSub: { fontSize: 14, color: colors.subtle, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.slate100,
    ...shadow,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
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
  link: { color: colors.primary, fontSize: 13 },
  footer: { textAlign: "center", color: colors.subtle, fontSize: 12, marginTop: 22 },
});
