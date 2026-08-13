const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// 讀取 .env 檔案中的環境變數
dotenv.config();

const app = express();
const PORT = 3000;

// 中間件設定
app.use(cors());
app.use(express.json());

// 靜態檔案託管（可以直接在 http://localhost:3000 存取你的 HTML/CSS/JS）
app.use(express.static(path.join(__dirname)));

// 匯入你剛改好的 API 邏輯
const adminLoginHandler = require('./api/admin-login');
const recommendHandler = require('./api/recommend');

// 路由設定 (對應原本 Vercel 的 API 路徑)
app.use('/api/admin-login', (req, res) => adminLoginHandler(req, res));
app.use('/api/recommend', (req, res) => recommendHandler(req, res));

app.listen(PORT, () => {
    console.log(`=================================`);
    console.g
    console.log(`🚀 Localhost server running at:`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`=================================`);
});