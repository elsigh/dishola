"use client"

import Link from "next/link"
import { useEffect, useId, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"

export default function ProfilePage() {
  const { user, getAuthToken, isLoading } = useAuth()
  const [profile, setProfile] = useState({ display_name: "", username: "", avatar_url: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const displayNameId = useId()
  const usernameId = useId()
  const avatarId = useId()

  useEffect(() => {
    if (!user) return
    const fetchProfile = async () => {
      setLoading(true)
      try {
        const token = getAuthToken()
        const res = await fetch("/api/profile", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
          setDisplayName(data.display_name || "")
          setUsername(data.username || "")
        } else {
          toast.error("Failed to load profile")
        }
      } catch (e) {
        toast.error("Failed to load profile")
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [user, getAuthToken])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const token = getAuthToken()
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ display_name: displayName, username })
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        toast.success("Profile updated!")
      } else {
        const err = await res.json()
        toast.error(err.statusMessage || "Failed to update profile")
      }
    } catch (e) {
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading your profile...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>You must be signed in to view your profile.</CardDescription>
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
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>Your public profile info is visible at your username URL.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor={displayNameId} className="block mb-1 font-medium">
                Display Name
              </label>
              <Input
                id={displayNameId}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                maxLength={255}
              />
            </div>
            <div>
              <label htmlFor={usernameId} className="block mb-1 font-medium">
                Username
              </label>
              <Input
                id={usernameId}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="username (lowercase, a-z, 0-9, _ only)"
                maxLength={50}
                pattern="^[a-z0-9_]+$"
                required
              />
              {profile.username && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Your public profile:{" "}
                  <Link href={`/~${profile.username}`} className="underline">
                    /~{profile.username}
                  </Link>
                </div>
              )}
            </div>
            <div>
              <label htmlFor={avatarId} className="block mb-1 font-medium">
                Avatar
              </label>
              {profile.avatar_url ? (
                <img
                  id={avatarId}
                  src={profile.avatar_url}
                  alt="avatar"
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <span className="text-muted-foreground">No avatar set</span>
              )}
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        <Link href="/profile/tastes" className="underline text-primary">
          Edit Taste Preferences
        </Link>
      </div>
    </div>
  )
}
