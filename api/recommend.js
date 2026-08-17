const { InferenceClient } = require("@huggingface/inference");

const HF_TOKEN = process.env.HF_TOKEN;
const MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct";

const client = HF_TOKEN ? new InferenceClient(HF_TOKEN) : null;

async function getAiRecommendationsFromHf(products, preferences) {
    if (!client) {
        throw new Error("Missing HF_TOKEN");
    }

    const simplifiedProducts = products.map(p => ({
        name: p.name,
    }));

    const prompt = `
You are an AI recommender system. Based on user preferences, write a short, engaging recommendation sentence (under 30 words) for the following 5 products:
User preferences: ${JSON.stringify(preferences)},
Products: ${JSON.stringify(simplifiedProducts)}.

The recommendation focus on 1-3 major aspects based on the user preferences, and includes promotion of the idea of eco-sustainability of the products, but without explicitly mentioning or indicating about the extraction from user preferences.

Output MUST be plain text only, exactly one short sentence, starting with "These items". Do not wrap into JSON or quotes.
`;

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Model Request Timeout (7s)")), 7000)
    );

    const apiPromise = client.chatCompletion({
        model: MODEL_NAME,
        messages: [
            { role: "system", content: "You are a helpful and concise shopping assistant." },
            { role: "user", content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.3
    });

    const response = await Promise.race([apiPromise, timeoutPromise]);

    let content = response.choices[0].message.content.trim();

    if (content.startsWith("```")) {
        content = content.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
    }
    content = content.replace(/^["']|["']$/g, '');

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
            message: "Vercel AI Function Active",
            has_token: Boolean(HF_TOKEN)
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
                result = await getAiRecommendationsFromHf(products, preferences);
            } catch (aiErr) {
                console.log(`[AI Model Error/Timeout]: ${aiErr.message}. Switching to Fallback system.`);
                result = 'Results generated based on your preference.';
            }

            return res.status(200).json({ recommendation: result });

        } catch (e) {
            console.log(`[Handler Exception]: ${e.message}`);
            return res.status(500).json({ detail: e.message });
        }
    }

    return res.status(405).json({ detail: `Method ${req.method} Not Allowed` });
};