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
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none')
  const [visibleSources, setVisibleSources] = useState({
    steam: true,
    local: true,
    tool: true
  })
  
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
  let processedGames = games

  // Apply source visibility filter
  processedGames = processedGames.filter(g => {
    if (g.source === 'steam') return visibleSources.steam
    if (g.source === 'local') return visibleSources.local
    if (g.source === 'tool') return visibleSources.tool
    return true
  })

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    processedGames = processedGames.filter(g => 
      g.name.toLowerCase().includes(query)
    )
  }

  // Apply sorting
  if (sortOrder !== 'none') {
    processedGames = [...processedGames].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name)
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }

  const filteredGames = filter === 'all' 
    ? processedGames 
    : processedGames.filter(g => g.source === filter)

  const steamCount = games.filter((g) => g.source === "steam").length
  const localCount = games.filter((g) => g.source === "local").length
  const toolCount = games.filter((g) => g.source === "tool").length

  // Group games by source for category view (with filters applied)
  const steamGames = processedGames.filter(g => g.source === 'steam')
  const localGames = processedGames.filter(g => g.source === 'local')
  const toolGames = processedGames.filter(g => g.source === 'tool')

  const toggleSource = (source: 'steam' | 'local' | 'tool') => {
    setVisibleSources(prev => ({
      ...prev,
      [source]: !prev[source]
    }))
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-seezee-dark relative">
      <ReactiveBackground />

      {/* Fixed Header with Back Button and Filters */}
      <div className="flex-shrink-0 px-4 py-3 bg-seezee-dark/95 backdrop-blur-md border-b border-white/10 z-20">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-seezee-red hover:text-seezee-red-bright transition-colors mb-3 text-sm font-medium flex items-center gap-2"
        >
          <span className="text-xl">←</span> Back to Hub
        </button>
        
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-white text-2xl font-bold">Library</h2>
            <p className="text-white/50 text-sm">
              {viewMode === 'categories' ? processedGames.length : filteredGames.length} items
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('categories')}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                viewMode === 'categories' 
                  ? 'bg-seezee-red text-white' 
                  : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              Categories
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                viewMode === 'grid' 
                  ? 'bg-seezee-red text-white' 
                  : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search games..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/10 px-4 py-3 rounded-lg text-white text-base placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-seezee-red/50 mb-3"
          style={{ userSelect: 'text', WebkitUserSelect: 'text', minHeight: '48px' }}
        />

        {/* Filter Toggles */}
        <div className="flex gap-3 items-center">
          <span className="text-white/50 text-sm">Show:</span>
          <button
            onClick={() => toggleSource('steam')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all min-w-[80px] ${
              visibleSources.steam 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                : 'bg-white/5 text-white/30'
            }`}
          >
            Steam {steamCount > 0 && `(${steamCount})`}
          </button>
          <button
            onClick={() => toggleSource('local')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all min-w-[80px] ${
              visibleSources.local 
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                : 'bg-white/5 text-white/30'
            }`}
          >
            Apps {localCount > 0 && `(${localCount})`}
          </button>
          {toolCount > 0 && (
            <button
              onClick={() => toggleSource('tool')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all min-w-[80px] ${
                visibleSources.tool 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-white/5 text-white/30'
              }`}
            >
              Tools ({toolCount})
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Game Grid - Main Content */}
      <main className="main-scroll flex-1 px-4 py-4">
        {viewMode === 'categories' ? (
          <div className="space-y-6">
            {/* Steam Games Section */}
            {steamGames.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">S</span>
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-bold">Steam</h3>
                    <p className="text-white/50 text-sm">{steamGames.length} games</p>
                  </div>
                </div>
                <GameGrid games={steamGames} onPlayGame={handlePlayGame} />
              </div>
            )}

            {/* Local Apps Section */}
            {localGames.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">L</span>
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-bold">Local Apps</h3>
                    <p className="text-white/50 text-sm">{localGames.length} apps</p>
                  </div>
                </div>
                <GameGrid games={localGames} onPlayGame={handlePlayGame} />
              </div>
            )}

            {/* Tools Section */}
            {toolGames.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">T</span>
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-bold">Tools</h3>
                    <p className="text-white/50 text-sm">{toolGames.length} tools</p>
                  </div>
                </div>
                <GameGrid games={toolGames} onPlayGame={handlePlayGame} />
              </div>
            )}

            {/* Empty State */}
            {processedGames.length === 0 && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🎮</div>
                <p className="text-white/50 text-lg mb-2">
                  {searchQuery ? 'No games match your search' : 'No games found'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-4 px-6 py-3 bg-seezee-red/20 text-seezee-red rounded-lg hover:bg-seezee-red/30 transition-colors"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          filteredGames.length > 0 ? (
            <GameGrid games={filteredGames} onPlayGame={handlePlayGame} />
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-white/50 text-lg mb-2">
                {searchQuery ? 'No games match your search' : 'No games found'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-6 py-3 bg-seezee-red/20 text-seezee-red rounded-lg hover:bg-seezee-red/30 transition-colors"
                >
                  Clear search
                </button>
              )}
            </div>
          )
        )}
      </main>
    </div>
  )
}