import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { RADIO_CARDS, VERTICAL_TABS } from '../src/index.js'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const packageRoot = (name: string) => {
  for (let dir = root; dir !== path.dirname(dir); dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', name)
    if (existsSync(candidate)) {
      return realpathSync(candidate)
    }
  }
  throw new Error(`${name} is not installed`)
}

const sourceDir = path.join(root, 'src')
const stylesDir = path.join(sourceDir, 'styles')
const uiRoot = packageRoot('@payloadcms/ui')
const uiDist = path.join(uiRoot, 'dist')
const sonnerCss = createRequire(path.join(uiRoot, 'package.json')).resolve('sonner/dist/styles.css')
const lexicalDist = path.join(packageRoot('@payloadcms/richtext-lexical'), 'dist')
const lucideIcons = path.join(packageRoot('lucide-static'), 'icons')

const scopes: Record<string, string> = {
  'comfortable.css': "html[data-density='comfortable']",
  'lucide.css': "html[data-icons='lucide']",
  'neutral.css': "html[data-admin-theme='neutral']",
  'fields/radio-cards.css': `.${RADIO_CARDS}`,
  'fields/vertical-tabs.css': `.${VERTICAL_TABS}`
}

const keptPayloadIcons = ['dots', 'error', 'eye', 'minimize-maximize', 'sort', 'spinner', 'success']

const builtAtRuntime: Record<string, { file: string; snippets: string[] }> = {
  'action-duplicate-locales': {
    file: 'elements/DuplicateDocument/index.js',
    snippets: ['`action-duplicate${isDuplicateByLocaleEnabled ? `-locales`']
  },
  'copy-locale-data__button': {
    file: 'elements/CopyLocaleData/index.js',
    snippets: ["const baseClass = 'copy-locale-data'", 'id: `${baseClass}__button`']
  }
}

const hardCodedByPayload = [
  {
    file: 'elements/Collapsible/index.css',
    selector: '.collapsible__toggle-wrap',
    declaration: 'height: var(--spacer-5);'
  },
  {
    file: 'elements/Collapsible/index.css',
    selector: '.collapsible__indicator',
    declaration: 'min-width: var(--spacer-4);'
  },
  {
    file: 'fields/Slug/index.css',
    selector: '.slug-field-component__input',
    declaration: 'padding-inline-end: calc(var(--spacer-5) + var(--spacer-1));'
  },
  {
    file: 'elements/APIKeyInput/index.css',
    selector: '.api-key-input__control',
    declaration: 'min-height: var(--spacer-5);'
  },
  {
    file: 'elements/DatePicker/index.css',
    selector: '.react-datepicker__header__dropdown',
    declaration: 'padding: var(--spacer-2);'
  },
  {
    file: 'elements/Popup/index.css',
    selector: '.popup__scroll-container',
    declaration: 'max-height: min(calc(var(--spacer-5) * 10), calc(100vh - var(--spacer-3)));'
  },
  {
    file: 'fields/Checkbox/index.css',
    selector: '.checkbox-input__input',
    declaration: 'width: var(--spacer-3); height: var(--spacer-3); margin-block: var(--spacer-1);'
  },
  {
    file: 'fields/Checkbox/index.css',
    selector: '.checkbox-input__mixed',
    declaration: 'width: var(--spacer-3); height: var(--spacer-3);'
  },
  {
    file: 'fields/RadioGroup/Radio/index.css',
    selector: '.radio-input__styled-radio',
    declaration: 'width: 1rem; height: 1rem;'
  },
  {
    file: 'fields/RadioGroup/Radio/index.css',
    selector: "input[type='radio']",
    declaration: 'width: 1rem; height: 1rem;'
  },
  {
    file: 'fields/Checkbox/index.css',
    selector: '.checkbox > .field-description',
    declaration: 'padding-inline-start: var(--spacer-4);'
  },
  {
    file: 'fields/Checkbox/index.css',
    selector: '.checkbox-input__tooltip.tooltip--caret-left .tooltip__caret',
    declaration: 'left: 0.5rem;'
  },
  { file: 'elements/ReactSelect/MultiValue/index.css', selector: '.multi-value', declaration: 'height: 1.25rem;' },
  {
    file: 'elements/ErrorPill/index.css',
    selector: '.error-pill--fixed-width',
    declaration: 'width: var(--spacer-3);'
  },
  {
    file: 'elements/SegmentedControl/index.css',
    selector: '.segmented-control__icon',
    declaration: 'width: var(--spacer-4);'
  },
  { file: 'elements/Button/index.css', selector: '.btn--size-large', declaration: 'height: var(--spacer-5, 2rem);' },
  {
    file: 'elements/Button/index.css',
    selector: '.btn--round',
    declaration: '&.btn--size-medium { width: var(--spacer-4); }'
  },
  {
    file: 'elements/Button/index.css',
    selector: '.btn--withPopup',
    declaration: '.popup-button { height: var(--spacer-4, 1.5rem); }'
  },
  { file: 'css/theme.css', selector: ':root', declaration: '--popup-radius: var(--radius-large);' },
  { file: 'elements/Dialog/index.css', selector: '.dialog--small', declaration: '--dialog-width: 280px;' },
  {
    file: 'elements/Dialog/index.css',
    selector: '.dialog__header',
    declaration: 'padding: var(--spacer-2) var(--spacer-3);'
  },
  {
    file: 'elements/Dialog/index.css',
    selector: '.dialog__header--has-close',
    declaration: 'padding-inline-end: var(--spacer-2);'
  },
  { file: 'elements/Dialog/index.css', selector: '.dialog__body', declaration: 'padding: var(--spacer-3);' },
  {
    file: 'elements/Dialog/index.css',
    selector: '.dialog:has(.dialog__header) .dialog__body',
    declaration: 'padding-top: var(--spacer-2);'
  },
  {
    file: 'elements/Dialog/index.css',
    selector: '.dialog:has(.dialog__footer) .dialog__body',
    declaration: 'padding-bottom: var(--spacer-2);'
  },
  {
    file: 'elements/Dialog/index.css',
    selector: '.dialog__footer',
    declaration: 'padding-block: var(--spacer-2); padding-inline-start: var(--spacer-3); padding-inline-end: var(--spacer-2);'
  },
  { file: 'icons/Dots/index.css', selector: '.dots', declaration: 'height: var(--spacer-4);' }
]

const read = (file: string) => readFileSync(file, 'utf8')
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const squash = (text: string) => text.replace(/\s+/g, ' ')

const listFiles = (dir: string, extension: string) =>
  (readdirSync(dir, { recursive: true }) as string[])
    .filter((file) => file.endsWith(extension))
    .map((file) => path.join(dir, file))

const payloadCssFiles = [...listFiles(uiDist, '.css'), ...listFiles(lexicalDist, '.css'), sonnerCss]
const payloadCss = payloadCssFiles.map(read).join('\n')
const payloadSource = [payloadCss, ...[...listFiles(uiDist, '.js'), ...listFiles(lexicalDist, '.js')].map(read)].join('\n')

const themeCss = Object.fromEntries(Object.keys(scopes).map((file) => [file, stripComments(read(path.join(stylesDir, file)))]))
const allThemeCss = Object.values(themeCss).join('\n')

const unique = (values: string[]) => [...new Set(values)].sort()
const matchAll = (text: string, pattern: RegExp) => unique([...text.matchAll(pattern)].map((match) => match[1]))

const declaredProperties = (css: string) => matchAll(css, /(?<![\w-])(--[\w-]+)\s*:/g)
const referencedProperties = (css: string) => matchAll(css, /var\(\s*(--[\w-]+)/g)
const selectors = (css: string) =>
  [...css.matchAll(/([^{};]+)\{/g)]
    .map((match) => match[1].trim())
    .filter((prelude) => !prelude.startsWith('@'))
    .map((prelude) => prelude.replace(/\[[^\]]*\]/g, ''))
    .join('\n')

const topLevelBlocks = (css: string) => {
  const blocks: { body: string; prelude: string }[] = []
  let depth = 0
  let preludeStart = 0
  let bodyStart = 0
  let outside = ''
  for (let index = 0; index < css.length; index++) {
    if (css[index] === '{') {
      if (depth === 0) {
        outside += css.slice(preludeStart, index).replace(/[^{]*$/, '')
        blocks.push({ body: '', prelude: css.slice(preludeStart, index).trim() })
        bodyStart = index + 1
      }
      depth++
    } else if (css[index] === '}') {
      depth--
      if (depth === 0) {
        blocks[blocks.length - 1].body = css.slice(bodyStart, index)
        preludeStart = index + 1
      }
    }
  }
  outside += css.slice(preludeStart)
  return { blocks, outside: outside.trim() }
}

const rules = (css: string, parent = ''): { properties: string[]; selector: string }[] =>
  topLevelBlocks(css).blocks.flatMap((block) => {
    const selector = `${parent} ${block.prelude}`.trim()
    const ownDeclarations = block.body.replace(/[^{};]*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '')
    const properties = matchAll(ownDeclarations, /(?:^|;)\s*([\w-]+)\s*:/g)
    return [{ properties, selector }, ...rules(block.body, selector)]
  })

const ruleBody = (css: string, selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const start = css.search(new RegExp(`(?:^|\\n)[ \\t]*${escaped} \\{`))
  if (start === -1) {
    return null
  }
  const open = css.indexOf('{', start + selector.length)
  let depth = 1
  let index = open + 1
  while (depth > 0 && index < css.length) {
    if (css[index] === '{') depth++
    if (css[index] === '}') depth--
    index++
  }
  return squash(css.slice(open + 1, index - 1))
}

const existsInPayload = (name: string) => {
  const runtime = builtAtRuntime[name]
  if (runtime) {
    const source = read(path.join(uiDist, runtime.file))
    return runtime.snippets.every((snippet) => source.includes(snippet))
  }
  return new RegExp(`(?<![\\w-])${name.replace(/[-]/g, '\\-')}(?![\\w-])`).test(payloadSource)
}

describe('theme contract with Payload', () => {
  it('loads every stylesheet through styles/index.css', () => {
    const stylesheets = listFiles(stylesDir, '.css').map((file) => path.relative(stylesDir, file))
    const imported = matchAll(read(path.join(stylesDir, 'index.css')), /@import '\.\/(.+?)'/g)
    expect(imported).toEqual(unique(stylesheets.filter((file) => file !== 'index.css')))
    expect(unique(Object.keys(scopes))).toEqual(imported)
  })

  it('wraps every stylesheet in @layer payload with a single scope block', () => {
    for (const [file, scope] of Object.entries(scopes)) {
      const layer = topLevelBlocks(themeCss[file])
      expect(layer.outside, `${file} has CSS outside @layer payload`).toBe('')
      expect(
        layer.blocks.map((block) => block.prelude),
        file
      ).toEqual(['@layer payload'])

      const scoped = topLevelBlocks(layer.blocks[0].body)
      expect(scoped.outside, `${file} has CSS outside ${scope}`).toBe('')
      expect(
        scoped.blocks.map((block) => block.prelude),
        file
      ).toEqual([scope])
    }
  })

  it('keeps Payload CSS in a layer below ours', () => {
    expect(read(path.join(uiDist, 'layouts/Root/DocumentRoot.js'))).toContain('@layer payload-default, payload;')
  })

  it('overrides only tokens that Payload still declares', () => {
    const payloadTokens = new Set(declaredProperties(payloadCss))
    const overridden = declaredProperties(allThemeCss).filter((token) => !token.startsWith('--payloadpack-'))
    expect(overridden.filter((token) => !payloadTokens.has(token))).toEqual([])
  })

  it('reads only tokens that Payload or the plugin declares', () => {
    const known = new Set([...declaredProperties(payloadCss), ...declaredProperties(allThemeCss)])
    expect(referencedProperties(allThemeCss).filter((token) => !known.has(token))).toEqual([])
  })

  it('gives light-mode toasts back every dark token Payload pins on the toaster', () => {
    const darkTokens = new Set(
      payloadCssFiles
        .flatMap((file) => rules(stripComments(read(file))))
        .filter((rule) => /\[data-theme=['"]?dark['"]?\]$/.test(rule.selector))
        .flatMap((rule) => rule.properties)
    )
    const toastCss = ['providers/ToastContainer/index.css', 'elements/Toasts/index.css']
      .map((file) => read(path.join(uiDist, file)))
      .join('\n')
    const neutral = themeCss['neutral.css']
    const handled = [
      ...declaredProperties(ruleBody(neutral, "&[data-theme='light'] .payload-toast-container") ?? ''),
      ...declaredProperties(ruleBody(neutral, '.toast-error') ?? '')
    ]
    expect(referencedProperties(toastCss).filter((token) => darkTokens.has(token) && !handled.includes(token))).toEqual([])
  })

  it('targets only classes and ids that Payload still renders', () => {
    const selectorText = selectors(allThemeCss)
    const classes = matchAll(selectorText, /\.(-?[_a-zA-Z][\w-]*)/g)
    const ids = matchAll(selectorText, /#([\w-]+)/g)
    expect([...classes, ...ids].filter((name) => !name.startsWith('payloadpack-') && !existsInPayload(name))).toEqual([])
  })

  it('is never outranked by unlayered Payload rules on the properties it sets', () => {
    const hasClass = (selector: string, name: string) => new RegExp(`\\.${name}(?![\\w-])`).test(selector)
    const pseudoElement = (selector: string) => selector.match(/::[\w-]+$/)?.[0] ?? ''
    const subject = (selector: string) =>
      selector
        .replace(/:(?:not|has)\([^()]*\)|\[[^\]]*\]/g, '')
        .replace(/\s+&/g, '')
        .split(',')
        .map((part) =>
          part
            .trim()
            .split(/\s*[\s>+~]\s*/)
            .pop()
        )
        .join(',')
    const ours = rules(allThemeCss)
    const conflicts = payloadCssFiles.flatMap((file) =>
      topLevelBlocks(stripComments(read(file)))
        .blocks.filter((block) => !/^@(layer|property|keyframes|font-face)\b/.test(block.prelude))
        .flatMap((block) => rules(`${block.prelude}{${block.body}}`))
        .flatMap((theirs) =>
          ours
            .filter((mine) => pseudoElement(mine.selector) === pseudoElement(theirs.selector))
            .flatMap((mine) =>
              matchAll(mine.selector.replace(/\[[^\]]*\]/g, ''), /\.(-?[_a-zA-Z][\w-]*)/g)
                .filter((name) => name !== 'icon' && hasClass(subject(theirs.selector), name))
                .flatMap((name) =>
                  mine.properties
                    .filter((property) => theirs.properties.includes(property))
                    .map((property) => `${property} on .${name}: ${theirs.selector} in ${path.relative(root, file)}`)
                )
            )
        )
    )
    expect(unique(conflicts)).toEqual([])
  })

  it('maps every Payload icon to Lucide or keeps it on purpose', () => {
    const payloadIcons = matchAll(
      listFiles(path.join(uiDist, 'icons'), '.js').map(read).join('\n'),
      /icon--([a-z]+(?:-[a-z]+)*(?:--[a-z]+)?)/g
    )
    const mapped = matchAll(themeCss['lucide.css'], /svg\.icon--([a-z-]+)\s*\{\s*--payloadpack-icon:/g)

    expect(
      payloadIcons.filter((icon) => !mapped.includes(icon) && !keptPayloadIcons.includes(icon)),
      'unmapped Payload icons'
    ).toEqual([])
    expect(
      mapped.filter((icon) => !payloadIcons.includes(icon)),
      'mapped icons Payload no longer has'
    ).toEqual([])
  })

  it.each(hardCodedByPayload)('Payload still hard-codes $selector ($declaration)', ({ declaration, file, selector }) => {
    const css = read(path.join(uiDist, file))
    expect(ruleBody(css, selector), `${selector} changed upstream, re-check its fix in comfortable.css`).toContain(
      squash(declaration)
    )
  })

  it('Payload still hard-codes the fixed-toolbar editor padding', () => {
    const css = read(path.join(lexicalDist, 'features/toolbars/fixed/client/Toolbar/index.css'))
    expect(ruleBody(css, '.fixed-toolbar')).toContain('> .ContentEditable__root { padding-top: var(--spacer-2); }')
  })

  it('Payload still defaults Monaco to the font size the plugin replaces', () => {
    const constants = read(path.join(uiDist, 'elements/CodeEditor/constants.js'))
    const pluginDefault = read(path.join(sourceDir, 'hooks/use-monaco-font-size.ts')).match(/PAYLOAD_FONT_SIZE = (\d+)/)?.[1]
    expect(constants).toContain(`fontSize: ${pluginDefault},`)
    expect(constants).toContain('lineHeight: 16,')
  })
  it('references only Lucide icons that lucide-static ships', () => {
    const icons = matchAll(themeCss['lucide.css'], /lucide-static\/icons\/([a-z0-9-]+)\.svg/g)
    expect(icons.length).toBeGreaterThan(0)
    expect(icons.filter((icon) => !existsSync(path.join(lucideIcons, `${icon}.svg`)))).toEqual([])
  })
})
