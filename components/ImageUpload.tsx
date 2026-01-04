"use client"

import { useState, useRef } from "react"
import { Upload, X, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  onImageSelected: (file: File) => void
}

export function ImageUpload({ onImageSelected }: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
        alert("Please upload an image file")
        return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
        setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    onImageSelected(file)
  }

  const clearImage = () => {
    setPreview(null)
    if (inputRef.current) {
        inputRef.current.value = ""
    }
  }

  return (
    <Card className="p-6">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center w-full min-h-[300px] border-2 border-dashed rounded-lg transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          preview ? "border-none" : ""
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleChange}
        />

        {preview ? (
          <div className="relative w-full h-[300px] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
                src={preview} 
                alt="Preview" 
                className="max-h-full max-w-full object-contain rounded-lg"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={clearImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-4">
            <div className="p-4 rounded-full bg-primary/10 text-primary">
              <ImageIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold tracking-tight">
                Upload your product image
              </h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop or click to select
              </p>
            </div>
            <Button onClick={() => inputRef.current?.click()}>
              Select Image
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
