export type GameSource = "steam" | "epic" | "local" | "tool"

export type Game = {
  id: string
  name: string
  cover: string
  source: GameSource
  steamAppId?: string
  execPath?: string
  folderSource?: string
}

// Helper to convert API GameItem to frontend Game
export function apiGameToGame(item: {
  id: string
  title: string
  source: GameSource
  steamAppId?: string
  execPath?: string
  coverImage?: string
  folderSource?: string
}): Game {
  // Generate cover - use Steam image if available, otherwise gradient
  let cover = item.coverImage || ''
  
  if (!cover) {
    // Generate a consistent gradient based on the game name
    const gradients = [
      "linear-gradient(135deg, #39ff14 0%, #00e5ff 100%)",
      "linear-gradient(135deg, #0066ff 0%, #39ff14 100%)",
      "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0066ff 100%)",
      "linear-gradient(135deg, #8b5cf6 0%, #00e5ff 100%)",
      "linear-gradient(135deg, #ff6b35 0%, #39ff14 100%)",
      "linear-gradient(135deg, #00e5ff 0%, #0066ff 100%)",
      "linear-gradient(135deg, #ff6b35 0%, #8b5cf6 100%)",
      "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 30%, #39ff14 100%)",
    ]
    // Use hash of title to pick consistent gradient
    const hash = item.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    cover = gradients[hash % gradients.length]
  }
  
  return {
    id: item.id,
    name: item.title,
    cover,
    source: item.source,
    steamAppId: item.steamAppId,
    execPath: item.execPath,
    folderSource: item.folderSource
  }
}

// Mock game data with SeeZee-themed gradient placeholders
// Colors match the SeeZee brand palette
export const mockGames: Game[] = [
  {
    id: "1",
    name: "Cyber Runner",
    cover: "linear-gradient(135deg, #39ff14 0%, #00e5ff 100%)",
    source: "steam",
  },
  {
    id: "2",
    name: "Neon Blade", 
    cover: "linear-gradient(135deg, #0066ff 0%, #39ff14 100%)",
    source: "steam",
  },
  {
    id: "3",
    name: "Shadow Protocol",
    cover: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0066ff 100%)",
    source: "local",
  },
  {
    id: "4",
    name: "Quantum Drift",
    cover: "linear-gradient(135deg, #8b5cf6 0%, #00e5ff 100%)",
    source: "steam",
  },
  {
    id: "5",
    name: "Void Hunters",
    cover: "linear-gradient(135deg, #ff6b35 0%, #39ff14 100%)",
    source: "local",
  },
  {
    id: "6", 
    name: "Grid Wars",
    cover: "linear-gradient(135deg, #00e5ff 0%, #0066ff 100%)",
    source: "steam",
  },
  {
    id: "7",
    name: "Retro Blaster",
    cover: "linear-gradient(135deg, #ff6b35 0%, #8b5cf6 100%)",
    source: "local",
  },
  {
    id: "8",
    name: "Deep Space",
    cover: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 30%, #39ff14 100%)",
    source: "steam",
  },
]
