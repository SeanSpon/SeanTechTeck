"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import ReactiveBackground from "@/components/ReactiveBackground"
import { useConnectionStore } from "@/lib/connectionStore"

type SpotifyNowPlaying = {
  isPlaying: boolean
  title?: string
  artists?: string[]
  album?: string
  albumArtUrl?: string | null
  progressMs?: number
  durationMs?: number
}

type AudioStateResponse = {
  system: {
    supported: boolean
    volume?: number
    muted?: boolean
    error?: string
    hint?: string
    backend?: string
  }
  spotify: {
    configured: boolean
    nowPlaying: SpotifyNowPlaying | null
    error?: string | null
  }
  timestamp: string
}

function formatMs(ms?: number) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "-:--"
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export default function AudioController() {
  const router = useRouter()
  const pcIpAddress = useConnectionStore((state) => state.pcIpAddress)
  const pcPort = useConnectionStore((state) => state.pcPort)

  const serverUrl = useMemo(() => {
    if (!pcIpAddress) return ""
    return `http://${pcIpAddress}:${pcPort}`
  }, [pcIpAddress, pcPort])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [spotifyConfigured, setSpotifyConfigured] = useState(false)
  const [nowPlaying, setNowPlaying] = useState<SpotifyNowPlaying | null>(null)
  const [spotifyError, setSpotifyError] = useState<string | null>(null)

  const [systemVolumeSupported, setSystemVolumeSupported] = useState(false)
  const [volume, setVolume] = useState(50)
  const [systemVolumeHint, setSystemVolumeHint] = useState<string | null>(null)

  const [showSpotifyToken, setShowSpotifyToken] = useState(false)
  const [spotifyToken, setSpotifyToken] = useState("")
  const [refreshToken, setRefreshToken] = useState("")
  const [showRefreshToken, setShowRefreshToken] = useState(false)

  async function fetchAudioState(isInitial = false) {
    if (!serverUrl) {
      setIsLoading(false)
      setError("Set your PC IP in Settings to use Audio.")
      return
    }

    if (isInitial) {
      setIsLoading(true)
      setError(null)
    }

    try {
      const response = await fetch(`${serverUrl}/api/audio/state`, { cache: "no-store" })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Audio state request failed (${response.status})`)
      }
      const data = (await response.json()) as AudioStateResponse

      setSpotifyConfigured(Boolean(data.spotify?.configured))
      setNowPlaying(data.spotify?.nowPlaying ?? null)
      setSpotifyError(data.spotify?.error ?? null)

      setSystemVolumeSupported(Boolean(data.system?.supported))
      if (typeof data.system?.volume === "number") setVolume(data.system.volume)
      setSystemVolumeHint(data.system?.hint ?? data.system?.error ?? null)

      if (isInitial) {
        setIsLoading(false)
      }
    } catch (e) {
      if (isInitial) {
        setIsLoading(false)
        setError(e instanceof Error ? e.message : "Failed to load audio state")
      }
    }
  }

  async function postJson(path: string, body?: unknown) {
    if (!serverUrl) throw new Error("PC server URL not configured")
    const response = await fetch(`${serverUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || `Request failed (${response.status})`)
    }
    return response.json().catch(() => ({}))
  }

  async function commitSystemVolume(nextVolume: number) {
    if (!systemVolumeSupported) return
    try {
      await postJson("/api/audio/system/volume", { volume: nextVolume })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set volume")
    }
  }

  async function spotifyCommand(action: "play" | "pause" | "next" | "previous") {
    if (!spotifyConfigured) return
    try {
      await postJson(`/api/audio/spotify/${action}`)
      window.setTimeout(() => void fetchAudioState(false), 300)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Spotify command failed")
    }
  }

  async function setSpotifyShuffle(enabled: boolean) {
    if (!spotifyConfigured) return
    try {
      await postJson("/api/audio/spotify/shuffle", { enabled })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set shuffle")
    }
  }

  async function setSpotifyRepeat(mode: "off" | "context" | "track") {
    if (!spotifyConfigured) return
    try {
      await postJson("/api/audio/spotify/repeat", { mode })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set repeat")
    }
  }

  async function seekToPosition(percent: number) {
    if (!spotifyConfigured || !durationMs) return
    try {
      const positionMs = Math.round((percent / 100) * durationMs)
      await postJson("/api/audio/spotify/seek", { positionMs })
      window.setTimeout(() => void fetchAudioState(false), 300)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to seek")
    }
  }

  async function saveSpotifyToken() {
    try {
      await postJson("/api/audio/spotify/token", { 
        accessToken: spotifyToken,
        refreshToken: refreshToken
      })
      setShowSpotifyToken(false)
      setShowRefreshToken(false)
      setSpotifyToken("")
      setRefreshToken("")
      await fetchAudioState(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save Spotify token")
    }
  }

  useEffect(() => {
    void fetchAudioState(true)
    
    // Poll for updates every second when Spotify is playing
    const interval = setInterval(() => {
      void fetchAudioState(false)
    }, 1000)
    
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl])

  const progressMs = nowPlaying?.progressMs
  const durationMs = nowPlaying?.durationMs
  const progressPercent =
    typeof progressMs === "number" && typeof durationMs === "number" && durationMs > 0
      ? Math.min(100, Math.max(0, Math.round((progressMs / durationMs) * 100)))
      : 0

  return (
    <div className="h-screen w-screen flex flex-col bg-seezee-dark relative overflow-hidden">
      <ReactiveBackground />

      <header className="px-5 pt-6 pb-4 relative z-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-seezee-red hover:text-seezee-red-bright transition-colors mb-3 text-sm font-medium flex items-center gap-2"
        >
          <span className="text-xl">←</span> Back to Hub
        </button>
        <h1 className="text-white text-3xl font-bold">Audio Controller</h1>
        <p className="text-white/40 text-sm mt-1">Spotify + system audio in one place</p>
      </header>

      <main className="flex-1 px-5 pb-6 overflow-y-auto relative z-10">
        {error ? (
          <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start gap-4">
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-green-500/40 to-emerald-500/20 flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
                {nowPlaying?.albumArtUrl ? (
                  <img
                    src={nowPlaying.albumArtUrl}
                    alt={nowPlaying.album || "Album art"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  "🎵"
                )}
              </div>
              <div className="flex-1">
                <p className="text-white/60 text-sm">Now Playing</p>
                <h2 className="text-white text-xl font-bold mt-1">
                  {isLoading ? "Loading…" : nowPlaying?.title || "Nothing playing"}
                </h2>
                <p className="text-white/40 text-sm">
                  {spotifyError ? (
                    <span className="text-red-400/80">{spotifyError}</span>
                  ) : nowPlaying?.artists?.length ? (
                    <>
                      {nowPlaying.artists.join("  ")}
                      {nowPlaying?.album ? `  ${nowPlaying.album}` : ""}
                    </>
                  ) : !nowPlaying?.title && !isLoading ? (
                    "Start playback in Spotify, then refresh."
                  ) : (
                    ""
                  )}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => void setSpotifyShuffle(true)}
                    disabled={!spotifyConfigured}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                      spotifyConfigured
                        ? "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20 active:scale-95"
                        : "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
                    }`}
                  >
                    🔀 Shuffle
                  </button>
                  <button
                    onClick={() => void setSpotifyRepeat("context")}
                    disabled={!spotifyConfigured}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                      spotifyConfigured
                        ? "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20 active:scale-95"
                        : "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
                    }`}
                  >
                    🔁 Repeat
                  </button>
                </div>
              </div>
              <div className="text-right text-white/50 text-xs">
                <p>Device</p>
                <p className="text-white text-sm font-semibold mt-1">Spotify Connect</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>{formatMs(progressMs)}</span>
                <span>{formatMs(durationMs)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={progressPercent}
                onChange={(e) => void seekToPosition(Number(e.target.value))}
                disabled={!spotifyConfigured || !durationMs}
                className="w-full mt-2 accent-seezee-red disabled:opacity-50 cursor-pointer hover:accent-seezee-red-bright transition-colors"
              />
            </div>

            <div className="mt-8 flex items-center justify-center gap-8">
              <button
                onClick={() => void spotifyCommand("previous")}
                disabled={!spotifyConfigured}
                className="group relative h-16 w-16 rounded-full border-2 border-white/20 bg-gradient-to-br from-white/10 to-white/5 text-2xl disabled:opacity-30 hover:border-white/50 hover:from-white/20 hover:to-white/10 transition-all duration-300 hover:scale-110 active:scale-95"
              >
                ⏮️
                <div className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
              </button>
              
              <button
                onClick={() => void spotifyCommand(nowPlaying?.isPlaying ? "pause" : "play")}
                disabled={!spotifyConfigured}
                className="group relative h-20 w-20 rounded-full bg-gradient-to-br from-seezee-red via-red-500 to-red-600 text-white text-4xl font-bold shadow-2xl shadow-seezee-red/60 disabled:opacity-30 hover:shadow-seezee-red/100 hover:scale-110 transition-all duration-300 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
                <div className="absolute inset-0 rounded-full animate-pulse opacity-0 group-hover:opacity-20 bg-white" />
                {nowPlaying?.isPlaying ? "⏸️" : "▶️"}
              </button>
              
              <button
                onClick={() => void spotifyCommand("next")}
                disabled={!spotifyConfigured}
                className="group relative h-16 w-16 rounded-full border-2 border-white/20 bg-gradient-to-br from-white/10 to-white/5 text-2xl disabled:opacity-30 hover:border-white/50 hover:from-white/20 hover:to-white/10 transition-all duration-300 hover:scale-110 active:scale-95"
              >
                ⏭️
                <div className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="group relative rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-200 active:scale-95">
                ❤️ Like
                <div className="absolute inset-0 rounded-xl bg-red-500/0 group-hover:bg-red-500/5 transition-colors duration-200" />
              </button>
              <button className="group relative rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all duration-200 active:scale-95">
                ➕ Queue
                <div className="absolute inset-0 rounded-xl bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors duration-200" />
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-5">
            <div>
              <h3 className="text-white text-lg font-semibold">Spotify</h3>
              <p className="text-white/40 text-sm mt-1">
                {spotifyConfigured ? "Connected (token stored on PC server)" : "Paste an access token to enable playback controls"}
              </p>

              <div className="mt-4 space-y-3">
                <button
                  onClick={() => setShowSpotifyToken((v) => !v)}
                  className="w-full rounded-xl bg-green-500/20 border border-green-400/40 text-green-200 font-semibold py-3 hover:bg-green-500/30 transition-colors"
                >
                  {spotifyConfigured ? "Update Token" : "Connect Spotify"}
                </button>

                {showSpotifyToken ? (
                  <div className="rounded-xl border border-white/10 bg-seezee-dark/60 p-4 space-y-3">
                    <div>
                      <label className="text-white/60 text-xs font-semibold">Spotify Access Token</label>
                      <input
                        value={spotifyToken}
                        onChange={(e) => setSpotifyToken(e.target.value)}
                        placeholder="BQD…"
                        className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/20 focus:border-seezee-red/50 focus:bg-white/10 transition-colors"
                      />
                      <p className="mt-1 text-[10px] text-white/40">
                        Required scopes: <span className="text-white/60 font-mono">user-read-playback-state user-modify-playback-state</span>
                      </p>
                    </div>

                    <div>
                      <label className="text-white/60 text-xs font-semibold">Spotify Refresh Token (Optional)</label>
                      <p className="text-white/40 text-[10px] mt-0.5">Auto-refreshes access token every hour</p>
                      <input
                        value={refreshToken}
                        onChange={(e) => setRefreshToken(e.target.value)}
                        placeholder="AQB…"
                        className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/20 focus:border-seezee-red/50 focus:bg-white/10 transition-colors"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => void saveSpotifyToken()}
                        disabled={!spotifyToken.trim()}
                        className="flex-1 rounded-lg bg-seezee-red px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
                      >
                        ✓ Save & Connect
                      </button>
                      <button
                        onClick={() => {
                          setShowSpotifyToken(false)
                          setShowRefreshToken(false)
                          setSpotifyToken("")
                          setRefreshToken("")
                        }}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/10 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <h4 className="text-white text-sm font-semibold">Volume</h4>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-white/40 text-sm">🔈</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  onMouseUp={() => void commitSystemVolume(volume)}
                  onTouchEnd={() => void commitSystemVolume(volume)}
                  className="flex-1 accent-seezee-red"
                />
                <span className="text-white/60 text-sm w-9 text-right">{volume}%</span>
              </div>
              {!systemVolumeSupported && systemVolumeHint ? (
                <p className="mt-2 text-[11px] text-white/40">{systemVolumeHint}</p>
              ) : null}
            </div>

            <div>
              <h4 className="text-white text-sm font-semibold">Connection</h4>
              <div className="mt-3 rounded-xl border border-white/10 bg-seezee-dark/60 px-3 py-2 text-sm">
                <p className="text-white/70">
                  PC Server: <span className="text-white/90">{pcIpAddress ? `${pcIpAddress}:${pcPort}` : "Not configured"}</span>
                </p>
                <button
                  onClick={() => void fetchAudioState(true)}
                  className="mt-2 text-xs text-white/50 hover:text-white"
                >
                  Refresh
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
