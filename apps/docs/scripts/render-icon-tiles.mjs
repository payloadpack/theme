import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const lucideIconsDir = path.join(path.dirname(createRequire(import.meta.url).resolve('lucide-static/package.json')), 'icons')
const iconTilesDir = fileURLToPath(new URL('../../../.github/assets/icons', import.meta.url))
const faviconPath = fileURLToPath(new URL('../public/favicon.svg', import.meta.url))
const tileColor = '#c2410c'

const lucideIconByTileName = {
  appearance: 'sliders-horizontal',
  fields: 'toggle-right',
  icons: 'shapes',
  logo: 'swatch-book',
  palettes: 'palette',
  styles: 'layout-template',
  tokens: 'paintbrush'
}

const readLucideIconShapes = (iconName) =>
  readFileSync(path.join(lucideIconsDir, `${iconName}.svg`), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const renderIconTile = (iconName) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="${tileColor}"/><g transform="translate(12 12)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${readLucideIconShapes(iconName)}</g></svg>\n`

mkdirSync(iconTilesDir, { recursive: true })
mkdirSync(path.dirname(faviconPath), { recursive: true })
writeFileSync(faviconPath, renderIconTile(lucideIconByTileName.logo))
for (const [tileName, iconName] of Object.entries(lucideIconByTileName)) {
  writeFileSync(path.join(iconTilesDir, `${tileName}.svg`), renderIconTile(iconName))
}
