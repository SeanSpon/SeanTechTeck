"use client"

import { usePathname, useRouter } from "next/navigation"
import { useConnectionStore } from "@/lib/connectionStore"
import SeeZeeWordmark from "@/components/SeeZeeWordmark"

type NavItem = { href: string; label: string }

const NAV: NavItem[] = [
	{ href: "/dashboard", label: "Hub" },
	{ href: "/commancenter", label: "Command" },
	{ href: "/library", label: "Library" },
	{ href: "/lighting", label: "Lights" },
	{ href: "/audio", label: "Audio" },
	{ href: "/monitor", label: "Monitor" },
	{ href: "/settings", label: "Settings" },
]

export default function TopBar() {
	const router = useRouter()
	const pathname = usePathname()
	const { pcIpAddress, pcPort, isConnected } = useConnectionStore()

	return (
		<header className="relative flex-shrink-0 z-20 bg-seezee-dark/95 backdrop-blur-md border-b border-white/10">
			<div className="px-6 py-3 max-[1280px]:px-4 max-[1280px]:py-2 flex items-center justify-between gap-4 max-[1280px]:gap-3">
				<button
					type="button"
					onClick={() => router.push("/dashboard")}
					className="flex items-center gap-3 max-[1280px]:gap-2 rounded-xl px-2 py-1 hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-seezee-red/50"
					aria-label="Go to Hub"
				>
					<SeeZeeWordmark size="sm" />
				</button>

				<nav className="hidden md:flex items-center gap-2">
					{NAV.map((item) => {
						const active = pathname === item.href
						return (
							<button
								key={item.href}
								type="button"
								onClick={() => router.push(item.href)}
								className={
									"px-3 py-2 max-[1280px]:px-2 max-[1280px]:py-1.5 rounded-lg text-sm max-[1280px]:text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-seezee-red/40 " +
									(active
										? "bg-white/10 text-white"
										: "text-white/60 hover:text-white hover:bg-white/5")
								}
							>
								{item.label}
							</button>
						)
					})}
				</nav>

				<div className="flex items-center gap-3">
					<div
						className={
							"flex items-center gap-2 px-3 py-1.5 max-[1280px]:px-2 max-[1280px]:py-1 rounded-lg border text-xs " +
							(isConnected
								? "bg-seezee-green/10 border-seezee-green/30 text-white/80"
								: "bg-white/5 border-white/10 text-white/50")
						}
						aria-label={
							isConnected
								? `Connected to ${pcIpAddress}:${pcPort}`
								: "Not connected"
						}
					>
						<span
							className={
								"w-2 h-2 rounded-full " +
								(isConnected ? "bg-seezee-red animate-pulse" : "bg-white/30")
							}
						/>
						<span className="font-mono">
							{isConnected && pcIpAddress ? `${pcIpAddress}:${pcPort}` : "No PC"}
						</span>
					</div>

					<button
						type="button"
						onClick={() => router.push("/settings")}
						className="md:hidden px-3 py-2 max-[1280px]:px-2 max-[1280px]:py-1.5 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 transition-colors text-sm"
					>
						Settings
					</button>
				</div>
			</div>
		</header>
	)
}

