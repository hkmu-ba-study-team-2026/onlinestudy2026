module.exports = async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    try {
        const { password: inputPassword } = req.body || {};
        const CORRECT_PASSWORD = process.env.ADMIN_PASSWORD;

        if (!CORRECT_PASSWORD) {
            return res.status(500).json({
                success: false,
                message: "Server configuration error: ADMIN_PASSWORD not set."
            });
        }

        if (inputPassword === CORRECT_PASSWORD) {
            return res.status(200).json({ success: true, message: "Login successful!" });
        } else {
            return res.status(401).json({ success: false, message: "Wrong Password!" });
        }
    } catch (error) {
        return res.status(400).json({ success: false, message: "Invalid request body." });
    }
};