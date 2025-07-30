"use client"

import type { ProfileResponse } from "@dishola/types"
import { useState } from "react"
import { InlineUsernameEditor } from "./inline-username-editor"

interface ProfileDisplayProps {
  profile: ProfileResponse
}

export function ProfileDisplay({ profile: initialProfile }: ProfileDisplayProps) {
  const [profile, setProfile] = useState(initialProfile)

  const handleProfileUpdate = (updatedProfile: ProfileResponse) => {
    setProfile(updatedProfile)
  }

  return (
    <div className="space-y-4">
      {/* Inline Username Editor */}
      <InlineUsernameEditor initialProfile={profile} onProfileUpdate={handleProfileUpdate} />

      <div>
        <div className="block mb-1 font-medium text-sm text-muted-foreground">Email</div>
        <div className="text-base">
          {profile.email || <span className="text-muted-foreground italic">Not available</span>}
        </div>
      </div>
    </div>
  )
}
