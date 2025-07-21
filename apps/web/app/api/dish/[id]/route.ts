import type { NextRequest } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!id) {
    return new Response("Missing dish ID", { status: 400 })
  }

  try {
    // Use the nitro server directly
    const apiUrl = `http://localhost:3001/api/dish/${id}`
    const apiRes = await fetch(apiUrl)

    if (!apiRes.ok) {
      const errorText = await apiRes.text()
      return new Response(JSON.stringify({ error: `Failed to fetch dish: ${apiRes.statusText}` }), {
        status: apiRes.status,
        headers: { "Content-Type": "application/json" }
      })
    }

    const data = await apiRes.json()
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Error proxying dish request:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
