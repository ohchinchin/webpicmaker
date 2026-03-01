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

        interface OpenRouterModel {
            id: string;
            name?: string;
            pricing?: {
                prompt: string | number;
                completion: string | number;
            };
        }

        const data = await res.json() as { data: OpenRouterModel[] };

        // Filter for free models. OpenRouter usually has pricing.prompt === "0" and completion === "0"
        // or ID contains ":free"
        const freeModels = data.data.filter((m: OpenRouterModel) => {
            const isPricingZero = m.pricing &&
                (m.pricing.prompt === "0" || m.pricing.prompt === 0) &&
                (m.pricing.completion === "0" || m.pricing.completion === 0);
            const isIdFree = m.id.includes(':free');
            return isPricingZero || isIdFree;
        }).map((m: OpenRouterModel) => ({
            id: m.id,
            name: m.name || m.id
        }));

        return NextResponse.json(freeModels);
    } catch (error) {
        console.error("API Models Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
