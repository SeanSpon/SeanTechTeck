"use client"

import { Game } from "@/lib/mockGames"
import GameTile from "./GameTile"

interface GameGridProps {
  games: Game[]
  onPlayGame?: (game: Game) => void
}

export default function GameGrid({ games, onPlayGame }: GameGridProps) {
  // Filter out any games without valid IDs
  const validGames = games.filter(game => game.id)
  
  return (
    <div className="w-full py-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
        {validGames.map((game, index) => (
          <GameTile key={game.id} game={game} onPlay={onPlayGame} index={index} />
        ))}
      </div>
    </div>
  )
}
