"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import TopBar from "@/components/TopBar"
import ReactiveBackground from "@/components/ReactiveBackground"
import { useConnectionStore } from "@/lib/connectionStore"

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
  const [stats, setStats] = useState({
    totalGames: 0,
    steamGames: 0,
    localApps: 0
  })
  const { pcIpAddress, isConnected, fetchGames } = useConnectionStore()

  useEffect(() => {
    loadStats()
  }, [pcIpAddress])

  const loadStats = async () => {
    if (!pcIpAddress) return
    
    try {
      const games = await fetchGames()
      setStats({
        totalGames: games.length,
        steamGames: games.filter(g => g.source === 'steam').length,
        localApps: games.filter(g => g.source === 'local').length
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  // Action tile configurations
  const actionTiles = [
    {
      id: 'library',
      emoji: '🎮',
      label: 'Library',
      subtitle: `${stats.totalGames} games`,
      color: 'red',
      onClick: () => router.push('/library')
    },
    {
      id: 'lighting',
      emoji: '💡',
      label: 'Lights',
      subtitle: 'RGB themes',
      color: 'purple',
      onClick: () => router.push('/lighting')
    },
    {
      id: 'monitor',
      emoji: '📊',
      label: 'Monitor',
      subtitle: 'System stats',
      color: 'blue',
      onClick: () => router.push('/monitor')
    },
    {
      id: 'apps',
      emoji: '📁',
      label: 'Apps',
      subtitle: `${stats.localApps} items`,
      color: 'green',
      onClick: () => router.push('/library?filter=local')
    },
    {
      id: 'browser',
      emoji: '🌐',
      label: 'Browser',
      subtitle: 'Quick web',
      color: 'cyan',
      onClick: () => {
        if (typeof window !== 'undefined') {
          window.open('https://google.com', '_blank')
        }
      }
    },
    {
      id: 'settings',
      emoji: '⚙️',
      label: 'Settings',
      subtitle: 'Configure',
      color: 'white',
      onClick: () => router.push('/settings')
    }
  ]

  const colorStyles: { [key: string]: string } = {
    red: 'border-seezee-red/30 hover:border-seezee-red hover:bg-seezee-red/10 hover:shadow-[0_0_30px_rgba(230,57,70,0.4)]',
    purple: 'border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/10 hover:shadow-[0_0_30px_rgba(138,43,226,0.4)]',
    blue: 'border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/10 hover:shadow-[0_0_30px_rgba(0,102,255,0.4)]',
    green: 'border-green-500/30 hover:border-green-500 hover:bg-green-500/10 hover:shadow-[0_0_30px_rgba(57,255,20,0.4)]',
    cyan: 'border-cyan-500/30 hover:border-cyan-500 hover:bg-cyan-500/10 hover:shadow-[0_0_30px_rgba(0,229,255,0.4)]',
    white: 'border-white/20 hover:border-white/50 hover:bg-white/5 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]'
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-seezee-dark relative">
      <ReactiveBackground />
      
      <TopBar />
      
      {/* Main launcher hub - NO SCROLLING */}
      <main className="relative flex-1 flex items-center justify-center z-10 p-8">
        <div className="w-full max-w-6xl">
          {/* Connection Status */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4" style={{
              textShadow: '0 0 30px rgba(230, 57, 70, 0.6), 0 0 60px rgba(230, 57, 70, 0.3)'
            }}>
              SEEZEE HUB
            </h1>
            <div className="flex items-center justify-center gap-3 text-white/60">
              <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.6)]' : 'bg-red-400'}`} />
              <span className="text-lg">
                {isConnected ? `Connected • ${stats.totalGames} items ready` : 'Offline'}
              </span>
            </div>
          </div>

          {/* 6 Big Action Tiles - 3x2 Grid */}
          <div className="grid grid-cols-3 gap-6">
            {actionTiles.map((tile) => (
              <button
                key={tile.id}
                onClick={tile.onClick}
                className={`
                  relative rounded-3xl p-10 border-2 transition-all duration-300
                  backdrop-blur-md bg-black/40
                  active:scale-95 touch-manipulation
                  ${colorStyles[tile.color]}
                `}
                style={{ minHeight: '200px' }}
              >
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="text-7xl" style={{
                    filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))'
                  }}>
                    {tile.emoji}
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1">
                      {tile.label}
                    </div>
                    <div className="text-sm text-white/50">
                      {tile.subtitle}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}