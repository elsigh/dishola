"use client"

import type { TasteType } from "@dishola/types/constants"
import { ChevronLeft, ChevronRight, GripVertical, Loader2, Plus, Search, Trash2, X } from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { API_BASE_URL } from "@/lib/constants"
import { capitalize } from "@/lib/utils"
import type { UserTaste } from "./user-tastes"

interface AutocompleteResult {
  id: number
  name: string
  type: TasteType
  image_url?: string
}

interface TastesManagerProps {
  initialTastes: UserTaste[]
}

export function TastesManager({ initialTastes }: TastesManagerProps) {
  const [userTastes, setUserTastes] = useState<UserTaste[]>(initialTastes)
  const [searchTerm, setSearchTerm] = useState("")
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResult[]>([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [isAutocompleteLoading, setIsAutocompleteLoading] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Create new taste state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTaste, setNewTaste] = useState({ name: "", type: "dish" as TasteType })
  const [imageResults, setImageResults] = useState<{ url: string; source: string; thumbnail?: string }[]>([])
  const [imageIndex, setImageIndex] = useState(0)
  const [selectedImage, setSelectedImage] = useState<{ url: string; source: string; thumbnail?: string } | null>(null)
  const [isFetchingImages, setIsFetchingImages] = useState(false)
  const [isCreatingTaste, setIsCreatingTaste] = useState(false)

  const { getAuthToken } = useAuth()

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
        setUserTastes((prev) => [...data.tastes, ...prev])
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

  // Track which taste is being deleted
  const [deletingTasteId, setDeletingTasteId] = useState<number | null>(null)

  // Remove taste from user's list
  const removeTaste = async (tasteId: number, tasteName: string) => {
    // Show confirmation dialog
    if (!window.confirm(`Are you sure you want to remove "${tasteName}" from your tastes?`)) {
      return
    }

    // Set the deleting state
    setDeletingTasteId(tasteId)

    try {
      const token = getAuthToken()
      if (!token) {
        setDeletingTasteId(null)
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/tastes/user?id=${tasteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.ok) {
        setUserTastes((prev) => prev.filter((taste) => taste.id !== tasteId))
        toast.success(`"${tasteName}" removed from your tastes`)
      } else {
        toast.error("Failed to remove taste")
      }
    } catch (error) {
      console.error("Error removing taste:", error)
      toast.error("Failed to remove taste")
    } finally {
      // Clear the deleting state
      setDeletingTasteId(null)
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
        toast.error("Failed to reorder tastes")
      }
    } catch (error) {
      console.error("Error reordering tastes:", error)
      toast.error("Failed to reorder tastes")
    }

    setDraggedIndex(null)
  }

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
          setSelectedImage(data.images?.[0] ?? null)
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
    if (imageResults.length === 0) return
    const newIndex = (imageIndex + dir + imageResults.length) % imageResults.length
    setImageIndex(newIndex)
    setSelectedImage(imageResults[newIndex])
  }

  // Check if there's an exact match in autocomplete results
  const hasExactMatch = (searchTerm: string, results: AutocompleteResult[]) => {
    return results.some((result) => result.name.toLowerCase() === searchTerm.toLowerCase())
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
      if (selectedImage?.url) {
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
          name: capitalize(newTaste.name.trim()),
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
          setUserTastes((prev) => [newUserTaste, ...prev])
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
        const errorData = (await response?.json?.()) || {}
        toast.error(errorData.statusMessage || "Failed to create taste")
      }
    } catch (error) {
      console.error("Error creating taste:", error)
      toast.error("Failed to create taste")
    } finally {
      setIsCreatingTaste(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Tastes ({userTastes.length})</CardTitle>
        <CardDescription>Your top preferences will be weighted more heavily in recommendations.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <div>
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
            />

            {/* Autocomplete dropdown area */}
            {showAutocomplete && searchTerm.length >= 2 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
                {isAutocompleteLoading ? (
                  <div className="px-4 py-3 text-center text-muted-foreground flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm">Searching...</span>
                  </div>
                ) : (
                  <>
                    {autocompleteResults.length > 0 && !showCreateForm && (
                      <>
                        {autocompleteResults.map((result) => (
                          <button
                            type="button"
                            key={result.id}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0 dark:hover:bg-gray-700 dark:border-gray-700"
                            onClick={() => addTaste(result)}
                          >
                            {result.image_url && (
                              <Image
                                src={result.image_url}
                                alt={result.name}
                                width={36}
                                height={36}
                                className="w-12 h-12 rounded object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-sm">{result.name}</div>
                              <Badge variant="secondary" className="text-xs pl-0">
                                {capitalize(result.type)}
                              </Badge>
                            </div>
                          </button>
                        ))}
                        {!hasExactMatch(searchTerm, autocompleteResults) && (
                          <div className="border-t border-gray-200 dark:border-gray-700">
                            <button
                              type="button"
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-muted-foreground dark:hover:bg-gray-700"
                              onClick={() => {
                                setShowCreateForm(true)
                                setNewTaste({ name: capitalize(searchTerm), type: "dish" })
                              }}
                            >
                              <Plus className="w-4 h-4" />
                              <span className="text-sm">Create "{capitalize(searchTerm)}"</span>
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {autocompleteResults.length === 0 && !showCreateForm && (
                      <>
                        <div className="px-4 py-3 text-center text-muted-foreground text-sm">No results found.</div>
                        <div className="border-t border-gray-200 dark:border-gray-700">
                          <button
                            type="button"
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-muted-foreground dark:hover:bg-gray-700"
                            onClick={() => {
                              setShowCreateForm(true)
                              setNewTaste({ name: searchTerm, type: "dish" })
                            }}
                          >
                            <Plus className="w-4 h-4" />
                            <span className="text-sm">Create "{capitalize(searchTerm)}"</span>
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
            <div className="mt-4 p-4 border rounded bg-muted space-y-3 dark:border-gray-700 relative">
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => {
                  setShowCreateForm(false)
                  setShowAutocomplete(false)
                }}
              >
                <X className="h-24 w-24" />
              </Button>
              <div className="inline-flex flex-col gap-2">
                <div className="flex gap-2 justify-center">
                  <input
                    value={newTaste.name}
                    //onChange={(e) => setNewTaste((nt) => ({ ...nt, name: e.target.value }))}
                    placeholder="Name"
                    disabled={isCreatingTaste}
                    hidden
                  />
                  <select
                    value={newTaste.type}
                    onChange={(e) => setNewTaste((nt) => ({ ...nt, type: e.target.value as TasteType }))}
                    className="border w-[142px] rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-700"
                    disabled={isCreatingTaste}
                  >
                    <option value="dish">Dish</option>
                    <option value="ingredient">Ingredient</option>
                    <option value="cuisine">Cuisine</option>
                  </select>
                </div>
                <div className="flex jutify-center items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => cycleImage(-1)}
                    disabled={isFetchingImages || !imageResults.length}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="w-36 h-36 flex items-center justify-center bg-white border rounded overflow-hidden dark:bg-gray-800 dark:border-gray-700">
                    {isFetchingImages ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex justify-center">
                  <Button onClick={createNewTaste} disabled={isCreatingTaste} className="w-[142px]">
                    {isCreatingTaste ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-1" />
                    )}
                    {isCreatingTaste ? "Creating..." : `Add "${capitalize(newTaste.name)}"`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {userTastes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No tastes added yet. Start by searching above!</div>
        ) : (
          <ul className="space-y-2 list-none p-0">
            {userTastes.map((taste, index) => (
              <li
                key={taste.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                aria-label={`Taste item: ${taste.taste_dictionary.name}`}
                className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                  draggedIndex === index ? "opacity-50" : ""
                } hover:bg-gray-50 cursor-move dark:hover:bg-gray-800 dark:border-gray-700`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />

                {taste.taste_dictionary.image_url && (
                  <Image
                    src={taste.taste_dictionary.image_url}
                    alt={taste.taste_dictionary.name}
                    width={36}
                    height={36}
                    className="w-10 h-10 rounded object-cover"
                  />
                )}

                <div className="flex-1">
                  <div className="font-medium">{taste.taste_dictionary.name}</div>
                  <Badge variant="secondary" className="text-xs pl-0">
                    {capitalize(taste.taste_dictionary.type)}
                  </Badge>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTaste(taste.id, taste.taste_dictionary.name)}
                  className="text-red-500 hover:text-red-700"
                  disabled={deletingTasteId === taste.id}
                >
                  {deletingTasteId === taste.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
