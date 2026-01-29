"use client"

import { useRouter } from "next/navigation"

interface EmptyGameLibraryProps {
	onOpenSettings?: () => void
	title?: string
	subtitle?: string
}

export default function EmptyGameLibrary({
	onOpenSettings,
	title = "No games found",
	subtitle = "Connect to your PC and add folders to populate the library.",
}: EmptyGameLibraryProps) {
	const router = useRouter()

	const handleOpen = () => {
		if (onOpenSettings) onOpenSettings()
		else router.push("/settings")
	}

	return (
		<div className="relative flex-1 flex items-center justify-center px-6 py-10 z-10">
			<div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6">
				<div className="flex items-start gap-4">
					<div className="h-14 w-14 rounded-2xl bg-seezee-red/20 border border-seezee-red/30 flex items-center justify-center text-2xl">
						📁
					</div>
					<div className="flex-1">
						<h2 className="text-white text-xl font-bold">{title}</h2>
						<p className="text-white/50 text-sm mt-1">{subtitle}</p>
					</div>
				</div>

				<div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
					<button
						type="button"
						onClick={handleOpen}
						className="w-full px-4 py-3 rounded-xl bg-seezee-red text-white font-semibold hover:bg-seezee-red-dark transition-colors"
					>
						Open Settings
					</button>
					<button
						type="button"
						onClick={() => router.push("/dashboard")}
						className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-semibold hover:bg-white/10 transition-colors"
					>
						Back to Hub
					</button>
				</div>

				<div className="mt-4 text-xs text-white/40">
					Tip: Make sure the PC server is running, then add a folder in Settings.
				</div>
			</div>
		</div>
	)
}

