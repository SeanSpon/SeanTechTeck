"use client"

import { useState, useEffect } from "react"
import { useConnectionStore } from "@/lib/connectionStore"

interface ConnectionModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ConnectionModal({ isOpen, onClose }: ConnectionModalProps) {
  const { 
    pcIpAddress, 
    pcPort, 
    connectionType, 
    setConfig, 
    isConnected,
    testConnection,
    fetchGames
  } = useConnectionStore()

  const [localIp, setLocalIp] = useState(pcIpAddress)
  const [localPort, setLocalPort] = useState(pcPort.toString())
  const [localType, setLocalType] = useState(connectionType)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

  useEffect(() => {
    if (isOpen) {
      setLocalIp(pcIpAddress)
      setLocalPort(pcPort.toString())
      setLocalType(connectionType)
      setTestResult(null)
    }
  }, [isOpen, pcIpAddress, pcPort, connectionType])

  const handleSave = () => {
    setConfig({
      pcIpAddress: localIp,
      pcPort: parseInt(localPort) || 5555,
      connectionType: localType,
    })
    onClose()
  }

  const handleTestConnection = async () => {
    // Save config first
    setConfig({
      pcIpAddress: localIp,
      pcPort: parseInt(localPort) || 5555,
      connectionType: localType,
    })
    
    setIsTesting(true)
    setTestResult(null)
    
    // Small delay to let state update
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const success = await testConnection()
    setIsTesting(false)
    setTestResult(success ? 'success' : 'error')
    
    if (success) {
      await fetchGames()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-seezee-darker border border-seezee-green/30 rounded-2xl max-w-2xl w-full p-8 shadow-glow">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">PC Connection Setup</h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Status indicator */}
        <div className="mb-6 p-4 rounded-lg bg-seezee-dark border border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-seezee-green animate-pulse' : 'bg-white/30'}`}></div>
            <span className="text-white/70">
              {isConnected ? '✓ Connected to PC' : '○ Not Connected'}
            </span>
          </div>
        </div>

        {/* Connection Type */}
        <div className="mb-6">
          <label className="block text-white/70 mb-2 text-sm font-medium">Connection Type</label>
          <div className="grid grid-cols-3 gap-3">
            {(['wifi', 'ethernet', 'usb'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setLocalType(type)}
                className={`px-4 py-3 rounded-lg border transition-all ${
                  localType === type
                    ? 'bg-seezee-green/20 border-seezee-green text-seezee-green'
                    : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* PC IP Address */}
        <div className="mb-4">
          <label className="block text-white/70 mb-2 text-sm font-medium">
            PC IP Address
          </label>
          <input
            type="text"
            value={localIp}
            onChange={(e) => setLocalIp(e.target.value)}
            placeholder="192.168.1.100"
            className="w-full px-4 py-3 bg-seezee-dark border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-seezee-green focus:outline-none transition-colors"
          />
          <p className="text-white/40 text-xs mt-1">Find this in your PC's network settings</p>
        </div>

        {/* Port */}
        <div className="mb-6">
          <label className="block text-white/70 mb-2 text-sm font-medium">Port</label>
          <input
            type="text"
            value={localPort}
            onChange={(e) => setLocalPort(e.target.value)}
            placeholder="5555"
            className="w-full px-4 py-3 bg-seezee-dark border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-seezee-green focus:outline-none transition-colors"
          />
        </div>

        {/* Test result message */}
        {testResult && (
          <div className={`mb-6 p-3 rounded-lg text-sm ${
            testResult === 'success' 
              ? 'bg-seezee-green/20 text-seezee-green border border-seezee-green/30' 
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {testResult === 'success' 
              ? '✓ Connection successful! Games loaded.' 
              : `✗ Connection failed. Make sure the server is running on ${localIp}:${localPort}`
            }
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleTestConnection}
            disabled={isTesting || !localIp}
            className="flex-1 px-6 py-3 bg-seezee-cyan/20 border border-seezee-cyan text-seezee-cyan rounded-lg hover:bg-seezee-cyan/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-seezee-green text-seezee-dark rounded-lg hover:shadow-glow transition-all font-bold"
          >
            Save Configuration
          </button>
        </div>

        {/* Help text */}
        <div className="mt-6 p-4 bg-seezee-blue/10 border border-seezee-blue/30 rounded-lg">
          <p className="text-white/60 text-sm">
            💡 <strong className="text-white/80">Need help?</strong> Run the SeeZee PC Server on your gaming PC, then enter its IP address above.
          </p>
        </div>
      </div>
    </div>
  )
}
