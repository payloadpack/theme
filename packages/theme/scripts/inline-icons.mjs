import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const iconsDir = path.join(path.dirname(createRequire(import.meta.url).resolve('lucide-static/package.json')), 'icons')
const distDir = fileURLToPath(new URL('../dist', import.meta.url))
const iconUrl = /url\('lucide-static\/icons\/([a-z0-9-]+)\.svg'\)/g

const toDataUri = (svg) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    svg
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ')
      .replace(/> </g, '><')
      .trim()
  )}")`

for (const file of readdirSync(distDir, { recursive: true }).filter((name) => name.endsWith('.css'))) {
  const stylesheet = path.join(distDir, file)
  const css = readFileSync(stylesheet, 'utf8')
  const inlined = css.replace(iconUrl, (_, name) => toDataUri(readFileSync(path.join(iconsDir, `${name}.svg`), 'utf8')))
  if (inlined !== css) {
    writeFileSync(stylesheet, inlined)
  }
}
