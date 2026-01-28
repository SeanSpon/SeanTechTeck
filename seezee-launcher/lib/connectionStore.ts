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
  source: 'steam' | 'local' | 'tool'
  steamAppId?: string
  execPath?: string
  coverImage?: string
  folderSource?: string
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
        
        try {
          const body = game.steamAppId 
            ? { steamAppId: game.steamAppId }
            : { execPath: game.execPath }
          
          const response = await fetch(`${getServerUrl()}/api/launch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })
          
          return response.ok
        } catch (error) {
          console.error('Failed to launch game:', error)
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
