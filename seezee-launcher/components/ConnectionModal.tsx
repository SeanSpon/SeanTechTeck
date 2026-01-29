"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

interface ConnectionModalProps {
	isOpen: boolean
	onClose: () => void
}

export default function ConnectionModal({ isOpen, onClose }: ConnectionModalProps) {
	const router = useRouter()

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (!isOpen) return
			if (event.key === "Escape") onClose()
		}
		window.addEventListener("keydown", onKeyDown)
		return () => window.removeEventListener("keydown", onKeyDown)
	}, [isOpen, onClose])

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center px-4">
			<button
				type="button"
				aria-label="Close modal"
				className="absolute inset-0 bg-black/70"
				onClick={onClose}
			/>
			<div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-seezee-dark/95 backdrop-blur-md p-6">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h2 className="text-white text-xl font-bold">Connect your PC</h2>
						<p className="text-white/50 text-sm mt-1">
							Open Settings to configure the server IP.
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
					>
						Close
					</button>
				</div>

				<div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
					<button
						type="button"
						onClick={() => {
							onClose()
							router.push("/settings")
						}}
						className="w-full px-4 py-3 rounded-xl bg-seezee-red text-white font-semibold hover:bg-seezee-red-dark transition-colors"
					>
						Go to Settings
					</button>
					<button
						type="button"
						onClick={onClose}
						className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-semibold hover:bg-white/10 transition-colors"
					>
						Not now
					</button>
				</div>
			</div>
		</div>
	)
}

