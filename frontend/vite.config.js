import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                // Use 127.0.0.1 so Node resolves IPv4; localhost → ::1 often causes ECONNREFUSED on Windows
                target: 'http://127.0.0.1:5000',
                changeOrigin: true
            },
            '/uploads': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true
            }
        }
    },
    // Strip console.log and debugger in production builds
    esbuild: {
        drop: mode === 'production' ? ['console', 'debugger'] : []
    }
}))
