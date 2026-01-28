"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
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

  // Load folders when connected
  useEffect(() => {
    if (isConnected && pcIpAddress) {
      fetchFolders()
    }
  }, [isConnected, pcIpAddress, fetchFolders])

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

      <main className="max-w-4xl mx-auto px-8 py-8 space-y-8">
        {/* PC Connection Section */}
        <section className="bg-white/5 rounded-2xl p-6 border border-white/5">
          <h2 className="text-white text-xl font-semibold mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-seezee-red to-seezee-charcoal flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            PC Connection
          </h2>

          {/* Status */}
          <div className="mb-4 flex items-center justify-between p-3 bg-seezee-dark rounded-lg">
            <span className="text-white/70 text-sm">Status</span>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm ${isConnected ? 'bg-seezee-green/20 text-seezee-red' : 'bg-white/5 text-white/50'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-seezee-red animate-pulse' : 'bg-white/30'}`} />
              {isConnected ? 'Connected' : 'Not Connected'}
            </div>
          </div>

          {/* Compact form */}
          <div className="space-y-3">
            {/* Connection Type - Horizontal */}
            <div>
              <label className="text-white/70 text-xs block mb-2">Connection Type</label>
              <div className="flex gap-2">
                {(['wifi', 'ethernet', 'usb'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setLocalType(type)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs transition-all ${
                      localType === type
                        ? 'bg-seezee-green/20 border border-seezee-red text-seezee-red'
                        : 'bg-white/5 border border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* IP and Port - Side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/70 text-xs block mb-1">PC IP Address</label>
                <input
                  type="text"
                  value={localIp}
                  onChange={(e) => setLocalIp(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-2 text-sm bg-seezee-dark border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-seezee-red focus:outline-none"
                />
              </div>
              <div>
                <label className="text-white/70 text-xs block mb-1">Port</label>
                <input
                  type="text"
                  value={localPort}
                  onChange={(e) => setLocalPort(e.target.value)}
                  placeholder="5555"
                  className="w-full px-3 py-2 text-sm bg-seezee-dark border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-seezee-red focus:outline-none"
                />
              </div>
            </div>

            {/* Test result message */}
            {testResult && (
              <div className={`p-3 rounded-lg text-sm ${
                testResult === 'success' 
                  ? 'bg-seezee-green/20 text-seezee-red border border-seezee-green/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {testResult === 'success' 
                  ? '✓ Connection successful! Games loaded.' 
                  : `✗ Connection failed. Make sure the server is running on ${localIp}:${localPort}`
                }
              </div>
            )}

            {/* Compact action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleTestConnection}
                disabled={isTesting || !localIp}
                className="flex-1 px-4 py-2 text-sm bg-seezee-red/20 border border-seezee-red text-seezee-red rounded-lg hover:bg-seezee-red/30 transition-all disabled:opacity-50"
              >
                {isTesting ? 'Testing...' : 'Test & Connect'}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 text-sm bg-seezee-red text-seezee-dark rounded-lg hover:shadow-glow transition-all font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </section>

        {/* Game & Tool Folders Section */}
        <section className="bg-white/5 rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xl font-semibold flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-seezee-red to-seezee-red flex items-center justify-center">
                <svg className="w-5 h-5 text-seezee-dark" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                </svg>
              </div>
              Game & Tool Folders
            </h2>
            {isConnected && (
              <button
                onClick={handleRefreshGames}
                disabled={isLoading}
                className="text-xs px-3 py-1 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Scanning...' : '↻ Scan'}
              </button>
            )}
          </div>

          {!isConnected ? (
            <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
              <p className="text-white/40 text-sm">
                Connect to your PC to manage folders
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Folder list */}
              <div className="space-y-2">
                {folders.length === 0 ? (
                  <p className="text-white/40 text-sm py-4 text-center border border-dashed border-white/10 rounded-xl">
                    No custom folders added yet. Steam games are auto-detected.
                  </p>
                ) : (
                  folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center gap-3 px-4 py-3 bg-seezee-dark rounded-lg border border-white/5"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        folder.type === 'tools' 
                          ? 'bg-purple-500/20 text-purple-400' 
                          : 'bg-seezee-green/20 text-seezee-red'
                      }`}>
                        {folder.type === 'tools' ? 'T' : 'G'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{folder.label}</p>
                        <p className="text-white/40 text-xs font-mono truncate">{folder.path}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        folder.type === 'tools'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-seezee-green/20 text-seezee-red'
                      }`}>
                        {folder.type}
                      </span>
                      <button 
                        onClick={() => handleRemoveFolder(folder.id)}
                        disabled={isLoading}
                        className="text-red-400 hover:text-red-300 text-sm px-2 py-1 hover:bg-red-500/10 rounded transition-all disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Folder Form */}
              {showAddFolder ? (
                <div className="p-4 bg-seezee-dark rounded-xl border border-white/10 space-y-3">
                  <h3 className="text-white font-medium text-sm">Add New Folder</h3>
                  
                  {/* Type selector */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewFolderType('games')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${
                        newFolderType === 'games'
                          ? 'bg-seezee-green/20 border border-seezee-red text-seezee-red'
                          : 'bg-white/5 border border-white/10 text-white/60'
                      }`}
                    >
                      Games
                    </button>
                    <button
                      onClick={() => setNewFolderType('tools')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${
                        newFolderType === 'tools'
                          ? 'bg-purple-500/20 border border-purple-500 text-purple-400'
                          : 'bg-white/5 border border-white/10 text-white/60'
                      }`}
                    >
                      Tools
                    </button>
                  </div>

                  {/* Label */}
                  <input
                    type="text"
                    value={newFolderLabel}
                    onChange={(e) => setNewFolderLabel(e.target.value)}
                    placeholder="Label (e.g., Main SSD, Epic Games)"
                    className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-seezee-red focus:outline-none"
                  />

                  {/* Path */}
                  <input
                    type="text"
                    value={newFolderPath}
                    onChange={(e) => setNewFolderPath(e.target.value)}
                    placeholder="Full path (e.g., D:\Games)"
                    className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-seezee-red focus:outline-none font-mono"
                  />

                  {/* Error */}
                  {addError && (
                    <p className="text-red-400 text-xs">{addError}</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowAddFolder(false)
                        setAddError("")
                        setNewFolderLabel("")
                        setNewFolderPath("")
                      }}
                      className="flex-1 px-4 py-2 text-sm bg-white/5 text-white/60 rounded-lg hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddFolder}
                      disabled={isLoading || !newFolderPath}
                      className="flex-1 px-4 py-2 text-sm bg-seezee-red text-seezee-dark rounded-lg hover:shadow-glow transition-all font-medium disabled:opacity-50"
                    >
                      {isLoading ? 'Adding...' : 'Add Folder'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddFolder(true)}
                  className="
                    w-full px-6 py-3 rounded-xl
                    bg-white/5 text-white/70 font-medium
                    hover:bg-white/10 hover:text-white
                    transition-all duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-seezee-red
                    border border-white/10
                  "
                >
                  + Add Folder
                </button>
              )}
            </div>
          )}
        </section>

        {/* System Info */}
        <section className="bg-white/5 rounded-2xl p-6 border border-white/5">
          <h2 className="text-white text-xl font-semibold mb-4">System Info</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/40">Version</p>
              <p className="text-white font-mono">2.0.0-beta</p>
            </div>
            <div>
              <p className="text-white/40">Target Platform</p>
              <p className="text-white font-mono">Raspberry Pi 5</p>
            </div>
            <div>
              <p className="text-white/40">PC Server</p>
              <p className={`font-mono ${isConnected ? 'text-seezee-red' : 'text-white/50'}`}>
                {isConnected ? `${pcIpAddress}:${pcPort}` : 'Not connected'}
              </p>
            </div>
            <div>
              <p className="text-white/40">Games Detected</p>
              <p className="text-white font-mono">
                {games.length} {isConnected ? '' : '(demo)'}
              </p>
            </div>
            <div>
              <p className="text-white/40">Custom Folders</p>
              <p className="text-white font-mono">{folders.length}</p>
            </div>
            <div>
              <p className="text-white/40">Connection</p>
              <p className="text-white font-mono capitalize">{connectionType}</p>
            </div>
          </div>
        </section>

        {/* RGB Lighting Control */}
        <section className="bg-white/5 rounded-2xl p-6 border border-white/5">
          <h2 className="text-white text-xl font-semibold mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-seezee-red flex items-center justify-center">
              💡
            </div>
            RGB Lighting
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-seezee-dark rounded-lg border border-white/10">
              <h3 className="text-white text-sm font-semibold mb-2">Setup Instructions</h3>
              <ol className="text-white/60 text-xs space-y-1 list-decimal list-inside">
                <li>Enable Govee: Add API key in <code className="text-seezee-red">seezee_config.json</code></li>
                <li>Enable SignalRGB: Create profiles named <code className="text-seezee-red">SeeZee-Red</code>, <code className="text-seezee-red">SeeZee-Chill</code>, <code className="text-seezee-red">SeeZee-Movie</code></li>
                <li>Test themes from Dashboard lighting tiles</li>
              </ol>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-seezee-dark rounded-lg">
                <p className="text-white/40 text-xs mb-1">SignalRGB</p>
                <p className="text-white/70 text-sm">Not configured</p>
              </div>
              <div className="p-3 bg-seezee-dark rounded-lg">
                <p className="text-white/40 text-xs mb-1">Govee Devices</p>
                <p className="text-white/70 text-sm">Not configured</p>
              </div>
            </div>

            <p className="text-white/40 text-xs">
              Configure devices in <code className="text-seezee-red font-mono">seezee_config.json</code> on your PC. 
              Restart server to apply changes.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
