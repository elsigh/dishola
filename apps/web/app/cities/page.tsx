import { MapPin } from "lucide-react"
import type { Metadata } from "next"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export const metadata: Metadata = {
  title: "Cities - dishola",
  description: "Explore dishes from major cities around the world"
}

interface City {
  city: string
  dishCount: number
}

async function getCities(): Promise<City[]> {
  try {
    // Call the Nitro API server directly
    const apiUrl =
      process.env.NODE_ENV === "production" ? "https://api.dishola.com/api/cities" : "http://localhost:3001/api/cities"

    const response = await fetch(apiUrl, {
      next: { revalidate: 3600 } // Revalidate every hour
    })

    if (!response.ok) {
      throw new Error("Failed to fetch cities")
    }

    const data = await response.json()
    return data.cities || []
  } catch (error) {
    console.error("Error fetching cities:", error)
    return []
  }
}

export default async function CitiesPage() {
  const cities = await getCities()

  // Define what constitutes a "major" city (cities with 5+ dishes)
  const majorCities = cities.filter((city) => city.dishCount >= 5)
  const otherCities = cities.filter((city) => city.dishCount < 5)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-text mb-2 flex items-center justify-center gap-2">
            <MapPin className="w-8 h-8 text-brand-primary" />
            Cities
          </h1>
          <p className="text-brand-text-muted">Discover amazing dishes from cities around the world</p>
        </div>

        {majorCities.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl text-brand-primary">Major Cities</CardTitle>
              <CardDescription>Cities with 5 or more dishes in our database</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">City</TableHead>
                    <TableHead className="text-right font-semibold">Dishes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {majorCities.map((city, index) => (
                    <TableRow key={city.city} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">#{index + 1}</span>
                          {city.city}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="font-semibold">
                          {city.dishCount}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {otherCities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-brand-primary">Other Cities</CardTitle>
              <CardDescription>Cities with dishes in our database</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">City</TableHead>
                    <TableHead className="text-right font-semibold">Dishes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherCities.map((city) => (
                    <TableRow key={city.city} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{city.city}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="font-semibold">
                          {city.dishCount}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {cities.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Cities Found</h3>
              <p className="text-gray-500">We haven't found any cities with dishes yet. Check back soon!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
