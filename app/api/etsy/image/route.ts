import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("etsy_access_token")?.value;
    const apiKey = process.env.ETSY_API_KEY;

    if (!token || !apiKey) {
        return NextResponse.json({ error: "Not authenticated with Etsy" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const listingId = formData.get("listing_id");
        const image = formData.get("image") as File;

        if (!listingId || !image) {
            return NextResponse.json({ error: "Missing listing_id or image" }, { status: 400 });
        }

        // Need shop ID. We can fetch it or pass it. Fetching is safer.
        const userRes = await fetch(`https://api.etsy.com/v3/application/users/me`, {
            headers: { 'x-api-key': apiKey, 'Authorization': `Bearer ${token}` }
        });
        const userData = await userRes.json();

        const shopRes = await fetch(`https://api.etsy.com/v3/application/users/${userData.user_id}/shops`, {
            headers: { 'x-api-key': apiKey, 'Authorization': `Bearer ${token}` }
        });
        const shopData = await shopRes.json();
        const shopId = shopData.shop_id || shopData.results?.[0]?.shop_id;

        if (!shopId) {
            return NextResponse.json({ error: "Shop not found" }, { status: 404 });
        }

        // Upload image to Etsy
        // Etsy expects 'image' field in multipart/form-data
        // We need to forward the file.

        const etsyFormData = new FormData();
        etsyFormData.append("image", image);
        // Etsy might require 'rank' or 'overwrite'. Default is rank 1.

        const uploadRes = await fetch(`https://api.etsy.com/v3/application/shops/${shopId}/listings/${listingId}/images`, {
            method: "POST",
            headers: {
                'x-api-key': apiKey,
                'Authorization': `Bearer ${token}`,
                // Do not set Content-Type header when sending FormData, fetch does it with boundary
            },
            body: etsyFormData
        });

        if (!uploadRes.ok) {
            const err = await uploadRes.text();
            console.error("Image upload failed", err);
            return NextResponse.json({ error: "Failed to upload image to Etsy", details: err }, { status: 500 });
        }

        const data = await uploadRes.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
