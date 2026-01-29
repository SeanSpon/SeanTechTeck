import { NextResponse } from "next/server"

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const token = typeof body?.token === "string" ? body.token : ""
		const owner = typeof body?.owner === "string" ? body.owner : ""

		let url = ""
		const headers: Record<string, string> = {
			"Accept": "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
		}

		if (token) {
			headers.Authorization = `Bearer ${token}`
			url = "https://api.github.com/user/repos?per_page=50&sort=pushed"
		} else if (owner) {
			url = `https://api.github.com/users/${encodeURIComponent(owner)}/repos?per_page=50&sort=pushed`
		} else {
			return NextResponse.json({ error: "GitHub owner or token required" }, { status: 400 })
		}

		const response = await fetch(url, { headers, cache: "no-store" })
		if (!response.ok) {
			return NextResponse.json({ error: `GitHub API error: ${response.status}` }, { status: 502 })
		}

		const repos = await response.json()
		const filtered = Array.isArray(repos)
			? repos.filter((repo) => (owner ? repo?.owner?.login?.toLowerCase() === owner.toLowerCase() : true))
			: []

		return NextResponse.json({ repos: filtered })
	} catch {
		return NextResponse.json({ error: "Failed to fetch GitHub repositories" }, { status: 500 })
	}
}
