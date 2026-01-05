"use client"

import { Monitor, Image as ImageIcon, Sparkles, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

export type Category = "frame-tv" | "wall-art" | "clipart" | "other"

interface CategorySelectorProps {
    selected: Category
    onSelect: (category: Category) => void
    disabled?: boolean
}

export function CategorySelector({ selected, onSelect, disabled }: CategorySelectorProps) {
    const categories = [
        {
            id: "frame-tv",
            label: "Frame TV",
            subLabel: "16:9 SCREEN ART",
            icon: Monitor,
        },
        {
            id: "wall-art",
            label: "Wall Art",
            subLabel: "DIGITAL PRINTS",
            icon: ImageIcon,
        },
        {
            id: "clipart",
            label: "Clipart",
            subLabel: "PNG ASSETS",
            icon: Sparkles,
        },
        {
            id: "other",
            label: "Other",
            subLabel: "GENERAL LISTING",
            icon: Layers,
        },
    ] as const

    return (
        <div className="space-y-3">
            <label className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Select Product Category
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.map((category) => {
                    const Icon = category.icon
                    const isSelected = selected === category.id

                    return (
                        <button
                            key={category.id}
                            onClick={() => onSelect(category.id as Category)}
                            disabled={disabled}
                            className={cn(
                                "relative flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200 text-left hover:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2",
                                isSelected
                                    ? "border-orange-500 bg-orange-50/10 text-orange-600"
                                    : "border-slate-200 bg-transparent text-slate-600 hover:bg-slate-50",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <div className="mb-3">
                                <Icon className={cn("w-6 h-6", isSelected ? "text-orange-500" : "text-slate-400")} />
                            </div>
                            <div className="font-semibold text-sm">
                                {category.label}
                            </div>
                            <div className={cn("text-xs font-medium mt-1", isSelected ? "text-orange-400" : "text-slate-400")}>
                                {category.subLabel}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
