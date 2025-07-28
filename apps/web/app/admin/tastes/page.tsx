"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { AdminGuard } from "@/components/admin-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, Image, RefreshCw, Search, BarChart3 } from "lucide-react"
import { toast } from "sonner"

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

  const supabase = createClient()

  // Fetch taste dictionary items
  const fetchItems = async () => {
    try {
      setIsLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
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

      const response = await fetch(`http://localhost:3001/api/tastes/admin?${params}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
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
      const { data, error } = await supabase
        .from("taste_dictionary")
        .select("type, image_url, search_count")

      if (error) {
        console.error("Error fetching stats:", error)
        return
      }

      const stats: Stats = {
        total: data.length,
        dishes: data.filter(item => item.type === "dish").length,
        ingredients: data.filter(item => item.type === "ingredient").length,
        withImages: data.filter(item => item.image_url).length,
        withoutImages: data.filter(item => !item.image_url).length,
        totalSearches: data.reduce((sum, item) => sum + (item.search_count || 0), 0)
      }

      setStats(stats)
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  // Add new item
  const addItem = async () => {
    if (!newItem.name.trim()) {
      toast.error("Item name is required")
      return
    }

    try {
      setIsAddingItem(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error("Please sign in to perform this action")
        return
      }

      const response = await fetch("http://localhost:3001/api/tastes/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          name: newItem.name.trim(), 
          type: newItem.type 
        })
      })

      if (response.ok) {
        const data = await response.json()
        setItems(prev => [data.item, ...prev])
        setNewItem({ name: "", type: "dish" })
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
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error("Please sign in to perform this action")
        return
      }

      const response = await fetch(`http://localhost:3001/api/tastes/admin?id=${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        setItems(prev => prev.filter(item => item.id !== id))
        toast.success("Item deleted successfully")
        fetchStats() // Refresh stats
      } else {
        toast.error("Failed to delete item")
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
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error("Please sign in to perform this action")
        return
      }
      
      const response = await fetch("http://localhost:3001/api/tastes/populate-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error("Failed to populate images")
      }

      const result = await response.json()
      toast.success(result.message)
      
      // Refresh the data
      fetchItems()
      fetchStats()
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
              <CardDescription>
                Automatically fetch images for items that don't have them yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={populateImages} 
                disabled={isPopulatingImages}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isPopulatingImages ? 'animate-spin' : ''}`} />
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
                <div className="flex gap-4">
                  <Input
                    placeholder="Item name"
                    value={newItem.name}
                    onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                    className="flex-1"
                  />
                  <Select
                    value={newItem.type}
                    onValueChange={(value: "dish" | "ingredient") => 
                      setNewItem(prev => ({ ...prev, type: value }))
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
                  <Button 
                    onClick={addItem} 
                    disabled={isAddingItem || !newItem.name.trim()}
                  >
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
                  <div className="text-center py-8 text-muted-foreground">
                    No items found
                  </div>
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
                              <img 
                                src={item.image_url} 
                                alt={item.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                <Image className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {item.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.search_count}</TableCell>
                          <TableCell>
                            {item.image_source && (
                              <Badge variant="outline">
                                {item.image_source}
                              </Badge>
                            )}
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