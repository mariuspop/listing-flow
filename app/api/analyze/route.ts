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

        const category = formData.get("category") as string || "other";
        const shopUrl = formData.get("shopUrl") as string || "[YOUR SHOP URL]";
        const shopName = formData.get("shopName") as string || "[YOUR SHOP NAME]";

        const mode = formData.get("mode");

        if (mode === "alt_text") {
            const prompt = `
            Analyze this product image and generate a short, descriptive alt text for Etsy SEO.
            Focus on visual details and keywords. Max 150 characters.
            Return ONLY a raw JSON object with one field:
            - alt: The generated alt text string
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
                return NextResponse.json({ alt: text }); // Fallback to raw text if JSON fails
            }
        } else if (mode === "batch_alt_text") {
            const files = formData.getAll("image") as File[];
            if (!files || files.length === 0) {
                return NextResponse.json({ error: "No images provided" }, { status: 400 });
            }

            const prompt = `
             Analyze these ${files.length} product images.
             Generate a short, descriptive alt text for EACH image for Etsy SEO.
             Focus on visual details and keywords. Max 150 characters per text.
             
             Return ONLY a raw JSON object with a single field "results", which is an array of objects.
             Each object in the array must have an "alt" field.
             The order of the array MUST match the order of the images provided.
             Example: { "results": [ { "alt": "..." }, { "alt": "..." } ] }
             `;

            const imageParts = await Promise.all(files.map(async (f) => ({
                inlineData: {
                    data: Buffer.from(await f.arrayBuffer()).toString("base64"),
                    mimeType: f.type
                }
            })));

            const result = await model.generateContent([
                prompt,
                ...imageParts
            ]);

            const response = await result.response;
            const text = response.text();
            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

            try {
                const data = JSON.parse(jsonStr);
                return NextResponse.json(data);
            } catch (e) {
                console.error("Batch JSON parse failed", text);
                return NextResponse.json({ error: "Failed to parse batch response" }, { status: 500 });
            }
        }

        let contextPrompt = "";
        // ... (rest of context prompt logic for full listing) ...
        const prompt = `
      Analyze this product image and generate a high-quality Etsy listing.
      Category context: ${contextPrompt}
      
      Return ONLY a raw JSON object (no markdown formatting) with these fields:
      - title: SEO optimized, catchy title (max 140 chars)
      - description: Detailed, persuasive description (markdown supported). Include specific details relevant to the category (e.g. sizing for wall art, resolution for frame TV).
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
