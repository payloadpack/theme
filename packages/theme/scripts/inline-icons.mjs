import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const iconsDir = path.join(path.dirname(createRequire(import.meta.url).resolve('lucide-static/package.json')), 'icons')
const stylesheet = new URL('../dist/styles/lucide.css', import.meta.url)

const toDataUri = (svg) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    svg
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ')
      .replace(/> </g, '><')
      .trim()
  )}")`

const css = readFileSync(stylesheet, 'utf8').replace(/url\('lucide-static\/icons\/([a-z0-9-]+)\.svg'\)/g, (_, name) =>
  toDataUri(readFileSync(path.join(iconsDir, `${name}.svg`), 'utf8'))
)

writeFileSync(stylesheet, css)
