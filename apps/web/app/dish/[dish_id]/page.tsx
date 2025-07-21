import type { Metadata } from "next"
import { notFound } from "next/navigation"
import DishHero from "@/components/dish/dish-hero"
import DishInfo from "@/components/dish/dish-info"
import RestaurantInfo from "@/components/dish/restaurant-info"
import ReviewThread from "@/components/dish/review-thread"
import { type Dish, generateSlug, getDish } from "@/lib/dish-service"

interface PageProps {
  params: Promise<{
    dish_id: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { dish_id } = await params

  try {
    const dish = await getDish(dish_id)

    return {
      title: `${dish.name} at ${dish.restaurant.name} | dishola`,
      description: `${dish.name} • ${dish.review_count} reviews • ${dish.vote_avg}/10 rating`,
      openGraph: {
        title: `${dish.name} at ${dish.restaurant.name}`,
        description: `${dish.name} • ${dish.review_count} reviews • ${dish.vote_avg}/10 rating`,
        images: dish.images.length > 0 ? [dish.images[0].blob_url] : [],
        type: "article"
      },
      twitter: {
        card: "summary_large_image",
        title: `${dish.name} at ${dish.restaurant.name}`,
        description: `${dish.name} • ${dish.review_count} reviews • ${dish.vote_avg}/10 rating`,
        images: dish.images.length > 0 ? [dish.images[0].blob_url] : []
      }
    }
  } catch {
    return {
      title: "Dish Not Found | dishola",
      description: "The dish you are looking for could not be found."
    }
  }
}

export default async function DishPage({ params }: PageProps) {
  const { dish_id } = await params

  let dish: Dish
  try {
    dish = await getDish(dish_id)
  } catch {
    notFound()
  }

  // Transform data to match component expectations
  const dishForHero = {
    id: dish.id.toString(),
    name: dish.name,
    description: `${dish.name} from ${dish.restaurant.name}`,
    cuisine: "Unknown", // Not in current schema
    category: "Dish", // Not in current schema
    price: 2, // Not in current schema
    rating: dish.vote_avg,
    reviewCount: dish.review_count
  }

  const images = dish.images.map((img) => img.blob_url)

  const restaurantForInfo = {
    id: dish.restaurant.id.toString(),
    name: dish.restaurant.name,
    address: [dish.restaurant.address_line1, dish.restaurant.city, dish.restaurant.state].filter(Boolean).join(", "),
    placeId: undefined, // Not in current schema
    phone: dish.restaurant.phone,
    website: dish.restaurant.url,
    rating: undefined, // Not in current schema
    priceLevel: undefined // Not in current schema
  }

  const reviewsForThread = dish.reviews.map((review) => ({
    id: review.id.toString(),
    userId: review.user.id.toString(),
    userName: review.user.realname || review.user.name,
    userAvatar: review.user.image_normal || "/img/placeholder-user.jpg",
    rating: review.vote,
    review: review.review,
    wouldRecommend: review.vote >= 7, // Assume 7+ is recommend
    createdAt: review.created_at,
    helpful: 0, // Not in current schema
    replies: [] // Not implementing nested replies yet
  }))

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Hero Section */}
      <DishHero dish={dishForHero} images={images} />

      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Dish Information */}
            <DishInfo
              dish={{
                ...dishForHero,
                createdAt: dish.created_at,
                updatedAt: dish.updated_at
              }}
            />

            {/* Reviews Thread */}
            <ReviewThread
              dishId={dish.id.toString()}
              reviews={reviewsForThread}
              totalReviews={dish.review_count}
              averageRating={dish.vote_avg}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Restaurant Information */}
              <RestaurantInfo restaurant={restaurantForInfo} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
