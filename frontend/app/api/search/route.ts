import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")
  const lat = searchParams.get("lat")
  const long = searchParams.get("long")

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  if (!q || !lat || !long) {
    return NextResponse.json({ error: "Missing query parameters" }, { status: 400 })
  }

  // Mock data - in a real app, this would come from your backend
  const mockDishes = [
    {
      id: "1",
      dishName: `Delicious ${q} near you`,
      restaurantName: "The Food Place",
      description: `An amazing ${q} prepared with fresh, local ingredients. A must-try!`,
      imageUrl: `/placeholder.svg?width=300&height=200&query=${encodeURIComponent(q || "food")}`,
      rating: 4.5,
      address: "123 Main St, Foodville",
    },
    {
      id: "2",
      dishName: `Authentic ${q} Special`,
      restaurantName: "Local Gem Eatery",
      description: `You've never had ${q} like this before. Our chef's specialty.`,
      imageUrl: `/placeholder.svg?width=300&height=200&query=authentic+${encodeURIComponent(q || "dish")}`,
      rating: 4.8,
      address: "456 Oak Ave, Flavor Town",
    },
    {
      id: "3",
      dishName: `Gourmet ${q}`,
      restaurantName: "Fancy Bites",
      description: `An upscale take on the classic ${q}. Perfect for a special occasion.`,
      imageUrl: `/placeholder.svg?width=300&height=200&query=gourmet+${encodeURIComponent(q || "meal")}`,
      rating: 4.2,
      address: "789 Pine Rd, Gourmet City",
    },
  ]

  // Simulate no results for a specific query
  if (q.toLowerCase() === "nothingfound") {
    return NextResponse.json({ dishes: [] })
  }

  return NextResponse.json({ dishes: mockDishes })
}
