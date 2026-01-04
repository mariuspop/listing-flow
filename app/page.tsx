"use client"

import { useState } from "react"
import Link from "next/link"
import { ImageUpload } from "@/components/ImageUpload"
import { ListingForm, ListingData } from "@/components/ListingForm"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<"upload" | "review">("upload")
  const [isLoading, setIsLoading] = useState(false)
  const [listingData, setListingData] = useState<ListingData | undefined>(undefined)

  const handleImageSelected = async (selectedFile: File) => {
    setFile(selectedFile)
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append("image", selectedFile)

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.details || errData.error || "Analysis failed")
      }

      const data = await res.json()
      setListingData(data)
      setStep("review")
    } catch (error: any) {
      console.error(error)
      alert(`Error: ${error.message}`)
      setFile(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-4 relative">
          <div className="absolute top-0 right-0">
            <Link href="/api/etsy/auth">
              <Button variant="outline" size="sm">Connect Etsy</Button>
            </Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 pt-4">Listing Flow</h1>
          <p className="text-lg text-slate-600">
            Upload a photo to generate an optimized Etsy listing.
          </p>
        </div>

        {step === "upload" ? (
          <div className="max-w-xl mx-auto">
            <ImageUpload onImageSelected={handleImageSelected} />
            {isLoading && <p className="text-center mt-4 text-muted-foreground">Analyzing image...</p>}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ListingForm
              initialData={listingData}
              isLoading={isLoading}
              onCancel={() => {
                setStep("upload")
                setFile(null)
                setListingData(undefined)
              }}
              onSubmit={async (data) => {
                setIsLoading(true)
                try {
                  // 1. Create Listing
                  const res = await fetch("/api/etsy/listing", {
                    method: "POST",
                    body: JSON.stringify(data)
                  })

                  if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || "Failed to create listing")
                  }

                  const listing = await res.json()
                  console.log("Listing created", listing)

                  // 2. Upload Image
                  if (file) {
                    const formData = new FormData()
                    formData.append("listing_id", listing.listing_id)
                    formData.append("image", file)

                    const imgRes = await fetch("/api/etsy/image", {
                      method: "POST",
                      body: formData
                    })
                    if (!imgRes.ok) console.warn("Image upload failed")
                  }

                  alert("Listing created successfully!")
                  setStep("upload")
                  setFile(null)
                  setListingData(undefined)

                } catch (e: any) {
                  console.error(e)
                  alert(`Error: ${e.message}`)
                } finally {
                  setIsLoading(false)
                }
              }}
            />
          </div>
        )}
      </div>
    </main>
  )
}
