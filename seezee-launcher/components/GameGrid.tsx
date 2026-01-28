"use client"

import { Game } from "@/lib/mockGames"
import GameTile from "./GameTile"

interface GameGridProps {
  games: Game[]
  onPlayGame?: (game: Game) => void
}

export default function GameGrid({ games, onPlayGame }: GameGridProps) {
  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <div className="flex gap-6 px-8 py-6 min-w-max">
        {games.map((game, index) => (
          <GameTile key={game.id} game={game} onPlay={onPlayGame} index={index} />
        ))}
      </div>
    </div>
  )
}
