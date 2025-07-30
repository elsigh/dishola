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

interface UsernameEditorProps {
  initialProfile: ProfileResponse
  onProfileUpdate?: (profile: ProfileResponse) => void
}

export function UsernameEditor({ initialProfile, onProfileUpdate }: UsernameEditorProps) {
  const { getAuthToken } = useAuth()
  const [username, setUsername] = useState(initialProfile.username || "")
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [validationMessage, setValidationMessage] = useState("")
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
        const res = await fetch(`${API_BASE_URL}/api/username-check?username=${encodeURIComponent(usernameToCheck)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (res.ok) {
          const data = await res.json()
          setIsAvailable(data.available)
          setValidationMessage(data.available ? "Username is available!" : data.message || "Username is not available")
        } else {
          setIsAvailable(false)
          setValidationMessage("Error checking username availability")
        }
      } catch (error) {
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
    try {
      const requestData: ProfileUpdateRequest = {
        username: username || undefined
      }

      const validatedRequest = ProfileUpdateRequestSchema.parse(requestData)

      const token = getAuthToken()
      const res = await fetch(`${API_BASE_URL}/api/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(validatedRequest)
      })

      if (res.ok) {
        const updatedProfile: ProfileResponse = await res.json()
        onProfileUpdate?.(updatedProfile)
        toast.success("Username updated successfully!")
      } else {
        const err = await res.json()
        toast.error(err.statusMessage || "Failed to update username")
      }
    } catch (e) {
      if (e instanceof Error) {
        toast.error(e.message)
      } else {
        toast.error("Failed to update username")
      }
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = username !== initialProfile.username

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label htmlFor={usernameId} className="block mb-1 font-medium">
          Username
        </label>
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

        {initialProfile.username && (
          <div className="mt-2 text-sm text-muted-foreground">
            Your public profile:{" "}
            <Link href={`/~${initialProfile.username}`} className="underline">
              /~{initialProfile.username}
            </Link>
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={saving || !hasChanges || isAvailable === false || username === ""}
        className="w-full"
      >
        {saving ? "Updating..." : "Update Username"}
      </Button>
    </form>
  )
}
