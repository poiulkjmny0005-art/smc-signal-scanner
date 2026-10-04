# SMC 全幣種交易訊號掃描器 — 線上部署版

此版本不需要 Binance API Key，使用 Binance USDⓈ-M Futures 公開市場資料。

## 建議：Render
1. 建立 GitHub repository，將這個資料夾內全部檔案上傳。
2. 登入 Render，選 New > Blueprint 或 Web Service。
3. 連接剛才的 GitHub repository。
4. Build Command：`npm install`
5. Start Command：`npm start`
6. 部署完成後會取得 `https://xxxxx.onrender.com` 網址。
7. iPhone 直接用 Safari 開啟該網址即可。

`render.yaml` 已包含基本設定。

## Vercel 備用方式
1. 將同一個 repository 匯入 Vercel。
2. Framework Preset 選 Other。
3. 不需要設定環境變數。
4. 部署後直接開 Vercel 網址。

Vercel 版使用 `/api/*.js` serverless functions 代理 Binance 公開 API；Render 版則使用 `server.js`。

## 本機測試
需要 Node.js 18+：

```bash
npm start
```

然後開啟 `http://localhost:3000`。

## 注意
- 這是規則型 SMC 掃描器，不是自動下單系統。
- 全幣種掃描會產生較多公開 API 請求；若遇到交易所限流，畫面會顯示讀取失敗數量。
- 訊號僅供研究、回測與策略驗證，不保證獲利。
