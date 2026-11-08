import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const brandAssetsDir = fileURLToPath(new URL('../../../.github/assets/icons', import.meta.url))
const faviconPath = fileURLToPath(new URL('../public/favicon.svg', import.meta.url))

const logoColorByColorScheme = { dark: '#fafafa', light: '#18181b' }
const logoShapes =
  '<path d="M18.378 6.319c.756.188 1.215.954 1.027 1.709l-2.511 10.072c-.155.62-.698 1.041-1.305 1.068.168-.389.261-.818.261-1.268V6.1c0-.142-.009-.281-.027-.418Z" opacity=".45"/><rect x="4.25" y="4.5" width="10" height="15" rx="1.6"/>'

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
