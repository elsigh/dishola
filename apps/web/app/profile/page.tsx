import type { ProfileResponse } from "@dishola/types"
import { redirect } from "next/navigation"
import { cache } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { API_BASE_URL } from "@/lib/constants"
import { createClient } from "@/lib/supabase-server"
import { ProfileDisplay } from "./profile-display"
import { TastesManager } from "./tastes-manager"
import { getUserTastes } from "./user-tastes"

// Cache the profile fetch function
const getProfile = cache(async (accessToken: string): Promise<ProfileResponse> => {
  try {
    const url = `${API_BASE_URL}/api/profile`
    console.debug("Fetching profile from", url)
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (res.ok) {
      return (await res.json()) as ProfileResponse
    }

    throw new Error(`Failed to fetch profile: ${res.status}`)
  } catch (error) {
    console.error("Error fetching profile:", error)
    throw error
  }
})

export default async function ProfilePage() {
  // Get the user session server-side
  const supabase = await createClient()
  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  // Redirect if not authenticated
  if (!session?.user || error) {
    redirect("/auth/login")
  }

  // Fetch profile data server-side
  let profile: ProfileResponse
  let userTastes: Awaited<ReturnType<typeof getUserTastes>>["tastes"]

  try {
    // Fetch both profile and tastes in parallel
    const [profileData, tastesData] = await Promise.all([
      getProfile(session.access_token),
      getUserTastes(session.access_token)
    ])

    profile = profileData
    userTastes = tastesData.tastes
  } catch (_error) {
    // Handle error - could show error page or fallback
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Error Loading Profile</CardTitle>
            <CardDescription>We couldn't load your profile data. Please try refreshing the page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-muted-foreground">Manage your public profile and preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Profile Information with Inline Username Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileDisplay profile={profile} />
          </CardContent>
        </Card>

        {/* Tastes Section */}
        <Card>
          <CardHeader>
            <CardTitle>Taste Preferences</CardTitle>
            <CardDescription>Add and manage your favorite dishes and ingredients</CardDescription>
          </CardHeader>
          <CardContent>
            <TastesManager initialTastes={userTastes} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
