"use client"

import { GripVertical, Plus, Search, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { API_BASE_URL } from "@/lib/constants"

interface TasteDictionaryItem {
  id: number
  name: string
  type: "dish" | "ingredient"
  image_url?: string
}

interface UserTaste {
  id: number
  order_position: number
  taste_dictionary: TasteDictionaryItem
}

interface AutocompleteResult {
  id: number
  name: string
  type: "dish" | "ingredient"
  image_url?: string
}

export default function TastesPage() {
  const [userTastes, setUserTastes] = useState<UserTaste[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResult[]>([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const { user, getAuthToken } = useAuth()

  // Fetch user tastes
  const fetchUserTastes = useCallback(async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/tastes/user`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUserTastes(data.tastes || [])
      } else {
        toast.error("Failed to load your tastes")
      }
    } catch (error) {
      console.error("Error fetching user tastes:", error)
      toast.error("Failed to load your tastes")
    } finally {
      setIsLoading(false)
    }
  }, [getAuthToken])

  // Fetch autocomplete suggestions
  const fetchAutocomplete = useCallback(async (term: string) => {
    if (term.length < 2) {
      setAutocompleteResults([])
      setShowAutocomplete(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/tastes/autocomplete?q=${encodeURIComponent(term)}`)

      if (response.ok) {
        const data = await response.json()
        setAutocompleteResults(data.results || [])
        setShowAutocomplete(true)
      }
    } catch (error) {
      console.error("Error fetching autocomplete:", error)
    }
  }, [])

  // Add taste to user's list
  const addTaste = async (taste: AutocompleteResult) => {
    try {
      const token = getAuthToken()
      if (!token) {
        toast.error("Please sign in to add tastes")
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/tastes/user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tasteIds: [taste.id] })
      })

      if (response.ok) {
        const data = await response.json()
        setUserTastes((prev) => [...prev, ...data.tastes])
        setSearchTerm("")
        setShowAutocomplete(false)
        toast.success(`Added ${taste.name} to your tastes`)
      } else {
        toast.error("Failed to add taste")
      }
    } catch (error) {
      console.error("Error adding taste:", error)
      toast.error("Failed to add taste")
    }
  }

  // Remove taste from user's list
  const removeTaste = async (tasteId: number) => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/tastes/user?id=${tasteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.ok) {
        setUserTastes((prev) => prev.filter((taste) => taste.id !== tasteId))
        toast.success("Taste removed")
      } else {
        toast.error("Failed to remove taste")
      }
    } catch (error) {
      console.error("Error removing taste:", error)
      toast.error("Failed to remove taste")
    }
  }

  // Handle drag and drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    // Reorder the array
    const newTastes = [...userTastes]
    const draggedItem = newTastes[draggedIndex]
    newTastes.splice(draggedIndex, 1)
    newTastes.splice(dropIndex, 0, draggedItem)

    // Update order positions
    const reorderedTastes = newTastes.map((taste, index) => ({
      id: taste.id,
      order_position: index + 1
    }))

    // Optimistically update UI
    setUserTastes(
      newTastes.map((taste, index) => ({
        ...taste,
        order_position: index + 1
      }))
    )

    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/tastes/user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reorderedTastes })
      })

      if (!response.ok) {
        // Revert on error
        fetchUserTastes()
        toast.error("Failed to reorder tastes")
      }
    } catch (error) {
      console.error("Error reordering tastes:", error)
      fetchUserTastes()
      toast.error("Failed to reorder tastes")
    }

    setDraggedIndex(null)
  }

  useEffect(() => {
    fetchUserTastes()
  }, [fetchUserTastes])

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchAutocomplete(searchTerm)
    }, 300)

    return () => clearTimeout(debounce)
  }, [searchTerm, fetchAutocomplete])

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading your tastes...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Taste Preferences</h1>
        <p className="text-muted-foreground">
          Add and organize your favorite dishes and ingredients to get personalized recommendations.
        </p>
      </div>

      {/* Add new taste */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Taste
          </CardTitle>
          <CardDescription>Search for dishes or ingredients to add to your preferences</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for dishes or ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              onFocus={() => searchTerm.length >= 2 && setShowAutocomplete(true)}
              onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
            />
          </div>

          {showAutocomplete && autocompleteResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {autocompleteResults.map((result) => (
                <button
                  key={result.id}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                  onClick={() => addTaste(result)}
                >
                  {result.image_url && (
                    <img src={result.image_url} alt={result.name} className="w-8 h-8 rounded object-cover" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{result.name}</div>
                    <Badge variant="secondary" className="text-xs">
                      {result.type}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User tastes list */}
      <Card>
        <CardHeader>
          <CardTitle>Your Tastes ({userTastes.length})</CardTitle>
          <CardDescription>
            Drag and drop to reorder by preference. Your top preferences will be weighted more heavily in
            recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userTastes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No tastes added yet. Start by searching above!</div>
          ) : (
            <div className="space-y-2">
              {userTastes.map((taste, index) => (
                <div
                  key={taste.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                    draggedIndex === index ? "opacity-50" : ""
                  } hover:bg-gray-50 cursor-move`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />

                  {taste.taste_dictionary.image_url && (
                    <img
                      src={taste.taste_dictionary.image_url}
                      alt={taste.taste_dictionary.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}

                  <div className="flex-1">
                    <div className="font-medium">{taste.taste_dictionary.name}</div>
                    <Badge variant="secondary" className="text-xs">
                      {taste.taste_dictionary.type}
                    </Badge>
                  </div>

                  <div className="text-sm text-muted-foreground">#{taste.order_position}</div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTaste(taste.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
