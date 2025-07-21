"use client"

import { AlertCircle, Camera, Image as ImageIcon, Upload, X } from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  data: any
  setData: (d: any) => void
}

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

export default function StepPhotos({ data, setData }: Props) {
  const [files, setFiles] = useState<File[]>(data.files || [])
  const [previews, setPreviews] = useState<string[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    setData({ ...data, files })
  }, [files])

  useEffect(() => {
    // Create preview URLs
    const newPreviews = files.map((file) => URL.createObjectURL(file))
    setPreviews(newPreviews)

    // Cleanup old URLs
    return () => {
      newPreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [files])

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Please upload only JPEG, PNG, or WebP images"
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size must be less than 10MB"
    }
    return null
  }

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setError("")
      const fileArray = Array.from(newFiles)

      // Validate total count
      if (files.length + fileArray.length > MAX_FILES) {
        setError(`You can only upload up to ${MAX_FILES} photos`)
        return
      }

      // Validate each file
      for (const file of fileArray) {
        const validationError = validateFile(file)
        if (validationError) {
          setError(validationError)
          return
        }
      }

      setFiles((prev) => [...prev, ...fileArray])
    },
    [files]
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setError("")
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <button
        type="button"
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all w-full ${
          dragActive
            ? "border-brand-primary bg-brand-primary/5"
            : files.length > 0
              ? "border-green-300 bg-green-50"
              : "border-brand-border hover:border-brand-primary/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={(e) => {
          const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement
          input?.click()
        }}
        disabled={files.length >= MAX_FILES}
      >
        <input
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={files.length >= MAX_FILES}
        />

        <div className="space-y-4">
          <div className="flex justify-center">
            {files.length > 0 ? (
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <Camera className="w-8 h-8 text-green-600" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center">
                <Upload className="w-8 h-8 text-brand-primary" />
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium text-brand-text">
              {files.length > 0 ? "Add more photos" : "Upload photos of your dish"}
            </h3>
            <p className="text-sm text-brand-text-muted mt-1">
              Drag and drop or click to browse • Max {MAX_FILES} photos • Up to 10MB each
            </p>
          </div>

          {files.length < MAX_FILES && (
            <Button type="button" variant="outline" className="mt-4">
              <ImageIcon className="w-4 h-4 mr-2" />
              Choose Photos
            </Button>
          )}
        </div>
      </button>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Photo Previews */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-brand-text">
              Photos ({files.length}/{MAX_FILES})
            </h4>
            <Badge variant="outline" className="text-green-600 border-green-200">
              ✓ Looking delicious!
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {files.map((file, index) => (
              <Card key={`${file.name}-${index}`} className="relative group overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-square relative">
                    <Image src={previews[index]} alt={`Preview ${index + 1}`} fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-brand-text-muted truncate">{file.name}</p>
                    <p className="text-xs text-brand-text-muted">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">📸 Photo Tips</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Take photos in good lighting for the best results</li>
          <li>• Show the dish from different angles</li>
          <li>• Include the restaurant setting if it adds to the story</li>
          <li>• Make sure the food is the main focus</li>
        </ul>
      </div>
    </div>
  )
}
