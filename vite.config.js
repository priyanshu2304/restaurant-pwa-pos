import { defineConfig } from 'vite'
import path from 'path'

// Using dynamic import for ESM compatibility
export default defineConfig(async () => {
  const react = await import('@vitejs/plugin-react')
  return {
    plugins: [react.default()],
    server: { port: 5173, host: true },
    preview: { port: 5174 },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), './src')
      }
    },
    define: {
      __APP_VERSION__: JSON.stringify('1.0.0')
    }
  }
})
