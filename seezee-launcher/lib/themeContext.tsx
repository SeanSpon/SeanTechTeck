"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export type Theme = "ps5" | "steam" | "epic" | "retro"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const themes = {
  ps5: {
    name: "PS5 Dark",
    primary: "#0070cc",
    secondary: "#2d7ae1",
    accent: "#00d9ff",
    background: "#0a0a0f",
    card: "rgba(255, 255, 255, 0.05)",
  },
  steam: {
    name: "Steam Blue",
    primary: "#1b2838",
    secondary: "#2a475e",
    accent: "#66c0f4",
    background: "#0a0e13",
    card: "rgba(27, 40, 56, 0.3)",
  },
  epic: {
    name: "Epic Dark",
    primary: "#121212",
    secondary: "#2a2a2a",
    accent: "#0078f2",
    background: "#0a0a0a",
    card: "rgba(42, 42, 42, 0.5)",
  },
  retro: {
    name: "Retro Neon",
    primary: "#1a1a2e",
    secondary: "#16213e",
    accent: "#39ff14",
    background: "#0f0f1e",
    card: "rgba(26, 26, 46, 0.6)",
  },
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("ps5")

  useEffect(() => {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem("seezee-theme") as Theme
    if (savedTheme && themes[savedTheme]) {
      setThemeState(savedTheme)
    }
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem("seezee-theme", newTheme)
    
    // Apply theme colors to CSS variables
    const themeColors = themes[newTheme]
    document.documentElement.style.setProperty("--theme-primary", themeColors.primary)
    document.documentElement.style.setProperty("--theme-secondary", themeColors.secondary)
    document.documentElement.style.setProperty("--theme-accent", themeColors.accent)
    document.documentElement.style.setProperty("--theme-background", themeColors.background)
    document.documentElement.style.setProperty("--theme-card", themeColors.card)
  }

  useEffect(() => {
    // Apply initial theme
    setTheme(theme)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
