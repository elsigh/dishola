"use client"

import { formatDistanceToNow } from "date-fns"
import { Flag, MessageCircle, MoreHorizontal, Reply, Share2, Star, ThumbsDown, ThumbsUp } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

interface ReviewReply {
  id: string
  userId: string
  userName: string
  userAvatar: string
  reply: string
  createdAt: string
  helpful: number
}

interface Review {
  id: string
  userId: string
  userName: string
  userAvatar: string
  rating: number
  review: string
  wouldRecommend: boolean
  createdAt: string
  helpful: number
  replies: ReviewReply[]
}

interface ReviewThreadProps {
  dishId: string
  reviews: Review[]
  totalReviews: number
  averageRating: number
}

function ReviewCard({ review, onReply }: { review: Review; onReply: (reviewId: string) => void }) {
  const [isHelpful, setIsHelpful] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState("")

  const timeAgo = formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })

  const handleReply = () => {
    if (replyText.trim()) {
      // TODO: Submit reply
      setReplyText("")
      setShowReplyForm(false)
      onReply(review.id)
    }
  }

  return (
    <Card className="border border-brand-border">
      <CardContent className="p-6">
        {/* Review Header */}
        <div className="flex items-start space-x-4 mb-4">
          <Image src={review.userAvatar} alt={review.userName} width={40} height={40} className="rounded-full" />
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-brand-text">{review.userName}</h4>
              <span className="text-sm text-brand-text-muted">•</span>
              <span className="text-sm text-brand-text-muted">{timeAgo}</span>
            </div>

            {/* Rating */}
            <div className="flex items-center space-x-2 mb-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= review.rating ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-brand-text">{review.rating}/5</span>
              {review.wouldRecommend && (
                <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                  Recommends
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Review Content */}
        <div className="mb-4">
          <p className="text-brand-text leading-relaxed whitespace-pre-wrap">{review.review}</p>
        </div>

        {/* Review Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setIsHelpful(!isHelpful)}
              className={`flex items-center space-x-1 text-sm transition-colors ${
                isHelpful ? "text-green-600" : "text-brand-text-muted hover:text-brand-text"
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Helpful ({review.helpful + (isHelpful ? 1 : 0)})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex items-center space-x-1 text-sm text-brand-text-muted hover:text-brand-text transition-colors"
            >
              <Reply className="w-4 h-4" />
              <span>Reply</span>
            </button>

            <button
              type="button"
              className="flex items-center space-x-1 text-sm text-brand-text-muted hover:text-brand-text transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button type="button" className="text-brand-text-muted hover:text-brand-text transition-colors">
              <Flag className="w-4 h-4" />
            </button>
            <button type="button" className="text-brand-text-muted hover:text-brand-text transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <div className="mt-4 pt-4 border-t border-brand-border">
            <div className="space-y-3">
              <Textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="input-custom resize-none"
                rows={3}
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => setShowReplyForm(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="btn-custom-primary" onClick={handleReply} disabled={!replyText.trim()}>
                  Reply
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Replies */}
        {review.replies.length > 0 && (
          <div className="mt-4 pt-4 border-t border-brand-border space-y-4">
            {review.replies.map((reply) => (
              <ReplyCard key={reply.id} reply={reply} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ReplyCard({ reply }: { reply: ReviewReply }) {
  const [isHelpful, setIsHelpful] = useState(false)
  const timeAgo = formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })

  return (
    <div className="ml-8 pl-4 border-l-2 border-brand-border">
      <div className="flex items-start space-x-3">
        <Image src={reply.userAvatar} alt={reply.userName} width={32} height={32} className="rounded-full" />
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h5 className="text-sm font-medium text-brand-text">{reply.userName}</h5>
            <span className="text-xs text-brand-text-muted">•</span>
            <span className="text-xs text-brand-text-muted">{timeAgo}</span>
          </div>

          <p className="text-sm text-brand-text leading-relaxed mb-3 whitespace-pre-wrap">{reply.reply}</p>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setIsHelpful(!isHelpful)}
              className={`flex items-center space-x-1 text-xs transition-colors ${
                isHelpful ? "text-green-600" : "text-brand-text-muted hover:text-brand-text"
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
              <span>Helpful ({reply.helpful + (isHelpful ? 1 : 0)})</span>
            </button>

            <button type="button" className="text-xs text-brand-text-muted hover:text-brand-text transition-colors">
              Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReviewThread({ dishId, reviews, totalReviews, averageRating }: ReviewThreadProps) {
  const [sortBy, setSortBy] = useState<"newest" | "helpful" | "rating">("helpful")
  const [showAddReview, setShowAddReview] = useState(false)

  const sortedReviews = [...reviews].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case "helpful":
        return b.helpful - a.helpful
      case "rating":
        return b.rating - a.rating
      default:
        return 0
    }
  })

  const handleReply = (reviewId: string) => {
    // TODO: Handle reply submission
    console.log("Reply to review:", reviewId)
  }

  return (
    <div className="space-y-6">
      {/* Reviews Header */}
      <Card className="border-2 border-brand-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-brand-primary">
              <MessageCircle className="w-5 h-5" />
              <span>Reviews ({totalReviews})</span>
            </CardTitle>
            <Button className="btn-custom-primary" onClick={() => setShowAddReview(true)}>
              Write Review
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.floor(averageRating) ? "text-yellow-400 fill-current" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-medium text-brand-text">{averageRating.toFixed(1)} out of 5</span>
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-brand-text-muted">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border border-brand-border rounded px-2 py-1 bg-white"
              >
                <option value="helpful">Most Helpful</option>
                <option value="newest">Newest</option>
                <option value="rating">Highest Rating</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {sortedReviews.map((review) => (
          <ReviewCard key={review.id} review={review} onReply={handleReply} />
        ))}
      </div>

      {/* Load More */}
      {reviews.length < totalReviews && (
        <div className="text-center">
          <Button variant="outline" className="px-8">
            Load More Reviews
          </Button>
        </div>
      )}
    </div>
  )
}
