"use client"

import { Game } from "@/lib/mockGames"
import GameTile from "./GameTile"

interface GameGridProps {
  games: Game[]
  onPlayGame?: (game: Game) => void
  favorites?: string[]
  onToggleFavorite?: (game: Game) => void
}

export default function GameGrid({ games, onPlayGame, favorites = [], onToggleFavorite }: GameGridProps) {
  // Filter out any games without valid IDs
  const validGames = games.filter(game => game.id)
  
  return (
    <div className="w-full">
      {/* Max 3 columns on Pi touchscreen for better touch targets */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-[1280px]:gap-4">
        {validGames.map((game, index) => (
          <GameTile 
            key={game.id} 
            game={game} 
            onPlay={onPlayGame}
            isFavorite={favorites.includes(game.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </div>
  )
}
