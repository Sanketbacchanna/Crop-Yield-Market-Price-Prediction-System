import { readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function offlineAssetsPlugin() {
  let outputDirectory

  return {
    name: 'agripredict-offline-assets',
    apply: 'build',
    configResolved(config) {
      outputDirectory = config.build.outDir
    },
    async closeBundle() {
      const assetsDirectory = path.resolve(outputDirectory, 'assets')
      const files = await readdir(assetsDirectory)
      const assets = files
        .filter((file) => /\.(js|css)$/.test(file))
        .map((file) => `/assets/${file}`)
      await writeFile(
        path.resolve(outputDirectory, 'offline-assets.json'),
        JSON.stringify(assets, null, 2),
        'utf8',
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), offlineAssetsPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})