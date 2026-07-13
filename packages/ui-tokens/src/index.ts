export const colors = {
  background: "#040814",
  backgroundAlt: "#0a1120",
  backgroundCanvas: "#10192c",
  surface: "#0f1729",
  surfaceAlt: "#162137",
  surfaceElevated: "#1a2741",
  surfaceStrong: "#21304e",
  stroke: "rgba(148, 163, 184, 0.18)",
  strokeStrong: "rgba(148, 163, 184, 0.32)",
  overlay: "rgba(4, 8, 20, 0.78)",
  primary: "#7c3aed",
  primaryStrong: "#6d28d9",
  primarySoft: "rgba(124, 58, 237, 0.18)",
  accent: "#22d3ee",
  accentSoft: "rgba(34, 211, 238, 0.16)",
  success: "#34d399",
  successSoft: "rgba(52, 211, 153, 0.16)",
  warning: "#f59e0b",
  warningSoft: "rgba(245, 158, 11, 0.16)",
  danger: "#fb7185",
  dangerSoft: "rgba(251, 113, 133, 0.16)",
  text: "#f8fbff",
  textMuted: "#b4c0d3",
  textSubtle: "#7f8ea8",
  textOnPrimary: "#f8fbff",
  glowPrimary: "rgba(124, 58, 237, 0.22)",
  glowAccent: "rgba(34, 211, 238, 0.18)",
  black: "#000000",
  white: "#ffffff",
  muted: "#94a3b8",
} as const;

export const gradients = {
  hero: [colors.backgroundCanvas, colors.backgroundAlt] as const,
  card: [colors.surfaceElevated, colors.surface] as const,
  accent: [colors.primary, colors.accent] as const,
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 40,
  "3xl": 56,
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const typography = {
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
} as const;

export const elevation = {
  card: {
    shadowColor: colors.black,
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  floating: {
    shadowColor: colors.black,
    shadowOpacity: 0.34,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
} as const;

export const motion = {
  quick: 180,
  base: 260,
  slow: 420,
} as const;
