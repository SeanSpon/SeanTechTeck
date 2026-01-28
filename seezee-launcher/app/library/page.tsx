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
  const [viewMode, setViewMode] = useState<'grid' | 'categories'>('categories')
  
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

  // Group games by source for category view
  const steamGames = games.filter(g => g.source === 'steam')
  const localGames = games.filter(g => g.source === 'local')
  const toolGames = games.filter(g => g.source === 'tool')

  return (
    <div className="h-screen w-screen flex flex-col bg-seezee-dark relative overflow-hidden">
      <ReactiveBackground />

      <TopBar />

      {/* Scrollable Content Area */}
      <main className="relative flex-1 overflow-y-auto overflow-x-hidden touch-scroll z-10">
        {/* Header Section (Fixed at top) */}
        <div className="flex-shrink-0 px-6 py-4 sticky top-0 bg-seezee-dark/95 backdrop-blur-md border-b border-white/5 z-20">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-seezee-red hover:text-seezee-red-bright transition-colors mb-2 text-sm font-medium"
          >
            ← Back
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white/90 text-3xl font-bold">Library</h2>
              <p className="text-white/50 text-sm">
                {viewMode === 'categories' ? games.length : filteredGames.length} items
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-3 items-center">
              {/* Category/Grid Toggle */}
              <div className="flex gap-2 glass px-2 py-1 rounded-lg">
                <button
                  onClick={() => setViewMode('categories')}
                  className={`
                    px-3 py-1.5 rounded-md font-medium transition-all duration-200 text-xs
                    ${viewMode === 'categories' 
                      ? 'bg-seezee-red text-white' 
                      : 'text-white/60 hover:text-white'}
                  `}
                >
                  Categories
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`
                    px-3 py-1.5 rounded-md font-medium transition-all duration-200 text-xs
                    ${viewMode === 'grid' 
                      ? 'bg-seezee-red text-white' 
                      : 'text-white/60 hover:text-white'}
                  `}
                >
                  All
                </button>
              </div>

              {/* Filter Tabs (only show in grid mode) */}
              {viewMode === 'grid' && (
                <div className="flex gap-2">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'steam', label: 'Steam' },
                    { key: 'local', label: 'Apps' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key as any)}
                      className={`
                        px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm
                        ${filter === tab.key 
                          ? 'bg-seezee-red text-white' 
                          : 'glass text-white/60 hover:text-white'}
                      `}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Game Grid - Scrollable */}
        <div className="px-6 py-6">
          {viewMode === 'categories' ? (
            // Category View - Organized sections
            <div className="space-y-8">
              {/* Steam Games Section */}
              {steamGames.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <span className="text-xl">🎮</span>
                    </div>
                    <div>
                      <h3 className="text-white/90 text-xl font-bold">Steam</h3>
                      <p className="text-white/50 text-xs">{steamGames.length} games</p>
                    </div>
                  </div>
                  <GameGrid games={steamGames} onPlayGame={handlePlayGame} />
                </div>
              )}

              {/* Local Apps Section */}
              {localGames.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                      <span className="text-xl">💻</span>
                    </div>
                    <div>
                      <h3 className="text-white/90 text-xl font-bold">Local Apps</h3>
                      <p className="text-white/50 text-xs">{localGames.length} apps</p>
                    </div>
                  </div>
                  <GameGrid games={localGames} onPlayGame={handlePlayGame} />
                </div>
              )}

              {/* Tools Section */}
              {toolGames.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <span className="text-xl">🔧</span>
                    </div>
                    <div>
                      <h3 className="text-white/90 text-xl font-bold">Tools</h3>
                      <p className="text-white/50 text-xs">{toolGames.length} tools</p>
                    </div>
                  </div>
                  <GameGrid games={toolGames} onPlayGame={handlePlayGame} />
                </div>
              )}

              {/* Empty State */}
              {games.length === 0 && (
                <EmptyGameLibrary />
              )}
            </div>
          ) : (
            // Grid View - Filtered
            filteredGames.length > 0 ? (
              <GameGrid games={filteredGames} onPlayGame={handlePlayGame} />
            ) : (
              <EmptyGameLibrary />
            )
          )}
        </div>
      </main>

      <footer className="relative flex-shrink-0 px-8 py-4 text-center text-white/30 text-sm z-10">
        Touch and drag to scroll • Tap to launch
      </footer>
    </div>
  )
}
       