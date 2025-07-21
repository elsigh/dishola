"use client"

import { ArrowLeft, ArrowRight, Camera, CheckCircle, MapPin, Star, Utensils } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import StepDish from "./step-dish"
import StepPhotos from "./step-photos"
import StepRestaurant from "./step-restaurant"
import StepReview from "./step-review"

interface DishData {
  // Restaurant info
  restaurantName?: string
  restaurantAddress?: string
  placeId?: string

  // Dish info
  dishName?: string
  cuisine?: string
  category?: string
  price?: number

  // Review info
  review?: string
  rating?: number

  // Photos
  files?: File[]
}

const STEPS = [
  {
    id: "dish",
    title: "What did you eat?",
    subtitle: "Tell us about the dish",
    icon: Utensils,
    color: "bg-blue-500"
  },
  {
    id: "photos",
    title: "Show us the goods",
    subtitle: "Upload some mouth-watering photos",
    icon: Camera,
    color: "bg-green-500"
  },
  {
    id: "restaurant",
    title: "Where was this?",
    subtitle: "Help others find this amazing dish",
    icon: MapPin,
    color: "bg-purple-500"
  },
  {
    id: "review",
    title: "How was it?",
    subtitle: "Share your experience",
    icon: Star,
    color: "bg-orange-500"
  }
]

export default function AddDishWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<DishData>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const step = STEPS[currentStep]
  const progress = ((currentStep + 1) / STEPS.length) * 100

  const isStepValid = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Dish
        return !!data.dishName?.trim()
      case 1: // Photos
        return !!data.files?.length
      case 2: // Restaurant
        return !!(data.restaurantName?.trim() && data.placeId)
      case 3: // Review
        return !!(data.review?.trim() && data.rating)
      default:
        return false
    }
  }

  const canProceed = isStepValid(currentStep)
  const isLast = currentStep === STEPS.length - 1
  const isFirst = currentStep === 0

  const handleNext = () => {
    if (!canProceed) {
      toast.error("Please complete all required fields before continuing")
      return
    }

    if (isLast) {
      handleSubmit()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // TODO: Implement actual submission logic
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate API call
      toast.success("Dish added successfully! 🎉")
      // TODO: Redirect to dish page or user's dishes
    } catch (error) {
      toast.error("Failed to add dish. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepDish data={data} setData={setData} />
      case 1:
        return <StepPhotos data={data} setData={setData} />
      case 2:
        return <StepRestaurant data={data} setData={setData} />
      case 3:
        return <StepReview data={data} setData={setData} />
      default:
        return null
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-serif font-bold text-brand-primary">Add a Dish</h1>
        <p className="text-brand-text-muted">Share your culinary discovery with the dishola community</p>
      </div>

      {/* Progress */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-brand-text">
            Step {currentStep + 1} of {STEPS.length}
          </span>
          <span className="text-sm text-brand-text-muted">{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />

        {/* Step indicators */}
        <div className="flex justify-between">
          {STEPS.map((s, index) => {
            const Icon = s.icon
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep
            const isValid = isStepValid(index)

            return (
              <div key={s.id} className="flex flex-col items-center space-y-1">
                <div
                  className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all
                  ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isCurrent
                        ? `${s.color} text-white`
                        : "bg-gray-200 text-gray-400"
                  }
                `}
                >
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <div className="text-center">
                  <div className={`text-xs font-medium ${isCurrent ? "text-brand-primary" : "text-brand-text-muted"}`}>
                    {s.title.split(" ")[0]}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <Card className="border-2 border-brand-border">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center space-x-3">
            <div className={`w-12 h-12 rounded-full ${step.color} flex items-center justify-center`}>
              <step.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-serif text-brand-primary">{step.title}</CardTitle>
              <p className="text-sm text-brand-text-muted mt-1">{step.subtitle}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">{renderStep()}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={handlePrevious} disabled={isFirst} className="flex items-center space-x-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </Button>

        <div className="flex items-center space-x-2">
          {STEPS.map((stepItem, index) => (
            <div
              key={stepItem.id}
              className={`w-2 h-2 rounded-full transition-all ${
                index <= currentStep ? "bg-brand-primary" : "bg-gray-300"
              }`}
            />
          ))}
        </div>

        <Button
          onClick={handleNext}
          disabled={!canProceed || isSubmitting}
          className="btn-custom-primary flex items-center space-x-2"
        >
          <span>{isLast ? (isSubmitting ? "Adding..." : "Add Dish") : "Next"}</span>
          {!isLast && <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>

      {/* Validation feedback */}
      {!canProceed && (
        <div className="text-center">
          <Badge variant="outline" className="text-brand-text-muted">
            {currentStep === 0 && "Enter a dish name to continue"}
            {currentStep === 1 && "Add at least one photo to continue"}
            {currentStep === 2 && "Select a restaurant to continue"}
            {currentStep === 3 && "Add a review and rating to continue"}
          </Badge>
        </div>
      )}
    </div>
  )
}
