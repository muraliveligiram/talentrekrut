import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/** Ensures a base path like "app" or "/app" becomes "/app/". */
function normalizeBase(value: string | undefined) {
  if (!value || value === '/') return '/'
  return `/${value.replace(/^\/+|\/+$/g, '')}/`
}

/**
 * Emits dist/web.config for IIS (Azure App Service on Windows) when a virtual path is configured,
 * filling in the base path so the SPA fallback rewrites to the right index.html.
 */
function iisWebConfig(base: string): Plugin {
  return {
    name: 'iis-web-config',
    apply: 'build',
    generateBundle() {
      if (base === '/') return
      const template = readFileSync(new URL('./deploy/web.config', import.meta.url), 'utf8')
      this.emitFile({ type: 'asset', fileName: 'web.config', source: template.replaceAll('%BASE_PATH%', base) })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const base = normalizeBase(env.VITE_BASE_PATH)

  return {
    base,
    plugins: [react(), tailwindcss(), iisWebConfig(base)],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5101',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: false,
    },
  }
})
