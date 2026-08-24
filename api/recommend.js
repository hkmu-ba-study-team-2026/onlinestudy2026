const { InferenceClient } = require("@huggingface/inference");

const HF_TOKEN = process.env.HF_TOKEN;
// 選用在 Hugging Face 免費 Inference API 上極度穩定的開源指令模型
const MODEL_NAME = "HuggingFaceH4/zephyr-7b-beta";

const client = HF_TOKEN ? new InferenceClient(HF_TOKEN) : null;

async function getAiRecommendationsFromHf(products, preferences) {
    if (!client) {
        throw new Error("Missing HF_TOKEN environment variable in Vercel.");
    }

    const simplifiedProducts = Array.isArray(products)
        ? products.map(p => (typeof p === 'string' ? p : p.name)).join(", ")
        : "";

    const prompt = `<|system|>
You are a helpful grocery shopping assistant. Write exactly one short, natural recommendation sentence (under 30 words) starting with "These items". Do not output markdown quotes or explanation.</s>
<|user|>
User survey preferences: ${JSON.stringify(preferences)}.
Featured Products: ${simplifiedProducts}.
Based on the preferences, promote the eco-friendly aspects of these featured products in a single sentence starting with "These items".</s>
<|assistant|>
`;

    // 呼叫相容性最高的 textGeneration
    const response = await client.textGeneration({
        model: MODEL_NAME,
        inputs: prompt,
        parameters: {
            max_new_tokens: 60,
            temperature: 0.3,
            return_full_text: false
        }
    });

    let content = (response.generated_text || "").trim();

    // 清理可能出現的引號或多餘字元
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
            message: "Vercel AI Function Active",
            has_token: Boolean(HF_TOKEN),
            model: MODEL_NAME
        });
    }

    if (req.method === "POST") {
        try {
            const { products = [], preferences = {} } = req.body || {};

            let result;
            try {
                result = await getAiRecommendationsFromHf(products, preferences);
            } catch (aiErr) {
                // 將具體錯誤原因回傳給前端，方便在 Network 頁籤精確抓出問題
                console.error("[HF Inference Error]:", aiErr.message);
                return res.status(200).json({
                    recommendation: 'Results generated based on your preference.',
                    debug_error: aiErr.message
                });
            }

            return res.status(200).json({ recommendation: result });

        } catch (e) {
            console.error(`[Handler Exception]:`, e);
            return res.status(500).json({ detail: e.message });
        }
    }

    return res.status(405).json({ detail: `Method ${req.method} Not Allowed` });
};