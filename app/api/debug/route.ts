import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "No API Key" });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Use the model manager to list models
        // Note: older SDKs used access to listModels via fetch, newer SDKs expose it via genAI.getGenerativeModel usually doesn't have list.
        // Actually, currently listModels is usually on the GoogleGenerativeAI instance or via a manager.
        // Checking docs... in 0.24.1 it might be separate?
        // Let's try to just make a raw fetch to the list models endpoint to be safe and dependency-agnostic.

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message });
    }
}
