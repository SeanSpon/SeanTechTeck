"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import TopBar from "@/components/TopBar"
import ReactiveBackground from "@/components/ReactiveBackground"
import SeeZeeWordmark from "@/components/SeeZeeWordmark"
import { useConnectionStore } from "@/lib/connectionStore"
import { useTheme } from "@/lib/themeContext"

type Tile = {
	title: string
	subtitle: string
	href: string
	icon: string
}

export default function Dashboard() {
	const router = useRouter()
	const { pcIpAddress, pcPort, isConnected, error } = useConnectionStore()
	const { accentRgb } = useTheme()
	const [mounted, setMounted] = useState(false)

	// Prevent hydration mismatch by only rendering dynamic content after mount
	useEffect(() => {
		setMounted(true)
	}, [])

	const tiles: Tile[] = [
		{ title: "Command Center", subtitle: "Git + Vercel", href: "/commancenter", icon: "🛰️" },
		{ title: "Library", subtitle: "Games & tools", href: "/library", icon: "📚" },
		{ title: "Lighting", subtitle: "RGB sync", href: "/lighting", icon: "💡" },
		{ title: "Audio", subtitle: "Music & volume", href: "/audio", icon: "🎵" },
		{ title: "Monitor", subtitle: "Devices", href: "/monitor", icon: "📈" },
		{ title: "Settings", subtitle: "Connection & folders", href: "/settings", icon: "⚙️" },
	]

	return (
		<div className="h-screen w-screen flex flex-col bg-seezee-dark relative overflow-hidden">
			<ReactiveBackground />
			<TopBar />

			<main className="relative flex-1 overflow-y-auto overflow-x-hidden touch-scroll z-10">
				<div className="px-6 py-6 max-[1280px]:px-4 max-[1280px]:py-4">
					<div className="flex items-start justify-between gap-6 flex-wrap">
						<div>
							<div className="flex items-end gap-3 flex-wrap">
								<SeeZeeWordmark size="md" />
								<span className="text-white/60 text-2xl max-[1280px]:text-xl font-extrabold tracking-tight">
									Dashboard
								</span>
							</div>
							<p className="text-white/50 mt-2 text-sm max-[1280px]:text-xs">
								Accent follows your last lighting color.
							</p>
							{mounted && (
								<div className="mt-3 flex items-center gap-3 text-xs max-[1280px]:text-[11px] text-white/60">
									<div
										className="w-3 h-3 rounded-full border border-white/20"
										style={{
											backgroundColor: `rgb(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b})`,
										}}
										aria-label="Current accent color"
									/>
									<span className="font-mono">
										rgb({accentRgb.r},{accentRgb.g},{accentRgb.b})
									</span>
								</div>
							)}
						</div>

						<div className="min-w-[240px] max-[1280px]:min-w-[200px]">
							<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
								<div className="text-white/70 text-xs">PC Server</div>
								<div className="mt-1 text-white font-mono text-sm">
									{pcIpAddress ? `${pcIpAddress}:${pcPort}` : "Not set"}
								</div>
								<div className="mt-2 flex items-center gap-2 text-xs">
									<span
										className={
											"w-2 h-2 rounded-full " +
											(isConnected ? "bg-seezee-red animate-pulse" : "bg-white/30")
										}
									/>
									<span className={isConnected ? "text-white/80" : "text-white/50"}>
										{isConnected ? "Connected" : "Not connected"}
									</span>
								</div>
								{error && <div className="mt-2 text-xs text-red-400">{error}</div>}
								{!isConnected && (
									<button
										type="button"
										onClick={() => router.push("/settings")}
										className="mt-3 w-full px-4 py-2 max-[1280px]:px-3 max-[1280px]:py-1.5 rounded-lg bg-seezee-red/20 border border-seezee-red/40 text-seezee-red hover:bg-seezee-red/30 transition-colors text-sm max-[1280px]:text-xs font-semibold"
									>
										Configure connection
									</button>
								)}
							</div>
						</div>
					</div>

					<div className="mt-6 max-[1280px]:mt-4 grid grid-cols-2 md:grid-cols-4 max-[1280px]:grid-cols-3 gap-4 max-[1280px]:gap-3">
						{tiles.map((t) => (
							<button
								key={t.href}
								type="button"
								onClick={() => router.push(t.href)}
								className="group relative overflow-hidden p-5 max-[1280px]:p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-seezee-red/40 transition-all hover:scale-[1.02] active:scale-[0.99] text-left shadow-glow"
							>
								<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
									<div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-seezee-red/20 blur-2xl" />
									<div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
								</div>
								<div className="relative flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="flex h-12 w-12 max-[1280px]:h-10 max-[1280px]:w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/10 text-2xl max-[1280px]:text-xl">
											{t.icon}
										</div>
										<div>
											<div className="text-white font-bold text-lg max-[1280px]:text-base">{t.title}</div>
											<div className="text-white/50 text-xs max-[1280px]:text-[11px] mt-0.5">{t.subtitle}</div>
										</div>
									</div>
									<div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70">
										→
									</div>
								</div>
							</button>
						))}
					</div>
				</div>
			</main>
		</div>
	)
}

