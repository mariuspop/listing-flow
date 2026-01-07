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

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const category = formData.get("category") as string || "other";
        const shopUrl = formData.get("shopUrl") as string || "[YOUR SHOP URL]";
        const shopName = formData.get("shopName") as string || "[YOUR SHOP NAME]";

        const mode = formData.get("mode");

        const modelsToTry = ["gemini-3-flash-preview", "gemini-2.0-flash", "gemini-1.5-flash"];
        let usedModel = "";
        let result = null;
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`Trying model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });

                if (mode === "batch_alt_text") {
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

                    result = await model.generateContent([
                        prompt,
                        ...imageParts
                    ]);
                } else if (mode === "alt_text") {
                    const prompt = `
                    Analyze this product image and generate a short, descriptive alt text for Etsy SEO.
                    Focus on visual details and keywords. Max 150 characters.
                    Return ONLY a raw JSON object with one field:
                    - alt: The generated alt text string
                    `;

                    result = await model.generateContent([
                        prompt,
                        {
                            inlineData: {
                                data: buffer.toString("base64"),
                                mimeType: file.type,
                            },
                        },
                    ]);
                } else {
                    let contextPrompt = "";
                    if (category === "frame-tv") {
                        contextPrompt = `
                        This is a digital file for Samsung Frame TV art.
                        REQUIRED title format: "Title of Art | Frame TV Art | Samsung Frame TV Art | 4K Digital Download" (or similar relevant keywords).
                        
                        REQUIRED DESCRIPTION CONTENT:
                        - THIS IS A SAMSUNG FRAME TV ART PIECE.
                        - CRITICAL: The title MUST include 'Frame TV' or 'Samsung Frame TV' and '(Digital Download)'.
                        
                        - DESCRIPTION TEMPLATE (Use double newlines between sections):
                        [GENERATE A 2-3 SENTENCE VIVID DESCRIPTION OF THE IMAGE HERE]

                        𝗙𝗶𝗹𝗲 𝗗𝗲𝘁𝗮𝗶𝗹𝘀
                        Your download includes one high-resolution JPG file sized 3840 x 2160 pixels.
                        This 16:9 ratio file is specifically optimized for the Samsung Frame TV but works on any 4K 16:9 display.
                        Please kindly note this file is intended for digital screen use only and is not suitable for printing.

                        𝗛𝗼𝘄 𝘁𝗼 𝗗𝗼𝘄𝗻𝗹𝗼𝗮𝗱
                        After purchase, you can access your file by visiting your Etsy Profile > Purchases and Reviews.
                        Please note: The Etsy app does not currently support downloading files. You must sign in to Etsy through a mobile browser (like Safari or Chrome) or a computer to save your file.

                        𝗛𝗼𝘄 𝘁𝗼 𝗔𝗱𝗱 𝘁𝗼 𝗧𝗩
                        1. Download the image to your phone.
                        2. Open the free SmartThings app and ensure your TV is connected.
                        3. Select "Art Mode" and add your photo.
                        4. Select "No Mat" for the full-screen look.

                        𝗡𝗲𝗲𝗱 𝗛𝗲𝗹𝗽?
                        We would be happy to assist you. If you have any questions, please message us in Etsy chat.
                        Thanks for visiting! Make sure to follow the shop to see new items.
                        Shop: ${shopUrl}

                        © ${shopName}

                        This product is for personal use only. You may not redistribute, resell, or modify the product for commercial gain. Sharing of the file is strictly prohibited. Artwork created with digital tools and AI assistance.
                        `;
                    } else if (category === "wall-art") {
                        contextPrompt = "This is printable wall art. Suggest standard aspect ratios (2:3, 3:4, 4:5, etc) and mention it is a high-resolution digital download.";
                    }

                    const prompt = `
                      Analyze this product image and generate a high-quality Etsy listing.
                      Category context: ${contextPrompt}
                      
                      Return ONLY a raw JSON object (no markdown formatting) with these fields:
                      - title: SEO optimized, catchy title (max 140 chars)
                      - description: Detailed, persuasive description (markdown supported). Include specific details relevant to the category (e.g. sizing for wall art, resolution for frame TV).
                      - tags: A comma-separated string of 13 relevant tags
                      - price: An estimated price (number as string, e.g. "29.99")
                    `;
                    const resultResp = await model.generateContent([
                        prompt,
                        {
                            inlineData: {
                                data: buffer.toString("base64"),
                                mimeType: file.type,
                            },
                        },
                    ]);
                    result = resultResp;
                }

                usedModel = modelName;
                break; // If successful, exit loop
            } catch (error: any) {
                console.warn(`Model ${modelName} failed:`, error.message);
                lastError = error;
                // Continue to next model
            }
        }

        if (!result) {
            throw lastError || new Error("All models failed");
        }

        const response = await result.response;
        const text = response.text();
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

        let data;
        try {
            data = JSON.parse(jsonStr);
        } catch (e) {
            if (mode === "alt_text") {
                data = { alt: text };
            } else {
                console.error("Failed to parse JSON", text);
                return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
            }
        }

        // Attach usedModel to response
        return NextResponse.json({ ...data, usedModel });

    } catch (error: any) {
        console.error("Analysis failed:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error.message || String(error)
        }, { status: 500 });
    }
}
