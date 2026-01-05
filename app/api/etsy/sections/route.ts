import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const token = req.cookies.get("etsy_access_token")?.value;
    const apiKey = process.env.ETSY_API_KEY;

    if (!token || !apiKey) {
        return NextResponse.json({ error: "Not authenticated with Etsy" }, { status: 401 });
    }

    try {
        // 1. Get User ID
        const userRes = await fetch(`https://api.etsy.com/v3/application/users/me`, {
            headers: {
                'x-api-key': apiKey,
                'Authorization': `Bearer ${token}`
            }
        });

        if (!userRes.ok) throw new Error("Failed to fetch user");
        const userData = await userRes.json();
        const userId = userData.user_id;

        // 2. Get Shop ID
        const shopRes = await fetch(`https://api.etsy.com/v3/application/users/${userId}/shops`, {
            headers: {
                'x-api-key': apiKey,
                'Authorization': `Bearer ${token}`
            }
        });

        if (!shopRes.ok) throw new Error("Failed to fetch shop");
        const shopData = await shopRes.json();

        // Check if shop exists
        if (!shopData.shop_id && (!shopData.results || shopData.results.length === 0)) {
            return NextResponse.json({ error: "No Etsy shop found for this user" }, { status: 404 });
        }

        const shopId = shopData.shop_id || shopData.results[0].shop_id;

        // 3. Fetch Shop Sections
        const sectionsRes = await fetch(`https://api.etsy.com/v3/application/shops/${shopId}/sections`, {
            headers: {
                'x-api-key': apiKey,
                'Authorization': `Bearer ${token}`
            }
        });

        if (!sectionsRes.ok) throw new Error("Failed to fetch shop sections");
        const sectionsData = await sectionsRes.json();
        const sections = sectionsData.results || [];

        return NextResponse.json({ sections });

    } catch (error) {
        console.error("Failed to fetch sections:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
