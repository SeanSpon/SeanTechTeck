"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import TopBar from "@/components/TopBar"
import ReactiveBackground from "@/components/ReactiveBackground"
import { useConnectionStore } from "@/lib/connectionStore"
import { useTheme, themes as uiThemes } from "@/lib/themeContext"

interface Theme {
  name: string
  rgb: { r: number; g: number; b: number }
  brightness: number
}

interface Game {
  id: string
  title: string
  source: string
  coverImage?: string
  steamAppId?: string
  execPath?: string
}

export default function Dashboard() {
  const router = useRouter()
  const { theme: selectedUiTheme, setTheme: setUiTheme } = useTheme()
  const [stats, setStats] = useState({
    totalGames: 0,
    steamGames: 0,
    localApps: 0,
    tools: 0
  })
  const [recentGames, setRecentGames] = useState<Game[]>([])
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(null)
  const [themeLoading, setThemeLoading] = useState(false)
  const { pcIpAddress, isConnected, fetchGames, launchGame } = useConnectionStore()

  useEffect(() => {
    loadStats()
    loadCurrentTheme()
    loadRecentGames()
  }, [pcIpAddress])

  const loadStats = async () => {
    if (!pcIpAddress) return
    
    try {
      const games = await fetchGames()
      setStats({
        totalGames: games.length,
        steamGames: games.filter(g => g.source === 'steam').length,
        localApps: games.filter(g => g.source === 'local').length,
        tools: games.filter(g => g.source === 'tool').length
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const loadRecentGames = async () => {
    if (!pcIpAddress) return
    
    try {
      // Get recently launched games from localStorage
      const recentIds = JSON.parse(localStorage.getItem('recentGames') || '[]')
      if (recentIds.length === 0) return
      
      const allGames = await fetchGames()
      const recent = recentIds
        .map((id: string) => allGames.find((g: Game) => g.id === id))
        .filter(Boolean)
        .slice(0, 6)
      
      setRecentGames(recent)
    } catch (error) {
      console.error('Failed to load recent games:', error)
    }
  }

  const handleLaunchGame = async (game: Game) => {
    try {
      await launchGame(game)
      
      // Update recent games
      const recentIds = JSON.parse(localStorage.getItem('recentGames') || '[]')
      const updated = [game.id, ...recentIds.filter((id: string) => id !== game.id)].slice(0, 10)
      localStorage.setItem('recentGames', JSON.stringify(updated))
      
      await loadRecentGames()
    } catch (error) {
      console.error('Failed to launch game:', error)
    }
  }

  const loadCurrentTheme = async () => {
    if (!pcIpAddress) return
    
    try {
      const response = await fetch(`http://${pcIpAddress}:5555/api/theme/current`)
      if (response.ok) {
        const data = await response.json()
        setCurrentTheme(data.theme)
      }
    } catch (error) {
      console.error('Failed to load theme:', error)
    }
  }

  const applyTheme = async (name: string, rgb: { r: number; g: number; b: number }) => {
    if (!pcIpAddress) return
    setThemeLoading(true)
    
    try {
      const response = await fetch(`http://${pcIpAddress}:5555/api/theme/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rgb })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Theme applied:', data)
        await loadCurrentTheme()
      }
    } catch (error) {
      console.error('Failed to apply theme:', error)
    } finally {
      setThemeLoading(false)
    }
  }

  const applyUiTheme = (themeName: string) => {
    // Map theme names to UI theme keys
    const themeMap: { [key: string]: keyof typeof uiThemes } = {
      'PS5 Dark': 'ps5',
      'Steam Blue': 'steam',
      'Epic Dark': 'epic',
      'Retro Neon': 'retro'
    }
    
    const uiThemeKey = themeMap[themeName]
    if (uiThemeKey) {
      setUiTheme(uiThemeKey)
    }
  }

  const syncThemeWithRgb = async (themeName: string, rgb: { r: number; g: number; b: number }) => {
    // Apply to RGB lighting
    await applyTheme(themeName, rgb)
    // Apply to UI theme
    applyUiTheme(themeName)
  }

  const themes = [
    { name: 'Gaming Red', rgb: { r: 255, g: 30, b: 30 }, emoji: '🔴', label: 'Gaming' },
    { name: 'Chill Blue', rgb: { r: 30, g: 144, b: 255 }, emoji: '🔵', label: 'Chill' },
    { name: 'Movie Purple', rgb: { r: 138, g: 43, b: 226 }, emoji: '🟣', label: 'Movie' },
    { name: 'Sunset Orange', rgb: { r: 255, g: 120, b: 0 }, emoji: '🟠', label: 'Sunset' },
    { name: 'Mint Green', rgb: { r: 50, g: 205, b: 50 }, emoji: '🟢', label: 'Mint' },
  ]

  const uiThemeOptions = [
    { key: 'ps5' as const, name: 'PS5 Dark', emoji: '🎮', rgb: uiThemes.ps5.rgb },
    { key: 'steam' as const, name: 'Steam Blue', emoji: '💨', rgb: uiThemes.steam.rgb },
    { key: 'epic' as const, name: 'Epic Dark', emoji: '⚡', rgb: uiThemes.epic.rgb },
    { key: 'retro' as const, name: 'Retro Neon', emoji: '🌈', rgb: uiThemes.retro.rgb },
  ]

  return (
    <div className="h-screen w-screen flex flex-col bg-seezee-dark relative overflow-hidden">
      <ReactiveBackground />
      
      <TopBar />
      
      <main className="relative flex-1 flex flex-col px-6 py-6 z-10 overflow-y-auto touch-scroll">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          {/* Header with Status */}
          <div className="mb-2">
            <h1 className="text-4xl font-bold text-white text-neon-glow">
              Dashboard
            </h1>
            <p className="text-white/50 text-sm mt-2 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {isConnected ? 'Connected' : 'Offline'} • {stats.totalGames} items
            </p>
          </div>

          {/* Stats Overview - Top */}
          <div className="grid grid-cols-4 gap-4">
            <div className="glass rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all">
              <div className="text-sm text-white/50 mb-1">Total</div>
              <div className="text-3xl font-bold text-white">
                {stats.totalGames}
              </div>
            </div>
            <div className="glass rounded-2xl p-4 border border-blue-400/20 hover:border-blue-400/40 transition-all">
              <div className="text-sm text-blue-300/70 mb-1">Steam</div>
              <div className="text-3xl font-bold text-blue-400">
                {stats.steamGames}
              </div>
            </div>
            <div className="glass rounded-2xl p-4 border border-green-400/20 hover:border-green-400/40 transition-all">
              <div className="text-sm text-green-300/70 mb-1">Local</div>
              <div className="text-3xl font-bold text-green-400">
                {stats.localApps}
              </div>
            </div>
            <div className="glass rounded-2xl p-4 border border-purple-400/20 hover:border-purple-400/40 transition-all">
              <div className="text-sm text-purple-300/70 mb-1">Tools</div>
              <div className="text-3xl font-bold text-purple-400">
                {stats.tools}
              </div>
            </div>
          </div>

          {/* Main Content - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column - Themes (3/5 width) */}
            <div className="lg:col-span-3 space-y-6">
              {/* UI Theme Selector */}
              <div className="glass rounded-2xl p-6 border border-purple-500/30 hover:border-purple-500/50 transition-all">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-white text-xl font-bold flex items-center gap-2">
                    <span className="text-2xl">🎨</span> UI Theme
                  </h2>
                  <span className="text-white/60 text-sm px-3 py-1 rounded-lg glass border border-white/10">
                    {uiThemes[selectedUiTheme].name}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {uiThemeOptions.map((themeOption) => (
                    <button
                      key={themeOption.key}
                      onClick={async () => {
                        setUiTheme(themeOption.key)
                        if (pcIpAddress) {
                          await applyTheme(themeOption.name, themeOption.rgb)
                        }
                      }}
                      className={`glass rounded-xl p-5 border transition-all duration-300 ${
                        selectedUiTheme === themeOption.key
                          ? 'border-white/60 bg-white/15 scale-105 ring-2 ring-white/30'
                          : 'border-white/10 hover:bg-white/5 hover:border-white/20'
                      }`}
                      style={{
                        boxShadow: selectedUiTheme === themeOption.key 
                          ? `0 0 25px rgba(${themeOption.rgb.r}, ${themeOption.rgb.g}, ${themeOption.rgb.b}, 0.5)` 
                          : 'none'
                      }}
                    >
                      <div className="text-4xl mb-3">{themeOption.emoji}</div>
                      <div className="text-white text-base font-semibold mb-2">
                        {themeOption.name}
                      </div>
                      <div 
                        className="w-full h-3 rounded-full"
                        style={{ 
                          backgroundColor: `rgb(${themeOption.rgb.r}, ${themeOption.rgb.g}, ${themeOption.rgb.b})`,
                          boxShadow: `0 0 12px rgba(${themeOption.rgb.r}, ${themeOption.rgb.g}, ${themeOption.rgb.b}, 0.6)`
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* RGB Lighting Control */}
              <div className="glass rounded-2xl p-6 border border-seezee-red/30 hover:border-seezee-red/50 transition-all">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-white text-xl font-bold flex items-center gap-2">
                    <span className="text-2xl">💡</span> RGB Lighting
                  </h2>
                  <div className="flex items-center gap-2">
                    {currentTheme && (
                      <span 
                        className="w-6 h-6 rounded-full border-2 border-white/40 shadow-xl"
                        style={{
                          backgroundColor: `rgb(${currentTheme.rgb.r}, ${currentTheme.rgb.g}, ${currentTheme.rgb.b})`,
                          boxShadow: `0 0 20px rgba(${currentTheme.rgb.r}, ${currentTheme.rgb.g}, ${currentTheme.rgb.b}, 0.7)`
                        }}
                      />
                    )}
                    <span className="text-white/60 text-sm">
                      {currentTheme?.name || 'None'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {themes.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => applyTheme(theme.name, theme.rgb)}
                      disabled={themeLoading}
                      className={`glass rounded-xl p-4 border transition-all duration-300 hover:scale-110 ${
                        currentTheme?.name === theme.name
                          ? 'border-white/50 bg-white/15 scale-105 ring-2 ring-white/20'
                          : 'border-white/10 hover:bg-white/5 hover:border-white/25'
                      } ${themeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{
                        boxShadow: currentTheme?.name === theme.name 
                          ? `0 0 25px rgba(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b}, 0.5)` 
                          : 'none'
                      }}
                    >
                      <div className="text-3xl mb-2">{theme.emoji}</div>
                      <div className="text-white text-xs font-medium mb-2">
                        {theme.label}
                      </div>
                      <div 
                        className="w-full h-2 rounded-full"
                        style={{ 
                          backgroundColor: `rgb(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b})`,
                          boxShadow: `0 0 8px rgba(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b}, 0.5)`
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Quick Actions (2/5 width) */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-white text-xl font-bold flex items-center gap-2 mb-2">
                <span className="text-2xl">⚡</span> Quick Actions
              </h2>
              
              <button
                onClick={() => router.push('/library')}
                className="w-full glass rounded-xl p-5 border border-white/10 hover:border-seezee-red/40 hover:bg-seezee-red/10 transition-all group"
              >
                <div className="text-4xl mb-3">🎮</div>
                <div className="text-white font-bold text-lg group-hover:text-seezee-red transition-colors mb-1">
                  Games
                </div>
                <div className="text-white/50 text-sm">
                  {stats.steamGames + stats.localApps} available
                </div>
              </button>

              <button
                onClick={() => router.push('/monitor')}
                className="w-full glass rounded-xl p-5 border border-white/10 hover:border-blue-400/40 hover:bg-blue-500/10 transition-all group"
              >
                <div className="text-4xl mb-3">📊</div>
                <div className="text-white font-bold text-lg group-hover:text-blue-400 transition-colors mb-1">
                  Monitor
                </div>
                <div className="text-white/50 text-sm">
                  System stats
                </div>
              </button>

              <button
                onClick={async () => {
                  if (!pcIpAddress) return
                  try {
                    const response = await fetch(`http://${pcIpAddress}:5555/api/lighting/sync`, {
                      method: 'POST'
                    })
                    if (response.ok) {
                      await loadCurrentTheme()
                    }
                  } catch (error) {
                    console.error('Sync failed:', error)
                  }
                }}
                className="w-full glass rounded-xl p-5 border border-white/10 hover:border-purple-400/40 hover:bg-purple-500/10 transition-all group"
              >
                <div className="text-4xl mb-3">🔄</div>
                <div className="text-white font-bold text-lg group-hover:text-purple-400 transition-colors mb-1">
                  Sync RGB
                </div>
                <div className="text-white/50 text-sm">
                  Force update
                </div>
              </button>

              <button
                onClick={() => router.push('/settings')}
                className="w-full glass rounded-xl p-5 border border-white/10 hover:border-white/25 hover:bg-white/5 transition-all group"
              >
                <div className="text-4xl mb-3">⚙️</div>
                <div className="text-white font-bold text-lg group-hover:text-white transition-colors mb-1">
                  Settings
                </div>
                <div className="text-white/50 text-sm">
                  Configure
                </div>
              </button>
            </div>
          </div>

          {/* Recently Played - Full Width */}
          {recentGames.length > 0 && (
            <div className="glass rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white text-xl font-bold flex items-center gap-2">
                  <span className="text-2xl">🕐</span> Recently Played
                </h2>
                <button
                  onClick={() => {
                    localStorage.removeItem('recentGames')
                    loadRecentGames()
                  }}
                  className="text-white/50 hover:text-white/80 text-sm transition-colors px-3 py-1 rounded-lg hover:bg-white/5"
                >
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {recentGames.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleLaunchGame(game)}
                    className="glass rounded-xl p-3 border border-white/10 hover:border-seezee-red/50 hover:bg-seezee-red/10 hover:scale-105 transition-all duration-300 group"
                  >
                    {game.coverImage ? (
                      <img
                        src={game.coverImage}
                        alt={game.title}
                        className="w-full aspect-[3/4] object-cover rounded-lg mb-2"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-gradient-to-br from-seezee-red/20 to-purple-500/20 rounded-lg mb-2 flex items-center justify-center">
                        <span className="text-4xl">🎮</span>
                      </div>
                    )}
                    <div className="text-white text-xs font-medium line-clamp-2 group-hover:text-seezee-red transition-colors">
                      {game.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}