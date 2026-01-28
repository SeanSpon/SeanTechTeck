"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import TopBar from "@/components/TopBar"
import ReactiveBackground from "@/components/ReactiveBackground"
import { useConnectionStore, GameItem } from "@/lib/connectionStore"

interface QuickAccessItem {
  id: string
  title: string
  icon: string
  type: 'app' | 'url'
  launchType?: string
  launchValue?: string
  url?: string
}

export default function Dashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalGames: 0,
    steamGames: 0,
    localApps: 0,
    tools: 0
  })
  const [quickAccess, setQuickAccess] = useState<QuickAccessItem[]>([])
  const { pcIpAddress, isConnected, fetchGames } = useConnectionStore()

  useEffect(() => {
    loadStats()
    loadQuickAccess()
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

  const loadQuickAccess = async () => {
    if (!pcIpAddress) return
    
    try {
      const response = await fetch(`http://${pcIpAddress}:5555/api/quick-access`)
      const data = await response.json()
      setQuickAccess(data.items || [])
    } catch (error) {
      console.error('Failed to load quick access:', error)
    }
  }

  const handleQuickLaunch = async (item: QuickAccessItem) => {
    if (!pcIpAddress) return
    
    try {
      const response = await fetch(`http://${pcIpAddress}:5555/api/launch-app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id })
      })
      
      const result = await response.json()
      if (result.success) {
        console.log(`✓ Launched ${item.title}`)
      } else {
        alert(`Failed to launch ${item.title}`)
      }
    } catch (error) {
      console.error('Launch failed:', error)
      alert(`Failed to launch ${item.title}`)
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-seezee-dark relative overflow-hidden">
      <ReactiveBackground />
      
      <TopBar />
      
      <main className="relative flex-1 flex flex-col items-center justify-center px-8 z-10">
        {/* Main Dashboard */}
        <div className="w-full max-w-5xl space-y-8 animate-fade-zoom-in">
          {/* Welcome Header */}
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-white mb-4 text-neon-glow">
              SeeZee Hub
            </h1>
            <p className="text-white/60 text-xl">
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </p>
          </div>

          {/* Quick Access Row */}
          {quickAccess.length > 0 && (
            <div className="mb-8">
              <h3 className="text-white/70 text-sm uppercase tracking-wider mb-3 px-2">Quick Access</h3>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {quickAccess.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleQuickLaunch(item)}
                    className="flex-shrink-0 glass rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105 min-w-[120px]"
                  >
                    <div className="text-4xl mb-2">{item.icon}</div>
                    <div className="text-white text-sm font-medium">{item.title}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="glass rounded-2xl p-6 border border-white/10 hover:bg-white/5 transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className="text-5xl font-bold text-seezee-red mb-2">
                {stats.totalGames}
              </div>
              <div className="text-white/60 text-sm uppercase tracking-wider">
                Total Items
              </div>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/10 hover:bg-white/5 transition-all duration-300 hover:scale-105 cursor-pointer"
                 onClick={() => router.push('/library')}>
              <div className="text-5xl font-bold text-seezee-red mb-2">
                {stats.steamGames}
              </div>
              <div className="text-white/60 text-sm uppercase tracking-wider">
                Steam Games
              </div>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/10 hover:bg-white/5 transition-all duration-300 hover:scale-105 cursor-pointer"
                 onClick={() => router.push('/library')}>
              <div className="text-5xl font-bold text-purple-400 mb-2">
                {stats.localApps}
              </div>
              <div className="text-white/60 text-sm uppercase tracking-wider">
                Local Apps
              </div>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/10 hover:bg-white/5 transition-all duration-300 hover:scale-105 cursor-pointer"
                 onClick={() => router.push('/library')}>
              <div className="text-5xl font-bold text-blue-400 mb-2">
                {stats.tools}
              </div>
              <div className="text-white/60 text-sm uppercase tracking-wider">
                Tools
              </div>
            </div>
          </div>

          {/* Main Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <button
              onClick={() => router.push('/library')}
              className="glass rounded-3xl p-10 border border-seezee-red/30 hover:bg-seezee-red/10 transition-all duration-300 hover:scale-105 text-left group"
            >
              <div className="text-6xl mb-4">🎮</div>
              <h2 className="text-3xl font-bold text-white mb-2 group-hover:text-neon-glow transition-all">
                Game Library
              </h2>
              <p className="text-white/60">
                Browse and launch all your games and applications
              </p>
            </button>

            <button
              onClick={() => router.push('/monitor')}
              className="glass rounded-3xl p-10 border border-blue-500/30 hover:bg-blue-500/10 transition-all duration-300 hover:scale-105 text-left group"
            >
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-3xl font-bold text-white mb-2 group-hover:text-neon-glow transition-all">
                System Monitor
              </h2>
              <p className="text-white/60">
                Real-time CPU, GPU, RAM stats for all your devices
              </p>
            </button>

            <button
              onClick={() => router.push('/settings')}
              className="glass rounded-3xl p-10 border border-white/10 hover:bg-white/5 transition-all duration-300 hover:scale-105 text-left group"
            >
              <div className="text-6xl mb-4">⚙️</div>
              <h2 className="text-3xl font-bold text-white mb-2 group-hover:text-neon-glow transition-all">
                Settings
              </h2>
              <p className="text-white/60">
                Configure connection and customize your launcher
              </p>
            </button>
          </div>
        </div>
      </main>

      <footer className="relative px-8 py-6 text-center text-white/30 text-sm z-10">
        Tap any card to navigate • Touch and drag to scroll
      </footer>
    </div>
  )
}
