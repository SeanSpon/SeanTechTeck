"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import TopBar from "@/components/TopBar"
import GameGrid from "@/components/GameGrid"
import ReactiveBackground from "@/components/ReactiveBackground"
import { mockGames, Game, apiGameToGame } from "@/lib/mockGames"
import { useConnectionStore } from "@/lib/connectionStore"

export default function AppsPage() {
	const router = useRouter()
	const pcIpAddress = useConnectionStore((state) => state.pcIpAddress)
	const pcPort = useConnectionStore((state) => state.pcPort)
	const [apps, setApps] = useState<Game[]>([])
	const [isLoading, setIsLoading] = useState(false)

	const serverUrl = useMemo(() => {
		if (!pcIpAddress) return ""
		return `http://${pcIpAddress}:${pcPort}`
	}, [pcIpAddress, pcPort])

	useEffect(() => {
		const loadApps = async () => {
			if (!serverUrl) {
				setApps([])
				return
			}
			setIsLoading(true)
			try {
				const response = await fetch(`${serverUrl}/api/games`)
				if (!response.ok) throw new Error(`Failed to load apps: ${response.status}`)
				const data = await response.json()
				
				// Filter for Steam and Epic Games only (actual store-bought games)
				const filteredApps = data.games
					.filter((g: any) => {
						// Only show Steam or Epic Games
						return g.source === 'steam' || g.source === 'epic'
					})
					.map(apiGameToGame)
				
				setApps(filteredApps)
			} catch (error) {
				console.error("Failed to load apps:", error)
				setApps([])
			} finally {
				setIsLoading(false)
			}
		}

		loadApps()
	}, [serverUrl])

	return (
		<div className="h-screen w-screen flex flex-col bg-seezee-dark relative overflow-hidden">
			<ReactiveBackground />
			<TopBar />
			<main className="relative flex-1 overflow-y-auto overflow-x-hidden touch-scroll z-10">
				<div className="px-6 py-6">
					<button
						type="button"
						onClick={() => router.push("/library")}
						className="text-seezee-red hover:text-seezee-red-bright transition-colors mb-4 text-sm font-medium"
					>
						← Back to Library
					</button>
					
					<h1 className="text-white text-3xl font-bold">Games</h1>
					<p className="text-white/50 mt-1 mb-6">
						{isLoading ? "Loading..." : `${apps.length} game${apps.length !== 1 ? 's' : ''} found`}
					</p>

					{!serverUrl ? (
						<div className="text-center py-12">
							<p className="text-white/50">Not connected to PC server</p>
							<p className="text-white/30 text-sm mt-2">Go to Settings to configure your PC IP and port</p>
							<button
								type="button"
								onClick={() => router.push("/settings")}
								className="mt-4 px-4 py-2 bg-seezee-red text-white rounded-lg hover:bg-seezee-red-dark transition-colors font-semibold"
							>
								Open Settings
							</button>
						</div>
					) : apps.length > 0 ? (
						<GameGrid games={apps} />
					) : (
						<div className="text-center py-12">
							<p className="text-white/50">No games found</p>
							<p className="text-white/30 text-sm mt-2">Install Steam or Epic Games titles to see them here</p>
						</div>
					)}
				</div>
			</main>
		</div>
	)
}

