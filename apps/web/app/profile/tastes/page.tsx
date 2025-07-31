"use client"

import { GripVertical, Loader2, Plus, Search, Trash2 } from "lucide-react"
import Image from "next/image"
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
  const [isAutocompleteLoading, setIsAutocompleteLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Create new taste state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTaste, setNewTaste] = useState({ name: "", type: "dish" as "dish" | "ingredient" })
  const [imageResults, setImageResults] = useState<{ url: string; source: string; thumbnail?: string }[]>([])
  const [imageIndex, setImageIndex] = useState(0)
  const [selectedImage, setSelectedImage] = useState<{ url: string; source: string; thumbnail?: string } | null>(null)
  const [isFetchingImages, setIsFetchingImages] = useState(false)
  const [isCreatingTaste, setIsCreatingTaste] = useState(false)

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
      setIsAutocompleteLoading(false)
      return
    }

    setIsAutocompleteLoading(true)
    setShowAutocomplete(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/tastes/autocomplete?q=${encodeURIComponent(term)}`)

      if (response.ok) {
        const data = await response.json()
        setAutocompleteResults(data.results || [])
      }
    } catch (error) {
      console.error("Error fetching autocomplete:", error)
    } finally {
      setIsAutocompleteLoading(false)
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
    // Don't fetch autocomplete if create form is active
    if (showCreateForm) {
      return
    }

    const debounce = setTimeout(() => {
      fetchAutocomplete(searchTerm)
    }, 300)

    return () => clearTimeout(debounce)
  }, [searchTerm, fetchAutocomplete, showCreateForm])

  // Fetch images when creating new taste
  useEffect(() => {
    const fetchImages = async () => {
      if (!newTaste.name.trim() || !showCreateForm) {
        setImageResults([])
        setImageIndex(0)
        setSelectedImage(null)
        return
      }
      setIsFetchingImages(true)
      try {
        const token = getAuthToken()
        const res = await fetch(`${API_BASE_URL}/api/image-search?q=${encodeURIComponent(newTaste.name)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setImageResults(data.images || [])
          setImageIndex(0)
          setSelectedImage(data.images?.[0] || null)
        } else {
          setImageResults([])
          setImageIndex(0)
          setSelectedImage(null)
        }
      } catch {
        setImageResults([])
        setImageIndex(0)
        setSelectedImage(null)
      } finally {
        setIsFetchingImages(false)
      }
    }

    if (newTaste.name.trim() && showCreateForm) {
      const debounce = setTimeout(fetchImages, 500)
      return () => clearTimeout(debounce)
    }
  }, [newTaste.name, showCreateForm, getAuthToken])

  // Cycle through images
  const cycleImage = (dir: 1 | -1) => {
    if (!imageResults.length) return
    let newIndex = imageIndex + dir
    if (newIndex < 0) newIndex = imageResults.length - 1
    if (newIndex >= imageResults.length) newIndex = 0
    setImageIndex(newIndex)
    setSelectedImage(imageResults[newIndex])
  }

  // Create new taste item
  const createNewTaste = async () => {
    if (!newTaste.name.trim()) {
      toast.error("Taste name is required")
      return
    }

    setIsCreatingTaste(true)
    try {
      const token = getAuthToken()
      if (!token) {
        toast.error("Please sign in to create tastes")
        return
      }

      let imageUrl: string | undefined
      if (selectedImage && selectedImage.url) {
        // Upload to blob
        const uploadRes = await fetch(`${API_BASE_URL}/api/upload-image`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            imageUrl: selectedImage.url,
            filename: newTaste.name.replace(/\s+/g, "_").toLowerCase()
          })
        })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          imageUrl = uploadData.blobUrl
        } else {
          toast.error("Failed to upload image")
          setIsCreatingTaste(false)
          return
        }
      }

      // Create taste and add to profile
      const response = await fetch(`${API_BASE_URL}/api/tastes/user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: "createTaste",
          name: newTaste.name.trim(),
          type: newTaste.type,
          image_url: imageUrl,
          addToProfile: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Add to user tastes if it was added to profile
        if (data.userTaste) {
          const newUserTaste = {
            id: data.userTaste.id,
            order_position: data.userTaste.order_position,
            taste_dictionary: data.taste
          }
          setUserTastes((prev) => [...prev, newUserTaste])
        }

        // Reset form
        setNewTaste({ name: "", type: "dish" })
        setImageResults([])
        setImageIndex(0)
        setSelectedImage(null)
        setShowCreateForm(false)
        setSearchTerm("")
        setShowAutocomplete(false)

        toast.success(`Created and added "${data.taste.name}" to your tastes`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.statusMessage || "Failed to create taste")
      }
    } catch (error) {
      console.error("Error creating taste:", error)
      toast.error("Failed to create taste")
    } finally {
      setIsCreatingTaste(false)
    }
  }

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
              onChange={(e) => {
                setSearchTerm(e.target.value)
                // Reset create form when user modifies search term
                if (showCreateForm) {
                  setShowCreateForm(false)
                }
              }}
              className="pl-9"
              onFocus={() => searchTerm.length >= 2 && setShowAutocomplete(true)}
              onBlur={() => {
                // Don't hide autocomplete if create form is active
                // if (!showCreateForm) {
                //   setTimeout(() => setShowAutocomplete(false), 200)
                // }
              }}
            />

            {/* Autocomplete dropdown area */}
            {showAutocomplete && searchTerm.length >= 2 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {isAutocompleteLoading ? (
                  <div className="px-4 py-3 text-center text-muted-foreground flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm">Searching...</span>
                  </div>
                ) : (
                  <>
                    {autocompleteResults.length > 0 && (
                      <>
                        {autocompleteResults.map((result) => (
                          <button
                            type="button"
                            key={result.id}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                            onClick={() => addTaste(result)}
                          >
                            {result.image_url && (
                              <Image
                                src={result.image_url}
                                alt={result.name}
                                width={24}
                                height={24}
                                className="w-6 h-6 rounded object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-sm">{result.name}</div>
                              <Badge variant="secondary" className="text-xs">
                                {result.type}
                              </Badge>
                            </div>
                          </button>
                        ))}
                        <div className="border-t border-gray-200">
                          <button
                            type="button"
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-muted-foreground"
                            onClick={() => {
                              setShowCreateForm(true)
                              setNewTaste({ name: searchTerm, type: "dish" })
                            }}
                          >
                            <Plus className="w-4 h-4" />
                            <span className="text-sm">Create "{searchTerm}"</span>
                          </button>
                        </div>
                      </>
                    )}

                    {autocompleteResults.length === 0 && !showCreateForm && (
                      <>
                        <div className="px-4 py-3 text-center text-muted-foreground text-sm">No results found.</div>
                        <div className="border-t border-gray-200">
                          <button
                            type="button"
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-muted-foreground"
                            onClick={() => {
                              setShowCreateForm(true)
                              setNewTaste({ name: searchTerm, type: "dish" })
                            }}
                          >
                            <Plus className="w-4 h-4" />
                            <span className="text-sm">Create "{searchTerm}"</span>
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {showCreateForm && (
            <div className="mt-4 p-4 border rounded bg-muted space-y-3">
              <div className="flex gap-2 items-center">
                <Input
                  value={newTaste.name}
                  onChange={(e) => setNewTaste((nt) => ({ ...nt, name: e.target.value }))}
                  placeholder="Name"
                  className="w-48"
                  disabled={isCreatingTaste}
                />
                <select
                  value={newTaste.type}
                  onChange={(e) => setNewTaste((nt) => ({ ...nt, type: e.target.value as "dish" | "ingredient" }))}
                  className="border rounded px-2 py-1"
                  disabled={isCreatingTaste}
                >
                  <option value="dish">Dish</option>
                  <option value="ingredient">Ingredient</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => cycleImage(-1)}
                  disabled={isFetchingImages || !imageResults.length}
                >
                  &#8592;
                </Button>
                <div className="w-24 h-24 flex items-center justify-center bg-white border rounded overflow-hidden">
                  {isFetchingImages ? (
                    <span className="text-xs text-muted-foreground">Loading...</span>
                  ) : selectedImage ? (
                    <Image
                      src={selectedImage.thumbnail || selectedImage.url}
                      alt="Selected"
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">No image</span>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => cycleImage(1)}
                  disabled={isFetchingImages || !imageResults.length}
                >
                  &#8594;
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={createNewTaste} disabled={isCreatingTaste}>
                  <Plus className="w-4 h-4 mr-1" /> Add "{newTaste.name}"
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateForm(false)
                    setShowAutocomplete(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
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
                // biome-ignore lint/a11y/noStaticElementInteractions: <explanation>
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
                    <Image
                      src={taste.taste_dictionary.image_url}
                      alt={taste.taste_dictionary.name}
                      width={24}
                      height={24}
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
