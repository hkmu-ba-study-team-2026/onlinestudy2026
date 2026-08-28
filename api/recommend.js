const GEMINI_API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
// 建議使用 gemini-1.5-flash 或 gemini-2.0-flash
const MODEL_NAME = "gemini-3.7-flash";

async function getAiRecommendationsFromGemini(products, preferences) {
    if (!GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY in Vercel environment variables.");
    }

    const simplifiedProducts = Array.isArray(products)
        ? products.map(p => (typeof p === 'string' ? p : (p.name || String(p))))
        : [];

    const promptText = `
User Preferences from survey (1-7 scale): ${JSON.stringify(preferences)}
Featured Products: ${JSON.stringify(simplifiedProducts)}

Task:
Write a single concise sentence (under 25 words) recommending these featured products.
Rules:
1. Promote their eco-sustainability and fresh quality based on user preferences.
2. The sentence MUST strictly start with the words "These items".
3. Do NOT mention words like "survey", "based on your preference", or "scale".
4. Output plain text only. No markdown, no quotes, no explanation.
`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

    const requestBody = {
        contents: [
            {
                role: "user",
                parts: [{ text: promptText }]
            }
        ],
        generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 80
        }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal
    });

    clearTimeout(timeoutId);

    const rawResponseText = await response.text();

    if (!response.ok) {
        throw new Error(`Google Gemini API Error (${response.status}): ${rawResponseText}`);
    }

    let data;
    try {
        data = JSON.parse(rawResponseText);
    } catch (e) {
        throw new Error(`Failed to parse Gemini response: ${rawResponseText}`);
    }

    let content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!content) {
        throw new Error(`Empty text returned from Gemini API: ${rawResponseText}`);
    }

    // 清理 markdown 語法
    content = content.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
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
            message: "Gemini Handler Ready",
            has_key: Boolean(GEMINI_API_KEY),
            key_length: GEMINI_API_KEY.length,
            model: MODEL_NAME
        });
    }

    if (req.method === "POST") {
        try {
            const { products = [], preferences = {} } = req.body || {};

            if (!products || products.length < 3) {
                return res.status(400).json({ error: "Products list must contain at least 3 items." });
            }

            // 直接呼叫，不再吞掉錯誤
            const recommendation = await getAiRecommendationsFromGemini(products, preferences);

            return res.status(200).json({
                recommendation: recommendation,
                source: "Gemini_API_Live"
            });

        } catch (err) {
            console.error("[Backend Gemini Call Failed]:", err.message);
            // 回傳 500 與明確錯誤原因，讓前端 Console 清楚可見
            return res.status(500).json({
                error: err.message,
                source: "Fallback_Due_To_Error"
            });
        }
    }

    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
};