"use client"

import { useRouter } from "next/navigation"
import TopBar from "@/components/TopBar"
import ReactiveBackground from "@/components/ReactiveBackground"

export default function StudioPage() {
	const router = useRouter()

	return (
		<div className="h-screen w-screen flex flex-col bg-seezee-dark relative overflow-hidden">
			<ReactiveBackground />
			<TopBar />
			<main className="relative flex-1 overflow-y-auto overflow-x-hidden touch-scroll z-10">
				<div className="px-6 py-6">
					<button
						type="button"
						onClick={() => router.push("/dashboard")}
						className="text-seezee-red hover:text-seezee-red-bright transition-colors mb-2 text-sm font-medium"
					>
						← Back
					</button>
					<h1 className="text-white text-3xl font-bold">Studio</h1>
					<p className="text-white/50 mt-2">This page is coming back next.</p>
				</div>
			</main>
		</div>
	)
}

