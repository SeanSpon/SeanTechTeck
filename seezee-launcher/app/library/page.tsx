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
    <div className="h-screen w-screen flex flex-col bg-seezee-dark relative overflow-hidden">
      <ReactiveBackground />

      <TopBar />

      {/* Scrollable Content Area */}
      <main className="relative flex-1 overflow-y-auto overflow-x-hidden touch-scroll z-10" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Header Section (Fixed at top) */}
        <div className="flex-shrink-0 px-3 py-2 sticky top-0 bg-seezee-dark/95 backdrop-blur-md border-b border-white/5 z-20 pointer-events-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-seezee-red hover:text-seezee-red-bright transition-colors mb-1 text-xs font-medium"
          >
            ← Back
          </button>
          
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-white/90 text-xl font-bold">Library</h2>
              <p className="text-white/50 text-xs">
                {viewMode === 'categories' ? processedGames.length : filteredGames.length} items
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2 items-center">
              {/* Category/Grid Toggle */}
              <div className="flex gap-1 glass px-1 py-0.5 rounded-md">
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
                <div className="flex gap-1">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'steam', label: 'Steam' },
                    { key: 'local', label: 'Apps' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key as any)}
                      className={`
                        px-2 py-0.5 rounded-md font-medium transition-all duration-200 text-xs
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

          {/* Search & Filters Row */}
          <div className="flex gap-2 items-center pointer-events-auto">
            {/* Search Bar */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full glass px-3 py-2 rounded-md text-white/90 text-sm placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-seezee-red/50 pointer-events-auto"
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
              />
            </div>

            {/* Sort Button */}
            <button
              onClick={() => {
                if (sortOrder === 'none') setSortOrder('asc')
                else if (sortOrder === 'asc') setSortOrder('desc')
                else setSortOrder('none')
              }}
              className="glass px-3 py-2 rounded-md text-white/70 hover:text-white transition-colors text-xs font-medium whitespace-nowrap"
              title={sortOrder === 'none' ? 'No sorting' : sortOrder === 'asc' ? 'A→Z' : 'Z→A'}
            >
              {sortOrder === 'none' && '⇅'}
              {sortOrder === 'asc' && '↓ A-Z'}
              {sortOrder === 'desc' && '↑ Z-A'}
            </button>

            {/* Source Visibility Toggles */}
            <div className="flex gap-1">
              <button
                onClick={() => toggleSource('steam')}
                className={`
                  px-2 py-2 rounded-md text-xs font-medium transition-all duration-200
                  ${visibleSources.steam 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                    : 'glass text-white/30 hover:text-white/50'}
                `}
                title={visibleSources.steam ? 'Hide Steam games' : 'Show Steam games'}
              >
                S
              </button>
              <button
                onClick={() => toggleSource('local')}
                className={`
                  px-2 py-2 rounded-md text-xs font-medium transition-all duration-200
                  ${visibleSources.local 
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                    : 'glass text-white/30 hover:text-white/50'}
                `}
                title={visibleSources.local ? 'Hide local apps' : 'Show local apps'}
              >
                L
              </button>
              <button
                onClick={() => toggleSource('tool')}
                className={`
                  px-2 py-2 rounded-md text-xs font-medium transition-all duration-200
                  ${visibleSources.tool 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'glass text-white/30 hover:text-white/50'}
                `}
                title={visibleSources.tool ? 'Hide tools' : 'Show tools'}
              >
                T
              </button>
            </div>
          </div>
        </div>

        {/* Game Grid - Scrollable */}
        <div className="px-3 py-3 pointer-events-auto">
          {viewMode === 'categories' ? (
            // Category View - Organized sections
            <div className="space-y-4">
              {/* Steam Games Section */}
              {steamGames.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <span className="text-xs font-semibold text-white/90">S</span>
                    </div>
                    <div>
                      <h3 className="text-white/90 text-sm font-bold">Steam</h3>
                      <p className="text-white/50 text-xs\">{steamGames.length} games</p>
                    </div>
                  </div>
                  <GameGrid games={steamGames} onPlayGame={handlePlayGame} />
                </div>
              )}

              {/* Local Apps Section */}
              {localGames.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                      <span className="text-xs font-semibold text-white/90">L</span>
                    </div>
                    <div>
                      <h3 className="text-white/90 text-sm font-bold">Local Apps</h3>
                      <p className="text-white/50 text-xs">{localGames.length} apps</p>
                    </div>
                  </div>
                  <GameGrid games={localGames} onPlayGame={handlePlayGame} />
                </div>
              )}

              {/* Tools Section */}
              {toolGames.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <span className="text-xs font-semibold text-white/90">T</span>
                    </div>
                    <div>
                      <h3 className="text-white/90 text-sm font-bold">Tools</h3>
                      <p className="text-white/50 text-xs">{toolGames.length} tools</p>
                    </div>
                  </div>
                  <GameGrid games={toolGames} onPlayGame={handlePlayGame} />
                </div>
              )}

              {/* Empty State */}
              {processedGames.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-white/50 text-sm">
                    {searchQuery ? 'No games match your search' : 'No games found'}
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-seezee-red hover:text-seezee-red-bright text-xs"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Grid View - Filtered
            filteredGames.length > 0 ? (
              <GameGrid games={filteredGames} onPlayGame={handlePlayGame} />
            ) : (
              <div className="text-center py-12">
                <p className="text-white/50 text-sm">
                  {searchQuery ? 'No games match your search' : 'No games found'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-seezee-red hover:text-seezee-red-bright text-xs"
                  >
                    Clear search
                  </button>
                )}
              </div>
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
       