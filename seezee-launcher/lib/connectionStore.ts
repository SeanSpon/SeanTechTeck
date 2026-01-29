"use client"

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Folder configuration type
export interface FolderConfig {
  id: string
  label: string
  path: string
  type: 'games' | 'tools'
  scanDepth?: number
  enabled: boolean
}

// Game item from server
export interface GameItem {
  id: string
  title: string
  source: 'steam' | 'epic' | 'local' | 'tool'
  steamAppId?: string
  execPath?: string
  coverImage?: string
  folderSource?: string
}

export interface DirectoryEntry {
  name: string
  path: string
}

export interface ConnectionConfig {
  pcIpAddress: string
  pcPort: number
  connectionType: 'wifi' | 'ethernet' | 'usb'
  isConnected: boolean
  lastConnected?: string
  folders: FolderConfig[]
  games: GameItem[]
  isLoading: boolean
  error: string | null
}

interface ConnectionStore extends ConnectionConfig {
  setConfig: (config: Partial<ConnectionConfig>) => void
  setConnected: (connected: boolean) => void
  resetConfig: () => void
  
  // API methods
  getServerUrl: () => string
  testConnection: () => Promise<boolean>
  fetchFolders: () => Promise<FolderConfig[]>
  addFolder: (folder: Omit<FolderConfig, 'id' | 'enabled'>) => Promise<FolderConfig | null>
  removeFolder: (id: string) => Promise<boolean>
  fetchGames: () => Promise<GameItem[]>
  launchGame: (game: GameItem) => Promise<boolean>
  listDrives: () => Promise<string[]>
  listDirectory: (path: string) => Promise<DirectoryEntry[]>
  createFolder: (path: string) => Promise<boolean>
  trackRecentPlay: (gameId: string) => Promise<boolean>
  getRecentPlays: () => Promise<string[]>
  getFavorites: () => Promise<string[]>
  toggleFavorite: (itemId: string) => Promise<boolean>
}

const defaultConfig: ConnectionConfig = {
  pcIpAddress: '',
  pcPort: 5555,
  connectionType: 'wifi',
  isConnected: false,
  folders: [],
  games: [],
  isLoading: false,
  error: null,
}

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set, get) => ({
      ...defaultConfig,
      
      setConfig: (config) => set((state) => ({ ...state, ...config })),
      
      setConnected: (connected) => set({ 
        isConnected: connected,
        lastConnected: connected ? new Date().toISOString() : undefined
      }),
      
      resetConfig: () => set(defaultConfig),
      
      // Get server base URL
      getServerUrl: () => {
        const { pcIpAddress, pcPort } = get()
        return `http://${pcIpAddress}:${pcPort}`
      },
      
      // Test connection to PC server
      testConnection: async () => {
        const { getServerUrl } = get()
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(`${getServerUrl()}/api/status`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
          
          if (response.ok) {
            const data = await response.json()
            set({ 
              isConnected: data.status === 'online',
              isLoading: false,
              lastConnected: new Date().toISOString()
            })
            return true
          }
          
          set({ isConnected: false, isLoading: false, error: 'Server returned error' })
          return false
        } catch (error) {
          set({ 
            isConnected: false, 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Connection failed'
          })
          return false
        }
      },
      
      // Fetch folders from server
      fetchFolders: async () => {
        const { getServerUrl } = get()
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(`${getServerUrl()}/api/folders`)
          
          if (response.ok) {
            const data = await response.json()
            set({ folders: data.folders, isLoading: false })
            return data.folders
          }
          
          set({ isLoading: false, error: 'Failed to fetch folders' })
          return []
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to fetch folders'
          })
          return []
        }
      },
      
      // Add a new folder
      addFolder: async (folder) => {
        const { getServerUrl } = get()
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(`${getServerUrl()}/api/folders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(folder)
          })
          
          if (response.ok) {
            const data = await response.json()
            set({ folders: data.folders, isLoading: false })
            return data.folder
          }
          
          const errorData = await response.json()
          set({ isLoading: false, error: errorData.error || 'Failed to add folder' })
          return null
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to add folder'
          })
          return null
        }
      },
      
      // Remove a folder
      removeFolder: async (id) => {
        const { getServerUrl } = get()
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(`${getServerUrl()}/api/folders?id=${id}`, {
            method: 'DELETE'
          })
          
          if (response.ok) {
            const data = await response.json()
            set({ folders: data.folders, isLoading: false })
            return true
          }
          
          set({ isLoading: false, error: 'Failed to remove folder' })
          return false
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to remove folder'
          })
          return false
        }
      },
      
      // Fetch all games
      fetchGames: async () => {
        const { getServerUrl } = get()
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(`${getServerUrl()}/api/games`)
          
          if (response.ok) {
            const data = await response.json()
            set({ games: data.games, isLoading: false, isConnected: true })
            return data.games
          }
          
          set({ isLoading: false, error: 'Failed to fetch games' })
          return []
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to fetch games'
          })
          return []
        }
      },
      
      // Launch a game
      launchGame: async (game) => {
        const { getServerUrl } = get()
        
        if (!game.steamAppId && !game.execPath) {
          console.error('Game has neither steamAppId nor execPath:', game)
          return false
        }
        
        try {
          const body = game.steamAppId 
            ? { steamAppId: game.steamAppId }
            : { execPath: game.execPath }
          
          console.log('Launching game with:', body)
          
          const response = await fetch(`${getServerUrl()}/api/launch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })
          
          const data = await response.json()
          
          if (response.ok && data.success) {
            console.log('Game launched successfully:', data.message)
            return true
          } else {
            console.error('Server returned error:', data.error || data.message)
            return false
          }
        } catch (error) {
          console.error('Failed to launch game:', error)
          return false
        }
      },

      // List available drive roots
      listDrives: async () => {
        const { getServerUrl } = get()
        set({ isLoading: true, error: null })

        try {
          const response = await fetch(`${getServerUrl()}/api/fs/drives`)
          if (response.ok) {
            const data = await response.json()
            set({ isLoading: false })
            return data.drives || []
          }

          set({ isLoading: false, error: 'Failed to list drives' })
          return []
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to list drives'
          })
          return []
        }
      },

      // List directories for a given path
      listDirectory: async (path) => {
        const { getServerUrl } = get()
        set({ isLoading: true, error: null })

        try {
          const response = await fetch(`${getServerUrl()}/api/fs/list?path=${encodeURIComponent(path)}`)
          if (response.ok) {
            const data = await response.json()
            set({ isLoading: false })
            return data.directories || []
          }

          const errorData = await response.json()
          set({ isLoading: false, error: errorData.error || 'Failed to list directory' })
          return []
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to list directory'
          })
          return []
        }
      },

      // Create a folder at the given path
      createFolder: async (path) => {
        const { getServerUrl } = get()
        set({ isLoading: true, error: null })

        try {
          const response = await fetch(`${getServerUrl()}/api/fs/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
          })

          if (response.ok) {
            set({ isLoading: false })
            return true
          }

          const errorData = await response.json()
          set({ isLoading: false, error: errorData.error || 'Failed to create folder' })
          return false
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to create folder'
          })
          return false
        }
      },

      // Track a game as recently played
      trackRecentPlay: async (gameId) => {
        const { getServerUrl } = get()

        try {
          const response = await fetch(`${getServerUrl()}/api/track-recent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: gameId })
          })

          return response.ok
        } catch (error) {
          console.error('Failed to track recent play:', error)
          return false
        }
      },

      // Get recently played games
      getRecentPlays: async () => {
        const { getServerUrl } = get()

        try {
          const response = await fetch(`${getServerUrl()}/api/recent-plays`)
          if (response.ok) {
            const data = await response.json()
            return data.recentPlays.map((r: any) => r.id)
          }
          return []
        } catch (error) {
          console.error('Failed to fetch recent plays:', error)
          return []
        }
      },

      // Get favorite items
      getFavorites: async () => {
        const { getServerUrl } = get()

        try {
          const response = await fetch(`${getServerUrl()}/api/favorites`)
          if (response.ok) {
            const data = await response.json()
            return data.favorites
          }
          return []
        } catch (error) {
          console.error('Failed to fetch favorites:', error)
          return []
        }
      },

      // Toggle favorite status of an item
      toggleFavorite: async (itemId) => {
        const { getServerUrl } = get()
        const favorites = await get().getFavorites()
        const isFavorite = favorites.includes(itemId)

        try {
          const response = await fetch(`${getServerUrl()}/api/favorites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: itemId,
              action: isFavorite ? 'remove' : 'add'
            })
          })

          return response.ok
        } catch (error) {
          console.error('Failed to toggle favorite:', error)
          return false
        }
      }
    }),
    {
      name: 'seezee-connection-storage',
      partialize: (state) => ({
        pcIpAddress: state.pcIpAddress,
        pcPort: state.pcPort,
        connectionType: state.connectionType,
        lastConnected: state.lastConnected,
      })
    }
  )
)
