"use client"

import { useState, useEffect, useCallback } from "react"
import StartupScreen from "@/components/StartupScreen"
import TopBar from "@/components/TopBar"
import GameGrid from "@/components/GameGrid"
import ReactiveBackground from "@/components/ReactiveBackground"
import EmptyGameLibrary from "@/components/EmptyGameLibrary"
import { mockGames, Game, apiGameToGame } from "@/lib/mockGames"
import { useConnectionStore, GameItem } from "@/lib/connectionStore"

export default function Home() {
  const [showStartup, setShowStartup] = useState(true)
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [useMockData, setUseMockData] = useState(false)
  
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
      setUseMockData(false)
      return
    }

    setIsLoading(true)
    try {
      const apiGames = await fetchGames()
      
      // Convert API games to frontend format
      const convertedGames = apiGames.map(apiGameToGame)
      setGames(convertedGames)
      setUseMockData(false)
      setConnected(true)
    } catch (error) {
      console.error('Failed to load games:', error)
      setGames([])
      setUseMockData(false)
      setConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [pcIpAddress, fetchGames, setConnected])

  // Load games when component mounts or connection changes
  useEffect(() => {
    if (!showStartup) {
      loadGames()
    }
  }, [showStartup, pcIpAddress, loadGames])

  const handlePlayGame = async (game: Game) => {
    console.log(`Launching: ${game.name}`)
    
    if (!isConnected) {
      alert(`Cannot launch game - not connected to PC server.\n\nGo to Settings to configure connection.`)
      return
    }

    // Convert to GameItem format for the API
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

  // Count games by source
  const steamCount = games.filter((g) => g.source === "steam").length
  const localCount = games.filter((g) => g.source === "local").length
  const toolCount = games.filter((g) => g.source === "tool").length

  return (
    <div className="min-h-screen flex flex-col bg-seezee-dark relative overflow-hidden">
      {/* Reactive animated background */}
      <ReactiveBackground />

      <StartupScreen onComplete={() => setShowStartup(false)} duration={3500} />

      {!showStartup && (
        <>
          <TopBar />

          <main className="relative flex-1 flex flex-col justify-center py-8 z-10">
            {/* Section header */}
            <div className="px-8 mb-4 animate-slide-in-up stagger-3">
              <div className="flex items-center gap-3">
                <h2 className="text-white/90 text-3xl font-bold">Your Library</h2>
                {isLoading && (
                  <span className="text-xs px-2 py-1 rounded bg-seezee-red/20 text-seezee-red animate-pulse">
                    Loading...
                  </span>
                )}
              </div>
              <p className="text-white/50 mt-1">
                {games.length} {games.length === 1 ? 'item' : 'items'} ready to play
                {!isConnected && pcIpAddress && (
                  <span className="text-red-400 ml-2">• Disconnected</span>
                )}
              </p>
            </div>

            {/* Game grid - horizontal scroll */}
            {games.length > 0 ? (
              <GameGrid games={games} onPlayGame={handlePlayGame} />
            ) : (
              <EmptyGameLibrary />
            )}

            {/* Quick stats */}
            <div className="px-8 mt-8 flex gap-6 animate-fade-zoom-in stagger-4">
              <div className="glass rounded-xl px-6 py-4 border border-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                <span className="text-seezee-red text-2xl font-bold">
                  {steamCount}
                </span>
                <p className="text-white/50 text-sm mt-1">Steam Games</p>
              </div>
              <div className="glass rounded-xl px-6 py-4 border border-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                <span className="text-seezee-red text-2xl font-bold">
                  {localCount}
                </span>
                <p className="text-white/50 text-sm mt-1">Local Games</p>
              </div>
              {toolCount > 0 && (
                <div className="glass rounded-xl px-6 py-4 border border-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                  <span className="text-purple-400 text-2xl font-bold">
                    {toolCount}
                  </span>
                  <p className="text-white/50 text-sm mt-1">Tools</p>
                </div>
              )}
              {!isConnected && (
                <button 
                  onClick={loadGames}
                  className="glass rounded-xl px-6 py-4 border border-seezee-red/30 hover:bg-seezee-red/10 transition-all duration-300 hover:scale-105 cursor-pointer"
                >
                  <span className="text-seezee-red text-sm font-medium">↻ Refresh</span>
                </button>
              )}
            </div>
          </main>

          {/* Footer hint */}
          <footer className="relative px-8 py-4 text-center text-white/30 text-sm animate-fade-zoom-in stagger-5 z-10">
            Use arrow keys or swipe to navigate • Press Enter or tap to play
          </footer>
        </>
      )}
    </div>
  )
}
