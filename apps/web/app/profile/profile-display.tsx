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
    <div className="flex items-center justify-start gap-16">
      <InlineUsernameEditor initialProfile={profile} onProfileUpdate={handleProfileUpdate} />

      <div>
        <div className="block mb-1 font-bold text-sm text-muted-foreground">Email</div>
        <div className="text-base">
          {profile.email || <span className="text-muted-foreground italic">Not available</span>}
        </div>
      </div>
    </div>
  )
}
