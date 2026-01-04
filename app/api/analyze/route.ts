import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("image") as File;

        if (!file) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            console.warn("No GOOGLE_API_KEY found. using mock response.");
            // Return mock data if no key for testing
            return NextResponse.json({
                title: "Sample Vintage Camera Listing (Mock)",
                description: "This is a beautiful vintage camera in excellent condition. Perfect for collectors or photography enthusiasts. Lens is clear and shutter fires correctly.",
                tags: "vintage, camera, photography, retro, analogue, collector, rare, lens, film, old school, antique, decoration, gift",
                price: "150.00"
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const prompt = `
      Analyze this product image and generate a high-quality Etsy listing.
      Return ONLY a raw JSON object (no markdown formatting) with these fields:
      - title: SEO optimized, catchy title (max 140 chars)
      - description: Detailed, persuasive description (markdown supported)
      - tags: A comma-separated string of 13 relevant tags
      - price: An estimated price (number as string, e.g. "29.99")
    `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: buffer.toString("base64"),
                    mimeType: file.type,
                },
            },
        ]);

        const response = await result.response;
        const text = response.text();

        // Clean up markdown if present
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const data = JSON.parse(jsonStr);
            return NextResponse.json(data);
        } catch (e) {
            console.error("Failed to parse JSON", text);
            return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Analysis failed:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error.message || String(error)
        }, { status: 500 });
    }
}
