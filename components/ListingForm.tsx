"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export interface ListingData {
    title: string
    description: string
    tags: string
    price: string
}

interface ListingFormProps {
    initialData?: ListingData
    onSubmit: (data: ListingData) => void
    onCancel: () => void
    isLoading?: boolean
}

export function ListingForm({ initialData, onSubmit, onCancel, isLoading }: ListingFormProps) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Listing Details</CardTitle>
                <CardDescription>Review and edit the AI-generated listing details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                        id="title"
                        defaultValue={initialData?.title}
                        placeholder="Vintage Handcrafted..."
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        defaultValue={initialData?.description}
                        className="min-h-[150px]"
                        placeholder="This beautiful item..."
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                        id="tags"
                        defaultValue={initialData?.tags}
                        placeholder="vintage, handmade, pottery..."
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input
                        id="price"
                        defaultValue={initialData?.price}
                        placeholder="29.99"
                        type="number"
                        step="0.01"
                    />
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={() => { }} disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Draft Listing"}
                </Button>
            </CardFooter>
        </Card>
    )
}
