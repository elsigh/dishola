"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    // Redirect to homepage with search parameters
    const params = searchParams.toString()
    const redirectURL = params ? `/?${params}` : "/"
    router.replace(redirectURL)
  }, [searchParams, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-brand-text-muted">Redirecting to search...</p>
      </div>
    </div>
  )
}
