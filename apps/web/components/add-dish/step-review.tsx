"use client"

import { Heart, Star, ThumbsDown, ThumbsUp } from "lucide-react"
import { useEffect, useId, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  data: any
  setData: (d: any) => void
}

const RATING_LABELS = {
  1: "Terrible",
  2: "Poor",
  3: "Average",
  4: "Good",
  5: "Excellent"
}

const REVIEW_PROMPTS = [
  "How did it taste?",
  "What made it special?",
  "Would you order it again?",
  "How was the presentation?",
  "Any standout ingredients?"
]

export default function StepReview({ data, setData }: Props) {
  const [review, setReview] = useState(data.review || "")
  const [rating, setRating] = useState(data.rating || 0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [wouldRecommend, setWouldRecommend] = useState(data.wouldRecommend ?? null)

  const reviewId = useId()

  useEffect(() => {
    setData({
      ...data,
      review: review.trim(),
      rating: rating || undefined,
      wouldRecommend
    })
  }, [review, rating, wouldRecommend])

  const handleStarClick = (starRating: number) => {
    setRating(starRating)
  }

  const handleStarHover = (starRating: number) => {
    setHoveredRating(starRating)
  }

  const handleStarLeave = () => {
    setHoveredRating(0)
  }

  const displayRating = hoveredRating || rating
  const ratingLabel = RATING_LABELS[displayRating as keyof typeof RATING_LABELS]

  return (
    <div className="space-y-6">
      {/* Rating */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-brand-text">Overall Rating *</Label>

        <div className="flex flex-col items-center space-y-3">
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => handleStarHover(star)}
                onMouseLeave={handleStarLeave}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= displayRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-yellow-200"
                  }`}
                />
              </button>
            ))}
          </div>

          {displayRating > 0 && (
            <div className="text-center">
              <Badge
                variant="outline"
                className={`${
                  displayRating >= 4
                    ? "text-green-600 border-green-200"
                    : displayRating >= 3
                      ? "text-yellow-600 border-yellow-200"
                      : "text-red-600 border-red-200"
                }`}
              >
                {displayRating}/5 - {ratingLabel}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Would Recommend */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-brand-text">Would you recommend this dish?</Label>

        <div className="flex justify-center space-x-4">
          <button
            type="button"
            onClick={() => setWouldRecommend(true)}
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all ${
              wouldRecommend === true
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-gray-200 hover:border-green-300"
            }`}
          >
            <ThumbsUp className="w-5 h-5" />
            <span className="font-medium">Yes</span>
          </button>

          <button
            type="button"
            onClick={() => setWouldRecommend(false)}
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all ${
              wouldRecommend === false
                ? "border-red-500 bg-red-50 text-red-700"
                : "border-gray-200 hover:border-red-300"
            }`}
          >
            <ThumbsDown className="w-5 h-5" />
            <span className="font-medium">No</span>
          </button>
        </div>
      </div>

      {/* Review Text */}
      <div className="space-y-3">
        <Label htmlFor={reviewId} className="text-sm font-medium text-brand-text">
          Your Review *
        </Label>

        <Textarea
          id={reviewId}
          placeholder="Tell us about your experience with this dish..."
          value={review}
          onChange={(e) => setReview(e.target.value)}
          className="input-custom resize-none min-h-[120px]"
          rows={5}
        />

        <div className="flex justify-between items-center text-xs">
          <span className="text-brand-text-muted">{review.length}/1000 characters</span>
          {review.trim() && (
            <Badge variant="outline" className="text-green-600 border-green-200">
              ✓ Great detail!
            </Badge>
          )}
        </div>
      </div>

      {/* Review Prompts */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-3">💭 Need inspiration?</h4>
          <div className="space-y-2">
            {REVIEW_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  const currentReview = review.trim()
                  const newText = currentReview ? `${currentReview}\n\n${prompt} ` : `${prompt} `
                  setReview(newText)
                }}
                className="block w-full text-left text-xs text-blue-700 hover:text-blue-900 hover:underline"
              >
                • {prompt}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {rating > 0 && review.trim() && (
        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-brand-text mb-2">Review Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-brand-text-muted">Rating:</span>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: rating }, (_, i) => (
                        <Star key={`rating-star-${i + 1}`} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      ))}
                      <span className="text-brand-text ml-1">{rating}/5</span>
                    </div>
                  </div>
                  {wouldRecommend !== null && (
                    <div className="flex items-center space-x-2">
                      <span className="text-brand-text-muted">Recommend:</span>
                      <span className={wouldRecommend ? "text-green-600" : "text-red-600"}>
                        {wouldRecommend ? "Yes" : "No"}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start space-x-2">
                    <span className="text-brand-text-muted">Review:</span>
                    <span className="text-brand-text line-clamp-2">
                      {review.substring(0, 100)}
                      {review.length > 100 ? "..." : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
