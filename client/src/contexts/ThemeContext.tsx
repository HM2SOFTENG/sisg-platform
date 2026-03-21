import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "sentinel";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

const THEME_STORAGE_KEY = "sisg_theme";

// CSS variables for each theme
const themeVariables: Record<Theme, Record<string, string>> = {
  dark: {
    "--bg-primary": "#0b0f1a",
    "--bg-secondary": "#151b2b",
    "--bg-card": "#1a212f",
    "--text-primary": "#ffffff",
    "--text-secondary": "#d1d5db",
    "--text-muted": "#6b7280",
    "--border-color": "rgba(255, 255, 255, 0.15)",
    "--border-subtle": "rgba(255, 255, 255, 0.05)",
    "--accent-primary": "#0066ff",
    "--accent-success": "#00e5a0",
    "--accent-warning": "#ffb800",
    "--accent-error": "#ff6b35",
  },
  light: {
    "--bg-primary": "#ffffff",
    "--bg-secondary": "#f9fafb",
    "--bg-card": "#f3f4f6",
    "--text-primary": "#111827",
    "--text-secondary": "#374151",
    "--text-muted": "#9ca3af",
    "--border-color": "rgba(0, 0, 0, 0.1)",
    "--border-subtle": "rgba(0, 0, 0, 0.05)",
    "--accent-primary": "#0066ff",
    "--accent-success": "#10b981",
    "--accent-warning": "#f59e0b",
    "--accent-error": "#ef4444",
  },
  sentinel: {
    "--bg-primary": "oklch(0.07 0.025 255)",
    "--bg-secondary": "oklch(0.085 0.025 255)",
    "--bg-card": "oklch(0.1 0.025 255)",
    "--text-primary": "#ffffff",
    "--text-secondary": "#d1d5db",
    "--text-muted": "#6b7280",
    "--border-color": "rgba(255, 255, 255, 0.15)",
    "--border-subtle": "rgba(255, 255, 255, 0.05)",
    "--accent-primary": "#0066ff",
    "--accent-success": "#00e5a0",
    "--accent-warning": "#ffb800",
    "--accent-error": "#ff6b35",
  },
};

export function ThemeProvider({
  children,
  defaultTheme = "sentinel",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return (stored as Theme) || defaultTheme;
  });

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;

    // Remove old theme class
    root.classList.remove("dark", "light", "sentinel");
    // Add new theme class
    root.classList.add(theme);

    // Apply CSS variables
    const variables = themeVariables[theme];
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Save to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => (prev === "light" ? "dark" : "light"));
  };

  const cycleTheme = () => {
    setThemeState(prev => {
      switch (prev) {
        case "dark":
          return "light";
        case "light":
          return "sentinel";
        case "sentinel":
          return "dark";
      }
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
