"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import ReactiveBackground from "@/components/ReactiveBackground"
import { useConnectionStore } from "@/lib/connectionStore"

interface Theme {
  name: string
  rgb: { r: number; g: number; b: number }
  brightness: number
}

interface GoveeDevice {
  device: string
  model: string
  deviceName: string
  controllable: boolean
  retrievable: boolean
  supportCmds: string[]
  properties?: {
    online?: boolean
  }
}

interface LogEntry {
  timestamp: string
  type: 'info' | 'warning' | 'error' | 'success'
  message: string
}

export default function LightingPage() {
  const router = useRouter()
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(null)
  const [themeLoading, setThemeLoading] = useState(false)
  const [devices, setDevices] = useState<GoveeDevice[]>([])
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set())
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)
  const logContainerRef = useRef<HTMLDivElement>(null)
  const { pcIpAddress, isConnected } = useConnectionStore()

  const COOLDOWN_SECONDS = 60
  const MAX_DEVICES = 5

  useEffect(() => {
    loadCurrentTheme()
    loadDevices()
    
    // Cooldown timer
    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - lastUpdateTime) / 1000)
      const remaining = Math.max(0, COOLDOWN_SECONDS - elapsed)
      setCooldownRemaining(remaining)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [pcIpAddress, lastUpdateTime])

  const addLog = (type: LogEntry['type'], message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { timestamp, type, message }].slice(-50)) // Keep last 50 logs
    
    // Auto-scroll to bottom
    setTimeout(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
      }
    }, 100)
  }

  const loadDevices = async () => {
    if (!pcIpAddress) return
    
    addLog('info', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    addLog('info', '🔍 Fetching Govee devices from API...')
    
    try {
      const response = await fetch(`http://${pcIpAddress}:5555/api/lighting/govee/devices`)
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.api_response?.data?.devices) {
          const deviceList = data.api_response.data.devices
          setDevices(deviceList)
          
          addLog('success', `✓ Found ${deviceList.length} Govee device(s)`)
          
          // Log device details
          deviceList.forEach((device: GoveeDevice, index: number) => {
            const controllable = device.controllable ? '✓' : '✗'
            const online = device.properties?.online !== false ? 'Online' : 'Offline'
            addLog('info', `  ${index + 1}. ${device.deviceName}`)
            addLog('info', `     Model: ${device.model} | MAC: ...${device.device.slice(-8)}`)
            addLog('info', `     Control: ${controllable} | Status: ${online}`)
          })
          
          // Log API stats
          if (data.configured_devices !== undefined) {
            addLog('info', `📊 API Stats:`)
            addLog('info', `   Configured in settings: ${data.configured_devices}`)
            addLog('info', `   Available via API: ${data.api_devices}`)
            addLog('info', `   Matches: ${data.matches}`)
            
            if (data.missing_in_config?.length > 0) {
              addLog('warning', `   ⚠️  Not configured: ${data.missing_in_config.length} device(s)`)
            }
            if (data.invalid_in_config?.length > 0) {
              addLog('error', `   ✗ Invalid MACs: ${data.invalid_in_config.length}`)
            }
          }
          
          // Auto-select first 5 devices if none selected
          if (selectedDevices.size === 0 && deviceList.length > 0) {
            const autoSelect = new Set(
              deviceList.slice(0, MAX_DEVICES).map((d: GoveeDevice) => d.device)
            )
            setSelectedDevices(autoSelect)
            addLog('success', `✓ Auto-selected ${autoSelect.size} device(s) for control`)
          }
        } else {
          addLog('error', '✗ Invalid response from Govee API')
          addLog('error', `Response: ${JSON.stringify(data).substring(0, 100)}`)
        }
      } else {
        addLog('error', `✗ API request failed: HTTP ${response.status}`)
        try {
          const errorData = await response.json()
          addLog('error', `Error: ${errorData.error || 'Unknown error'}`)
        } catch {
          addLog('error', 'Could not parse error response')
        }
      }
    } catch (error) {
      addLog('error', `✗ Network error: ${error}`)
      addLog('error', `Check server connection to ${pcIpAddress}:5555`)
      console.error('Failed to load devices:', error)
    }
    
    addLog('info', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }

  useEffect(() => {
    loadCurrentTheme()
    loadDevices()
  }, [pcIpAddress])

  const loadCurrentTheme = async () => {
    if (!pcIpAddress) return
    
    try {
      const response = await fetch(`http://${pcIpAddress}:5555/api/theme/current`)
      if (response.ok) {
        const data = await response.json()
        setCurrentTheme(data.theme)
      }
    } catch (error) {
      console.error('Failed to load theme:', error)
    }
  }

  const applyTheme = async (name: string, rgb: { r: number; g: number; b: number }) => {
    if (!pcIpAddress) {
      addLog('error', '✗ Not connected to PC server')
      alert('Not connected to PC server')
      return
    }
    
    // Check cooldown
    const now = Date.now()
    const elapsed = Math.floor((now - lastUpdateTime) / 1000)
    if (elapsed < COOLDOWN_SECONDS) {
      const remaining = COOLDOWN_SECONDS - elapsed
      addLog('warning', `⏳ Rate limit active: ${remaining}s remaining`)
      return
    }
    
    if (selectedDevices.size === 0) {
      addLog('warning', '⚠️  No devices selected - select up to 5 devices')
      return
    }
    
    setThemeLoading(true)
    addLog('info', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    addLog('info', `🎨 Starting theme application: "${name}"`)
    addLog('info', `📡 Target: ${selectedDevices.size} selected device(s)`)
    addLog('info', `🎨 RGB: (${rgb.r}, ${rgb.g}, ${rgb.b})`)
    
    try {
      const response = await fetch(`http://${pcIpAddress}:5555/api/theme/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rgb })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setLastUpdateTime(now)
        addLog('success', `✓ API request successful`)
        
        // Log detailed results
        if (data.results) {
          const results = data.results
          
          // SignalRGB results
          if (results.signalrgb) {
            if (results.signalrgb.success) {
              addLog('success', `✓ SignalRGB: Profile switched to "${results.signalrgb.profile}"`)
            } else {
              addLog('error', `✗ SignalRGB: ${results.signalrgb.error}`)
            }
          }
          
          // Govee device results
          if (results.govee && Array.isArray(results.govee)) {
            addLog('info', `💡 Govee: Processing ${results.govee.length} device(s)`)
            
            let successCount = 0
            let failCount = 0
            let cachedCount = 0
            
            results.govee.forEach((deviceResult: any) => {
              const deviceName = deviceResult.device || 'Unknown'
              const result = deviceResult.result
              
              if (result.success) {
                if (result.cached) {
                  cachedCount++
                  addLog('info', `  ↻ ${deviceName}: Already at target color (cached)`)
                } else {
                  successCount++
                  addLog('success', `  ✓ ${deviceName}: Color updated successfully`)
                }
              } else {
                failCount++
                addLog('error', `  ✗ ${deviceName}: ${result.error || 'Failed'}`)
              }
            })
            
            addLog('info', `📊 Results: ${successCount} updated, ${cachedCount} cached, ${failCount} failed`)
          }
          
          // LAN lights results
          if (results.lan) {
            if (results.lan.success) {
              addLog('success', `✓ LAN Lights: Updated successfully`)
            } else {
              addLog('warning', `⚠️  LAN Lights: ${results.lan.error}`)
            }
          }
        }
        
        addLog('success', `✓ Theme "${name}" applied successfully`)
        addLog('info', `⏱️  Next update available in ${COOLDOWN_SECONDS}s`)
        await loadCurrentTheme()
      } else {
        addLog('error', `✗ API request failed: HTTP ${response.status}`)
        if (data.error) {
          addLog('error', `✗ Error details: ${data.error}`)
        }
      }
    } catch (error) {
      addLog('error', `✗ Network error: ${error}`)
      addLog('error', `✗ Check if server is running on ${pcIpAddress}:5555`)
      console.error('Failed to apply theme:', error)
    } finally {
      setThemeLoading(false)
      addLog('info', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    }
  }

  const toggleDevice = (deviceMac: string) => {
    setSelectedDevices(prev => {
      const newSet = new Set(prev)
      if (newSet.has(deviceMac)) {
        newSet.delete(deviceMac)
        addLog('info', `Deselected device ${deviceMac.slice(-8)}`)
      } else {
        if (newSet.size >= MAX_DEVICES) {
          addLog('warning', `Maximum ${MAX_DEVICES} devices allowed`)
          return prev
        }
        newSet.add(deviceMac)
        addLog('info', `Selected device ${deviceMac.slice(-8)}`)
      }
      return newSet
    })
  }

  const themes = [
    { name: 'Gaming Red', rgb: { r: 255, g: 30, b: 30 }, emoji: '🔴', label: 'Gaming' },
    { name: 'Chill Blue', rgb: { r: 30, g: 144, b: 255 }, emoji: '🔵', label: 'Chill' },
    { name: 'Movie Purple', rgb: { r: 138, g: 43, b: 226 }, emoji: '🟣', label: 'Movie' },
    { name: 'Sunset Orange', rgb: { r: 255, g: 120, b: 0 }, emoji: '🟠', label: 'Sunset' },
    { name: 'Mint Green', rgb: { r: 50, g: 205, b: 50 }, emoji: '🟢', label: 'Mint' },
    { name: 'Pure White', rgb: { r: 255, g: 255, b: 255 }, emoji: '⚪', label: 'White' },
  ]

  return (
    <div className="h-screen w-screen flex flex-col bg-seezee-dark relative">
      <ReactiveBackground />
      
      {/* Fixed Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-seezee-dark/95 backdrop-blur-md border-b border-white/10 z-20">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-seezee-red hover:text-seezee-red-bright transition-colors mb-3 text-sm font-medium flex items-center gap-2"
        >
          <span className="text-xl">←</span> Back to Hub
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-2xl font-bold">💡 Lighting Control</h2>
            <p className="text-white/50 text-sm">
              {devices.length} devices • {selectedDevices.size}/{MAX_DEVICES} selected
            </p>
          </div>

          {/* Cooldown Timer */}
          <div className="flex items-center gap-4">
            {cooldownRemaining > 0 && (
              <div className="px-4 py-2 bg-orange-500/20 border border-orange-500/40 rounded-lg">
                <span className="text-orange-400 font-mono text-sm">
                  ⏳ Cooldown: {cooldownRemaining}s
                </span>
              </div>
            )}
            
            {currentTheme && (
              <div className="flex items-center gap-3">
                <span className="text-white/50 text-sm">Active:</span>
                <div 
                  className="w-10 h-10 rounded-full border-2 border-white/40"
                  style={{
                    backgroundColor: `rgb(${currentTheme.rgb.r}, ${currentTheme.rgb.g}, ${currentTheme.rgb.b})`,
                    boxShadow: `0 0 20px rgba(${currentTheme.rgb.r}, ${currentTheme.rgb.g}, ${currentTheme.rgb.b}, 0.6)`
                  }}
                />
                <span className="text-white font-medium text-sm">{currentTheme.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <main className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left: Themes */}
        <div className="flex-1 flex flex-col gap-4">
          {!isConnected && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400">⚠️ Not connected to PC server</p>
            </div>
          )}

          {/* Theme Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 gap-4">
              {themes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => applyTheme(theme.name, theme.rgb)}
                  disabled={themeLoading || !isConnected || cooldownRemaining > 0}
                  className={`
                    relative rounded-2xl p-6 border-2 transition-all duration-300
                    bg-black/40
                    active:scale-95 touch-manipulation
                    ${currentTheme?.name === theme.name
                      ? 'border-white scale-105'
                      : 'border-white/20 hover:border-white/50'
                    }
                    ${themeLoading || !isConnected || cooldownRemaining > 0 ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  style={{
                    minHeight: '140px',
                    boxShadow: currentTheme?.name === theme.name 
                      ? `0 0 30px rgba(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b}, 0.5)` 
                      : 'none'
                  }}
                >
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="text-5xl">{theme.emoji}</div>
                    <div 
                      className="w-full h-3 rounded-full"
                      style={{ 
                        backgroundColor: `rgb(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b})`,
                        boxShadow: `0 0 10px rgba(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b}, 0.4)`
                      }}
                    />
                    <div className="text-white text-lg font-bold">
                      {theme.label}
                    </div>
                    {currentTheme?.name === theme.name && (
                      <div className="text-seezee-red text-xs">✓ Active</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Terminal + Devices */}
        <div className="w-1/3 flex flex-col gap-4">
          {/* Device Selection */}
          <div className="bg-black/60 border border-white/20 rounded-xl p-4">
            <h3 className="text-white font-bold mb-3 flex items-center justify-between">
              <span>🔗 Devices</span>
              <button
                onClick={loadDevices}
                className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white/70 hover:text-white transition-colors"
              >
                Refresh
              </button>
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {devices.length === 0 ? (
                <p className="text-white/40 text-sm">No devices found</p>
              ) : (
                devices.map(device => (
                  <button
                    key={device.device}
                    onClick={() => toggleDevice(device.device)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg transition-all text-sm
                      ${selectedDevices.has(device.device)
                        ? 'bg-seezee-red/20 border border-seezee-red/50 text-white'
                        : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{device.deviceName}</span>
                      {selectedDevices.has(device.device) && (
                        <span className="text-seezee-red">✓</span>
                      )}
                    </div>
                    <div className="text-xs text-white/40 font-mono">
                      {device.model} • {device.device.slice(-8)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Terminal Log */}
          <div className="flex-1 bg-black/80 border border-white/20 rounded-xl p-4 flex flex-col">
            <h3 className="text-white font-bold mb-3 font-mono">📟 Terminal</h3>
            <div 
              ref={logContainerRef}
              className="flex-1 overflow-y-auto font-mono text-xs space-y-1"
            >
              {logs.length === 0 ? (
                <p className="text-white/40">Waiting for activity...</p>
              ) : (
                logs.map((log, i) => (
                  <div 
                    key={i}
                    className={`
                      ${log.type === 'info' ? 'text-blue-400' : ''}
                      ${log.type === 'success' ? 'text-green-400' : ''}
                      ${log.type === 'warning' ? 'text-orange-400' : ''}
                      ${log.type === 'error' ? 'text-red-400' : ''}
                    `}
                  >
                    <span className="text-white/40">[{log.timestamp}]</span> {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
