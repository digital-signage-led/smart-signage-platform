import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/ecs/wbgt': {
        target: 'https://www.ecs-cloud.ne.jp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ecs\/wbgt/, '/Json/WBGTNumData'),
      },
    },
  },
})
