const { InferenceClient } = require("@huggingface/inference");

const HF_TOKEN = process.env.HF_TOKEN;
const MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct";

const client = HF_TOKEN ? new InferenceClient(HF_TOKEN) : null;

// 1. AI 推薦邏輯
async function getAiRecommendationsFromHf(products, preferences) {
    if (!client) {
        throw new Error("HF_TOKEN 未設定");
    }

    const simplifiedProducts = products.map(p => ({
        name: p.name,
    }));

    const prompt = `
You are an AI recommender system. Based on user preferences, write a short sentence, within 20 words, to recommend the products specified below:
User preferences: ${JSON.stringify(preferences)}
Products: ${JSON.stringify(simplifiedProducts)}

Output MUST be a valid String.
`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    try {
        const response = await client.chatCompletion({
            model: MODEL_NAME,
            messages: [
                { role: "system", content: "Output strictly valid JSON arrays without markdown." },
                { role: "user", content: prompt }
            ],
            max_tokens: 200,
            temperature: 0.2
        }, { signal: controller.signal });

        clearTimeout(timeoutId);

        let content = response.choices[0].message.content.trim();

        if (content.startsWith("```")) {
            content = content.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
        }

        return JSON.parse(content);
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

// 2. Fallback 備援邏輯
function fallbackRecommendations(products, preferences) {
    const pricePref = preferences.price_sensitivity || "medium";
    const ecoPref = preferences.sustainability_importance || "medium";

    const scored = products.map(p => {
        let score = 0;
        if (pricePref === "high" && p.price < 10) score += 2;
        if (["high", "medium"].includes(ecoPref) && p.isEco) score += 3;
        return { score, product: p };
    });

    scored.sort((a, b) => b.score - a.score);
    const top3 = scored.slice(0, 3).map(s => s.product);

    return top3.map((item, idx) => ({
        rank: idx + 1,
        item_id: item.id,
        reason: `Matches your preference for ${item.isEco ? "eco-friendly choices" : "great value"}.`
    }));
}

// 3. Vercel Serverless Function 進入點
module.exports = async (req, res) => {
    // 設定 CORS Header
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    // CORS Preflight
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // GET 測試驗證
    if (req.method === "GET") {
        return res.status(200).json({
            status: "ok",
            message: "Vercel AI Function Active",
            has_token: Boolean(HF_TOKEN)
        });
    }

    // POST 處理推薦請求
    if (req.method === "POST") {
        try {
            const { products = [], preferences = {} } = req.body || {};

            if (!products || products.length < 3) {
                return res.status(400).json({ detail: "Products list must contain at least 3 items." });
            }

            let result;
            try {
                result = await getAiRecommendationsFromHf(products, preferences);
            } catch (aiErr) {
                console.log(`[AI Model Error/Timeout]: ${aiErr.message}. Switching to Fallback system.`);
                result = fallbackRecommendations(products, preferences);
            }

            return res.status(200).json(result);

        } catch (e) {
            console.log(`[Handler Exception]: ${e.message}`);
            return res.status(500).json({ detail: e.message });
        }
    }

    return res.status(405).json({ detail: `Method ${req.method} Not Allowed` });
};