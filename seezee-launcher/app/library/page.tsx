"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import TopBar from "@/components/TopBar"
import GameGrid from "@/components/GameGrid"
import ReactiveBackground from "@/components/ReactiveBackground"
import EmptyGameLibrary from "@/components/EmptyGameLibrary"
import AddItemModal from "@/components/AddItemModal"
import { mockGames, Game, apiGameToGame } from "@/lib/mockGames"
import { useConnectionStore, GameItem, FolderConfig, DirectoryEntry } from "@/lib/connectionStore"

type BrowseItem = {
  name: string
  path: string
  isDrive?: boolean
}

export default function Library() {
  const router = useRouter()
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  
  // Modals and forms
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBrowser, setShowBrowser] = useState(false)
  const [browsePath, setBrowsePath] = useState<string | null>(null)
  const [browseItems, setBrowseItems] = useState<BrowseItem[]>([])
  const [browseLoading, setBrowseLoading] = useState(false)
  const [browseError, setBrowseError] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  
  // Favorites and recent
  const [favorites, setFavorites] = useState<string[]>([])
  const [recentPlays, setRecentPlays] = useState<string[]>([])
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(false)

  const {
    pcIpAddress,
    isConnected,
    folders,
    isLoading: isStoreLoading,
    error: storeError,
    fetchFolders,
    addFolder,
    removeFolder,
    fetchGames,
    launchGame,
    listDrives,
    listDirectory,
    createFolder,
    trackRecentPlay,
    getRecentPlays,
    getFavorites,
    toggleFavorite,
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

  // Load favorites and recent plays
  const loadTrackingData = useCallback(async () => {
    setIsFavoritesLoading(true)
    try {
      const [favs, recent] = await Promise.all([
        getFavorites(),
        getRecentPlays()
      ])
      setFavorites(favs)
      setRecentPlays(recent)
    } catch (error) {
      console.error('Failed to load tracking data:', error)
    } finally {
      setIsFavoritesLoading(false)
    }
  }, [getFavorites, getRecentPlays])

  useEffect(() => {
    loadGames()
    loadTrackingData()
  }, [loadGames, loadTrackingData])

  useEffect(() => {
    if (pcIpAddress) {
      fetchFolders()
    }
  }, [pcIpAddress, fetchFolders])

  const normalizePath = (path: string) => path.replace(/[\\/]+$/, '')

  const getParentPath = (path: string) => {
    const trimmed = normalizePath(path)
    if (/^[A-Za-z]:$/.test(trimmed)) return null
    const lastSlash = Math.max(trimmed.lastIndexOf('\\'), trimmed.lastIndexOf('/'))
    if (lastSlash <= 2 && /^[A-Za-z]:/.test(trimmed)) return `${trimmed.slice(0, 2)}\\`
    if (lastSlash === -1) return null
    return trimmed.slice(0, lastSlash + 1)
  }

  const joinPath = (base: string, name: string) => {
    const separator = base.includes('\\') ? '\\' : '/'
    return `${base.replace(/[\\/]+$/, '')}${separator}${name}`
  }

  const loadDrives = async () => {
    setBrowseLoading(true)
    setBrowseError('')
    try {
      const drives = await listDrives()
      const items: BrowseItem[] = drives.map((drive) => ({
        name: drive,
        path: drive,
        isDrive: true
      }))
      setBrowseItems(items)
      setBrowsePath(null)
    } catch (error) {
      setBrowseError(error instanceof Error ? error.message : 'Failed to load drives')
    } finally {
      setBrowseLoading(false)
    }
  }

  const loadDirectory = async (path: string) => {
    setBrowseLoading(true)
    setBrowseError('')
    try {
      const dirs = await listDirectory(path)
      const items: BrowseItem[] = (dirs as DirectoryEntry[]).map((dir) => ({
        name: dir.name,
        path: dir.path
      }))
      setBrowseItems(items)
      setBrowsePath(path)
    } catch (error) {
      setBrowseError(error instanceof Error ? error.message : 'Failed to load folder')
    } finally {
      setBrowseLoading(false)
    }
  }

  const handleBrowseUp = async () => {
    if (!browsePath) {
      await loadDrives()
      return
    }
    const parent = getParentPath(browsePath)
    if (!parent) {
      await loadDrives()
      return
    }
    await loadDirectory(parent)
  }

  const handleCreateFolder = async () => {
    if (!browsePath || !newFolderName.trim()) return
    const targetPath = joinPath(browsePath, newFolderName.trim())
    const success = await createFolder(targetPath)
    if (success) {
      setNewFolderName('')
      await loadDirectory(browsePath)
    }
  }

  const handleAddFolder = async (label: string, path: string, type: 'games' | 'tools') => {
    const result = await addFolder({
      label,
      path,
      type
    })

    if (result) {
      setShowAddModal(false)
      await fetchGames()
    } else {
      throw new Error(storeError || 'Failed to add folder')
    }
  }

  const handleRemoveFolder = async (id: string) => {
    const success = await removeFolder(id)
    if (success) {
      await fetchGames()
    }
  }

  const handlePlayGame = async (game: Game) => {
    if (!isConnected) {
      alert(`Cannot launch game - not connected to PC server.\n\nGo to Settings to configure connection.`)
      return
    }

    if (!game.steamAppId && !game.execPath) {
      alert(`Cannot launch ${game.name}\n\nGame has no steam app ID or executable path configured.`)
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
      // Track recent play
      await trackRecentPlay(game.id)
      await loadTrackingData()
      alert(`Launching ${game.name}...`)
    } else {
      alert(`Failed to launch ${game.name}\n\nCheck the PC server console for errors.`)
    }
  }

  const handleToggleFavorite = async (game: Game) => {
    await toggleFavorite(game.id)
    await loadTrackingData()
  }

  // Filter and display games
  let displayedGames = games

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    displayedGames = displayedGames.filter(g => 
      g.name.toLowerCase().includes(query)
    )
  }

  // Apply folder/view filter
  if (selectedFolder === 'favorites') {
    displayedGames = displayedGames.filter(g => favorites.includes(g.id))
  } else if (selectedFolder === 'recent') {
    displayedGames = displayedGames
      .filter(g => recentPlays.includes(g.id))
      .sort((a, b) => {
        const aIdx = recentPlays.indexOf(a.id)
        const bIdx = recentPlays.indexOf(b.id)
        return aIdx - bIdx
      })
  }

  const favoriteCount = games.filter(g => favorites.includes(g.id)).length
  const recentCount = games.filter(g => recentPlays.includes(g.id)).length

  return (
    <div className="h-screen w-screen flex flex-col bg-seezee-dark relative overflow-hidden">
      <ReactiveBackground />

      {/* Fixed Header */}
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
              {games.length} total items
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search library..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/10 px-4 py-3 rounded-lg text-white text-base placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-seezee-red/50"
        />
      </div>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 scroll-smooth" style={{
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth'
      }}>
        {selectedFolder ? (
          /* Detail View */
          <div>
            <button
              onClick={() => setSelectedFolder(null)}
              className="text-seezee-red hover:text-seezee-red-bright transition-colors mb-4 text-sm font-medium flex items-center gap-2"
            >
              <span className="text-xl">←</span> Back to Collections
            </button>
            
            {displayedGames.length > 0 ? (
              <GameGrid 
                games={displayedGames} 
                onPlayGame={handlePlayGame}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
              />
            ) : (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📂</div>
                <p className="text-white/50 text-lg">No items found</p>
                <p className="text-white/30 text-sm mt-2">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        ) : (
          /* Collections Grid */
          <div className="space-y-6">
            {/* Quick Collections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Favorites Collection */}
              <button
                onClick={() => setSelectedFolder('favorites')}
                className="relative p-6 rounded-2xl bg-white/5 border-2 border-white/10 hover:border-seezee-red/50 transition-all hover:scale-102 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-orange-500 opacity-10 group-hover:opacity-20 transition-opacity" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-3xl shadow-lg">
                      ⭐
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-white text-xl font-bold mb-1">Favorites</h3>
                      <p className="text-white/50 text-sm">
                        {favoriteCount} {favoriteCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <div className="text-white/30 group-hover:text-white/60 transition-colors text-2xl">
                      →
                    </div>
                  </div>
                  
                  {/* Preview thumbnails */}
                  {favoriteCount > 0 && (
                    <div className="flex gap-2 mt-4">
                      {games
                        .filter(g => favorites.includes(g.id))
                        .slice(0, 4)
                        .map((game) => (
                          <div key={game.id} className="w-12 h-12 rounded-lg bg-white/10 overflow-hidden">
                            {game.steamAppId ? (
                              <img
                                src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.steamAppId}/capsule_184x69.jpg`}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-seezee-red to-seezee-red-bright" />
                            )}
                          </div>
                        ))}
                      {favoriteCount > 4 && (
                        <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-white/50 text-xs font-bold">
                          +{favoriteCount - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </button>

              {/* Recently Played Collection */}
              <button
                onClick={() => setSelectedFolder('recent')}
                className="relative p-6 rounded-2xl bg-white/5 border-2 border-white/10 hover:border-seezee-red/50 transition-all hover:scale-102 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-10 group-hover:opacity-20 transition-opacity" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-3xl shadow-lg">
                      🕐
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-white text-xl font-bold mb-1">Recently Played</h3>
                      <p className="text-white/50 text-sm">
                        {recentCount} {recentCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <div className="text-white/30 group-hover:text-white/60 transition-colors text-2xl">
                      →
                    </div>
                  </div>
                  
                  {/* Preview thumbnails */}
                  {recentCount > 0 && (
                    <div className="flex gap-2 mt-4">
                      {games
                        .filter(g => recentPlays.includes(g.id))
                        .slice(0, 4)
                        .map((game) => (
                          <div key={game.id} className="w-12 h-12 rounded-lg bg-white/10 overflow-hidden">
                            {game.steamAppId ? (
                              <img
                                src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.steamAppId}/capsule_184x69.jpg`}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-cyan-500" />
                            )}
                          </div>
                        ))}
                      {recentCount > 4 && (
                        <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-white/50 text-xs font-bold">
                          +{recentCount - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </button>

              {/* All Apps Collection */}
              <button
                onClick={() => router.push('/apps')}
                className="relative p-6 rounded-2xl bg-white/5 border-2 border-white/10 hover:border-seezee-red/50 transition-all hover:scale-102 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-seezee-red to-seezee-red-bright opacity-10 group-hover:opacity-20 transition-opacity" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-seezee-red to-seezee-red-bright flex items-center justify-center text-3xl shadow-lg">
                      📦
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-white text-xl font-bold mb-1">All Apps</h3>
                      <p className="text-white/50 text-sm">
                        {games.length} total items
                      </p>
                    </div>
                    <div className="text-white/30 group-hover:text-white/60 transition-colors text-2xl">
                      →
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Custom Folders Manager */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white text-lg font-bold">Custom Folders</h3>
                  <p className="text-white/50 text-sm">Add, create, or remove folders on your PC</p>
                </div>
                <button
                  onClick={() => {
                    setShowBrowser(false)
                    setShowAddModal(true)
                  }}
                  className="px-4 py-2 rounded-lg bg-seezee-red/20 text-seezee-red border border-seezee-red/40 hover:bg-seezee-red/30 transition-colors text-sm font-semibold flex items-center gap-2"
                >
                  <span>+</span> Add
                </button>
              </div>

              {!isConnected ? (
                <div className="text-center py-6 border border-dashed border-white/10 rounded-xl bg-seezee-dark/30">
                  <p className="text-white/40 text-sm">Connect to your PC to manage folders</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {folders.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-white/10 rounded-xl bg-seezee-dark/30">
                      <p className="text-white/40 text-sm">No custom folders yet. Steam libraries are auto-detected.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {folders.map((folder: FolderConfig) => (
                        <div
                          key={folder.id}
                          className="flex items-center gap-3 px-4 py-3 bg-seezee-dark/60 rounded-xl border border-white/10"
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                            folder.type === 'tools'
                              ? 'bg-purple-500/30 text-purple-200'
                              : 'bg-seezee-red/30 text-seezee-red'
                          }`}>
                            {folder.type === 'tools' ? '🔧' : '🎮'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm truncate">{folder.label}</p>
                            <p className="text-white/40 text-xs font-mono truncate">{folder.path}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveFolder(folder.id)}
                            disabled={isStoreLoading}
                            className="text-red-300 hover:text-red-200 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setShowBrowser(false)
          setBrowsePath(null)
        }}
        onAddFolder={handleAddFolder}
        onBrowse={() => {
          setShowAddModal(false)
          setShowBrowser(true)
          loadDrives()
        }}
        currentPath={browsePath}
        isLoading={isStoreLoading}
      />

      {/* Browser Modal */}
      {showBrowser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-seezee-dark border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <h4 className="text-white font-semibold">Select Folder</h4>
                <p className="text-white/40 text-xs font-mono truncate">
                  {browsePath || 'Drives'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowBrowser(false)
                  setShowAddModal(true)
                }}
                className="text-white/40 hover:text-white/70 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBrowseUp}
                  className="px-3 py-2 rounded-lg bg-white/10 text-white/70 text-xs font-semibold hover:bg-white/20 transition-colors"
                >
                  Up
                </button>
                <button
                  onClick={() => {
                    if (browsePath) {
                      setShowBrowser(false)
                      setShowAddModal(true)
                    }
                  }}
                  disabled={!browsePath}
                  className="px-3 py-2 rounded-lg bg-seezee-red/20 text-seezee-red text-xs font-semibold hover:bg-seezee-red/30 transition-colors disabled:opacity-40"
                >
                  Use This Folder
                </button>
              </div>

              {browseError && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-xs font-medium">{browseError}</p>
                </div>
              )}

              <div className="max-h-72 overflow-y-auto space-y-2">
                {browseLoading ? (
                  <div className="text-white/50 text-sm">Loading...</div>
                ) : (
                  browseItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => loadDirectory(item.path)}
                      className="w-full text-left px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/80 text-sm font-medium flex items-center gap-3"
                    >
                      <span>{item.isDrive ? '💽' : '📁'}</span>
                      <span className="truncate">{item.name}</span>
                    </button>
                  ))
                )}
              </div>

              {browsePath && (
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder name"
                    className="flex-1 px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-seezee-red focus:outline-none"
                  />
                  <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                    className="px-3 py-2 rounded-lg bg-white/10 text-white/80 text-xs font-semibold hover:bg-white/20 transition-colors disabled:opacity-40"
                  >
                    Create
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
