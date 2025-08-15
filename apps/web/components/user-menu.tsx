"use client"

import { Image, LogOut } from "lucide-react"
import { default as NextImage } from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase-client"

export function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Direct Google sign-in
  const handleGoogleSignIn = async () => {
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${window.location.pathname}`
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    })
  }

  const avatarUrl = user?.user_metadata?.avatar_url
  // console.log("UserMenu debug:", {
  //   hasUser: !!user,
  //   avatarUrl,
  //   imageError,
  //   imageLoaded,
  //   userMetadata: user?.user_metadata
  // })

  const handleImageLoad = () => {
    //console.log("Avatar image loaded successfully")
    setImageLoaded(true)
    setImageError(false)
  }

  const handleImageError = (error: any) => {
    console.error("Avatar image failed to load:", error, "URL:", avatarUrl)
    setImageError(true)
    setImageLoaded(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <span>
          <Avatar className="h-10 w-10 border border-gray-200 relative cursor-pointer">
            {user ? (
              <>
                {avatarUrl && !imageError ? (
                  <AvatarImage
                    src={avatarUrl}
                    alt={user.user_metadata?.display_name || "Profile"}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                ) : null}
                <AvatarFallback>
                  {user.user_metadata?.display_name?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </>
            ) : (
              // Skeleton avatar with user icon
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-gray-200 animate-pulse">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5 text-gray-400"
                >
                  <title>User</title>
                  <circle cx="12" cy="8" r="4" fill="currentColor" />
                  <path d="M4 20c0-2.21 3.582-4 8-4s8 1.79 8 4" fill="currentColor" />
                </svg>
              </span>
            )}
          </Avatar>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className=" bg-white border" align="end" forceMount>
        {user ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex w-full cursor-pointer items-center">
                <Image className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem asChild>
            <Button onClick={handleGoogleSignIn} className="w-full bg-white" variant="outline">
              <NextImage src="/img/google-logo.png" alt="Google Logo" width={20} height={20} />
              Sign in with Google
            </Button>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
