"use client"

import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react"

export type Rgb = { r: number; g: number; b: number }

type ThemeContextValue = {
	currentRgb: Rgb
	accentRgb: Rgb
	setCurrentRgb: (rgb: Rgb) => void
	setAccentRgb: (rgb: Rgb) => void
	resetTheme: () => void
}

const DEFAULT_RGB: Rgb = { r: 230, g: 57, b: 70 }
const STORAGE_KEY = "seezee_theme_rgb_v1"

const isValidRgb = (value: unknown): value is Rgb => {
	if (!value || typeof value !== "object") return false
	const maybe = value as Partial<Rgb>
	return (
		typeof maybe.r === "number" &&
		typeof maybe.g === "number" &&
		typeof maybe.b === "number" &&
		Number.isFinite(maybe.r) &&
		Number.isFinite(maybe.g) &&
		Number.isFinite(maybe.b)
	)
}

const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

const normalizeRgb = (rgb: Rgb): Rgb => ({
	r: clampByte(rgb.r),
	g: clampByte(rgb.g),
	b: clampByte(rgb.b),
})

const readStoredRgb = (): Rgb => {
	if (typeof window === "undefined") return DEFAULT_RGB
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY)
		if (!raw) return DEFAULT_RGB
		const parsed = JSON.parse(raw) as unknown
		if (!isValidRgb(parsed)) return DEFAULT_RGB
		return normalizeRgb(parsed)
	} catch {
		return DEFAULT_RGB
	}
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	// Initialize with DEFAULT_RGB to avoid hydration mismatch
	const [accentRgb, setAccentRgbState] = useState<Rgb>(DEFAULT_RGB)

	// Current is used for subtle background tinting; keep it aligned with accent for now.
	const [currentRgb, setCurrentRgbState] = useState<Rgb>(DEFAULT_RGB)

	// Load from localStorage on mount
	useEffect(() => {
		const stored = readStoredRgb()
		setAccentRgbState(stored)
		setCurrentRgbState(stored)
	}, [])

	const setAccentRgb = useCallback((rgb: Rgb) => {
		setAccentRgbState(normalizeRgb(rgb))
		setCurrentRgbState(normalizeRgb(rgb))
	}, [])

	const setCurrentRgb = useCallback((rgb: Rgb) => {
		setCurrentRgbState(normalizeRgb(rgb))
	}, [])

	const resetTheme = useCallback(() => {
		setAccentRgbState(DEFAULT_RGB)
		setCurrentRgbState(DEFAULT_RGB)
	}, [])

	useEffect(() => {
		if (typeof window === "undefined") return
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accentRgb))
		} catch {
			// ignore
		}

		// Expose accent as CSS variable for Tailwind v4 color tokens.
		const root = document.documentElement
		root.style.setProperty(
			"--seezee-accent",
			`${accentRgb.r} ${accentRgb.g} ${accentRgb.b}`
		)
	}, [accentRgb])

	const value = useMemo<ThemeContextValue>(
		() => ({
			currentRgb,
			accentRgb,
			setCurrentRgb,
			setAccentRgb,
			resetTheme,
		}),
		[currentRgb, accentRgb, setCurrentRgb, setAccentRgb, resetTheme]
	)

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
	const ctx = useContext(ThemeContext)
	if (!ctx) {
		throw new Error("useTheme must be used within ThemeProvider")
	}
	return ctx
}

