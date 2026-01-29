"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import TopBar from "@/components/TopBar"
import ReactiveBackground from "@/components/ReactiveBackground"
import { useConnectionStore } from "@/lib/connectionStore"
import { useTheme } from "@/lib/themeContext"

export default function SettingsPage() {
	const router = useRouter()
	const { accentRgb, resetTheme } = useTheme()

	const {
		pcIpAddress,
		pcPort,
		connectionType,
		setConfig,
		isConnected,
		folders,
		games,
		isLoading,
		error,
		testConnection,
		fetchFolders,
		addFolder,
		removeFolder,
		fetchGames,
	} = useConnectionStore()

	const [showAddFolder, setShowAddFolder] = useState(false)
	const [newFolderLabel, setNewFolderLabel] = useState("")
	const [newFolderPath, setNewFolderPath] = useState("")
	const [newFolderType, setNewFolderType] = useState<"games" | "tools">("games")
	const [addError, setAddError] = useState("")

	const [localIp, setLocalIp] = useState(pcIpAddress)
	const [localPort, setLocalPort] = useState(pcPort.toString())
	const [localType, setLocalType] = useState(connectionType)
	const [isTesting, setIsTesting] = useState(false)
	const [testResult, setTestResult] = useState<"success" | "error" | null>(null)

	useEffect(() => {
		if (isConnected && pcIpAddress) {
			fetchFolders()
		}
	}, [isConnected, pcIpAddress, fetchFolders])

	const handleSave = () => {
		setConfig({
			pcIpAddress: localIp,
			pcPort: parseInt(localPort) || 5555,
			connectionType: localType,
		})
		setTestResult(null)
	}

	const handleTestConnection = async () => {
		handleSave()
		setIsTesting(true)
		setTestResult(null)
		await new Promise((resolve) => setTimeout(resolve, 100))
		const success = await testConnection()
		setIsTesting(false)
		setTestResult(success ? "success" : "error")
		if (success) {
			await fetchFolders()
			await fetchGames()
		}
	}

	const handleAddFolder = async () => {
		if (!newFolderPath) {
			setAddError("Path is required")
			return
		}
		setAddError("")
		const label = newFolderLabel || newFolderPath.split("\\").pop() || "Folder"
		const result = await addFolder({ label, path: newFolderPath, type: newFolderType })
		if (result) {
			setNewFolderLabel("")
			setNewFolderPath("")
			setNewFolderType("games")
			setShowAddFolder(false)
			await fetchGames()
		} else {
			setAddError(error || "Failed to add folder")
		}
	}

	const handleRemoveFolder = async (id: string) => {
		const success = await removeFolder(id)
		if (success) {
			await fetchGames()
		}
	}

	return (
		<div className="h-screen w-screen flex flex-col bg-seezee-dark relative overflow-hidden">
			<ReactiveBackground />
			<TopBar />

			<main className="relative flex-1 overflow-y-auto overflow-x-hidden touch-scroll z-10">
				<div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
					<div className="flex items-start justify-between gap-4">
						<div>
							<button
								type="button"
								onClick={() => router.push("/dashboard")}
								className="text-seezee-red hover:text-seezee-red-bright transition-colors mb-2 text-sm font-medium"
							>
								← Back
							</button>
							<h1 className="text-white text-3xl font-bold">Settings</h1>
							<p className="text-white/50 text-sm">Connection, folders, and theme accent.</p>
						</div>
					</div>

					{/* Theme */}
					<section className="bg-white/5 rounded-2xl p-6 border border-white/10">
						<h2 className="text-white text-xl font-semibold mb-3">Theme</h2>
						<p className="text-white/50 text-sm">
							The UI accent follows the last color you set in Lighting.
						</p>
						<div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
							<div className="flex items-center gap-3">
								<div
									className="w-8 h-8 rounded-lg border border-white/20"
									style={{
										backgroundColor: `rgb(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b})`,
									}}
								/>
								<div className="text-white/80 text-sm font-mono">
									rgb({accentRgb.r},{accentRgb.g},{accentRgb.b})
								</div>
							</div>
							<button
								type="button"
								onClick={resetTheme}
								className="px-4 py-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 transition-colors"
							>
								Reset to default red
							</button>
						</div>
					</section>

					{/* PC Connection */}
					<section className="bg-white/5 rounded-2xl p-6 border border-white/10">
						<h2 className="text-white text-xl font-semibold mb-4">PC Connection</h2>

						<div className="mb-4 flex items-center justify-between p-3 bg-seezee-dark/60 rounded-lg border border-white/10">
							<span className="text-white/70 text-sm">Status</span>
							<div
								className={
									"flex items-center gap-2 px-3 py-1 rounded-lg text-sm border " +
									(isConnected
										? "bg-seezee-green/10 border-seezee-green/30 text-white/80"
										: "bg-white/5 border-white/10 text-white/50")
								}
							>
								<div
									className={
										"w-2 h-2 rounded-full " +
										(isConnected ? "bg-seezee-red animate-pulse" : "bg-white/30")
									}
								/>
								{isConnected ? "Connected" : "Not Connected"}
							</div>
						</div>

						<div className="space-y-3">
							<div>
								<label className="text-white/70 text-xs block mb-2">Connection Type</label>
								<div className="flex gap-2">
									{(["wifi", "ethernet", "usb"] as const).map((type) => (
										<button
											key={type}
											type="button"
											onClick={() => setLocalType(type)}
											className={
												"flex-1 px-3 py-2 rounded-lg text-xs transition-all border " +
												(localType === type
													? "bg-seezee-green/10 border-seezee-red/40 text-seezee-red"
													: "bg-white/5 border-white/10 text-white/60 hover:border-white/30")
											}
										>
											{type}
										</button>
									))}
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="text-white/70 text-xs block mb-1">PC IP Address</label>
									<input
										type="text"
										value={localIp}
										onChange={(e) => setLocalIp(e.target.value)}
										placeholder="192.168.1.100"
										className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-seezee-red focus:outline-none"
									/>
								</div>
								<div>
									<label className="text-white/70 text-xs block mb-1">Port</label>
									<input
										type="text"
										value={localPort}
										onChange={(e) => setLocalPort(e.target.value)}
										placeholder="5555"
										className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-seezee-red focus:outline-none"
									/>
								</div>
							</div>

							{testResult && (
								<div
									className={
										"p-3 rounded-lg text-sm border " +
										(testResult === "success"
											? "bg-seezee-green/10 text-white/80 border-seezee-green/30"
											: "bg-red-500/10 text-red-400 border-red-500/30")
									}
								>
									{testResult === "success"
										? "✓ Connection successful!"
										: `✗ Connection failed. Make sure the server is running on ${localIp}:${localPort}`}
								</div>
							)}

							<div className="flex gap-2 pt-2">
								<button
									type="button"
									onClick={handleTestConnection}
									disabled={isTesting || !localIp}
									className="flex-1 px-4 py-2 text-sm bg-seezee-red/20 border border-seezee-red/40 text-seezee-red rounded-lg hover:bg-seezee-red/30 transition-all disabled:opacity-50"
								>
									{isTesting ? "Testing..." : "Test & Connect"}
								</button>
								<button
									type="button"
									onClick={handleSave}
									className="flex-1 px-4 py-2 text-sm bg-seezee-red text-white rounded-lg hover:bg-seezee-red-dark transition-colors font-semibold"
								>
									Save
								</button>
							</div>
						</div>
					</section>

					{/* Folders */}
					<section className="bg-white/5 rounded-2xl p-6 border border-white/10">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-white text-xl font-semibold">Game & Tool Folders</h2>
							{isConnected && (
								<button
									type="button"
									onClick={() => fetchGames()}
									disabled={isLoading}
									className="text-xs px-3 py-1 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-all disabled:opacity-50"
								>
									{isLoading ? "Scanning..." : "↻ Scan"}
								</button>
							)}
						</div>

						{!isConnected ? (
							<div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
								<p className="text-white/40 text-sm">Connect to your PC to manage folders</p>
							</div>
						) : (
							<div className="space-y-4">
								<div className="space-y-2">
									{folders.length === 0 ? (
										<p className="text-white/40 text-sm py-4 text-center border border-dashed border-white/10 rounded-xl">
											No custom folders added yet. Steam games are auto-detected.
										</p>
									) : (
										folders.map((folder) => (
											<div
												key={folder.id}
												className="flex items-center gap-3 px-4 py-3 bg-seezee-dark/60 rounded-lg border border-white/10"
											>
												<div
													className={
														"w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold " +
														(folder.type === "tools"
															? "bg-purple-500/20 text-purple-300"
															: "bg-seezee-green/10 text-seezee-red")
													}
												>
													{folder.type === "tools" ? "T" : "G"}
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-white font-medium text-sm truncate">{folder.label}</p>
													<p className="text-white/40 text-xs font-mono truncate">{folder.path}</p>
												</div>
												<button
													type="button"
													onClick={() => handleRemoveFolder(folder.id)}
													disabled={isLoading}
													className="text-red-400 hover:text-red-300 text-sm px-2 py-1 hover:bg-red-500/10 rounded transition-all disabled:opacity-50"
												>
													Remove
												</button>
											</div>
										))
									)}
								</div>

								{showAddFolder ? (
									<div className="p-4 bg-seezee-dark/60 rounded-xl border border-white/10 space-y-3">
										<h3 className="text-white font-medium text-sm">Add New Folder</h3>

										<div className="flex gap-2">
											<button
												type="button"
												onClick={() => setNewFolderType("games")}
												className={
													"flex-1 px-3 py-2 rounded-lg text-sm transition-all border " +
													(newFolderType === "games"
														? "bg-seezee-green/10 border-seezee-red/40 text-seezee-red"
														: "bg-white/5 border-white/10 text-white/60")
												}
											>
												Games
											</button>
											<button
												type="button"
												onClick={() => setNewFolderType("tools")}
												className={
													"flex-1 px-3 py-2 rounded-lg text-sm transition-all border " +
													(newFolderType === "tools"
														? "bg-purple-500/20 border-purple-500/40 text-purple-300"
														: "bg-white/5 border-white/10 text-white/60")
												}
											>
												Tools
											</button>
										</div>

										<input
											type="text"
											value={newFolderLabel}
											onChange={(e) => setNewFolderLabel(e.target.value)}
											placeholder="Label (e.g., Main SSD, Epic Games)"
											className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-seezee-red focus:outline-none"
										/>

										<input
											type="text"
											value={newFolderPath}
											onChange={(e) => setNewFolderPath(e.target.value)}
											placeholder="Full path (e.g., D:\\Games)"
											className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-seezee-red focus:outline-none font-mono"
										/>

										{addError && <p className="text-red-400 text-xs">{addError}</p>}

										<div className="flex gap-2">
											<button
												type="button"
												onClick={() => {
													setShowAddFolder(false)
													setAddError("")
													setNewFolderLabel("")
													setNewFolderPath("")
												}}
												className="flex-1 px-4 py-2 text-sm bg-white/5 text-white/60 rounded-lg hover:bg-white/10 transition-all"
											>
												Cancel
											</button>
											<button
												type="button"
												onClick={handleAddFolder}
												disabled={isLoading || !newFolderPath}
												className="flex-1 px-4 py-2 text-sm bg-seezee-red text-white rounded-lg hover:bg-seezee-red-dark transition-colors font-semibold disabled:opacity-50"
											>
												{isLoading ? "Adding..." : "Add Folder"}
											</button>
										</div>
									</div>
								) : (
									<button
										type="button"
										onClick={() => setShowAddFolder(true)}
										className="w-full px-6 py-3 rounded-xl bg-white/5 text-white/70 font-medium hover:bg-white/10 hover:text-white transition-all duration-200 border border-white/10"
									>
										+ Add Folder
									</button>
								)}
							</div>
						)}
					</section>

					{/* Quick stats */}
					<section className="bg-white/5 rounded-2xl p-6 border border-white/10">
						<h2 className="text-white text-xl font-semibold mb-4">System Info</h2>
						<div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
							<div>
								<p className="text-white/40">PC Server</p>
								<p className={`font-mono ${isConnected ? "text-white" : "text-white/50"}`}>
									{isConnected ? `${pcIpAddress}:${pcPort}` : "Not connected"}
								</p>
							</div>
							<div>
								<p className="text-white/40">Games Detected</p>
								<p className="text-white font-mono">{games.length}</p>
							</div>
							<div>
								<p className="text-white/40">Custom Folders</p>
								<p className="text-white font-mono">{folders.length}</p>
							</div>
						</div>
					</section>
				</div>
			</main>
		</div>
	)
}

