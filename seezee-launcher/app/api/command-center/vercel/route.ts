import { NextResponse } from "next/server"

type VercelProject = {
	id?: string
	name?: string
	framework?: string | null
	link?: { repo?: string | null } | null
	latestDeployments?: unknown[]
	updatedAt?: number | string
	createdAt?: number | string
	nodeVersion?: string | null
}

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const token = typeof body?.token === "string" ? body.token : ""
		const teamId = typeof body?.teamId === "string" ? body.teamId : ""

		if (!token) {
			return NextResponse.json({ error: "Vercel token required" }, { status: 400 })
		}

		const url = new URL("https://api.vercel.com/v9/projects")
		url.searchParams.set("limit", "50")
		if (teamId) {
			url.searchParams.set("teamId", teamId)
		}

		const response = await fetch(url.toString(), {
			headers: {
				Authorization: `Bearer ${token}`,
			},
			cache: "no-store",
		})

		if (!response.ok) {
			return NextResponse.json({ error: `Vercel API error: ${response.status}` }, { status: 502 })
		}

		const data = await response.json()
		const projects = Array.isArray(data?.projects)
			? (data.projects as VercelProject[]).map((project) => ({
				id: project.id ?? "",
				name: project.name ?? "",
				framework: project.framework || null,
				gitUrl: project.link?.repo || null,
				url: project.name ? `https://${project.name}.vercel.app` : null,
				latestDeployment: project.latestDeployments?.[0] || null,
				updatedAt: project.updatedAt ?? null,
				createdAt: project.createdAt ?? null,
				nodeVersion: project.nodeVersion || null,
			}))
			: []

		return NextResponse.json({ projects })
	} catch {
		return NextResponse.json({ error: "Failed to fetch Vercel projects" }, { status: 500 })
	}
}
