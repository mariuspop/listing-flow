import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const apiKey = process.env.ETSY_API_KEY;
    const redirectUri = "http://localhost:3000/api/etsy/callback";

    if (!apiKey) {
        return NextResponse.json({ error: "ETSY_API_KEY not configured" }, { status: 500 });
    }

    // Generate PKCE values
    const codeVerifier = base64URLEncode(crypto.randomBytes(32));
    const codeChallenge = base64URLEncode(crypto.createHash('sha256').update(codeVerifier).digest());
    const state = Math.random().toString(36).substring(7);

    // Store verifier in cookie for callback
    const response = NextResponse.redirect(
        `https://www.etsy.com/oauth/connect?response_type=code&redirect_uri=${encodeURIComponent(
            redirectUri
        )}&scope=listings_w%20listings_r&client_id=${apiKey}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`
    );

    response.cookies.set("etsy_code_verifier", codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 300 // 5 minutes
    });

    response.cookies.set("etsy_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 300
    });

    return response;
}

function base64URLEncode(str: Buffer) {
    return str.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
