"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, ArrowLeft } from "lucide-react"

interface AdminGuardProps {
  children: React.ReactNode
}

// List of admin email addresses
const ADMIN_EMAILS = [
  'elsigh@gmail.com'
]

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false)
        return
      }

      // Check if the user's email is in the admin list
      const userEmail = user.email?.toLowerCase()
      const adminStatus = userEmail && ADMIN_EMAILS.includes(userEmail)
      setIsAdmin(adminStatus || false)
    }

    if (!isLoading) {
      checkAdminStatus()
    }
  }, [user, isLoading])

  // Show loading state
  if (isLoading || isAdmin === null) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Checking access permissions...</div>
        </div>
      </div>
    )
  }

  // User not authenticated
  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Authentication Required
            </CardTitle>
            <CardDescription>
              You must be signed in to access this area.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User not admin
  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access this administrative area.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Signed in as: <span className="font-medium">{user.email}</span>
            </div>
            <Button onClick={() => router.push('/')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User is admin - show the protected content
  return (
    <>
      <div className="border-b bg-muted/50">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              Admin Access - Signed in as: <span className="font-medium">{user.email}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
      {children}
    </>
  )
}