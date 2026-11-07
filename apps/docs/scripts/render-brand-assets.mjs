import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const lucideIconsDir = path.join(path.dirname(createRequire(import.meta.url).resolve('lucide-static/package.json')), 'icons')
const brandAssetsDir = fileURLToPath(new URL('../../../.github/assets/icons', import.meta.url))
const faviconPath = fileURLToPath(new URL('../public/favicon.svg', import.meta.url))

const brandGradientStops = ['#10b981', '#06b6d4']
const logoColorByColorScheme = { dark: '#fafafa', light: '#18181b' }
const logoShapes =
  '<path d="M18.378 6.319c.756.188 1.215.954 1.027 1.709l-2.511 10.072c-.155.62-.698 1.041-1.305 1.068.168-.389.261-.818.261-1.268V6.1c0-.142-.009-.281-.027-.418Z" opacity=".45"/><rect x="4.25" y="4.5" width="10" height="15" rx="1.6"/>'

const lucideIconByFeatureName = {
  appearance: 'sliders-horizontal',
  fields: 'toggle-right',
  icons: 'shapes',
  palettes: 'palette',
  styles: 'layout-template',
  tokens: 'paintbrush'
}

const brandGradient = `<linearGradient id="brand" x1="2" x2="22" y1="0" y2="0" gradientUnits="userSpaceOnUse">${brandGradientStops
  .map((color, index) => `<stop offset="${index / (brandGradientStops.length - 1)}" stop-color="${color}"/>`)
  .join('')}</linearGradient>`

const readLucideIconShapesInBrandGradient = (iconName) =>
  readFileSync(path.join(lucideIconsDir, `${iconName}.svg`), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, '')
    .replace(/\s+/g, ' ')
    .replaceAll('currentColor', 'url(#brand)')
    .trim()

const renderGradientFeatureIcon = (iconName) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><defs>${brandGradient}</defs><g fill="none" stroke="url(#brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${readLucideIconShapesInBrandGradient(iconName)}</g></svg>\n`

const renderLogo = (color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${color}">${logoShapes}</svg>\n`

const renderFavicon = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="3 3 18 18"><style>path,rect{fill:${logoColorByColorScheme.light}}@media (prefers-color-scheme:dark){path,rect{fill:${logoColorByColorScheme.dark}}}</style>${logoShapes}</svg>\n`

mkdirSync(brandAssetsDir, { recursive: true })
mkdirSync(path.dirname(faviconPath), { recursive: true })
writeFileSync(faviconPath, renderFavicon())
for (const [colorScheme, color] of Object.entries(logoColorByColorScheme)) {
  writeFileSync(path.join(brandAssetsDir, `logo-${colorScheme}.svg`), renderLogo(color))
}
for (const [featureName, iconName] of Object.entries(lucideIconByFeatureName)) {
  writeFileSync(path.join(brandAssetsDir, `${featureName}.svg`), renderGradientFeatureIcon(iconName))
}
