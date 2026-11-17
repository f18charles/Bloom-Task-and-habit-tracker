import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { User } from "../types";

const KEY_ENABLED = "bloom_bio_enabled";
const KEY_LOCK_ON_LAUNCH = "bloom_bio_lock_on_launch";
const KEY_SAVED_USER = "bloom_bio_user";
const KEY_SAVED_TOKEN = "bloom_bio_token";

export interface BiometricCapability {
  available: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  label: string;
  icon: "face-recognition" | "fingerprint" | "shield-lock-outline";
}

export interface BiometricSettings {
  enabled: boolean;
  requireOnLaunch: boolean;
  savedUser: User | null;
  hasVaultToken: boolean;
}

export async function getBiometricCapability(): Promise<BiometricCapability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
    const types = hasHardware
      ? await LocalAuthentication.supportedAuthenticationTypesAsync()
      : [];

    const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);

    let label = "Biometrics";
    let icon: BiometricCapability["icon"] = "shield-lock-outline";

    if (Platform.OS === "ios" && hasFace) {
      label = "Face ID";
      icon = "face-recognition";
    } else if (hasFingerprint) {
      label = Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
      icon = "fingerprint";
    } else if (hasFace) {
      label = "Face Unlock";
      icon = "face-recognition";
    }

    return {
      available: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      label,
      icon,
    };
  } catch {
    return {
      available: false,
      hasHardware: false,
      isEnrolled: false,
      label: "Biometrics",
      icon: "shield-lock-outline",
    };
  }
}

export async function getBiometricSettings(): Promise<BiometricSettings> {
  try {
    const [enabledRaw, lockRaw, userRaw, tokenRaw] = await Promise.all([
      SecureStore.getItemAsync(KEY_ENABLED),
      SecureStore.getItemAsync(KEY_LOCK_ON_LAUNCH),
      SecureStore.getItemAsync(KEY_SAVED_USER),
      SecureStore.getItemAsync(KEY_SAVED_TOKEN),
    ]);

    let savedUser: User | null = null;
    if (userRaw) {
      try {
        savedUser = JSON.parse(userRaw) as User;
      } catch {
        savedUser = null;
      }
    }

    return {
      enabled: enabledRaw === "1",
      requireOnLaunch: lockRaw !== "0",
      savedUser,
      hasVaultToken: Boolean(tokenRaw),
    };
  } catch {
    return {
      enabled: false,
      requireOnLaunch: true,
      savedUser: null,
      hasVaultToken: false,
    };
  }
}

export async function promptBiometric(
  promptMessage: string
): Promise<{ ok: boolean; cancelled?: boolean; error?: string }> {
  try {
    const cap = await getBiometricCapability();
    if (!cap.hasHardware) {
      return { ok: false, error: "This device does not support biometric hardware." };
    }
    if (!cap.isEnrolled) {
      return {
        ok: false,
        error: `No ${cap.label.toLowerCase()} enrolled in your phone's security settings.`,
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
      fallbackLabel: "Use Passcode",
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { ok: true };
    }

    const cancelled =
      result.error === "user_cancel" ||
      result.error === "app_cancel" ||
      result.error === "system_cancel";

    return {
      ok: false,
      cancelled,
      error: cancelled ? undefined : "Biometric verification failed. Please try again.",
    };
  } catch {
    return { ok: false, error: "Biometric authentication is unavailable right now." };
  }
}

export async function saveBiometricEnrollment(
  user: User,
  token: string,
  requireOnLaunch = true
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEY_ENABLED, "1"),
    SecureStore.setItemAsync(KEY_LOCK_ON_LAUNCH, requireOnLaunch ? "1" : "0"),
    SecureStore.setItemAsync(KEY_SAVED_USER, JSON.stringify(user)),
    SecureStore.setItemAsync(KEY_SAVED_TOKEN, token),
  ]);
}

export async function setBiometricRequireOnLaunch(requireOnLaunch: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEY_LOCK_ON_LAUNCH, requireOnLaunch ? "1" : "0");
}

export async function syncBiometricVaultOnLogin(user: User, token: string): Promise<void> {
  const current = await getBiometricSettings();
  if (!current.enabled) return;

  if (current.savedUser && current.savedUser.id !== user.id) {
    // Different user logged in with password; reset old biometric binding for safety.
    await clearBiometricEnrollment();
    return;
  }

  await Promise.all([
    SecureStore.setItemAsync(KEY_SAVED_USER, JSON.stringify(user)),
    SecureStore.setItemAsync(KEY_SAVED_TOKEN, token),
  ]);
}

export async function getBiometricVaultSession(): Promise<{ user: User; token: string } | null> {
  const [enabledRaw, userRaw, token] = await Promise.all([
    SecureStore.getItemAsync(KEY_ENABLED),
    SecureStore.getItemAsync(KEY_SAVED_USER),
    SecureStore.getItemAsync(KEY_SAVED_TOKEN),
  ]);
  if (enabledRaw !== "1" || !userRaw || !token) return null;
  try {
    const user = JSON.parse(userRaw) as User;
    if (!user?.id) return null;
    return { user, token };
  } catch {
    return null;
  }
}

export async function clearBiometricEnrollment(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_ENABLED),
    SecureStore.deleteItemAsync(KEY_LOCK_ON_LAUNCH),
    SecureStore.deleteItemAsync(KEY_SAVED_USER),
    SecureStore.deleteItemAsync(KEY_SAVED_TOKEN),
  ]);
}
