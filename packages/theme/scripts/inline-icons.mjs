import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const iconsDir = path.join(path.dirname(createRequire(import.meta.url).resolve('lucide-static/package.json')), 'icons')
const stylesheets = ['icons.css', 'nav-icons.css'].map((file) => new URL(`../dist/options/${file}`, import.meta.url))

const toDataUri = (svg) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    svg
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ')
      .replace(/> </g, '><')
      .trim()
  )}")`

for (const stylesheet of stylesheets) {
  const css = readFileSync(stylesheet, 'utf8').replace(/url\('lucide-static\/icons\/([a-z0-9-]+)\.svg'\)/g, (_, name) =>
    toDataUri(readFileSync(path.join(iconsDir, `${name}.svg`), 'utf8'))
  )

  writeFileSync(stylesheet, css)
}
