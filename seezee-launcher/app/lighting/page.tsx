"use client"

import { useState, useEffect, useRef } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"
import { useRouter } from "next/navigation"
import ReactiveBackground from "@/components/ReactiveBackground"
import { useConnectionStore } from "@/lib/connectionStore"
import { useTheme } from "@/lib/themeContext"

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

type HSV = { h: number; s: number; v: number }

const rgbToHsv = (rgb: { r: number; g: number; b: number }): HSV => {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h = Math.round(h * 60)
    if (h < 0) h += 360
  }

  const s = max === 0 ? 0 : delta / max
  const v = max
  return { h, s, v }
}

const hsvToRgb = (hsv: HSV) => {
  const h = hsv.h / 60
  const c = hsv.v * hsv.s
  const x = c * (1 - Math.abs((h % 2) - 1))
  const m = hsv.v - c

  let r = 0, g = 0, b = 0
  if (h >= 0 && h < 1) [r, g, b] = [c, x, 0]
  else if (h >= 1 && h < 2) [r, g, b] = [x, c, 0]
  else if (h >= 2 && h < 3) [r, g, b] = [0, c, x]
  else if (h >= 3 && h < 4) [r, g, b] = [0, x, c]
  else if (h >= 4 && h < 5) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

export default function LightingPage() {
  const router = useRouter()
  const [devices, setDevices] = useState<GoveeDevice[]>([])
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set())
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)
  
  // Control settings
  const [delayBetweenCommands, setDelayBetweenCommands] = useState<number>(1.1)
  const [controlMode, setControlMode] = useState<'all' | 'individual'>('all')
  const [selectedColor, setSelectedColor] = useState({ r: 255, g: 30, b: 30 })
  const [brightness, setBrightness] = useState(80)
  const [enableSignalRGB, setEnableSignalRGB] = useState(true)
  const [enableGovee, setEnableGovee] = useState(true)
  
  // UI states
  const [executePending, setExecutePending] = useState(false)
  
  const logContainerRef = useRef<HTMLDivElement>(null)
  const colorWheelRef = useRef<HTMLCanvasElement>(null)
  const isDraggingRef = useRef(false)
  const { pcIpAddress, pcPort, isConnected, getServerUrl } = useConnectionStore()
  const { setAccentRgb } = useTheme()

  const WHEEL_SIZE = 240
  const WHEEL_RADIUS = WHEEL_SIZE / 2

  const COOLDOWN_SECONDS = 60
  const MAX_DEVICES = 5

  useEffect(() => {
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

  useEffect(() => {
    const canvas = colorWheelRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const image = ctx.createImageData(WHEEL_SIZE, WHEEL_SIZE)
    const data = image.data
    const center = WHEEL_RADIUS

    for (let y = 0; y < WHEEL_SIZE; y++) {
      for (let x = 0; x < WHEEL_SIZE; x++) {
        const dx = x - center
        const dy = y - center
        const dist = Math.sqrt(dx * dx + dy * dy)
        const index = (y * WHEEL_SIZE + x) * 4

        if (dist > WHEEL_RADIUS) {
          data[index + 3] = 0
          continue
        }

        const angle = Math.atan2(dy, dx)
        const hue = ((angle * 180) / Math.PI + 360) % 360
        const saturation = Math.min(1, dist / WHEEL_RADIUS)
        const rgb = hsvToRgb({ h: hue, s: saturation, v: 1 })

        data[index] = rgb.r
        data[index + 1] = rgb.g
        data[index + 2] = rgb.b
        data[index + 3] = 255
      }
    }

    ctx.putImageData(image, 0, 0)
  }, [])

  const addLog = (type: LogEntry['type'], message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { timestamp, type, message }].slice(-100))
    
    setTimeout(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
      }
    }, 100)
  }

  const loadDevices = async () => {
    if (!pcIpAddress) return
    
    addLog('info', '🔍 Loading Govee devices...')
    
    try {
      const baseUrl = getServerUrl()
      const response = await fetch(`${baseUrl}/api/lighting/govee/devices`)
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && Array.isArray(data.devices)) {
          setDevices(data.devices)
          addLog('success', `✓ Found ${data.devices.length} Govee device(s)`)
          
          // Auto-select first 5 devices
          if (selectedDevices.size === 0 && data.devices.length > 0) {
            const autoSelect: Set<string> = new Set(
              (data.devices as GoveeDevice[])
                .slice(0, MAX_DEVICES)
                .map((d) => d.device)
            )
            setSelectedDevices(autoSelect)
          }
        }
      } else {
        const text = await response.text().catch(() => "")
        addLog('error', `✗ Device list failed: HTTP ${response.status}${text ? ` — ${text}` : ''}`)
      }
    } catch (error) {
      addLog('error', `✗ Failed to load devices: ${error}`)
    }
  }

  const executeColorCommand = async () => {
    if (!pcIpAddress) {
      addLog('error', '✗ Not connected to PC')
      return
    }

    // Check cooldown
    const now = Date.now()
    const elapsed = Math.floor((now - lastUpdateTime) / 1000)
    if (elapsed < COOLDOWN_SECONDS) {
      const remaining = COOLDOWN_SECONDS - elapsed
      addLog('warning', `⏳ Cooldown: ${remaining}s remaining`)
      return
    }

    if (enableGovee && selectedDevices.size === 0) {
      addLog('warning', '⚠️  No devices selected')
      return
    }

    setExecutePending(true)
    addLog('info', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    addLog('info', `🎨 Executing lighting command`)
    addLog('info', `   RGB: (${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`)
    addLog('info', `   Brightness: ${brightness}%`)
    addLog('info', `   Mode: ${controlMode === 'all' ? 'All devices' : 'Individual'}`)
    addLog('info', `   Delay: ${delayBetweenCommands}s between commands`)
    
    try {
      if (controlMode === 'all') {
        // Send to all selected devices
        const baseUrl = getServerUrl()
        const response = await fetch(`${baseUrl}/api/lighting/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            devices: Array.from(selectedDevices),
            rgb: selectedColor,
            brightness,
            delay: delayBetweenCommands,
            enableSignalRGB,
            enableGovee
          })
        })

        if (!response.ok) {
          addLog('error', `✗ HTTP ${response.status}`)
          throw new Error(`Failed: ${response.status}`)
        }

        const data = await response.json()
        
        if (data.govee) {
          if (data.govee.queued) {
            addLog('success', `✓ Queued ${data.govee.queued} device(s)`)
            const totalTime = data.govee.queued * delayBetweenCommands
            addLog('info', `⏱️  ETA: ~${totalTime.toFixed(1)}s`)
          }
        }
        
        if (data.signalrgb) {
          addLog('success', `✓ SignalRGB: ${data.signalrgb.message || 'Applied'}`)
        }
      } else {
        // Individual mode - send one at a time from UI
        addLog('info', `🔄 Individual mode: Send commands one-by-one`)
        for (const deviceMac of selectedDevices) {
          const device = devices.find(d => d.device === deviceMac)
          if (!device) continue
          
          addLog('info', `→ Sending to ${device.deviceName}...`)
          
          const baseUrl = getServerUrl()
          const response = await fetch(`${baseUrl}/api/lighting/device`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              device: deviceMac,
              rgb: selectedColor,
              brightness
            })
          })
          
          if (response.ok) {
            addLog('success', `✓ ${device.deviceName} updated`)
          } else {
            addLog('error', `✗ ${device.deviceName} failed`)
          }
          
          // Wait between commands in individual mode
          if (Array.from(selectedDevices).indexOf(deviceMac) < selectedDevices.size - 1) {
            addLog('info', `⏳ Waiting ${delayBetweenCommands}s...`)
            await new Promise(resolve => setTimeout(resolve, delayBetweenCommands * 1000))
          }
        }
      }
      
      setLastUpdateTime(Date.now())
      // Tie UI accent to the last successfully-applied lighting color.
      setAccentRgb(selectedColor)
      addLog('success', `✓ Command execution complete`)
      
    } catch (error) {
      addLog('error', `✗ Error: ${error}`)
    } finally {
      setExecutePending(false)
      addLog('info', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    }
  }

  const toggleDevice = (deviceMac: string) => {
    setSelectedDevices(prev => {
      const newSet = new Set(prev)
      if (newSet.has(deviceMac)) {
        newSet.delete(deviceMac)
      } else {
        if (newSet.size >= MAX_DEVICES) {
          addLog('warning', `Maximum ${MAX_DEVICES} devices`)
          return prev
        }
        newSet.add(deviceMac)
      }
      return newSet
    })
  }

  const handleWheelPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const dx = x - WHEEL_RADIUS
    const dy = y - WHEEL_RADIUS
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), WHEEL_RADIUS)
    const angle = Math.atan2(dy, dx)
    const hue = ((angle * 180) / Math.PI + 360) % 360
    const saturation = dist / WHEEL_RADIUS
    const rgb = hsvToRgb({ h: hue, s: saturation, v: 1 })
    setSelectedColor(rgb)
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-seezee-dark relative">
      <ReactiveBackground />
      
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 bg-seezee-dark/95 backdrop-blur-md border-b border-white/10 z-20">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-seezee-red hover:text-seezee-red-bright transition-colors mb-3 text-sm font-medium flex items-center gap-2"
        >
          <span className="text-xl">←</span> Back to Hub
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-3xl font-bold mb-1">💡 Advanced Lighting Control</h2>
            <p className="text-white/50 text-sm">
              {devices.length} devices • {selectedDevices.size} selected
              {enableGovee && enableSignalRGB && ' • Full sync enabled'}
            </p>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-3">
            {cooldownRemaining > 0 && (
              <div className="px-4 py-2 bg-orange-500/20 border border-orange-500/40 rounded-lg">
                <span className="text-orange-400 font-mono text-sm">
                  ⏳ {cooldownRemaining}s
                </span>
              </div>
            )}
            
            {/* Color preview */}
            <div className="flex items-center gap-3 bg-black/40 border border-white/20 rounded-lg px-4 py-2">
              <span className="text-white/60 text-sm">Preview:</span>
              <div 
                className="w-12 h-12 rounded-lg border-2 border-white/40 transition-all"
                style={{
                  backgroundColor: `rgb(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`,
                  boxShadow: `0 0 20px rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, 0.6)`,
                  filter: `brightness(${brightness}%)`
                }}
              />
              <div className="text-white/60 text-xs font-mono">
                RGB({selectedColor.r}, {selectedColor.g}, {selectedColor.b})
                <br/>
                {brightness}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex gap-4 p-4 overflow-hidden">
        
        {/* Left Column: Color Selection & Controls */}
        <div className="w-1/2 flex flex-col gap-4 overflow-y-auto">
          
          {/* Color Wheel */}
          <div className="bg-black/60 border border-white/20 rounded-xl p-4">
            <h3 className="text-white font-bold text-lg mb-4">🎨 Color Wheel</h3>
            <div className="flex flex-col items-center gap-4">
              <div className="relative" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
                <canvas
                  ref={colorWheelRef}
                  width={WHEEL_SIZE}
                  height={WHEEL_SIZE}
                  className="rounded-full cursor-crosshair"
                  onPointerDown={(e) => {
                    isDraggingRef.current = true
                    e.currentTarget.setPointerCapture(e.pointerId)
                    handleWheelPointer(e)
                  }}
                  onPointerMove={(e) => {
                    if (isDraggingRef.current) handleWheelPointer(e)
                  }}
                  onPointerUp={(e) => {
                    isDraggingRef.current = false
                    e.currentTarget.releasePointerCapture(e.pointerId)
                  }}
                  onPointerLeave={() => {
                    isDraggingRef.current = false
                  }}
                />
                {(() => {
                  const hsv = rgbToHsv(selectedColor)
                  const angle = (hsv.h * Math.PI) / 180
                  const radius = hsv.s * WHEEL_RADIUS
                  const x = WHEEL_RADIUS + Math.cos(angle) * radius
                  const y = WHEEL_RADIUS + Math.sin(angle) * radius
                  return (
                    <div
                      className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg"
                      style={{
                        left: x - 8,
                        top: y - 8,
                        backgroundColor: `rgb(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`
                      }}
                    />
                  )
                })()}
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg border border-white/30"
                  style={{ backgroundColor: `rgb(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})` }}
                />
                <div className="text-white/60 text-xs font-mono">
                  RGB({selectedColor.r}, {selectedColor.g}, {selectedColor.b})
                </div>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="bg-black/60 border border-white/20 rounded-xl p-4">
            <h3 className="text-white font-bold text-lg mb-4">⚙️ Controls</h3>
            
            <div className="space-y-4">
              {/* Mode selection */}
              <div>
                <label className="text-white/70 text-sm block mb-2">Execution Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setControlMode('all')}
                    className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                      controlMode === 'all'
                        ? 'bg-seezee-red text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    All Devices
                  </button>
                  <button
                    onClick={() => setControlMode('individual')}
                    className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                      controlMode === 'individual'
                        ? 'bg-seezee-red text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Individual
                  </button>
                </div>
              </div>

              {/* Delay slider */}
              <div>
                <label className="text-white/70 text-sm block mb-2">
                  Delay Between Commands: {delayBetweenCommands.toFixed(1)}s
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={delayBetweenCommands}
                  onChange={(e) => setDelayBetweenCommands(parseFloat(e.target.value))}
                  className="w-full accent-seezee-red"
                />
                <div className="flex justify-between text-xs text-white/40 mt-1">
                  <span>0.5s</span>
                  <span>5.0s</span>
                </div>
              </div>

              {/* Brightness slider */}
              <div>
                <label className="text-white/70 text-sm block mb-2">
                  Brightness: {brightness}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full accent-seezee-red"
                />
              </div>

              {/* Execute button */}
              <button
                onClick={executeColorCommand}
                disabled={executePending || cooldownRemaining > 0 || !isConnected}
                className={`
                  w-full py-4 rounded-xl font-bold text-lg transition-all
                  ${executePending || cooldownRemaining > 0 || !isConnected
                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-seezee-red hover:bg-seezee-red-bright text-white active:scale-95'
                  }
                `}
              >
                {executePending ? '⏳ Executing...' : '▶️ Execute Lighting Command'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Devices & Terminal */}
        <div className="w-1/2 flex flex-col gap-4">
          
          {/* Device Selection */}
          <div className="bg-black/60 border border-white/20 rounded-xl p-4">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center justify-between">
              🔗 Govee Devices ({devices.length})
              <button
                onClick={loadDevices}
                className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-white/70 hover:text-white transition-colors"
              >
                🔄 Refresh
              </button>
            </h3>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {devices.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-4">
                  No devices found. Click refresh to scan.
                </p>
              ) : (
                <>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setSelectedDevices(new Set(devices.map(d => d.device).slice(0, MAX_DEVICES)))}
                      className="flex-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-white/70 text-xs transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedDevices(new Set())}
                      className="flex-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-white/70 text-xs transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  
                  {devices.map(device => (
                    <button
                      key={device.device}
                      onClick={() => toggleDevice(device.device)}
                      className={`
                        w-full text-left px-4 py-3 rounded-lg transition-all
                        ${selectedDevices.has(device.device)
                          ? 'bg-seezee-red/20 border-2 border-seezee-red/50 text-white'
                          : 'bg-white/5 border-2 border-white/10 text-white/60 hover:text-white hover:border-white/30'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold">{device.deviceName}</span>
                        {selectedDevices.has(device.device) && (
                          <span className="text-seezee-red text-xl">✓</span>
                        )}
                      </div>
                      <div className="text-xs text-white/40 font-mono">
                        {device.model} • MAC: {device.device.slice(-8)}
                      </div>
                      {device.properties?.online !== undefined && (
                        <div className={`text-xs mt-1 ${device.properties.online ? 'text-green-400' : 'text-red-400'}`}>
                          {device.properties.online ? '● Online' : '○ Offline'}
                        </div>
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Terminal Log */}
          <div className="flex-1 bg-black/80 border border-white/20 rounded-xl p-4 flex flex-col min-h-0">
            <h3 className="text-white font-bold text-lg mb-3 flex items-center justify-between">
              <span>📟 Terminal Log</span>
              <button
                onClick={() => setLogs([])}
                className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white/70 transition-colors"
              >
                Clear
              </button>
            </h3>
            
            <div 
              ref={logContainerRef}
              className="flex-1 overflow-y-auto font-mono text-xs space-y-1 min-h-0"
            >
              {logs.length === 0 ? (
                <p className="text-white/40">System ready. Click Execute to begin.</p>
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
