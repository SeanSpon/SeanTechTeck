"use client"

import { Game } from "@/lib/mockGames"
import { useState } from "react"

interface GameTileProps {
  game: Game
  onPlay?: (game: Game) => void
  index?: number
}

export default function GameTile({ game, onPlay, index = 0 }: GameTileProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [imageError, setImageError] = useState(false)

  const isActive = isHovered || isFocused

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
      className={`
        relative w-full aspect-[2/3] rounded-2xl overflow-hidden
        transition-all duration-300 ease-out
        focus:outline-none focus-visible:ring-4 focus-visible:ring-seezee-red focus-visible:ring-offset-2 focus-visible:ring-offset-transparent
        animate-fade-zoom-in stagger-${Math.min(index + 1, 8)}
        ${isActive ? "scale-105 z-10" : "scale-100"}
        min-h-[240px]
      `}
      style={{ 
        background: hasImage ? '#1a1a1a' : game.cover,
        boxShadow: isActive 
          ? "0 0 30px rgba(230, 57, 70, 0.6), 0 20px 60px rgba(0, 0, 0, 0.8)" 
          : "0 4px 20px rgba(0, 0, 0, 0.5)"
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onClick={() => onPlay?.(game)}
      onTouchStart={() => setIsFocused(true)}
      onTouchEnd={() => setIsFocused(false)}
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

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      
      {/* Animated gradient border on hover */}
      <div
        className={`
          absolute inset-0 rounded-2xl transition-opacity duration-300
          ${isActive ? "opacity-100" : "opacity-0"}
        `}
        style={{
          background: "linear-gradient(135deg, rgba(230, 57, 70, 0.8), rgba(255, 71, 87, 0.8), rgba(193, 18, 31, 0.8))",
          padding: "3px",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      {/* Shimmer effect on hover */}
      {isActive && (
        <div className="absolute inset-0 animate-shimmer pointer-events-none" />
      )}

      {/* Game info */}
      <div className={`
        absolute bottom-0 left-0 right-0 p-4 transition-all duration-300
        ${isActive ? "transform translate-y-0" : ""}
      `}>
        <h3 className={`
          text-white font-bold text-lg leading-tight truncate transition-all duration-300
          ${isActive ? "text-neon-glow" : ""}
        `}>
          {game.name}
        </h3>
        <span className={`
          text-xs uppercase tracking-wider transition-all duration-300
          ${isActive ? "text-seezee-red" : "text-seezee-red/60"}
        `}>
          {game.source}
        </span>
      </div>

      {/* Play overlay */}
      <div
        className={`
          absolute inset-0 flex items-center justify-center
          bg-black/70 backdrop-blur-sm
          transition-all duration-300
          ${isActive ? "opacity-100" : "opacity-0"}
        `}
      >
        <div className={`
          w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-300
          ${isActive ? "scale-100 animate-glow-pulse" : "scale-75"}
        `}
        style={{
          background: "linear-gradient(135deg, rgba(230, 57, 70, 0.9), rgba(255, 71, 87, 0.9))",
          boxShadow: "0 0 30px rgba(230, 57, 70, 0.6)"
        }}>
          <svg
            className="w-9 h-9 text-white ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  )
}
