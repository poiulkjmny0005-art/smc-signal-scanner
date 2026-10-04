SMC 全幣種交易訊號掃描器（後端代理版）

為什麼要用這個版本：
直接開啟 index.html 時，手機瀏覽器或 ChatGPT 預覽環境可能會阻擋 Binance API，造成按掃描沒有反應。
此版本由 server.js 代為讀取 Binance Futures 公開市場資料，再提供給前端。

啟動方式（Windows / macOS）：
1. 安裝 Node.js 18 以上。
2. 解壓縮此資料夾。
3. 在此資料夾開啟終端機。
4. 執行：npm start
5. 瀏覽器開啟：http://localhost:3000

不需要 Binance API Key，不會自動下單。
若要在 iPhone 上直接使用，需要將這個網站部署到可執行 Node.js 的主機，例如 Render、Railway、Fly.io 或自己的 VPS。
