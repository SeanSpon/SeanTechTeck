"use client"

import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { useConnectionStore, FolderConfig } from "@/lib/connectionStore"

export default function SettingsPage() {
  const [showAddFolder, setShowAddFolder] = useState(false)
  const [newFolderLabel, setNewFolderLabel] = useState("")
  const [newFolderPath, setNewFolderPath] = useState("")
  const [newFolderType, setNewFolderType] = useState<'games' | 'tools'>('games')
  const [addError, setAddError] = useState("")
  
  const { 
    pcIpAddress, 
    pcPort,
    connectionType, 
    setConfig, 
    setConnected,
    isConnected,
    folders,
    games,
    isLoading,
    error,
    testConnection,
    fetchFolders,
    addFolder,
    removeFolder,
    fetchGames
  } = useConnectionStore()

  const [localIp, setLocalIp] = useState(pcIpAddress)
  const [localPort, setLocalPort] = useState(pcPort.toString())
  const [localType, setLocalType] = useState(connectionType)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

  // Theme & Lighting state
  const [activeTheme, setActiveTheme] = useState('default')
  const [themeRgb, setThemeRgb] = useState({ r: 230, g: 57, b: 70 }) // Default red
  const [themeBrightness, setThemeBrightness] = useState(80)
  const [goveeApiKey, setGoveeApiKey] = useState('')
  const [goveeEnabled, setGoveeEnabled] = useState(false)
  const [signalRgbEnabled, setSignalRgbEnabled] = useState(false)
  const [signalRgbPath, setSignalRgbPath] = useState('')
  const [themeSyncSettings, setThemeSyncSettings] = useState({
    signalrgb: false,
    govee: false,
    lan: false
  })
  const [themeApplyStatus, setThemeApplyStatus] = useState<string | null>(null)

  const loadLightingConfig = useCallback(async () => {
    if (!pcIpAddress) return
    
    try {
      const response = await fetch(`http://${pcIpAddress}:${pcPort}/api/config`)
      if (response.ok) {
        const data = await response.json()
        
        // Load Govee config
        if (data.govee) {
          setGoveeEnabled(data.govee.enabled || false)
          setGoveeApiKey(data.govee.apiKey || '')
        }
        
        // Load SignalRGB config
        if (data.signalrgb) {
          setSignalRgbEnabled(data.signalrgb.enabled || false)
          setSignalRgbPath(data.signalrgb.execPath || '')
        }
        
        // Load current theme
        const themeResponse = await fetch(`http://${pcIpAddress}:${pcPort}/api/theme/current`)
        if (themeResponse.ok) {
          const themeData = await themeResponse.json()
          if (themeData.theme) {
            setActiveTheme(themeData.theme.name || 'default')
            if (themeData.theme.rgb) {
              setThemeRgb(themeData.theme.rgb)
            }
            if (themeData.theme.brightness) {
              setThemeBrightness(themeData.theme.brightness)
            }
            if (themeData.theme.sync) {
              setThemeSyncSettings(themeData.theme.sync)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load lighting config:', error)
    }
  }, [pcIpAddress, pcPort])

  // Load folders when connected
  useEffect(() => {
    if (isConnected && pcIpAddress) {
      fetchFolders()
      loadLightingConfig()
    }
  }, [isConnected, pcIpAddress, fetchFolders, loadLightingConfig])

  const applyTheme = useCallback(async () => {
    if (!isConnected || !pcIpAddress) {
      setThemeApplyStatus('✗ Not connected to PC')
      setTimeout(() => setThemeApplyStatus(null), 3000)
      return
    }
    
    setThemeApplyStatus('Applying...')
    try {
      const url = `http://${pcIpAddress}:${pcPort}/api/theme/set`
      console.log('Applying theme to:', url)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activeTheme,
          rgb: themeRgb,
          brightness: themeBrightness
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Theme applied:', data)
        setThemeApplyStatus('✓ Theme applied!')
        setTimeout(() => setThemeApplyStatus(null), 3000)
      } else {
        const errorText = await response.text()
        console.error('Failed to apply theme:', response.status, errorText)
        setThemeApplyStatus('✗ Failed to apply')
        setTimeout(() => setThemeApplyStatus(null), 3000)
      }
    } catch (error) {
      console.error('Failed to apply theme:', error)
      setThemeApplyStatus(`✗ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setThemeApplyStatus(null), 3000)
    }
  }, [isConnected, pcIpAddress, pcPort, activeTheme, themeRgb, themeBrightness])

  const saveLightingConfig = useCallback(async () => {
    if (!isConnected || !pcIpAddress) {
      setThemeApplyStatus('✗ Not connected to PC')
      setTimeout(() => setThemeApplyStatus(null), 3000)
      return
    }
    
    try {
      const url = `http://${pcIpAddress}:${pcPort}/api/config`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          govee: {
            enabled: goveeEnabled,
            apiKey: goveeApiKey
          },
          signalrgb: {
            enabled: signalRgbEnabled,
            execPath: signalRgbPath
          }
        })
      })
      
      if (response.ok) {
        console.log('Lighting config saved')
        // Now apply the theme
        await applyTheme()
      } else {
        console.error('Failed to save lighting config')
        setThemeApplyStatus('✗ Failed to save config')
        setTimeout(() => setThemeApplyStatus(null), 3000)
      }
    } catch (error) {
      console.error('Failed to save lighting config:', error)
      setThemeApplyStatus('✗ Connection error')
      setTimeout(() => setThemeApplyStatus(null), 3000)
    }
  }, [isConnected, pcIpAddress, pcPort, goveeEnabled, goveeApiKey, signalRgbEnabled, signalRgbPath, applyTheme])

  const handleSave = () => {
    setConfig({
      pcIpAddress: localIp,
      pcPort: parseInt(localPort) || 5555,
      connectionType: localType,
    })
    setTestResult(null)
  }

  const handleTestConnection = async () => {
    // Save first
    handleSave()
    
    setIsTesting(true)
    setTestResult(null)
    
    // Small delay to let state update
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const success = await testConnection()
    setIsTesting(false)
    setTestResult(success ? 'success' : 'error')
    
    if (success) {
      // Fetch folders and games on successful connection
      await fetchFolders()
      await fetchGames()
    }
  }

  const handleAddFolder = async () => {
    if (!newFolderPath) {
      setAddError("Path is required")
      return
    }
    
    setAddError("")
    const result = await addFolder({
      label: newFolderLabel || newFolderPath.split('\\').pop() || 'Folder',
      path: newFolderPath,
      type: newFolderType
    })
    
    if (result) {
      // Success - reset form and close
      setNewFolderLabel("")
      setNewFolderPath("")
      setNewFolderType('games')
      setShowAddFolder(false)
      // Refresh games list
      await fetchGames()
    } else {
      setAddError(error || "Failed to add folder")
    }
  }

  const handleRemoveFolder = async (id: string) => {
    const success = await removeFolder(id)
    if (success) {
      // Refresh games list
      await fetchGames()
    }
  }

  const handleRefreshGames = async () => {
    await fetchGames()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-seezee-dark via-seezee-charcoal to-seezee-dark">
      {/* Animated background gradient */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-seezee-red/20 rounded-full mix-blend-screen filter blur-3xl animate-blob" />
        <div className="absolute top-0 -right-40 w-80 h-80 bg-purple-500/20 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-40 left-1/2 w-80 h-80 bg-seezee-red/10 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Header */}
      <header className="relative flex items-center gap-4 px-8 py-6 border-b border-white/5 backdrop-blur-xl bg-seezee-charcoal/50">
        <Link
          href="/"
          className="
            w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 hover:scale-105
            flex items-center justify-center
            transition-all duration-200
            focus:outline-none focus-visible:ring-2 focus-visible:ring-seezee-red
            group
          "
          aria-label="Back to library"
        >
          <svg
            className="w-6 h-6 text-white/70 group-hover:text-seezee-red transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-white text-3xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Settings</h1>
          <p className="text-white/40 text-sm mt-0.5">Configure your SeeZee experience</p>
        </div>
      </header>

      <main className="relative max-w-5xl mx-auto px-8 py-10 space-y-8">
        {/* PC Connection Section */}
        <section className="group bg-gradient-to-br from-white/[0.07] to-white/[0.02] rounded-3xl p-8 border border-white/10 hover:border-seezee-red/30 transition-all duration-300 backdrop-blur-sm shadow-xl">
          <h2 className="text-white text-2xl font-semibold mb-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-seezee-red to-seezee-red-dark flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-all duration-300">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">PC Connection</span>
          </h2>

          {/* Status Badge */}
          <div className="mb-8 flex items-center justify-between p-5 bg-seezee-dark/80 rounded-xl border border-white/5">
            <span className="text-white/60 text-sm font-medium">Connection Status</span>
            <div className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm ${
              isConnected 
                ? 'bg-seezee-red/20 text-seezee-red border border-seezee-red/30 shadow-glow-sm' 
                : 'bg-white/5 text-white/40 border border-white/5'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${
                isConnected 
                  ? 'bg-seezee-red animate-pulse shadow-[0_0_8px_rgba(230,57,70,0.6)]' 
                  : 'bg-white/20'
              }`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          <div className="space-y-4">
            {/* Connection Type - Enhanced */}
            <div>
              <label className="text-white/50 text-xs font-medium block mb-2.5 uppercase tracking-wider">Connection Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['wifi', 'ethernet', 'usb'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setLocalType(type)}
                    className={`relative overflow-hidden px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      localType === type
                        ? 'bg-gradient-to-br from-seezee-red/30 to-seezee-red/10 border-2 border-seezee-red text-seezee-red shadow-glow-sm'
                        : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:border-white/20 hover:text-white/70'
                    }`}
                  >
                    {localType === type && (
                      <div className="absolute inset-0 bg-gradient-to-r from-seezee-red/0 via-seezee-red/10 to-seezee-red/0 animate-shimmer" />
                    )}
                    <span className="relative capitalize">{type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* IP and Port - Enhanced */}
            <div className="grid grid-cols-[2fr,1fr] gap-3">
              <div>
                <label className="text-white/50 text-xs font-medium block mb-2.5 uppercase tracking-wider">PC IP Address</label>
                <input
                  type="text"
                  value={localIp}
                  onChange={(e) => setLocalIp(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full px-4 py-3 text-sm bg-seezee-dark/80 border border-white/10 rounded-xl text-white placeholder-white/20 focus:border-seezee-red focus:ring-2 focus:ring-seezee-red/20 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-white/50 text-xs font-medium block mb-2.5 uppercase tracking-wider">Port</label>
                <input
                  type="text"
                  value={localPort}
                  onChange={(e) => setLocalPort(e.target.value)}
                  placeholder="5555"
                  className="w-full px-4 py-3 text-sm bg-seezee-dark/80 border border-white/10 rounded-xl text-white placeholder-white/20 focus:border-seezee-red focus:ring-2 focus:ring-seezee-red/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Test result message - Enhanced */}
            {testResult && (
              <div className={`p-4 rounded-xl text-sm font-medium backdrop-blur-sm animate-fade-in ${
                testResult === 'success' 
                  ? 'bg-seezee-red/20 text-seezee-red border border-seezee-red/30 shadow-glow-sm' 
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{testResult === 'success' ? '✓' : '✗'}</span>
                  <span>
                    {testResult === 'success' 
                      ? 'Connection successful! Games loaded.' 
                      : `Connection failed. Make sure the server is running on ${localIp}:${localPort}`
                    }
                  </span>
                </div>
              </div>
            )}

            {/* Action buttons - Enhanced */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleTestConnection}
                disabled={isTesting || !localIp}
                className="flex-1 relative overflow-hidden px-6 py-3.5 text-sm font-semibold bg-seezee-red/20 border-2 border-seezee-red text-seezee-red rounded-xl hover:bg-seezee-red/30 hover:shadow-glow transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                <span className="relative z-10">{isTesting ? 'Testing...' : 'Test & Connect'}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              </button>
              <button
                onClick={handleSave}
                className="flex-1 relative overflow-hidden px-6 py-3.5 text-sm font-bold bg-gradient-to-r from-seezee-red to-seezee-red-dark text-white rounded-xl hover:shadow-glow transition-all duration-200 group"
              >
                <span className="relative z-10">Save Configuration</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              </button>
            </div>
          </div>
        </section>

        {/* Game & Tool Folders Section */}
        <section className="group bg-gradient-to-br from-white/[0.07] to-white/[0.02] rounded-3xl p-8 border border-white/10 hover:border-purple-500/30 transition-all duration-300 backdrop-blur-sm shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-white text-2xl font-semibold flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-all duration-300">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                </svg>
              </div>
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">Game & Tool Folders</span>
            </h2>
            {isConnected && (
              <button
                onClick={handleRefreshGames}
                disabled={isLoading}
                className="text-xs font-medium px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 border border-white/10"
              >
                {isLoading ? 'Scanning...' : '↻ Refresh'}
              </button>
            )}
          </div>

          {!isConnected ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-seezee-dark/30">
              <svg className="w-16 h-16 mx-auto mb-4 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-white/40 text-sm font-medium">
                Connect to your PC to manage folders
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Folder list */}
              <div className="space-y-3">
                {folders.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-white/10 rounded-xl bg-seezee-dark/30">
                    <p className="text-white/40 text-sm">
                      No custom folders added yet. Steam games are auto-detected.
                    </p>
                  </div>
                ) : (
                  folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="group/item flex items-center gap-4 px-5 py-4 bg-seezee-dark/60 rounded-xl border border-white/5 hover:border-white/20 hover:bg-seezee-dark/80 transition-all duration-200"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm ${
                        folder.type === 'tools' 
                          ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white' 
                          : 'bg-gradient-to-br from-seezee-red to-seezee-red-dark text-white'
                      }`}>
                        {folder.type === 'tools' ? '🔧' : '🎮'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{folder.label}</p>
                        <p className="text-white/40 text-xs font-mono truncate mt-0.5">{folder.path}</p>
                      </div>
                      <span className={`text-xs font-medium px-3 py-1 rounded-lg ${
                        folder.type === 'tools'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-seezee-red/20 text-seezee-red border border-seezee-red/30'
                      }`}>
                        {folder.type}
                      </span>
                      <button 
                        onClick={() => handleRemoveFolder(folder.id)}
                        disabled={isLoading}
                        className="opacity-0 group-hover/item:opacity-100 text-red-400 hover:text-red-300 text-sm px-3 py-1.5 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Folder Form */}
              {showAddFolder ? (
                <div className="p-5 bg-seezee-dark/60 rounded-xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold text-sm">Add New Folder</h3>
                    <button
                      onClick={() => {
                        setShowAddFolder(false)
                        setAddError("")
                        setNewFolderLabel("")
                        setNewFolderPath("")
                      }}
                      className="text-white/40 hover:text-white/70 transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Type selector */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setNewFolderType('games')}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        newFolderType === 'games'
                          ? 'bg-gradient-to-br from-seezee-red/30 to-seezee-red/10 border-2 border-seezee-red text-seezee-red'
                          : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      🎮 Games
                    </button>
                    <button
                      onClick={() => setNewFolderType('tools')}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        newFolderType === 'tools'
                          ? 'bg-gradient-to-br from-purple-500/30 to-purple-500/10 border-2 border-purple-500 text-purple-300'
                          : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      🔧 Tools
                    </button>
                  </div>

                  {/* Label */}
                  <div>
                    <label className="text-white/50 text-xs font-medium block mb-2 uppercase tracking-wider">Folder Label</label>
                    <input
                      type="text"
                      value={newFolderLabel}
                      onChange={(e) => setNewFolderLabel(e.target.value)}
                      placeholder="e.g., Main SSD, Epic Games"
                      className="w-full px-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-seezee-red focus:ring-2 focus:ring-seezee-red/20 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Path */}
                  <div>
                    <label className="text-white/50 text-xs font-medium block mb-2 uppercase tracking-wider">Full Path</label>
                    <input
                      type="text"
                      value={newFolderPath}
                      onChange={(e) => setNewFolderPath(e.target.value)}
                      placeholder="e.g., D:\Games"
                      className="w-full px-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-seezee-red focus:ring-2 focus:ring-seezee-red/20 focus:outline-none transition-all font-mono"
                    />
                  </div>

                  {/* Error */}
                  {addError && (
                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <p className="text-red-300 text-xs font-medium">{addError}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <button
                    onClick={handleAddFolder}
                    disabled={isLoading || !newFolderPath}
                    className="w-full relative overflow-hidden px-6 py-3.5 text-sm font-bold bg-gradient-to-r from-seezee-red to-seezee-red-dark text-white rounded-xl hover:shadow-glow transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed group"
                  >
                    <span className="relative z-10">{isLoading ? 'Adding...' : 'Add Folder'}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddFolder(true)}
                  className="
                    w-full px-6 py-4 rounded-xl
                    bg-white/5 text-white/70 font-semibold text-sm
                    hover:bg-white/10 hover:text-white border-2 border-dashed border-white/20 hover:border-white/30
                    transition-all duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-seezee-red
                  "
                >
                  + Add Custom Folder
                </button>
              )}
            </div>
          )}
        </section>

        {/* System Info Grid */}
        <div className="grid grid-cols-2 gap-6">
          <section className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] rounded-3xl p-6 border border-white/10 backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <span className="text-lg">ℹ️</span>
              </div>
              <h2 className="text-white text-lg font-semibold">System Info</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-white/50">Version</span>
                <span className="text-white font-mono font-medium">2.0.0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50">Platform</span>
                <span className="text-white font-mono font-medium">Pi 5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50">Games</span>
                <span className="text-seezee-red font-mono font-bold">{games.length}</span>
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] rounded-3xl p-6 border border-white/10 backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                <span className="text-lg">💡</span>
              </div>
              <h2 className="text-white text-lg font-semibold">Quick Stats</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-white/50">Custom Folders</span>
                <span className="text-white font-mono font-medium">{folders.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50">Connection</span>
                <span className={`font-medium ${isConnected ? 'text-seezee-red' : 'text-white/40'}`}>
                  {isConnected ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50">Lighting</span>
                <span className={`font-medium ${(goveeEnabled || signalRgbEnabled) ? 'text-purple-400' : 'text-white/40'}`}>
                  {(goveeEnabled || signalRgbEnabled) ? 'Configured' : 'Not Set'}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Theme & RGB Lighting Section */}
        <section className="group bg-gradient-to-br from-white/[0.07] to-white/[0.02] rounded-3xl p-8 border border-white/10 hover:border-purple-500/30 transition-all duration-300 backdrop-blur-sm shadow-xl">
          <h2 className="text-white text-2xl font-semibold mb-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-all duration-300">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">Theme & RGB Lighting</span>
          </h2>

          {!isConnected ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-seezee-dark/30">
              <svg className="w-16 h-16 mx-auto mb-4 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-white/40 text-sm font-medium">
                Connect to your PC to configure lighting
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Theme Selector */}
              <div>
                <label className="text-white/50 text-xs font-medium block mb-3 uppercase tracking-wider">Active Theme</label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { name: 'default', label: 'Default Red', color: 'from-red-500 to-red-700' },
                    { name: 'blue', label: 'Cool Blue', color: 'from-blue-500 to-blue-700' },
                    { name: 'purple', label: 'Purple Haze', color: 'from-purple-500 to-purple-700' },
                    { name: 'green', label: 'Matrix Green', color: 'from-green-500 to-green-700' },
                  ].map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => setActiveTheme(theme.name)}
                      className={`relative overflow-hidden p-4 rounded-xl transition-all duration-200 ${
                        activeTheme === theme.name
                          ? 'ring-2 ring-white/50 scale-105'
                          : 'hover:scale-102'
                      }`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${theme.color}`} />
                      <div className="relative text-white text-xs font-bold text-center">
                        {theme.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* RGB Custom Color Picker */}
              <div>
                <label className="text-white/50 text-xs font-medium block mb-3 uppercase tracking-wider">Custom RGB Color</label>
                <div className="p-5 bg-seezee-dark/60 rounded-xl border border-white/10 space-y-4">
                  {/* Color preview */}
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-16 h-16 rounded-xl shadow-lg border-2 border-white/20"
                      style={{ backgroundColor: `rgb(${themeRgb.r}, ${themeRgb.g}, ${themeRgb.b})` }}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-red-400 text-xs font-bold w-4">R</span>
                        <input
                          type="range"
                          min="0"
                          max="255"
                          value={themeRgb.r}
                          onChange={(e) => setThemeRgb({ ...themeRgb, r: parseInt(e.target.value) })}
                          className="flex-1 h-2 rounded-lg appearance-none bg-gradient-to-r from-black to-red-500 cursor-pointer"
                        />
                        <span className="text-white/70 text-xs font-mono w-8">{themeRgb.r}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-400 text-xs font-bold w-4">G</span>
                        <input
                          type="range"
                          min="0"
                          max="255"
                          value={themeRgb.g}
                          onChange={(e) => setThemeRgb({ ...themeRgb, g: parseInt(e.target.value) })}
                          className="flex-1 h-2 rounded-lg appearance-none bg-gradient-to-r from-black to-green-500 cursor-pointer"
                        />
                        <span className="text-white/70 text-xs font-mono w-8">{themeRgb.g}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-blue-400 text-xs font-bold w-4">B</span>
                        <input
                          type="range"
                          min="0"
                          max="255"
                          value={themeRgb.b}
                          onChange={(e) => setThemeRgb({ ...themeRgb, b: parseInt(e.target.value) })}
                          className="flex-1 h-2 rounded-lg appearance-none bg-gradient-to-r from-black to-blue-500 cursor-pointer"
                        />
                        <span className="text-white/70 text-xs font-mono w-8">{themeRgb.b}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Brightness */}
                  <div className="flex items-center gap-3">
                    <span className="text-white/50 text-xs font-medium w-20">Brightness</span>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={themeBrightness}
                      onChange={(e) => setThemeBrightness(parseInt(e.target.value))}
                      className="flex-1 h-2 rounded-lg appearance-none bg-gradient-to-r from-gray-700 to-white cursor-pointer"
                    />
                    <span className="text-white/70 text-xs font-mono w-12">{themeBrightness}%</span>
                  </div>
                </div>
              </div>

              {/* Govee Configuration */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-white/50 text-xs font-medium uppercase tracking-wider">Govee Cloud API</label>
                  <button
                    onClick={() => setGoveeEnabled(!goveeEnabled)}
                    className={`relative w-14 h-7 rounded-full transition-all duration-200 ${
                      goveeEnabled ? 'bg-seezee-red' : 'bg-white/10'
                    }`}
                  >
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                      goveeEnabled ? 'transform translate-x-7' : ''
                    }`} />
                  </button>
                </div>
                {goveeEnabled && (
                  <div className="p-5 bg-seezee-dark/60 rounded-xl border border-white/10 space-y-3">
                    <div>
                      <label className="text-white/40 text-xs font-medium block mb-2">API Key</label>
                      <input
                        type="password"
                        value={goveeApiKey}
                        onChange={(e) => setGoveeApiKey(e.target.value)}
                        placeholder="Enter your Govee API key"
                        className="w-full px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-seezee-red focus:ring-2 focus:ring-seezee-red/20 focus:outline-none transition-all font-mono"
                      />
                      <p className="text-white/30 text-xs mt-2">
                        Get your API key from the Govee Home app → Settings → Apply for API Key
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* SignalRGB Configuration */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-white/50 text-xs font-medium uppercase tracking-wider">SignalRGB (PC RGB)</label>
                  <button
                    onClick={() => setSignalRgbEnabled(!signalRgbEnabled)}
                    className={`relative w-14 h-7 rounded-full transition-all duration-200 ${
                      signalRgbEnabled ? 'bg-purple-500' : 'bg-white/10'
                    }`}
                  >
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                      signalRgbEnabled ? 'transform translate-x-7' : ''
                    }`} />
                  </button>
                </div>
                {signalRgbEnabled && (
                  <div className="p-5 bg-seezee-dark/60 rounded-xl border border-white/10 space-y-3">
                    <div>
                      <label className="text-white/40 text-xs font-medium block mb-2">SignalRGB Executable Path</label>
                      <input
                        type="text"
                        value={signalRgbPath}
                        onChange={(e) => setSignalRgbPath(e.target.value)}
                        placeholder="C:\Program Files\SignalRGB\SignalRGB.exe"
                        className="w-full px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Apply Status */}
              {themeApplyStatus && (
                <div className={`p-4 rounded-xl text-sm font-medium backdrop-blur-sm animate-fade-in ${
                  themeApplyStatus.includes('✓') 
                    ? 'bg-seezee-red/20 text-seezee-red border border-seezee-red/30' 
                    : themeApplyStatus.includes('✗')
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {themeApplyStatus}
                </div>
              )}

              {/* Apply Button */}
              <button
                onClick={saveLightingConfig}
                disabled={!isConnected}
                className="w-full relative overflow-hidden px-6 py-4 text-sm font-bold bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-xl hover:shadow-glow transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                <span className="relative z-10">🎨 Save Settings & Apply Theme</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              </button>

              <p className="text-white/30 text-xs text-center">
                Theme changes will sync to your UI and all connected RGB devices
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
