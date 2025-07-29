"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PublicProfilePage() {
  const params = useParams()
  const username = Array.isArray(params?.username) ? params.username[0] : params?.username
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!username) return
    const fetchProfile = async () => {
      setLoading(true)
      setNotFound(false)
      try {
        const res = await fetch(`/api/public-profile?username=${encodeURIComponent(username)}`)
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [username])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading profile...</div>
        </div>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>User Not Found</CardTitle>
            <CardDescription>This user does not exist.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-8 flex items-center gap-4">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="avatar" className="w-20 h-20 rounded-full object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-3xl">
            {profile.display_name?.[0]?.toUpperCase() || profile.username[0].toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold">{profile.display_name || profile.username}</h1>
          <div className="text-muted-foreground">@{profile.username}</div>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{profile.display_name || profile.username}'s Taste Preferences</CardTitle>
          <CardDescription>This user's favorite dishes and ingredients.</CardDescription>
        </CardHeader>
        <CardContent>
          {profile.tastes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No tastes added yet.</div>
          ) : (
            <div className="space-y-2">
              {profile.tastes.map((taste: any) => (
                <div key={taste.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  {taste.taste_dictionary.image_url && (
                    <img
                      src={taste.taste_dictionary.image_url}
                      alt={taste.taste_dictionary.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{taste.taste_dictionary.name}</div>
                    <Badge variant="secondary" className="text-xs">
                      {taste.taste_dictionary.type}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">#{taste.order_position}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
