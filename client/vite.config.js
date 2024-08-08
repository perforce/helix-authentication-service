import path from 'node:path'
import {
  defineConfig,
  splitVendorChunkPlugin
} from 'vite'
import react from '@vitejs/plugin-react'
import eslint from 'vite-plugin-eslint'

// several proxied routes lead to the same backend server
const backend = {
  target: 'https://localhost:3000',
  changeOrigin: true,
  // Allow for self-signed certificates by setting secure to false, otherwise
  // vite will reject the proxy request.
  secure: false
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/admin',
  plugins: [
    react(),
    eslint(),
    splitVendorChunkPlugin()
  ],
  resolve: {
    alias: {
      // Would have used @ like everyone else except that there are real-world
      // module dependencies that start with @ already so that would be problem.
      '~': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/requests': backend,
      '/settings': backend,
      '/status': backend,
      '/tokens': backend,
    }
  },
})
