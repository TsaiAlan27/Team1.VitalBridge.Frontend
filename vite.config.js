import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
    plugins: [mkcert()],
    server: {
        host: 'localhost', // 或 'localhost'
        port: 5173,
        https: true,       // 啟用 HTTPS（使用 mkcert 憑證）
        open: false,
        strictPort: true,   // 嚴格使用指定的端口
        // 若需要代理到後端（可選）
        proxy: {
            '/api': {
                target: 'https://localhost:7104', // 你的 WebAPI
                changeOrigin: true,
                secure: false, // 後端是自簽憑證時要設 false
            }
        },
        // 若要跨來源 Cookie（僅當你日後用 Cookie 時）
        // cors: { origin: /https:\/\/localhost:5173/, credentials: true },
        // hmr: { protocol: 'wss', host: '127.0.0.1', port: 5173 }, // 通常不需要手動設
    },
    // 如果你的專案不是以專案根目錄當靜態根，才需要設置
    // root: '.',  
    build: {
        outDir: 'dist'
    }
})