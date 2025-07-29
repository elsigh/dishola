"use client"

import { BarChart3, Image, Plus, RefreshCw, Search, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { AdminGuard } from "@/components/admin-guard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { API_BASE_URL } from "@/lib/constants"

interface TasteDictionaryItem {
  id: number
  name: string
  type: "dish" | "ingredient"
  image_url?: string
  image_source?: string
  search_count: number
  created_at: string
  updated_at: string
}

interface Stats {
  total: number
  dishes: number
  ingredients: number
  withImages: number
  withoutImages: number
  totalSearches: number
}

export default function TastesAdminPage() {
  const [items, setItems] = useState<TasteDictionaryItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [isPopulatingImages, setIsPopulatingImages] = useState(false)
  const [newItem, setNewItem] = useState({ name: "", type: "dish" as "dish" | "ingredient" })
  const [imageResults, setImageResults] = useState<{ url: string; source: string; thumbnail?: string }[]>([])
  const [imageIndex, setImageIndex] = useState(0)
  const [isFetchingImages, setIsFetchingImages] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{ url: string; source: string; thumbnail?: string } | null>(null)
  const lastSearchedName = useRef("")

  const { getAuthToken } = useAuth()

  // Fetch taste dictionary items
  const fetchItems = async () => {
    try {
      setIsLoading(true)

      const token = getAuthToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      const params = new URLSearchParams()
      if (typeFilter !== "all") {
        params.append("type", typeFilter)
      }
      if (searchTerm) {
        params.append("search", searchTerm)
      }

      const response = await fetch(`${API_BASE_URL}/api/tastes/admin?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
      } else {
        toast.error("Failed to load taste dictionary")
      }
    } catch (error) {
      console.error("Error fetching items:", error)
      toast.error("Failed to load taste dictionary")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/tastes/admin?action=stats`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else {
        console.error("Failed to fetch stats")
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  // Fetch images when name changes
  useEffect(() => {
    const fetchImages = async () => {
      if (!newItem.name.trim()) {
        setImageResults([])
        setImageIndex(0)
        setSelectedImage(null)
        return
      }
      setIsFetchingImages(true)
      try {
        const token = getAuthToken()
        const res = await fetch(`/api/image-search?q=${encodeURIComponent(newItem.name)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setImageResults(data.images || [])
          setImageIndex(0)
          setSelectedImage(data.images?.[0] || null)
          lastSearchedName.current = newItem.name
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
    // Only fetch if name is not empty and has changed
    if (newItem.name.trim() && newItem.name !== lastSearchedName.current) {
      fetchImages()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newItem.name])

  const cycleImage = (dir: 1 | -1) => {
    if (!imageResults.length) return
    let newIndex = imageIndex + dir
    if (newIndex < 0) newIndex = imageResults.length - 1
    if (newIndex >= imageResults.length) newIndex = 0
    setImageIndex(newIndex)
    setSelectedImage(imageResults[newIndex])
  }

  // Add new item
  const addItem = async () => {
    if (!newItem.name.trim()) {
      toast.error("Item name is required")
      return
    }
    setIsAddingItem(true)
    try {
      const token = getAuthToken()
      let imageUrl: string | undefined
      if (selectedImage && selectedImage.url) {
        // Upload to blob
        const uploadRes = await fetch("/api/upload-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            imageUrl: selectedImage.url,
            filename: newItem.name.replace(/\s+/g, "_").toLowerCase()
          })
        })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          imageUrl = uploadData.blobUrl
        } else {
          toast.error("Failed to upload image to blob")
          setIsAddingItem(false)
          return
        }
      }
      // Add item with imageUrl if available
      const response = await fetch("/api/tastes/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newItem.name.trim(),
          type: newItem.type,
          image_url: imageUrl
        })
      })
      if (response.ok) {
        const data = await response.json()
        setItems((prev) => [data.item, ...prev])
        setNewItem({ name: "", type: "dish" })
        setImageResults([])
        setImageIndex(0)
        setSelectedImage(null)
        toast.success("Item added successfully")
        fetchStats() // Refresh stats
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.statusMessage || "Failed to add item")
      }
    } catch (error) {
      console.error("Error adding item:", error)
      toast.error("Failed to add item")
    } finally {
      setIsAddingItem(false)
    }
  }

  // Delete item
  const deleteItem = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) {
      return
    }

    try {
      const token = getAuthToken()
      if (!token) {
        toast.error("Please sign in to perform this action")
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/tastes/admin?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id))
        toast.success("Item deleted successfully")
        fetchStats() // Refresh stats
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.statusMessage || "Failed to delete item")
      }
    } catch (error) {
      console.error("Error deleting item:", error)
      toast.error("Failed to delete item")
    }
  }

  // Populate images
  const populateImages = async () => {
    try {
      setIsPopulatingImages(true)

      const token = getAuthToken()
      if (!token) {
        toast.error("Please sign in to perform this action")
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/tastes/populate-images`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)

        // Refresh the data
        fetchItems()
        fetchStats()
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.statusMessage || "Failed to populate images")
      }
    } catch (error) {
      console.error("Error populating images:", error)
      toast.error("Failed to populate images")
    } finally {
      setIsPopulatingImages(false)
    }
  }

  useEffect(() => {
    fetchItems()
    fetchStats()
  }, [searchTerm, typeFilter])

  return (
    <AdminGuard>
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Taste Dictionary Admin</h1>
          <p className="text-muted-foreground">
            Manage the dictionary of dishes and ingredients used for autocomplete and user preferences.
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="items">Manage Items</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Dishes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.dishes}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Ingredients</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.ingredients}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">With Images</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.withImages}</div>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((stats.withImages / stats.total) * 100)}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Without Images</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.withoutImages}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalSearches}</div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Image Management
                </CardTitle>
                <CardDescription>Automatically fetch images for items that don't have them yet.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={populateImages} disabled={isPopulatingImages} className="flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 ${isPopulatingImages ? "animate-spin" : ""}`} />
                  {isPopulatingImages ? "Populating Images..." : "Populate Missing Images"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items">
            <div className="space-y-6">
              {/* Add new item */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add New Item
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 items-start">
                    <div className="flex-1 flex flex-col gap-2">
                      <Input
                        placeholder="Item name"
                        value={newItem.name}
                        onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))}
                      />
                      <Select
                        value={newItem.type}
                        onValueChange={(value: "dish" | "ingredient") =>
                          setNewItem((prev) => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dish">Dish</SelectItem>
                          <SelectItem value="ingredient">Ingredient</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Image preview and cycling */}
                    <div className="flex flex-col items-center gap-2 min-w-[120px]">
                      {isFetchingImages ? (
                        <div className="w-20 h-20 flex items-center justify-center bg-gray-100 rounded">Loading...</div>
                      ) : selectedImage ? (
                        <>
                          <img
                            src={selectedImage.thumbnail || selectedImage.url}
                            alt="Preview"
                            className="w-20 h-20 object-cover rounded border"
                          />
                          <div className="flex gap-2 mt-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => cycleImage(-1)}
                              disabled={imageResults.length < 2}
                            >
                              &lt;
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => cycleImage(1)}
                              disabled={imageResults.length < 2}
                            >
                              &gt;
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{selectedImage.source}</div>
                        </>
                      ) : (
                        <div className="w-20 h-20 flex items-center justify-center bg-gray-100 rounded text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    <Button onClick={addItem} disabled={isAddingItem || !newItem.name.trim()} className="self-end">
                      {isAddingItem ? "Adding..." : "Add"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Filters and search */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Search & Filter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Input
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="dish">Dishes</SelectItem>
                        <SelectItem value="ingredient">Ingredients</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Items table */}
              <Card>
                <CardHeader>
                  <CardTitle>Items ({items.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : items.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No items found</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Image</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Searches</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded object-cover" />
                              ) : (
                                <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                  <Image className="h-4 w-4 text-gray-400" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{item.type}</Badge>
                            </TableCell>
                            <TableCell>{item.search_count}</TableCell>
                            <TableCell>
                              {item.image_source && <Badge variant="outline">{item.image_source}</Badge>}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteItem(item.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminGuard>
  )
}
