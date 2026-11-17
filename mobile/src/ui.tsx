import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text as RNText,
  TextInput,
  TextInputProps,
  TextProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, FontWeight, fonts, priority, radii, shadow, statusMeta } from "./theme";
import { Priority, Status } from "./types";

export function Text({
  weight = "regular",
  style,
  ...rest
}: TextProps & { weight?: FontWeight }) {
  return <RNText {...rest} style={[{ fontFamily: fonts[weight], color: colors.body }, style]} />;
}

export function Screen({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View style={s.logoTile}>
          <MaterialCommunityIcons name="flower" size={20} color={colors.darkGreen} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="bold" style={s.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={s.headerSub} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={{ marginLeft: 10 }}>{right}</View> : null}
      </View>
      {children}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";

export function Button({
  label,
  onPress,
  busy,
  disabled,
  variant = "primary",
  icon,
  small,
  style,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  icon?: React.ReactNode;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "secondary"
        ? colors.green
        : variant === "danger"
          ? colors.dangerBg
          : "transparent";
  const border = variant === "outline" ? colors.border : "transparent";
  const fg =
    variant === "primary"
      ? colors.white
      : variant === "secondary"
        ? colors.darkGreen
        : variant === "danger"
          ? colors.danger
          : colors.primary;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={busy || disabled}
      activeOpacity={0.85}
      style={[
        s.btn,
        small && s.btnSmall,
        { backgroundColor: bg, borderColor: border, borderWidth: variant === "outline" ? 1 : 0 },
        variant === "ghost" && { paddingHorizontal: 12 },
        (busy || disabled) && { opacity: 0.45 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={s.btnInner}>
          {icon}
          <Text weight="semibold" style={[s.btnText, small && { fontSize: 13 }, { color: fg }]}>
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  style,
}: {
  icon: React.ReactNode;
  onPress: () => void;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.6 }, style]}
    >
      {icon}
    </Pressable>
  );
}

export function Input({ style, ...rest }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.subtle}
      {...rest}
      style={[s.input, style]}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text weight="semibold" style={s.label}>
      {children}
    </Text>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  activeColor = colors.primary,
  activeTextColor = colors.white,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  activeColor?: string;
  activeTextColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        s.chip,
        selected && { backgroundColor: activeColor, borderColor: activeColor },
        style,
      ]}
    >
      <Text
        weight={selected ? "bold" : "semibold"}
        style={[s.chipText, selected && { color: activeTextColor }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function PriorityBadge({ value }: { value: Priority }) {
  const meta = priority[value];
  return (
    <View style={[s.badge, { backgroundColor: meta.bg }]}>
      <Text weight="black" style={[s.badgeText, { color: meta.color }]}>
        {value}
      </Text>
    </View>
  );
}

export function StatusBadge({ value }: { value: Status }) {
  const meta = statusMeta[value];
  return (
    <View style={[s.badge, { backgroundColor: meta.bg }]}>
      <Text weight="black" style={[s.badgeText, { color: meta.text }]}>
        {meta.label.toUpperCase()}
      </Text>
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  right,
  compact,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="black" style={[s.sectionTitle, compact && s.sectionTitleCompact]}>
          {title}
        </Text>
        {subtitle ? <Text style={s.sectionSub}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={{ marginLeft: 10 }}>{right}</View> : null}
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.error}>
      <Text style={s.errorText}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry} accessibilityRole="button">
          <Text weight="bold" style={s.retry}>
            Retry
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card style={s.emptyCard}>
      <View style={s.emptyIcon}>{icon}</View>
      <Text weight="black" style={s.emptyTitle}>
        {title}
      </Text>
      <Text style={s.emptyMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: 16 }} />
      ) : null}
    </Card>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View
      style={[
        s.avatar,
        { width: size, height: size, borderRadius: size / 2.6, backgroundColor: colors.primary },
      ]}
    >
      <Text weight="black" style={{ color: colors.white, fontSize: size * 0.42 }}>
        {(name || "U").trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export function ProgressBar({
  value,
  color = colors.primary,
  style,
}: {
  value: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[s.progressTrack, style]}>
      <View
        style={[
          s.progressFill,
          { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[s.divider, style]} />;
}

export function Loading({ text }: { text?: string }) {
  return (
    <View style={s.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      {text ? <Text style={{ marginTop: 10, color: colors.muted }}>{text}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 10,
  },
  logoTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  headerTitle: { fontSize: 19, color: colors.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  btn: {
    borderRadius: radii.lg,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
  btnSmall: { paddingVertical: 9, paddingHorizontal: 14, minHeight: 38 },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 7 },
  btnText: { fontSize: 15 },
  iconBtn: { padding: 6, alignItems: "center", justifyContent: "center" },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  label: { fontSize: 13, color: colors.slate600, marginBottom: 7 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  chipText: { fontSize: 12, color: colors.slate500 },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 9, letterSpacing: 0.6 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: { fontSize: 25, color: colors.text, letterSpacing: -0.6 },
  sectionTitleCompact: { fontSize: 18, letterSpacing: -0.3 },
  sectionSub: { fontSize: 13, color: colors.subtle, marginTop: 2 },
  error: {
    backgroundColor: colors.dangerBg,
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: { color: colors.danger, flex: 1, fontSize: 13 },
  retry: { color: colors.primary, marginLeft: 12, fontSize: 13 },
  emptyCard: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 24 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 19, color: colors.text, textAlign: "center" },
  emptyMessage: {
    fontSize: 13,
    color: colors.subtle,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  avatar: { alignItems: "center", justifyContent: "center" },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.slate100,
    overflow: "hidden",
  },
  progressFill: { height: 7, borderRadius: 999 },
  divider: { height: 1, backgroundColor: colors.slate100 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
});
