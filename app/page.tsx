"use client"

import { useState } from "react"
import Link from "next/link"
import { ImageUpload } from "@/components/ImageUpload"
import { ListingForm, ListingData } from "@/components/ListingForm"
import { CategorySelector, Category } from "@/components/CategorySelector"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<"upload" | "review">("upload")
  const [category, setCategory] = useState<Category>("frame-tv")
  const [shopUrl, setShopUrl] = useState("https://renderflow.etsy.com")
  const [shopName, setShopName] = useState("Render Flow")
  const [isLoading, setIsLoading] = useState(false)
  const [listingData, setListingData] = useState<ListingData | undefined>(undefined)

  const handleImageSelected = async (selectedFile: File) => {
    setFile(selectedFile)
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append("image", selectedFile)
      formData.append("category", category)
      formData.append("shopUrl", shopUrl)
      formData.append("shopName", shopName)

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
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-500 uppercase tracking-wider">Shop Name</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="My Etsy Shop"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-500 uppercase tracking-wider">Shop URL</label>
                <input
                  type="text"
                  value={shopUrl}
                  onChange={(e) => setShopUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="https://etsy.com/shop/..."
                />
              </div>
            </div>

            <CategorySelector
              selected={category}
              onSelect={setCategory}
              disabled={isLoading}
            />
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <ImageUpload onImageSelected={handleImageSelected} />
            </div>
            {isLoading && <p className="text-center mt-4 text-muted-foreground">Analyzing image...</p>}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ListingForm
              initialData={listingData}
              initialFiles={file ? [file] : []}
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
                  // Only simple image upload for now, we won't handle the files array yet for the Draft
                  // listing because that requires another loop. The image analysis one is critical though.
                  // For the 'Digital Files' section (PDFs etc), we'll need a separate flow later or loop here.
                  if (file) {
                    const formData = new FormData()
                    formData.append("listing_id", listing.listing_id)
                    formData.append("image", file)

                    const uploadRes = await fetch("/api/etsy/upload", {
                      method: "POST",
                      body: formData
                    })

                    if (!uploadRes.ok) console.warn("Failed to upload image")
                  }

                  alert("Draft listing created successfully! Check your Etsy Shop Manager.")
                  setStep("upload")
                  setFile(null)
                  setListingData(undefined)
                } catch (error) {
                  console.error(error)
                  alert(error instanceof Error ? error.message : "Failed to create listing")
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
