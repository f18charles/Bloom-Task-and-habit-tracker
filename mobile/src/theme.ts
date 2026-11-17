export const colors = {
  bg: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  primary: "#1e293b",
  primaryLight: "#f1f5f9",
  primarySoft: "#1e293b14",
  green: "#10b981",
  greenLight: "#ecfdf5",
  greenSoft: "#d1fae5",
  darkGreen: "#064e3b",
  emeraldCard: "#065f46",
  purple: "#4f46e5",
  text: "#1e293b",
  body: "#4a4a4a",
  muted: "#64748b",
  subtle: "#94a3b8",
  faint: "#cbd5e1",
  white: "#ffffff",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1e293b",
  slate900: "#0f172a",
  danger: "#ef4444",
  dangerBg: "#fef2f2",
  warning: "#f97316",
  warningBg: "#fff7ed",
  info: "#3b82f6",
  infoBg: "#eff6ff",
  success: "#10b981",
  successBg: "#ecfdf5",
  sky: "#0ea5e9",
  skyLight: "#e0f2fe",
};

export const priority = {
  LOW: { color: "#3b82f6", bg: "#eff6ff" },
  MEDIUM: { color: "#f97316", bg: "#fff7ed" },
  HIGH: { color: "#ef4444", bg: "#fef2f2" },
  URGENT: { color: "#dc2626", bg: "#fef2f2" },
} as const;

export const statusMeta = {
  TODO: { label: "To Do", color: "#94a3b8", bg: "#f1f5f9", text: "#475569" },
  IN_PROGRESS: { label: "In Progress", color: "#1e293b", bg: "#1e293b14", text: "#1e293b" },
  DONE: { label: "Done", color: "#10b981", bg: "#ecfdf5", text: "#064e3b" },
} as const;

export const fonts = {
  regular: "Outfit_400Regular",
  medium: "Outfit_500Medium",
  semibold: "Outfit_600SemiBold",
  bold: "Outfit_700Bold",
  black: "Outfit_800ExtraBold",
} as const;

export type FontWeight = keyof typeof fonts;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

export const shadow = {
  shadowColor: "#0f172a",
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
