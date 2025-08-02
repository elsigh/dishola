"use client"

import type { ProfileResponse, ProfileUpdateRequest } from "@dishola/types"
import { ProfileUpdateRequestSchema } from "@dishola/types"
import Link from "next/link"
import { useCallback, useId, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { API_BASE_URL } from "@/lib/constants"

interface InlineUsernameEditorProps {
  initialProfile: ProfileResponse
  onProfileUpdate?: (profile: ProfileResponse) => void
}

export function InlineUsernameEditor({ initialProfile, onProfileUpdate }: InlineUsernameEditorProps) {
  const { getAuthToken } = useAuth()
  const [isEditing, setIsEditing] = useState(!initialProfile.username) // Auto-edit if no username
  const [username, setUsername] = useState(initialProfile.username || "")
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [validationMessage, setValidationMessage] = useState("")
  const [saveError, setSaveError] = useState("")
  const usernameId = useId()
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const checkUsernameAvailability = useCallback(
    async (usernameToCheck: string) => {
      if (!usernameToCheck || usernameToCheck === initialProfile.username) {
        setIsAvailable(null)
        setValidationMessage("")
        return
      }

      // Basic validation
      if (usernameToCheck.length < 3) {
        setIsAvailable(false)
        setValidationMessage("Username must be at least 3 characters")
        return
      }

      if (!/^[a-z0-9_]+$/.test(usernameToCheck)) {
        setIsAvailable(false)
        setValidationMessage("Username can only contain lowercase letters, numbers, and underscores")
        return
      }

      setChecking(true)
      try {
        const token = getAuthToken()
        console.log("Checking username availability:", usernameToCheck)
        const res = await fetch(`${API_BASE_URL}/api/username-check?username=${encodeURIComponent(usernameToCheck)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (res.ok) {
          const data = await res.json()
          console.log("Username check result:", data)
          setIsAvailable(data.available)
          setValidationMessage(data.available ? "Username is available!" : data.message || "Username is not available")
        } else {
          console.error("Username check failed:", res.status, res.statusText)
          setIsAvailable(false)
          setValidationMessage("Error checking username availability")
        }
      } catch (error) {
        console.error("Username check error:", error)
        setIsAvailable(false)
        setValidationMessage("Error checking username availability")
      } finally {
        setChecking(false)
      }
    },
    [initialProfile.username, getAuthToken]
  )

  const handleUsernameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, "")
    setUsername(sanitized)

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Reset validation state immediately
    setIsAvailable(null)
    setValidationMessage("")
    setSaveError("") // Clear save errors when user types
    setChecking(false)

    // Set new timeout for debounced validation
    debounceTimeoutRef.current = setTimeout(() => {
      checkUsernameAvailability(sanitized)
    }, 500)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username) {
      toast.error("Username is required")
      return
    }

    if (isAvailable === false) {
      toast.error("Please choose an available username")
      return
    }

    setSaving(true)
    setSaveError("") // Clear any previous save errors

    try {
      const requestData: ProfileUpdateRequest = {
        username: username || undefined
      }

      const validatedRequest = ProfileUpdateRequestSchema.parse(requestData)
      const token = getAuthToken()

      console.log("Updating profile with:", validatedRequest)
      const res = await fetch(`${API_BASE_URL}/api/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(validatedRequest)
      })

      console.log("Profile update response:", res.status, res.statusText)

      if (res.ok) {
        const updatedProfile: ProfileResponse = await res.json()
        console.log("Profile updated successfully:", updatedProfile)
        onProfileUpdate?.(updatedProfile)
        setIsEditing(false)
        setSaveError("") // Clear any save errors
        toast.success("Username updated successfully!")
      } else {
        const err = await res.json()
        console.error("Profile update failed:", err)
        const errorMessage = err.statusMessage || "Failed to update username"
        setSaveError(errorMessage)
        toast.error(errorMessage)
      }
    } catch (e) {
      console.error("Profile update error:", e)
      const errorMessage = e instanceof Error ? e.message : "Failed to update username"
      setSaveError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setUsername(initialProfile.username || "")
    setIsEditing(false)
    setIsAvailable(null)
    setValidationMessage("")
    setChecking(false)

    // Clear any pending timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setUsername(initialProfile.username || "")
    // Reset validation state when entering edit mode
    setIsAvailable(null)
    setValidationMessage("")
    setChecking(false)
  }

  // Show form if editing or no username exists
  if (isEditing) {
    return (
      <div className="space-y-3 flex-grow">
        <div className="block mb-1 font-bold text-sm text-muted-foreground">Username</div>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <Input
              id={usernameId}
              data-1p-ignore
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="username (lowercase, a-z, 0-9, _ only)"
              maxLength={50}
              required
              className={isAvailable === true ? "border-green-500" : isAvailable === false ? "border-red-500" : ""}
            />

            {checking && <div className="mt-1 text-sm text-muted-foreground">Checking availability...</div>}

            {validationMessage && (
              <div className={`mt-1 text-sm ${isAvailable === true ? "text-green-600" : "text-red-600"}`}>
                {validationMessage}
              </div>
            )}

            {saveError && (
              <div className="mt-1 text-sm text-red-600">
                <strong>Save failed:</strong> {saveError}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving || isAvailable === false || username === ""} size="sm">
              {saving ? "Saving..." : "Save"}
            </Button>
            {initialProfile.username && (
              <Button type="button" variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>
    )
  }

  // Show username with edit link
  return (
    <div className="space-y-2">
      <div className="block mb-1 font-medium text-sm text-muted-foreground">Username</div>
      <div className="flex items-center gap-6">
        <Link href={`/~${initialProfile.username}`} className="text-primary">
          {initialProfile.username}
        </Link>
        <button
          type="button"
          onClick={handleEdit}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          edit
        </button>
      </div>
    </div>
  )
}
