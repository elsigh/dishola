"use client"

import type { Session, User } from "@supabase/supabase-js"
import { createContext, type ReactNode, useContext, useEffect, useState } from "react"
import { AuthModal } from "@/components/auth-modal"
import { createClient } from "@/lib/supabase-client"
import { API_BASE_URL } from "@/lib/constants"
import type { ProfileResponse } from "@dishola/types"

type AuthContextType = {
  user: User | null
  session: Session | null
  profile: ProfileResponse | null
  isLoading: boolean
  signOut: () => Promise<void>
  requireAuth: (callback: () => void) => void
  getAuthToken: () => string | null
  getUserTastes: () => string[]
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
  requireAuth: () => {},
  getAuthToken: () => null,
  getUserTastes: () => []
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null)

  // Fetch user profile (including tastes) from API
  const fetchProfile = async (session: Session) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const profileData: ProfileResponse = await response.json()
        console.log("[AuthContext] Profile fetched successfully:", { 
          id: profileData.id, 
          email: profileData.email,
          tastesCount: profileData.tastes?.length || 0,
          tastes: profileData.tastes?.map(t => t.taste_dictionary.name) || []
        })
        setProfile(profileData)
      } else {
        console.error("Failed to fetch profile:", response.status)
        setProfile(null)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      setProfile(null)
    }
  }

  useEffect(() => {
    const getUser = async () => {
      try {
        const supabase = createClient()
        // Get current session
        const {
          data: { session }
        } = await supabase.auth.getSession()
        
        setUser(session?.user || null)
        setSession(session)
        
        // Fetch profile if user is authenticated
        if (session?.user) {
          await fetchProfile(session)
        } else {
          setProfile(null)
        }

        // Listen for auth changes
        const {
          data: { subscription }
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          // Only fetch profile on actual auth events, not initial session
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setUser(session?.user || null)
            setSession(session)
            
            if (session?.user) {
              await fetchProfile(session)
              if (pendingCallback) {
                // Execute the pending action after successful auth
                pendingCallback()
                setPendingCallback(null)
              }
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null)
            setSession(null)
            setProfile(null)
          }
        })

        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error("Error getting auth session:", error)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()
  }, [pendingCallback])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setProfile(null) // Clear profile on sign out
  }

  const requireAuth = (callback: () => void) => {
    if (user) {
      // User is already authenticated, proceed with the action
      callback()
    } else {
      // Store the callback and show auth modal
      setPendingCallback(() => callback)
      setShowAuthModal(true)
    }
  }

  const getAuthToken = (): string | null => {
    return session?.access_token || null
  }

  const getUserTastes = (): string[] => {
    if (!profile?.tastes) {
      console.log("[AuthContext] getUserTastes called but no profile.tastes:", { profile: !!profile, tastes: profile?.tastes })
      return []
    }
    const tasteNames = profile.tastes.map(taste => taste.taste_dictionary.name).filter(Boolean)
    console.log("[AuthContext] getUserTastes returning:", tasteNames)
    return tasteNames
  }

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    // The callback will be executed by the auth state change listener
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signOut,
        requireAuth,
        getAuthToken,
        getUserTastes
      }}
    >
      {children}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false)
          if (pendingCallback) {
            pendingCallback()
            setPendingCallback(null)
          }
        }}
      />
    </AuthContext.Provider>
  )
}
