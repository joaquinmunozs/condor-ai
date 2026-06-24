import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { SITE, getSeo, SEO_PATHS } from './src/lib/seo'

/**
 * Prerender de SEO: tras el build, emite un index.html estático por ruta
 * (dist/planes/index.html, dist/diagnostico/index.html) con el <head> ya
 * reescrito, para que los crawlers sociales (que no ejecutan JS) lean el OG
 * correcto. La data sale de src/lib/seo.ts (fuente única, compartida con <Seo/>).
 */
function prerenderSeo(): Plugin {
  const escAttr = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const setMeta = (html: string, attr: 'name' | 'property', key: string, val: string) =>
    html.replace(
      new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`),
      (_m, p1, p2) => p1 + escAttr(val) + p2,
    )

  return {
    name: 'prerender-seo',
    apply: 'build',
    closeBundle() {
      const dist = resolve(process.cwd(), 'dist')
      const tpl = readFileSync(resolve(dist, 'index.html'), 'utf8')

      for (const path of SEO_PATHS) {
        const seo = getSeo(path)
        const url = SITE.url + path
        const img = SITE.url + seo.image

        let html = tpl
          .replace(/<title>[^<]*<\/title>/, `<title>${escAttr(seo.title)}</title>`)
          .replace(/(<link rel="canonical" href=")[^"]*(")/, (_m, p1, p2) => p1 + url + p2)
        html = setMeta(html, 'name', 'description', seo.description)
        html = setMeta(html, 'property', 'og:title', seo.title)
        html = setMeta(html, 'property', 'og:description', seo.description)
        html = setMeta(html, 'property', 'og:url', url)
        html = setMeta(html, 'property', 'og:image', img)
        html = setMeta(html, 'name', 'twitter:title', seo.title)
        html = setMeta(html, 'name', 'twitter:description', seo.description)
        html = setMeta(html, 'name', 'twitter:image', img)

        const dir = resolve(dist, path.replace(/^\//, ''))
        mkdirSync(dir, { recursive: true })
        writeFileSync(resolve(dir, 'index.html'), html)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), prerenderSeo()],
})
