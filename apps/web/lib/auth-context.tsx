"use client"

import type { Session, User } from "@supabase/supabase-js"
import { createContext, type ReactNode, useContext, useEffect, useState } from "react"
import { AuthModal } from "@/components/auth-modal"
import { createClient } from "@/lib/supabase-client"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signOut: () => Promise<void>
  requireAuth: (callback: () => void) => void
  getAuthToken: () => string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
  requireAuth: () => {},
  getAuthToken: () => null
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null)

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

        // Listen for auth changes
        const {
          data: { subscription }
        } = supabase.auth.onAuthStateChange((_event, session) => {
          //console.debug("[AuthContext] Auth state changed:", _event)
          // Only update if the session actually changed
          setUser((prevUser) => {
            const newUser = session?.user || null
            if (prevUser?.id !== newUser?.id) {
              return newUser
            }
            return prevUser
          })
          setSession((prevSession) => {
            if (prevSession?.access_token !== session?.access_token) {
              return session
            }
            return prevSession
          })
          if (session?.user && pendingCallback) {
            // Execute the pending action after successful auth
            pendingCallback()
            setPendingCallback(null)
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

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    // The callback will be executed by the auth state change listener
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signOut,
        requireAuth,
        getAuthToken
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
