"use client"

import { Camera, ChevronLeft, ChevronRight, Expand, X } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface DishHeroProps {
  dish: {
    id: string
    name: string
    description: string
    cuisine: string
    category: string
    price: number
    rating: number
    reviewCount: number
  }
  images: string[]
}

const PRICE_LABELS = {
  1: "$",
  2: "$$",
  3: "$$$",
  4: "$$$$"
}

export default function DishHero({ dish, images }: DishHeroProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setIsLightboxOpen(true)
  }

  const nextLightboxImage = () => {
    setLightboxIndex((prev) => (prev + 1) % images.length)
  }

  const prevLightboxImage = () => {
    setLightboxIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const priceLabel = PRICE_LABELS[dish.price as keyof typeof PRICE_LABELS]

  return (
    <>
      <div className="bg-white border-b border-brand-border">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Image Gallery or No Images State */}
            <div className="space-y-4">
              {images.length > 0 ? (
                <>
                  {/* Main Image */}
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={images[selectedImageIndex]}
                      alt={`${dish.name} - Image ${selectedImageIndex + 1}`}
                      fill
                      className="object-cover"
                      priority
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white border-0"
                      onClick={() => openLightbox(selectedImageIndex)}
                    >
                      <Expand className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Thumbnail Gallery */}
                  {images.length > 1 && (
                    <div className="flex space-x-2 overflow-x-auto pb-2">
                      {images.map((image, index) => (
                        <button
                          key={`thumbnail-${image.replace(/[^a-zA-Z0-9]/g, "")}-${index}`}
                          type="button"
                          onClick={() => setSelectedImageIndex(index)}
                          className={`relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                            index === selectedImageIndex
                              ? "border-brand-primary"
                              : "border-transparent hover:border-brand-primary/50"
                          }`}
                        >
                          <Image
                            src={image}
                            alt={`${dish.name} thumbnail ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* No Images State */
                <div className="relative aspect-[4/3] rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-600">No photos yet</h3>
                      <p className="text-sm text-gray-500 mt-1">Be the first to share a photo of this dish!</p>
                    </div>
                    <Button variant="outline" className="mt-4">
                      <Camera className="w-4 h-4 mr-2" />
                      Add Photo
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Dish Information */}
            <div className="space-y-6">
              {/* Title and Badges */}
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {dish.cuisine}
                  </Badge>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    {dish.category}
                  </Badge>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {priceLabel}
                  </Badge>
                </div>

                <h1 className="text-3xl md:text-4xl font-serif font-bold text-brand-primary">{dish.name}</h1>

                <p className="text-lg text-brand-text-muted leading-relaxed">{dish.description}</p>
              </div>

              {/* Rating and Reviews */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.floor(dish.rating)
                            ? "text-yellow-400 fill-current"
                            : star <= dish.rating
                              ? "text-yellow-400 fill-current opacity-50"
                              : "text-gray-300"
                        }`}
                        viewBox="0 0 20 20"
                        aria-label={`${star} star${star === 1 ? "" : "s"}`}
                      >
                        <title>{`${star} star rating`}</title>
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-lg font-medium text-brand-text">{dish.rating.toFixed(1)}</span>
                </div>
                <span className="text-brand-text-muted">
                  ({dish.reviewCount} {dish.reviewCount === 1 ? "review" : "reviews"})
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button className="btn-custom-primary flex-1">Add Your Review</Button>
                <Button variant="outline" className="flex-1">
                  Save Dish
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {images.length > 0 && (
        <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
          <DialogContent className="max-w-4xl w-full h-[90vh] p-0 bg-black">
            <div className="relative w-full h-full flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
                onClick={() => setIsLightboxOpen(false)}
              >
                <X className="w-6 h-6" />
              </Button>

              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                    onClick={prevLightboxImage}
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                    onClick={nextLightboxImage}
                  >
                    <ChevronRight className="w-8 h-8" />
                  </Button>
                </>
              )}

              <div className="relative w-full h-full">
                <Image
                  src={images[lightboxIndex]}
                  alt={`${dish.name} - Image ${lightboxIndex + 1}`}
                  fill
                  className="object-contain"
                />
              </div>

              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                  {images.map((image, index) => (
                    <button
                      key={`lightbox-dot-${image.replace(/[^a-zA-Z0-9]/g, "")}-${index}`}
                      type="button"
                      onClick={() => setLightboxIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === lightboxIndex ? "bg-white" : "bg-white/50"
                      }`}
                      aria-label={`View image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
