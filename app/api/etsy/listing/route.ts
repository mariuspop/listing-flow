import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("etsy_access_token")?.value;
    const apiKey = process.env.ETSY_API_KEY;

    if (!token || !apiKey) {
        return NextResponse.json({ error: "Not authenticated with Etsy" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { title, description, tags, price, quantity, shopSectionId, renewalOption } = body;

        // ... (existing code)

        // Prepare payload
        const listingPayload: any = {
            quantity: parseInt(quantity) || 999,
            title: title,
            description: description,
            price: parseFloat(price),
            who_made: "i_did",
            when_made: "2020_2024",
            taxonomy_id: 1296, // Prints
            shipping_profile_id: shippingProfileId || 123456, // Fallback
            tags: tags.split(",").map((t: string) => t.trim()).slice(0, 13),
            type: "physical",
            should_auto_renew: renewalOption === "automatic"
        };

        if (shopSectionId) {
            listingPayload.shop_section_id = parseInt(shopSectionId);
        }

        const createRes = await fetch(`https://api.etsy.com/v3/application/shops/${shopId}/listings`, {
            method: "POST",
            headers: {
                'x-api-key': apiKey,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(listingPayload)
        });

        if (!createRes.ok) {
            const err = await createRes.text();
            console.error("Failed to create listing", err);
            return NextResponse.json({ error: "Failed to create listing on Etsy", details: err }, { status: 500 });
        }

        const listing = await createRes.json();
        return NextResponse.json({ listing_id: listing.listing_id, url: listing.url });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
