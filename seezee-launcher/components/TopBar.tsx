"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useTheme, themes } from "@/lib/themeContext"
import { useConnectionStore } from "@/lib/connectionStore"

interface TopBarProps {
  onOpenSettings?: () => void
}

export default function TopBar({ onOpenSettings }: TopBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [time, setTime] = useState<string>("")
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const { theme, setTheme } = useTheme()
  const { isConnected } = useConnectionStore()

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="relative flex items-center justify-between px-8 py-4 backdrop-blur-md border-b border-white/5 glass animate-slide-in-up">
      {/* Logo / Title */}
      <div className="relative flex items-center gap-6 animate-fade-zoom-in">
        <button 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-glow-sm">
            <img 
              src="/seezee-logo.png" 
              alt="SeeZee Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-white font-bold text-2xl tracking-tight">
            SeeZee<span className="text-seezee-red">Launcher</span>
          </h1>
        </button>

        {/* Navigation */}
        <nav className="flex gap-2 ml-6">
          <button
            onClick={() => router.push('/dashboard')}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all duration-300
              ${pathname === '/dashboard' 
                ? 'bg-seezee-red text-white shadow-glow-sm' 
                : 'text-white/60 hover:text-white hover:bg-white/5'}
            `}
          >
            Home
          </button>
          <button
            onClick={() => router.push('/library')}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all duration-300
              ${pathname === '/library' 
                ? 'bg-seezee-red text-white shadow-glow-sm' 
                : 'text-white/60 hover:text-white hover:bg-white/5'}
            `}
          >
            Library
          </button>
        </nav>
      </div>

      {/* Status indicators */}
      <div className="relative flex items-center gap-6 animate-fade-zoom-in stagger-2">
        {/* Connection Status */}
        <button
          onClick={() => router.push('/settings')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
        >
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-seezee-red animate-pulse' : 'bg-white/30'}`} />
          <span className="text-white/70 text-sm">
            {isConnected ? 'Connected' : 'Not Connected'}
          </span>
        </button>

        {/* Time */}
        <span className="text-white/70 font-mono text-lg">{time}</span>

        {/* Theme Selector */}
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="
              w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10
              flex items-center justify-center
              transition-all duration-300
              focus:outline-none focus-visible:ring-2 focus-visible:ring-seezee-red
              hover:shadow-glow-sm hover:scale-105
            "
            aria-label="Change theme"
          >
            <svg
              className="w-6 h-6 text-white/70 transition-transform duration-300"
              style={{ transform: showThemeMenu ? "rotate(180deg)" : "rotate(0)" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
          </button>

          {/* Theme Menu */}
          {showThemeMenu && (
            <div className="absolute right-0 top-14 w-56 p-2 rounded-xl glass border border-white/10 shadow-glow-accent animate-bounce-in z-50">
              <div className="text-white/50 text-xs uppercase tracking-wide px-3 py-2">Select Theme</div>
              {Object.entries(themes).map(([key, themeData]) => (
                <button
                  key={key}
                  onClick={() => {
                    setTheme(key as any)
                    setShowThemeMenu(false)
                  }}
                  className={`
                    w-full px-3 py-2.5 rounded-lg text-left
                    transition-all duration-200
                    flex items-center gap-3
                    ${theme === key 
                      ? "bg-white/10 text-white" 
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                    }
                  `}
                >
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ background: themeData.accent }}
                  />
                  <span className="font-medium">{themeData.name}</span>
                  {theme === key && (
                    <svg className="w-4 h-4 ml-auto text-seezee-red" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
