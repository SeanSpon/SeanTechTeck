"use client"

import { useEffect, useMemo, useState } from "react"
import TopBar from "@/components/TopBar"
import ReactiveBackground from "@/components/ReactiveBackground"

const STORAGE_KEYS = {
	githubToken: "seezee.githubToken",
	githubOwner: "seezee.githubOwner",
	vercelToken: "seezee.vercelToken",
	vercelTeamId: "seezee.vercelTeamId",
}

type GitHubRepo = {
	id: number
	name: string
	full_name: string
	html_url: string
	default_branch: string
	private: boolean
	pushed_at?: string
	updated_at?: string
	language?: string
}

type VercelProject = {
	id: string
	name: string
	framework: string | null
	gitUrl: string | null
	url: string
	updatedAt: number
	createdAt: number
	nodeVersion?: string | null
	latestDeployment?: {
		state?: string
		url?: string
		createdAt?: number
	} | null
}

export default function CommandCenterPage() {
	const [githubToken, setGithubToken] = useState("")
	const [githubOwner, setGithubOwner] = useState("seanspon")
	const [vercelToken, setVercelToken] = useState("")
	const [vercelTeamId, setVercelTeamId] = useState("")
	const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([])
	const [vercelProjects, setVercelProjects] = useState<VercelProject[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastUpdated, setLastUpdated] = useState<string | null>(null)

	useEffect(() => {
		const storedGithubToken = localStorage.getItem(STORAGE_KEYS.githubToken) || ""
		const storedGithubOwner = localStorage.getItem(STORAGE_KEYS.githubOwner) || "seanspon"
		const storedVercelToken = localStorage.getItem(STORAGE_KEYS.vercelToken) || ""
		const storedVercelTeamId = localStorage.getItem(STORAGE_KEYS.vercelTeamId) || ""
		setGithubToken(storedGithubToken)
		setGithubOwner(storedGithubOwner)
		setVercelToken(storedVercelToken)
		setVercelTeamId(storedVercelTeamId)
	}, [])

	const saveTokens = () => {
		localStorage.setItem(STORAGE_KEYS.githubToken, githubToken)
		localStorage.setItem(STORAGE_KEYS.githubOwner, githubOwner)
		localStorage.setItem(STORAGE_KEYS.vercelToken, vercelToken)
		localStorage.setItem(STORAGE_KEYS.vercelTeamId, vercelTeamId)
	}

	const loadOverview = async () => {
		setLoading(true)
		setError(null)
		try {
			const [githubResponse, vercelResponse] = await Promise.all([
				fetch("/api/command-center/github", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						token: githubToken,
						owner: githubOwner,
					}),
				}),
				fetch("/api/command-center/vercel", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						token: vercelToken,
						teamId: vercelTeamId,
					}),
				}),
			])

			if (!githubResponse.ok) {
				const data = await githubResponse.json()
				throw new Error(data?.error || "GitHub request failed")
			}
			if (!vercelResponse.ok) {
				const data = await vercelResponse.json()
				throw new Error(data?.error || "Vercel request failed")
			}

			const githubData = await githubResponse.json()
			const vercelData = await vercelResponse.json()

			setGithubRepos(githubData.repos || [])
			setVercelProjects(vercelData.projects || [])
			setLastUpdated(new Date().toLocaleString())
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load overview")
		} finally {
			setLoading(false)
		}
	}

	const repoCount = githubRepos.length
	const projectCount = vercelProjects.length
	const connectedLabel = useMemo(() => {
		if (!githubToken && !vercelToken) return "Not connected"
		if (githubToken && vercelToken) return "GitHub + Vercel connected"
		if (githubToken) return "GitHub connected"
		return "Vercel connected"
	}, [githubToken, vercelToken])

	return (
		<div className="h-screen w-screen flex flex-col bg-seezee-dark relative overflow-hidden">
			<ReactiveBackground />
			<TopBar />
			<main className="relative flex-1 overflow-y-auto overflow-x-hidden touch-scroll z-10">
				<div className="px-6 py-6 max-[1280px]:px-4 max-[1280px]:py-4">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div>
							<h1 className="text-white text-2xl max-[1280px]:text-xl font-bold">Command Center</h1>
							<p className="text-white/50 text-sm max-[1280px]:text-xs mt-1">
								Overview of GitHub + Vercel status for your team.
							</p>
						</div>
						<div className="text-xs text-white/60">
							<div>{connectedLabel}</div>
							{lastUpdated && <div>Updated: {lastUpdated}</div>}
						</div>
					</div>

					{error && (
						<div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
							{error}
						</div>
					)}

					<div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
						<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
							<h2 className="text-white font-semibold text-base">Connections</h2>
							<div className="mt-3 flex flex-col gap-3 text-sm">
								<label className="text-white/70">
									GitHub token
									<input
										type="password"
										value={githubToken}
										onChange={(event) => setGithubToken(event.target.value)}
										className="mt-1 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white text-sm"
										placeholder="ghp_..."
									/>
								</label>
								<label className="text-white/70">
									GitHub owner
									<input
										type="text"
										value={githubOwner}
										onChange={(event) => setGithubOwner(event.target.value)}
										className="mt-1 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white text-sm"
										placeholder="seanspon"
									/>
								</label>
								<label className="text-white/70">
									Vercel token
									<input
										type="password"
										value={vercelToken}
										onChange={(event) => setVercelToken(event.target.value)}
										className="mt-1 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white text-sm"
										placeholder="vercel_..."
									/>
								</label>
								<label className="text-white/70">
									Vercel team ID (optional)
									<input
										type="text"
										value={vercelTeamId}
										onChange={(event) => setVercelTeamId(event.target.value)}
										className="mt-1 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white text-sm"
										placeholder="team_xxx"
									/>
								</label>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={saveTokens}
										className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white text-sm hover:bg-white/20"
									>
										Save tokens
									</button>
									<button
										type="button"
										onClick={loadOverview}
										disabled={loading}
										className="flex-1 rounded-lg border border-seezee-red/40 bg-seezee-red/20 px-3 py-2 text-seezee-red text-sm hover:bg-seezee-red/30 disabled:opacity-50"
									>
										{loading ? "Loading..." : "Refresh overview"}
									</button>
								</div>
							</div>
						</div>

						<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
							<div className="flex items-center justify-between">
								<h2 className="text-white font-semibold text-base">GitHub repos</h2>
								<span className="text-xs text-white/60">{repoCount} repos</span>
							</div>
							<div className="mt-3 space-y-3">
								{githubRepos.slice(0, 8).map((repo) => (
									<div key={repo.id} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
										<div className="flex items-center justify-between gap-3">
											<a
												href={repo.html_url}
												target="_blank"
												rel="noreferrer"
												className="text-white text-sm font-semibold hover:text-seezee-red"
											>
												{repo.full_name}
											</a>
											<span className="text-[11px] text-white/50">
												{repo.private ? "Private" : "Public"}
											</span>
										</div>
										<div className="mt-1 text-xs text-white/50">
											{repo.language || "Unknown"} • Updated {repo.updated_at?.slice(0, 10) || "-"}
										</div>
									</div>
								))}
								{githubRepos.length === 0 && (
									<div className="text-sm text-white/50">No repos loaded yet.</div>
								)}
							</div>
						</div>

						<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
							<div className="flex items-center justify-between">
								<h2 className="text-white font-semibold text-base">Vercel projects</h2>
								<span className="text-xs text-white/60">{projectCount} projects</span>
							</div>
							<div className="mt-3 space-y-3">
								{vercelProjects.slice(0, 8).map((project) => (
									<div key={project.id} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
										<div className="flex items-center justify-between gap-3">
											<a
												href={project.url}
												target="_blank"
												rel="noreferrer"
												className="text-white text-sm font-semibold hover:text-seezee-red"
											>
												{project.name}
											</a>
											<span className="text-[11px] text-white/50">
												{project.framework || "Unknown"}
											</span>
										</div>
										<div className="mt-1 text-xs text-white/50">
											{project.gitUrl ? `Git: ${project.gitUrl}` : "No Git linked"}
										</div>
										{project.latestDeployment?.state && (
											<div className="mt-1 text-xs text-white/60">
												Deploy: {project.latestDeployment.state}
											</div>
										)}
									</div>
								))}
								{vercelProjects.length === 0 && (
									<div className="text-sm text-white/50">No projects loaded yet.</div>
								)}
							</div>
						</div>
					</div>

					<div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
						<h2 className="text-white font-semibold text-base">Quick links</h2>
						<div className="mt-3 flex flex-wrap gap-3">
							<a
								href="https://seezeestudios.com/admin"
								target="_blank"
								rel="noreferrer"
								className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 hover:text-white hover:border-seezee-red/40"
							>
								SeeZeeStudios admin dashboard
							</a>
							<a
								href="https://vercel.com/dashboard"
								target="_blank"
								rel="noreferrer"
								className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 hover:text-white hover:border-seezee-red/40"
							>
								Vercel dashboard
							</a>
							<a
								href="https://github.com/seezee"
								target="_blank"
								rel="noreferrer"
								className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 hover:text-white hover:border-seezee-red/40"
							>
								GitHub organization
							</a>
						</div>
					</div>
				</div>
			</main>
		</div>
	)
}
