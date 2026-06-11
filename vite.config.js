import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CRA からの移行設定。
// JSX を含むソースは .jsx 拡張子に統一済みのため、plugin-react が既定で処理する。
// 出力先は firebase.json の hosting.public ("build") に合わせる（古い build/ の誤デプロイ防止）。
export default defineConfig({
  plugins: [react()],
  server: { port: 3000, open: true },
  build: { outDir: 'build' },
})
