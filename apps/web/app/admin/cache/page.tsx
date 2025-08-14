"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { API_BASE_URL } from "@/lib/constants"
import { AdminGuard } from "@/components/admin-guard"
import AdminNav from "@/components/admin-nav"
import { Loader2, Trash2 } from "lucide-react"

interface CacheStats {
  searchCache: { size: number }
  imageCache: { size: number }
}

export default function AdminCachePage() {
  const [isClearing, setIsClearing] = useState(false)
  const [lastCleared, setLastCleared] = useState<string | null>(null)
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const { getAuthToken } = useAuth()

  const loadCacheStats = async () => {
    setIsLoadingStats(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/api/admin/cache/stats`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load cache stats: ${response.status}`)
      }

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error loading cache stats:", error)
      alert("Failed to load cache statistics")
    } finally {
      setIsLoadingStats(false)
    }
  }

  const clearAllCaches = async () => {
    if (!confirm("Are you sure you want to clear all caches? This will affect performance temporarily.")) {
      return
    }

    setIsClearing(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/api/admin/cache/clear`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to clear caches: ${response.status}`)
      }

      const result = await response.json()
      setLastCleared(new Date().toLocaleString())
      setStats(null) // Reset stats after clearing
      alert(`Caches cleared successfully! ${result.message || ""}`)
    } catch (error) {
      console.error("Error clearing caches:", error)
      alert("Failed to clear caches. Please try again.")
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <AdminGuard>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <AdminNav />

          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-brand-text mb-2">Cache Management</h2>
            <p className="text-brand-text-muted mb-8">
              Manage application caches including search results and image caches.
            </p>

            {/* Cache Stats */}
            <div className="bg-white rounded-lg border p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-brand-text">Cache Statistics</h3>
                <Button onClick={loadCacheStats} disabled={isLoadingStats} variant="outline" size="sm">
                  {isLoadingStats ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Refresh Stats
                </Button>
              </div>

              {stats ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded p-4">
                    <h3 className="font-medium text-gray-700 mb-1">Search Cache</h3>
                    <p className="text-2xl font-bold text-brand-primary">{stats.searchCache.size}</p>
                    <p className="text-sm text-gray-500">cached searches</p>
                  </div>
                  <div className="bg-gray-50 rounded p-4">
                    <h3 className="font-medium text-gray-700 mb-1">Image Cache</h3>
                    <p className="text-2xl font-bold text-brand-primary">{stats.imageCache.size}</p>
                    <p className="text-sm text-gray-500">cached images</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 italic">Click "Refresh Stats" to load cache statistics</p>
              )}
            </div>

            {/* Clear Cache Button */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-xl font-semibold text-brand-text mb-4">Clear All Caches</h3>
              <p className="text-brand-text-muted mb-6">
                This will clear all cached data including search results and image caches. Performance may be
                temporarily affected while caches rebuild.
              </p>

              <Button
                onClick={clearAllCaches}
                disabled={isClearing}
                className="bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                {isClearing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Trash2 className="w-5 h-5 mr-2" />}
                {isClearing ? "Clearing Caches..." : "Clear All Caches"}
              </Button>

              {lastCleared && <p className="text-sm text-green-600 mt-4">Last cleared: {lastCleared}</p>}
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}
