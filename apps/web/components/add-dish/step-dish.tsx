"use client"

import { CATEGORIES, CUISINES, PRICE_RANGES } from "@dishola/types/constants"
import { DollarSign } from "lucide-react"
import { useEffect, useId, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  data: any
  setData: (d: any) => void
}

// CUISINES is now imported from @dishola/types/constants

// CATEGORIES and PRICE_RANGES are now imported from @dishola/types/constants

export default function StepDish({ data, setData }: Props) {
  const [dishName, setDishName] = useState(data.dishName || "")
  const [cuisine, setCuisine] = useState(data.cuisine || "")
  const [category, setCategory] = useState(data.category || "")
  const [price, setPrice] = useState(data.price || "")
  const [description, setDescription] = useState(data.description || "")

  const dishNameId = useId()
  const cuisineId = useId()
  const categoryId = useId()
  const descriptionId = useId()

  useEffect(() => {
    setData({
      ...data,
      dishName: dishName.trim(),
      cuisine,
      category,
      price: price ? Number(price) : undefined,
      description: description.trim()
    })
  }, [dishName, cuisine, category, price, description])

  return (
    <div className="space-y-6">
      {/* Dish Name */}
      <div className="space-y-2">
        <Label htmlFor={dishNameId} className="text-sm font-medium text-brand-text">
          Dish Name *
        </Label>
        <Input
          id={dishNameId}
          placeholder="e.g., Truffle Mushroom Risotto"
          value={dishName}
          onChange={(e) => setDishName(e.target.value)}
          className="input-custom text-lg"
        />
        {dishName.trim() && (
          <Badge variant="outline" className="text-green-600 border-green-200">
            ✓ Looking good!
          </Badge>
        )}
      </div>

      {/* Cuisine and Category Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={cuisineId} className="text-sm font-medium text-brand-text">
            Cuisine Type
          </Label>
          <Select value={cuisine} onValueChange={setCuisine}>
            <SelectTrigger className="input-custom">
              <SelectValue placeholder="Select cuisine..." />
            </SelectTrigger>
            <SelectContent>
              {CUISINES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={categoryId} className="text-sm font-medium text-brand-text">
            Category
          </Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="input-custom">
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-brand-text">Price Range</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PRICE_RANGES.map((range) => (
            <button
              key={range.value}
              type="button"
              onClick={() => setPrice(range.value.toString())}
              className={`p-3 rounded-lg border-2 text-left transition-all hover:border-brand-primary ${
                price === range.value.toString() ? "border-brand-primary bg-brand-primary/5" : "border-brand-border"
              }`}
            >
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-brand-accent" />
                <div>
                  <div className="font-medium text-brand-text">{range.label}</div>
                  <div className="text-xs text-brand-text-muted">{range.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor={descriptionId} className="text-sm font-medium text-brand-text">
          Description <span className="text-brand-text-muted">(optional)</span>
        </Label>
        <Textarea
          id={descriptionId}
          placeholder="Tell us more about this dish... What made it special?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-custom resize-none"
          rows={3}
        />
        <div className="text-xs text-brand-text-muted">{description.length}/500 characters</div>
      </div>

      {/* Selected Tags Preview */}
      {(cuisine || category) && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-brand-text">Tags</Label>
          <div className="flex flex-wrap gap-2">
            {cuisine && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {cuisine}
              </Badge>
            )}
            {category && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                {category}
              </Badge>
            )}
            {price && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {PRICE_RANGES.find((p) => p.value.toString() === price)?.label}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
