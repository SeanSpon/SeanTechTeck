"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import TopBar from "@/components/TopBar"
import GameGrid from "@/components/GameGrid"
import ReactiveBackground from "@/components/ReactiveBackground"
import EmptyGameLibrary from "@/components/EmptyGameLibrary"
import { mockGames, Game, apiGameToGame } from "@/lib/mockGames"
import { useConnectionStore, GameItem } from "@/lib/connectionStore"

export default function Library() {
  const router = useRouter()
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'steam' | 'local' | 'tool'>('all')
  
  const { 
    pcIpAddress, 
    isConnected, 
    fetchGames, 
    launchGame,
    setConnected 
  } = useConnectionStore()

  // Fetch games from server
  const loadGames = useCallback(async () => {
    if (!pcIpAddress) {
      setGames([])
      return
    }

    setIsLoading(true)
    try {
      const apiGames = await fetchGames()
      const convertedGames = apiGames.map(apiGameToGame)
      setGames(convertedGames)
      setConnected(true)
    } catch (error) {
      console.error('Failed to load games:', error)
      setGames([])
      setConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [pcIpAddress, fetchGames, setConnected])

  useEffect(() => {
    loadGames()
  }, [loadGames])

  const handlePlayGame = async (game: Game) => {
    console.log(`Launching: ${game.name}`)
    
    if (!isConnected) {
      alert(`Cannot launch game - not connected to PC server.\n\nGo to Settings to configure connection.`)
      return
    }

    const gameItem: GameItem = {
      id: game.id,
      title: game.name,
      source: game.source,
      steamAppId: game.steamAppId,
      execPath: game.execPath
    }

    const success = await launchGame(gameItem)
    
    if (success) {
      console.log(`✓ Launched ${game.name}`)
    } else {
      alert(`Failed to launch ${game.name}\n\nCheck the PC server console for errors.`)
    }
  }

  // Filter games
  const filteredGames = filter === 'all' 
    ? games 
    : games.filter(g => g.source === filter)

  const steamCount = games.filter((g) => g.source === "steam").length
  const localCount = games.filter((g) => g.source === "local").length
  const toolCount = games.filter((g) => g.source === "tool").length

  return (
    <div className="h-screen w-screen flex flex-col bg-seezee-dark relative overflow-hidden">
      <ReactiveBackground />

      <TopBar />

      {/* Scrollable Content Area */}
      <main className="relative flex-1 flex flex-col overflow-hidden z-10">
        {/* Header Section (Fixed) */}
        <div className="flex-shrink-0 px-8 py-6 animate-slide-in-up">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-seezee-red hover:text-seezee-red-bright transition-colors mb-4 text-sm font-medium"
          >
            ← Back to Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white/90 text-4xl font-bold">Game Library</h2>
              <p className="text-white/50 mt-1">
                {filteredGames.length} {filteredGames.length === 1 ? 'item' : 'items'}
                {!isConnected && pcIpAddress && (
                  <span className="text-red-400 ml-2">• Disconnected</span>
                )}
                {isLoading && (
                  <span className="text-seezee-red ml-2">• Loading...</span>
                )}
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'All', count: games.length },
                { key: 'steam', label: 'Steam', count: steamCount },
                { key: 'local', label: 'Apps', count: localCount },
                { key: 'tool', label: 'Tools', count: toolCount }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  className={`
                    px-6 py-3 rounded-xl font-medium transition-all duration-300 min-w-[100px]
                    ${filter === tab.key 
                      ? 'bg-seezee-red text-white shadow-glow' 
                      : 'glass text-white/60 hover:text-white hover:bg-white/5'}
                  `}
                >
                  {tab.label}
                  <span className="ml-2 text-sm opacity-70">({tab.count})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Game Grid */}
        <div className="flex-1 overflow-y-auto touch-scroll px-8 pb-8">
          {filteredGames.length > 0 ? (
            <GameGrid games={filteredGames} onPlayGame={handlePlayGame} />
          ) : (
            <EmptyGameLibrary />
          )}
        </div>
      </main>

      <footer className="relative flex-shrink-0 px-8 py-4 text-center text-white/30 text-sm z-10">
        Touch and drag to scroll • Tap to launch
      </footer>
    </div>
  )
}
