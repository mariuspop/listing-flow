
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { FileText, X, CloudDownload, GripVertical, Plus, HelpCircle, Image as ImageIcon, Sparkles, Trash2, RefreshCw } from "lucide-react"

export interface Photo {
    id: string
    file: File
    preview: string
    alt: string
    isGenerating: boolean
}

export interface ListingData {
    title: string
    description: string
    tags: string
    price: string
    quantity: string
    shopSectionId: string
    renewalOption: "automatic" | "manual"
    files: File[]
    photos: Photo[]
}

interface ListingFormProps {
    initialData?: Partial<ListingData>
    initialFiles?: File[]
    onSubmit: (data: ListingData) => void
    onCancel: () => void
    isLoading?: boolean
}

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]} `
}

export function ListingForm({ initialData, initialFiles = [], onSubmit, onCancel, isLoading }: ListingFormProps) {
    const defaultValues: ListingData = {
        title: initialData?.title || "",
        description: initialData?.description || "",
        tags: initialData?.tags || "",
        price: initialData?.price || "",
        quantity: initialData?.quantity || "999",
        shopSectionId: initialData?.shopSectionId || "",
        renewalOption: initialData?.renewalOption || "automatic",
        files: [],
        photos: []
    }

    const [files, setFiles] = useState<File[]>(initialFiles)
    const [photos, setPhotos] = useState<Photo[]>([])
    const [shopSections, setShopSections] = useState<{ shop_section_id: number, title: string }[]>([])
    const [selectedSection, setSelectedSection] = useState(defaultValues.shopSectionId)
    const photoInputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null)

    useEffect(() => {
        const fetchSections = async () => {
            try {
                const res = await fetch("/api/etsy/sections")
                if (res.ok) {
                    const data = await res.json()
                    setShopSections(data.sections || [])
                }
            } catch (error) {
                console.error("Failed to fetch shop sections", error)
            }
        }
        fetchSections()
    }, [])

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newPhotos = Array.from(e.target.files).map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                file,
                preview: URL.createObjectURL(file),
                alt: "",
                isGenerating: false
            }))
            setPhotos(prev => [...prev, ...newPhotos].slice(0, 20)) // Limit to 20
        }
    }

    const removePhoto = (id: string) => {
        setPhotos(prev => prev.filter(p => p.id !== id))
    }

    const updateAltText = (id: string, text: string) => {
        setPhotos(prev => prev.map(p => p.id === id ? { ...p, alt: text } : p))
    }

    const generateAltText = async (id: string) => {
        const photo = photos.find(p => p.id === id)
        if (!photo) return

        setPhotos(prev => prev.map(p => p.id === id ? { ...p, isGenerating: true } : p))

        try {
            const formData = new FormData()
            formData.append("image", photo.file)
            formData.append("mode", "alt_text")

            const res = await fetch("/api/analyze", {
                method: "POST",
                body: formData
            })

            if (res.ok) {
                const data = await res.json()
                if (data.alt) {
                    updateAltText(id, data.alt)
                }
            }
        } catch (error) {
            console.error("Failed to generate alt text", error)
        } finally {
            setPhotos(prev => prev.map(p => p.id === id ? { ...p, isGenerating: false } : p))
        }
    }

    const generateAllAltText = async () => {
        const photosToGenerate = photos.filter(p => !p.isGenerating)
        if (photosToGenerate.length === 0) return

        // Set all to generating
        setPhotos(prev => prev.map(p => ({ ...p, isGenerating: true })))

        // Initialize progress
        let processedCount = 0
        const totalToProcess = photosToGenerate.length
        setGenerationProgress({ current: 0, total: totalToProcess })

        // Process in batches of 5 to respect rate limits while efficient
        const BATCH_SIZE = 5
        const batches = []
        for (let i = 0; i < photosToGenerate.length; i += BATCH_SIZE) {
            batches.push(photosToGenerate.slice(i, i + BATCH_SIZE))
        }

        for (const batch of batches) {
            try {
                const formData = new FormData()
                batch.forEach(photo => {
                    formData.append("image", photo.file)
                })
                formData.append("mode", "batch_alt_text")

                const res = await fetch("/api/analyze", {
                    method: "POST",
                    body: formData
                })

                if (res.ok) {
                    const data = await res.json()
                    // Expecting { results: [{ alt: "..." }, ...] }
                    if (data.results && Array.isArray(data.results)) {
                        setPhotos(prev => prev.map(p => {
                            // Find if this photo was in the current batch
                            const batchIndex = batch.findIndex(b => b.id === p.id)
                            if (batchIndex !== -1 && data.results[batchIndex]?.alt) {
                                return { ...p, alt: data.results[batchIndex].alt }
                            }
                            return p
                        }))
                    }
                }

                // Update progress
                processedCount += batch.length
                setGenerationProgress({ current: processedCount, total: totalToProcess })

                // Small delay between batches
                await new Promise(resolve => setTimeout(resolve, 2000))

            } catch (error) {
                console.error("Batch generation failed", error)
            } finally {
                // Clear generating state for this batch
                setPhotos(prev => prev.map(p => {
                    if (batch.find(b => b.id === p.id)) {
                        return { ...p, isGenerating: false }
                    }
                    return p
                }))
            }
        }
        setGenerationProgress(null)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files || [])])
        }
    }

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        onSubmit({
            title: formData.get("title") as string,
            description: formData.get("description") as string,
            tags: formData.get("tags") as string,
            price: formData.get("price") as string,
            quantity: formData.get("quantity") as string,
            shopSectionId: selectedSection, // Use state for select
            renewalOption: formData.get("renewalOption") as "automatic" | "manual",
            files: files,
            photos: photos
        })
    }

    return (
        <Card className="w-full">
            <form onSubmit={handleSubmit}>
                <CardHeader>
                    <CardTitle>Listing Details</CardTitle>
                    <CardDescription>Review and edit the AI-generated listing details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Photos Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Label className="text-base font-semibold">Photos</Label>
                                <span className="text-red-500">*</span>
                                <span className="text-sm text-slate-500 ml-2">({photos.length}/20)</span>
                            </div>
                            <div className="flex gap-2">
                                {photos.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        {generationProgress && (
                                            <span className="text-xs text-purple-600 font-medium animate-pulse">
                                                Generating... {generationProgress.current}/{generationProgress.total}
                                            </span>
                                        )}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={generateAllAltText}
                                            disabled={photos.some(p => p.isGenerating)}
                                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200"
                                        >
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            {generationProgress ? "Generating..." : "Generate All Alt Text"}
                                        </Button>
                                    </div>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => photoInputRef.current?.click()}
                                    disabled={photos.length >= 20}
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Add photos
                                </Button>
                            </div>
                            <input
                                type="file"
                                ref={photoInputRef}
                                className="hidden"
                                multiple
                                accept="image/*"
                                onChange={handlePhotoUpload}
                            />
                        </div>

                        <p className="text-sm text-slate-500">
                            Upload up to 20 photos. Add alt text to improve SEO.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {photos.map((photo) => (
                                <div key={photo.id} className="flex gap-4 p-3 border rounded-lg bg-slate-50">
                                    <div className="relative w-24 h-24 flex-shrink-0 bg-white border rounded overflow-hidden">
                                        <img src={photo.preview} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(photo.id)}
                                            className="absolute top-1 right-1 p-1 bg-white/80 rounded-full hover:bg-red-100 text-slate-500 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Label className="text-xs font-semibold text-slate-700">Alt Text</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={photo.alt}
                                                onChange={(e) => updateAltText(photo.id, e.target.value)}
                                                placeholder="Describe this image for SEO..."
                                                className="h-8 text-sm"
                                            />
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="outline"
                                                className="h-8 w-8 flex-shrink-0"
                                                onClick={() => generateAltText(photo.id)}
                                                disabled={photo.isGenerating}
                                                title="Generate Alt Text with AI"
                                            >
                                                {photo.isGenerating ? (
                                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Sparkles className="w-3 h-3 text-purple-600" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Digital Files Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Label className="text-base font-semibold">Digital files</Label>
                            <span className="text-red-500">*</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <HelpCircle className="h-4 w-4 text-slate-500 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[300px]">
                                        <p className="font-semibold mb-1">Supported file types</p>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            .bmp, .doc, .gif, .jpeg, .jpg, .mobi, .mov, .mp3, .mpeg, .pdf, .png, .psp, .rtf, .stl, .txt, .zip, .ePUB, or .iBook.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <p className="text-sm text-slate-500">Buyers can download these files as soon as they complete their purchase. Add up to 5 files.</p>

                        <div className="space-y-3">
                            {files.map((file, index) => (
                                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-white shadow-sm group">
                                    <GripVertical className="w-5 h-5 text-slate-400 cursor-move" />
                                    <div className="flex items-center justify-center w-10 h-10 bg-slate-100 rounded text-slate-500">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate pr-2">{file.name}</p>
                                        <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            type="button"
                                            className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full"
                                        >
                                            <CloudDownload className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="h-8 w-8 text-slate-400 hover:text-red-500 rounded-full"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                multiple
                                onChange={handleFileChange}
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-900 border-0"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add file
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            name="title"
                            defaultValue={defaultValues.title}
                            placeholder="Vintage Handcrafted..."
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            name="description"
                            defaultValue={defaultValues.description}
                            className="min-h-[150px]"
                            placeholder="This beautiful item..."
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tags">Tags (comma separated)</Label>
                        <Input
                            id="tags"
                            name="tags"
                            defaultValue={defaultValues.tags}
                            placeholder="vintage, handmade, pottery..."
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Price</Label>
                            <Input
                                id="price"
                                name="price"
                                defaultValue={defaultValues.price}
                                placeholder="29.99"
                                type="number"
                                step="0.01"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                                id="quantity"
                                name="quantity"
                                defaultValue={defaultValues.quantity}
                                placeholder="999"
                                type="number"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="shopSectionId">Shop Section</Label>
                            <Select
                                value={selectedSection}
                                onValueChange={setSelectedSection}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a section" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {shopSections.map((section) => (
                                        <SelectItem key={section.shop_section_id} value={section.shop_section_id.toString()}>
                                            {section.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {/* Hidden input to ensure form submission works if needed, though we handle onSubmit manually */}
                            <input type="hidden" name="shopSectionId" value={selectedSection} />
                        </div>
                        <div className="space-y-2">
                            <Label>Renewal Option</Label>
                            <div className="flex gap-4 pt-2">
                                <label className="flex items-center space-x-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="renewalOption"
                                        value="automatic"
                                        defaultChecked={defaultValues.renewalOption === "automatic"}
                                        className="accent-orange-500 w-4 h-4"
                                    />
                                    <span>Automatic</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="renewalOption"
                                        value="manual"
                                        defaultChecked={defaultValues.renewalOption === "manual"}
                                        className="accent-orange-500 w-4 h-4"
                                    />
                                    <span>Manual</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Creating..." : "Create Draft Listing"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
