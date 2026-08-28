const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-3.7-flash";

async function getAiRecommendationsFromGemini(products, preferences) {
    if (!GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY environment variable in Vercel.");
    }

    const simplifiedProducts = Array.isArray(products)
        ? products.map(p => (typeof p === 'string' ? p : (p.name || String(p))))
        : [];

    const systemInstruction = "You are a helpful and concise shopping assistant.";
    const userPrompt = `
Based on the following user survey preferences, write a short, engaging recommendation sentence (strictly under 30 words) for these featured products:
User Preferences: ${JSON.stringify(preferences)}
Featured Products: ${JSON.stringify(simplifiedProducts)}

Requirements:
1. The recommendation must focus on 1-3 major aspects based on user preferences.
2. Promote the idea of eco-sustainability of these products.
3. DO NOT explicitly mention words like "based on your preference" or "according to your survey".
4. Output MUST be plain text only, exactly one sentence, starting with "These items". Do not wrap into JSON, markdown, or quotes.
`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

    const requestBody = {
        contents: [
            {
                role: "user",
                parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }]
            }
        ],
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 100
        }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    // 清理 markdown 與引號
    if (content.startsWith("```")) {
        content = content.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
    }
    content = content.replace(/^["']|["']$/g, '');

    if (!content.startsWith("These items")) {
        content = "These items " + content;
    }

    return content;
}

module.exports = async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method === "GET") {
        return res.status(200).json({
            status: "ok",
            message: "Vercel Gemini AI Function Active",
            has_token: Boolean(GEMINI_API_KEY),
            model: MODEL_NAME
        });
    }

    if (req.method === "POST") {
        try {
            const { products = [], preferences = {} } = req.body || {};

            if (!products || products.length < 3) {
                return res.status(400).json({ detail: "Products list must contain at least 3 items." });
            }

            let result;
            try {
                result = await getAiRecommendationsFromGemini(products, preferences);
            } catch (aiErr) {
                console.error(`[Gemini Model Error]: ${aiErr.message}`);
                result = 'These items are eco-friendly.';
            }

            return res.status(200).json({ recommendation: result });

        } catch (e) {
            console.error(`[Handler Exception]: ${e.message}`);
            return res.status(500).json({ detail: e.message });
        }
    }

    return res.status(405).json({ detail: `Method ${req.method} Not Allowed` });
};