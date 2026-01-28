"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import TopBar from "@/components/TopBar"
import ReactiveBackground from "@/components/ReactiveBackground"
import { useConnectionStore } from "@/lib/connectionStore"

interface DeviceStats {
  id: string
  name: string
  type: string
  ip: string
  online: boolean
  stats?: {
    hostname: string
    cpu: { usage: number; cores: number }
    memory: { used: number; total: number; percent: number }
    disk: { used: number; total: number; percent: number }
    network: { sent: number; recv: number }
    gpu?: { usage: number; memory: { used: number; total: number } }
  }
}

export default function SystemMonitor() {
  const router = useRouter()
  const [devices, setDevices] = useState<DeviceStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { pcIpAddress } = useConnectionStore()

  useEffect(() => {
    loadDevices()
    const interval = setInterval(loadDevices, 2000) // Poll every 2 seconds
    return () => clearInterval(interval)
  }, [pcIpAddress])

  const loadDevices = async () => {
    if (!pcIpAddress) return

    try {
      const response = await fetch(`http://${pcIpAddress}:5555/api/devices`)
      const data = await response.json()
      setDevices(data.devices || [])
      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load devices:', error)
      setIsLoading(false)
    }
  }

  const getStatusColor = (percent: number) => {
    if (percent >= 90) return 'text-red-400'
    if (percent >= 70) return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-seezee-dark relative overflow-hidden">
      <ReactiveBackground />
      
      <TopBar />
      
      <main className="relative flex-1 flex flex-col overflow-hidden z-10">
        {/* Header */}
        <div className="flex-shrink-0 px-8 py-6 animate-slide-in-up">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-seezee-red hover:text-seezee-red-bright transition-colors mb-4 text-sm font-medium"
          >
            ← Back to Dashboard
          </button>
          
          <h2 className="text-white/90 text-4xl font-bold">System Monitor</h2>
          <p className="text-white/50 mt-1">
            {devices.length} device{devices.length !== 1 ? 's' : ''} configured
            {isLoading && <span className="text-seezee-red ml-2">• Loading...</span>}
          </p>
        </div>

        {/* Device Grid */}
        <div className="flex-1 overflow-y-auto touch-scroll px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device) => (
              <div
                key={device.id}
                className="glass rounded-2xl p-6 border border-white/10 hover:bg-white/5 transition-all duration-300"
              >
                {/* Device Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-bold text-xl">{device.name}</h3>
                    <p className="text-white/50 text-sm">{device.ip}</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${device.online ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                </div>

                {/* Stats */}
                {device.online && device.stats ? (
                  <div className="space-y-4">
                    {/* CPU */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/70 text-sm">CPU</span>
                        <span className={`font-bold ${getStatusColor(device.stats.cpu.usage)}`}>
                          {device.stats.cpu.usage}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-seezee-red transition-all duration-300"
                          style={{ width: `${device.stats.cpu.usage}%` }}
                        />
                      </div>
                      <p className="text-white/40 text-xs mt-1">{device.stats.cpu.cores} cores</p>
                    </div>

                    {/* Memory */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/70 text-sm">Memory</span>
                        <span className={`font-bold ${getStatusColor(device.stats.memory.percent)}`}>
                          {device.stats.memory.used} / {device.stats.memory.total} GB
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all duration-300"
                          style={{ width: `${device.stats.memory.percent}%` }}
                        />
                      </div>
                      <p className="text-white/40 text-xs mt-1">{device.stats.memory.percent}% used</p>
                    </div>

                    {/* GPU (if available) */}
                    {device.stats.gpu && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/70 text-sm">GPU</span>
                          <span className={`font-bold ${getStatusColor(device.stats.gpu.usage)}`}>
                            {device.stats.gpu.usage}%
                          </span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${device.stats.gpu.usage}%` }}
                          />
                        </div>
                        <p className="text-white/40 text-xs mt-1">
                          {device.stats.gpu.memory.used} / {device.stats.gpu.memory.total} GB VRAM
                        </p>
                      </div>
                    )}

                    {/* Network */}
                    <div className="flex justify-between text-xs">
                      <div>
                        <span className="text-white/50">↑ </span>
                        <span className="text-white/70">{device.stats.network.sent} GB</span>
                      </div>
                      <div>
                        <span className="text-white/50">↓ </span>
                        <span className="text-white/70">{device.stats.network.recv} GB</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-white/30 text-center py-8">
                    {device.online ? 'No stats available' : 'Device offline'}
                  </div>
                )}
              </div>
            ))}
          </div>

          {devices.length === 0 && !isLoading && (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-white text-xl font-bold mb-2">No Devices Configured</h3>
              <p className="text-white/50 mb-6">
                Install and run the SeeZee Agent on your PCs to monitor system stats
              </p>
              <div className="glass rounded-xl p-4 text-left text-sm text-white/70 max-w-xl mx-auto">
                <p className="mb-2">1. Copy <code className="text-seezee-red">seezee_agent.py</code> to your PC</p>
                <p className="mb-2">2. Run: <code className="text-seezee-red">pip install psutil flask flask-cors</code></p>
                <p className="mb-2">3. Run: <code className="text-seezee-red">python seezee_agent.py</code></p>
                <p>4. Add device IP to <code className="text-seezee-red">seezee_config.json</code></p>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="relative flex-shrink-0 px-8 py-4 text-center text-white/30 text-sm z-10">
        Stats update every 2 seconds • Tap device for details
      </footer>
    </div>
  )
}
