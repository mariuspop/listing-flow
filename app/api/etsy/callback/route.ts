import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const error = req.nextUrl.searchParams.get("error");

    const savedState = req.cookies.get("etsy_state")?.value;
    const codeVerifier = req.cookies.get("etsy_code_verifier")?.value;

    if (error) {
        return NextResponse.json({ error: `Etsy Error: ${error}` }, { status: 400 });
    }

    if (!code || !state || !codeVerifier || state !== savedState) {
        return NextResponse.json({ error: "Invalid state or missing code" }, { status: 400 });
    }

    const apiKey = process.env.ETSY_API_KEY;
    const redirectUri = "http://localhost:3000/api/etsy/callback";

    try {
        const tokenResponse = await fetch("https://api.etsy.com/v3/public/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                client_id: apiKey!,
                redirect_uri: redirectUri,
                code: code,
                code_verifier: codeVerifier,
            }),
        });

        if (!tokenResponse.ok) {
            const errText = await tokenResponse.text();
            console.error("Token exchange failed", errText);
            return NextResponse.json({ error: "Failed to exchange token", details: errText }, { status: 500 });
        }

        const tokenData = await tokenResponse.json();

        // Check if we have an access token
        if (!tokenData.access_token) {
            return NextResponse.json({ error: "No access token received" }, { status: 500 });
        }

        const response = NextResponse.redirect(new URL("/", req.url));

        // Store access token and refresh token in cookie
        // Note: In a real app, store this in a DB linked to user session. 
        // Secure cookie is okay for this single-user MVP.
        response.cookies.set("etsy_access_token", tokenData.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 3600 // 1 hour
        });

        response.cookies.set("etsy_refresh_token", tokenData.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 86400 * 90 // 90 days
        });

        // Also set a flag accessible to JS to know we are connected
        response.cookies.set("etsy_connected", "true", {
            httpOnly: false, // Accessible to JS
            path: "/",
            maxAge: 3600
        });

        // Clean up temporary cookies
        response.cookies.delete("etsy_code_verifier");
        response.cookies.delete("etsy_state");

        return response;

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
