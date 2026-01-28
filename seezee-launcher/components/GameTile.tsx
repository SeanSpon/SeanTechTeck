"use client"

import { Game } from "@/lib/mockGames"
import { useState } from "react"

interface GameTileProps {
  game: Game
  onPlay?: (game: Game) => void
  index?: number
}

export default function GameTile({ game, onPlay, index = 0 }: GameTileProps) {
  const [imageError, setImageError] = useState(false)

  // Get Steam cover image if available
  const getSteamImage = () => {
    if (game.steamAppId && !imageError) {
      return `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.steamAppId}/library_600x900.jpg`
    }
    return null
  }

  const steamImage = getSteamImage()
  const hasImage = steamImage && !imageError

  return (
    <button
      className="
        relative w-full aspect-[2/3] rounded-2xl overflow-hidden
        transition-transform duration-200 ease-out
        focus:outline-none focus:ring-4 focus:ring-seezee-red/50
        hover:scale-105 active:scale-95
        touch-manipulation
        bg-black/60 border-2 border-white/10
        hover:border-seezee-red/50
      "
      style={{ 
        minHeight: '240px',
        minWidth: '160px'
      }}
      onClick={() => onPlay?.(game)}
      tabIndex={0}
      aria-label={`Play ${game.name}`}
    >
      {/* Steam Image */}
      {hasImage && (
        <img
          src={steamImage}
          alt={game.name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      )}

      {/* Fallback gradient */}
      {!hasImage && (
        <div 
          className="absolute inset-0"
          style={{ 
            background: game.cover || 'linear-gradient(135deg, #e63946 0%, #c1121f 100%)'
          }}
        />
      )}

      {/* Bottom gradient overlay for text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

      {/* Game info - Always visible */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-white font-bold text-base leading-tight mb-1 line-clamp-2">
          {game.name}
        </h3>
        <span className="inline-block text-xs uppercase tracking-wider text-seezee-red/80 bg-seezee-red/10 px-2 py-0.5 rounded">
          {game.source}
        </span>
      </div>
    </button>
  )
}
