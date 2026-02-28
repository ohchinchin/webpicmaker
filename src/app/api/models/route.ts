import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const res = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
                "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
                "X-Title": "TRPG Web App",
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!res.ok) {
            console.error("Failed to fetch models from OpenRouter", await res.text());
            return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
        }

        const data = await res.json();

        // Filter for free models. OpenRouter usually has pricing.prompt === "0" and completion === "0"
        // or ID contains ":free"
        const freeModels = data.data.filter((m: any) => {
            const isPricingZero = m.pricing &&
                (m.pricing.prompt === "0" || m.pricing.prompt === 0) &&
                (m.pricing.completion === "0" || m.pricing.completion === 0);
            const isIdFree = m.id.includes(':free');
            return isPricingZero || isIdFree;
        }).map((m: any) => ({
            id: m.id,
            name: m.name
        }));

        return NextResponse.json(freeModels);
    } catch (error) {
        console.error("API Models Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
