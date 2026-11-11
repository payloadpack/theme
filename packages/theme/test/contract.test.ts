import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { RADIO_CARDS, SWITCH, VERTICAL_TABS } from '../src/index.js'

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

const SCOPE_SELECTOR_BY_STYLESHEET: Record<string, string> = {
  'characters/enhanced/enhanced.css': "html[data-character='enhanced']",
  'characters/payload/payload.css': "html[data-character='payload']",
  'characters/shared.css': "html:is([data-character='enhanced'], [data-character='studio'])",
  'characters/studio/studio.css': "html[data-character='studio']",
  'palettes/accent.css': ":where([data-palette]:not([data-palette='payload']))",
  'options/density.css': "html[data-density='comfortable']",
  'options/font.css': 'html[data-font]',
  'options/frame.css': "html[data-frame='boxed']",
  'options/icons.css': "html[data-icons='lucide']",
  'options/motion.css': "html[data-motion='auto']",
  'options/nav-icons.css': "html:is([data-icons='lucide'], [data-nav='rail'])",
  'options/nav.css': "html[data-nav='rail']",
  'options/radius.css': 'html[data-radius]',
  'palettes/palette.css': ":where([data-palette]:not([data-palette='payload']))",
  'palettes/warm.css': "[data-palette='warm']",
  'palettes/neutral.css': "[data-palette='neutral']",
  'palettes/soft.css': "[data-palette='soft']",
  'styles/appearance-panel.css': '.payloadpack-appearance-panel',
  'styles/rail.css': 'html[data-rail]',
  'styles/nav-bar.css': '.payloadpack-nav-bar',
  'styles/fields/radio-cards.css': `.${RADIO_CARDS}`,
  'styles/fields/switch.css': `.${SWITCH}`,
  'styles/fields/vertical-tabs.css': `.${VERTICAL_TABS}`
}

const PALETTE_FILES = ['palettes/neutral.css', 'palettes/soft.css', 'palettes/warm.css']

const KEPT_PAYLOAD_ICONS = ['dots', 'error', 'eye', 'minimize-maximize', 'sort', 'spinner', 'success']

const BUILT_AT_RUNTIME: Record<string, { file: string; snippets: string[] }> = {
  'action-duplicate-locales': {
    file: 'elements/DuplicateDocument/index.js',
    snippets: ['`action-duplicate${isDuplicateByLocaleEnabled ? `-locales`']
  },
  'copy-locale-data__button': {
    file: 'elements/CopyLocaleData/index.js',
    snippets: ["const baseClass = 'copy-locale-data'", 'id: `${baseClass}__button`']
  },
  'nav-group__label': {
    file: 'elements/NavGroup/index.js',
    snippets: ["const baseClass = 'nav-group'", 'className: `${baseClass}__label`']
  },
  'nav__link-label': {
    file: 'elements/Nav/index.client.js',
    snippets: ["const baseClass = 'nav'", 'className: `${baseClass}__link-label`']
  },
  'popup--side-left': {
    file: 'elements/Popup/index.js',
    snippets: ["const baseClass = 'popup'", "horizontalAlignProp === 'left' ? 'left'", '`${baseClass}--side-${resolvedSide}`']
  },
  'popup--side-right': {
    file: 'elements/Popup/index.js',
    snippets: ["const baseClass = 'popup'", ": 'right'", '`${baseClass}--side-${resolvedSide}`']
  },
  'popup--v-top': {
    file: 'elements/Popup/index.js',
    snippets: ["const baseClass = 'popup'", '`${baseClass}--v-top`']
  }
}

const HARD_CODED_BY_PAYLOAD = [
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
    file: 'views/Edit/Auth/index.css',
    selector: '.auth-fields .field-type.api-key input',
    declaration: 'min-height: var(--spacer-5);'
  },
  {
    file: 'views/Edit/Auth/index.css',
    selector: '.auth-fields .field-type.api-key .api-key__input-wrap--has-regenerate input',
    declaration: 'padding-right: calc(var(--spacer-5) * 2);'
  },
  {
    file: 'views/Edit/Auth/index.css',
    selector: '.api-key__regenerate-button.btn',
    declaration: 'width: var(--spacer-5); min-height: var(--spacer-5);'
  },
  {
    file: 'views/Edit/Auth/index.css',
    selector: '.api-key__visibility-button--with-regenerate.btn',
    declaration: 'right: var(--spacer-5);'
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
  { file: 'icons/Dots/index.css', selector: '.dots', declaration: 'height: var(--spacer-4);' },
  {
    file: 'elements/FileManager/FileToolbar/index.css',
    selector: '.file-toolbar__filename-btn',
    declaration: 'padding: var(--spacer-1) var(--spacer-2);'
  },
  { file: 'elements/ListSelection/index.css', selector: '.list-selection', declaration: 'padding-block: var(--spacer-1);' },
  {
    file: 'elements/ColumnSelection/Popup.css',
    selector: '.column-selector__search',
    declaration: 'height: calc(var(--spacer-5) + var(--spacer-2) + var(--stroke-width-small));'
  },
  {
    file: 'elements/ColumnSelection/Popup.css',
    selector: '.column-selector__search-bar',
    declaration: 'height: var(--spacer-4);'
  },
  {
    file: 'elements/Combobox/index.css',
    selector: '.combobox__search',
    declaration: 'height: calc(var(--spacer-5) + var(--spacer-2) + var(--stroke-width-small));'
  },
  { file: 'elements/Combobox/index.css', selector: '.combobox__search-bar', declaration: 'height: var(--spacer-4);' },
  { file: 'elements/ItemsDrawer/ItemSearch/index.css', selector: '.item-search__input', declaration: 'height: var(--spacer-4);' },
  { file: 'elements/GroupBy/Popup.css', selector: '.group-by-control__label', declaration: 'height: var(--spacer-4);' },
  {
    file: 'elements/GroupBy/Popup.css',
    selector: '.group-by-control__select-trigger',
    declaration: 'min-height: var(--spacer-4);'
  },
  { file: 'elements/GroupBy/Popup.css', selector: '.group-by-control__header', declaration: 'height: var(--spacer-6);' },
  { file: 'elements/DatePicker/index.css', selector: '.react-datepicker__year-select', declaration: 'height: var(--spacer-4);' },
  {
    file: 'elements/PillSelector/index.css',
    selector: '.pill-selector',
    declaration: 'padding: var(--spacer-4); gap: var(--spacer-2-5);'
  },
  {
    file: 'elements/LivePreview/Toolbar/SizeInput/index.css',
    selector: '.toolbar-input .form-input',
    declaration: 'width: calc(var(--spacer-4) * 2);'
  },
  {
    file: 'elements/LivePreview/Toolbar/index.css',
    selector: '.live-preview-toolbar',
    declaration: 'max-height: var(--spacer-6);'
  },
  {
    file: 'elements/SidebarRow/index.css',
    selector: '.sidebar-row-wrapper > .sidebar-row',
    declaration: 'padding-inline: calc(var(--spacer-3) + var(--spacer-1));'
  },
  {
    file: 'elements/SidebarRow/index.css',
    selector: '.sidebar-row-wrapper > .sidebar-row',
    declaration: "&::before { content: ''; position: absolute; inset-block: var(--spacer-1);"
  }
]

const READ_BY_DESCENDANTS: Record<string, string[]> = {
  '--button-height': ['.btn--size-medium', '.sidebar-tabs__tab'],
  '--color-bg-hover': ['.sidebar-toggle'],
  '--color-bg-pressed': ['.sidebar-toggle'],
  '--content-editable-padding-block-start': ['.LexicalEditorTheme__placeholder'],
  '--elevation-400-menu-panel': ['.payload-toast-item'],
  '--lexical-h4-font-size': ['.LexicalEditorTheme__h4'],
  '--lexical-h5-font-size': ['.LexicalEditorTheme__h5'],
  '--lexical-h6-font-size': ['.LexicalEditorTheme__h6'],
  '--normal-text': ['[data-sonner-toast]'],
  '--popup-item-bg-hover': ['.popup-button-list__button'],
  '--popup-item-color-hover': ['.popup-button-list__button']
}

const READ_BY_THEME = ['--elevation-400-menu-panel']

const COPIED_FROM_PAYLOAD = [
  {
    token: '--elevation-500-modal-window',
    value: '0 0 0.5px 0 rgba(0, 0, 0, 0.08), 0 10px 24px 0 rgba(0, 0, 0, 0.18), 0 2px 5px 0 rgba(0, 0, 0, 0.15)'
  },
  {
    token: '--elevation-500-modal-window',
    value: '0 10px 24px 0 rgba(0, 0, 0, 0.45), 0 3px 5px 0 rgba(0, 0, 0, 0.35)'
  },
  { token: '--field-color-bg', value: 'var(--color-bg)' },
  { token: '--radius-medium', value: '0.3125rem' },
  { token: '--radius-large', value: '0.8125rem' }
]

const readUtf8 = (file: string) => readFileSync(file, 'utf8')
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const collapseWhitespace = (text: string) => text.replace(/\s+/g, ' ')

const listFiles = (dir: string, extension: string) =>
  (readdirSync(dir, { recursive: true }) as string[])
    .filter((file) => file.endsWith(extension))
    .map((file) => path.join(dir, file))

const payloadCssFiles = [...listFiles(uiDist, '.css'), ...listFiles(lexicalDist, '.css'), sonnerCss]
const payloadCss = payloadCssFiles.map(readUtf8).join('\n')
const payloadSource = [payloadCss, ...[...listFiles(uiDist, '.js'), ...listFiles(lexicalDist, '.js')].map(readUtf8)].join('\n')

const themeCss = Object.fromEntries(
  Object.keys(SCOPE_SELECTOR_BY_STYLESHEET).map((file) => [file, stripComments(readUtf8(path.join(sourceDir, file)))])
)
const allThemeCss = Object.values(themeCss).join('\n')

const uniqueSorted = (values: string[]) => [...new Set(values)].sort()
const uniqueFirstCaptureGroups = (text: string, pattern: RegExp) =>
  uniqueSorted([...text.matchAll(pattern)].map((match) => match[1]))

const declaredProperties = (css: string) => uniqueFirstCaptureGroups(css, /(?<![\w-])(--[\w-]+)\s*:/g)
const referencedProperties = (css: string) => uniqueFirstCaptureGroups(css, /var\(\s*(--[\w-]+)/g)
const optionalProperties = (css: string) => uniqueFirstCaptureGroups(css, /var\(\s*(--payloadpack-[\w-]+)\s*,/g)
const documentedTokens = uniqueFirstCaptureGroups(
  readUtf8(path.join(root, '../../apps/docs/src/content/docs/customize.md')),
  /^\| `(--payloadpack-[\w-]+)`/gm
)
const collapseWhitespaceAndParenthesisPadding = (css: string) =>
  collapseWhitespace(css).replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
const isRootScopedSelector = (selector: string, scope: string) =>
  selector
    .replace('@layer payload', '')
    .replace(scope, '')
    .replace(/@media\s*\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '[]')
    .replace(/\([^()]*\)/g, '()')
    .split(/[\s,]+/)
    .every((part) => part === '' || part.startsWith('&'))
const listSelectors = (css: string) =>
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
        outside += css.slice(preludeStart, index).split(';').slice(0, -1).join(';')
        blocks.push({ body: '', prelude: css.slice(preludeStart, index).split(';').pop()!.trim() })
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

const flattenRules = (css: string, parent = ''): { declarations: string; properties: string[]; selector: string }[] =>
  topLevelBlocks(css).blocks.flatMap((block) => {
    const selector = `${parent} ${block.prelude}`.trim()
    const declarations = block.body.replace(/[^{};]*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '')
    const properties = uniqueFirstCaptureGroups(declarations, /(?:^|;)\s*([\w-]+)\s*:/g)
    return [{ declarations, properties, selector }, ...flattenRules(block.body, selector)]
  })

const findRuleBody = (css: string, selector: string) => {
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
  return collapseWhitespace(css.slice(open + 1, index - 1))
}

const hasClass = (selector: string, name: string) => new RegExp(`\\.${name}(?![\\w-])`).test(selector)

const selectorSubject = (selector: string) =>
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

const existsInPayload = (name: string) => {
  const runtime = BUILT_AT_RUNTIME[name]
  if (runtime) {
    const source = readUtf8(path.join(uiDist, runtime.file))
    return runtime.snippets.every((snippet) => source.includes(snippet))
  }
  return new RegExp(`(?<![\\w-])${name.replace(/[-]/g, '\\-')}(?![\\w-])`).test(payloadSource)
}

describe('theme contract with Payload', () => {
  it('loads every stylesheet through styles/index.css', () => {
    const stylesheets = listFiles(sourceDir, '.css').map((file) => path.relative(sourceDir, file))
    const imported = uniqueFirstCaptureGroups(readUtf8(path.join(stylesDir, 'index.css')), /@import '(.+?)'/g).map((file) =>
      path.relative(sourceDir, path.resolve(stylesDir, file))
    )
    expect(uniqueSorted(imported)).toEqual(uniqueSorted(stylesheets.filter((file) => file !== 'styles/index.css')))
    expect(uniqueSorted(Object.keys(SCOPE_SELECTOR_BY_STYLESHEET))).toEqual(uniqueSorted(imported))
  })

  it('imports styles/index.css in the server provider and no CSS in client modules', () => {
    const cssImports = (file: string) => uniqueFirstCaptureGroups(readUtf8(file), /^import '(.+\.css)'/gm)
    const clientModulesWithCss = [...listFiles(sourceDir, '.ts'), ...listFiles(sourceDir, '.tsx')]
      .filter((file) => readUtf8(file).startsWith("'use client'") && cssImports(file).length > 0)
      .map((file) => path.relative(sourceDir, file))

    expect(cssImports(path.join(sourceDir, 'components/appearance-server-provider.tsx'))).toEqual(['../styles/index.css'])
    expect(clientModulesWithCss).toEqual([])
  })

  it('wraps every stylesheet in @layer payload with a single scope block', () => {
    for (const [file, scope] of Object.entries(SCOPE_SELECTOR_BY_STYLESHEET)) {
      const layer = topLevelBlocks(themeCss[file])
      const blocks = layer.blocks.filter((block) => !/^@property --payloadpack-[\w-]+$/.test(block.prelude))
      expect(layer.outside, `${file} has CSS outside @layer payload`).toBe('')
      expect(
        blocks.map((block) => block.prelude),
        file
      ).toEqual(['@layer payload'])

      const scoped = topLevelBlocks(blocks[0].body)
      expect(scoped.outside, `${file} has CSS outside ${scope}`).toBe('')
      expect(
        scoped.blocks.map((block) => block.prelude),
        file
      ).toEqual([scope])
    }
  })

  it('keeps Payload CSS in a layer below ours', () => {
    expect(readUtf8(path.join(uiDist, 'layouts/Root/DocumentRoot.js'))).toContain('@layer payload-default, payload;')
  })

  it('overrides only tokens that Payload still declares or reads', () => {
    const payloadTokens = new Set([...declaredProperties(payloadCss), ...referencedProperties(payloadCss)])
    const overridden = declaredProperties(allThemeCss).filter((token) => !token.startsWith('--payloadpack-'))
    expect(overridden.filter((token) => !payloadTokens.has(token))).toEqual([])
  })

  it('remaps only tokens that are still read where the theme sets them', () => {
    const payloadRules = payloadCssFiles.flatMap((file) => flattenRules(stripComments(readUtf8(file))))
    const themeRules = flattenRules(allThemeCss)
    const readsOn = (fragment: string, token: string) => {
      const pattern = new RegExp(`${fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`)
      const readers = READ_BY_THEME.includes(token) ? [...payloadRules, ...themeRules] : payloadRules
      return readers.some((rule) => pattern.test(rule.selector) && referencedProperties(rule.declarations).includes(token))
    }
    const readAnywhere = (token: string) =>
      [...payloadRules, ...themeRules].some((rule) => referencedProperties(rule.declarations).includes(token))
    const unread = themeRules.flatMap((rule) => {
      const classes = uniqueFirstCaptureGroups(selectorSubject(rule.selector), /\.([_a-zA-Z][\w-]*)/g).filter(
        (name) => !name.startsWith('payloadpack-')
      )
      const element = uniqueSorted(classes.flatMap((name) => [name, name.replace(/--.*$/, '')])).map((name) => `.${name}`)
      const isRead = (token: string) =>
        element.length === 0
          ? readAnywhere(token)
          : element.some((fragment) => readsOn(fragment, token)) ||
            (READ_BY_DESCENDANTS[token]?.every((fragment) => readsOn(fragment, token)) ?? false)
      return rule.properties
        .filter((token) => token.startsWith('--') && !token.startsWith('--payloadpack-') && !isRead(token))
        .map((token) => `${element[0] ?? 'root'} ${token}`)
    })
    expect(uniqueSorted(unread)).toEqual([])
  })

  it('reads only tokens that Payload or the plugin declares', () => {
    const setByPayloadScripts = ['--caret-left']
    const known = new Set([
      ...declaredProperties(payloadCss),
      ...referencedProperties(payloadCss),
      ...declaredProperties(allThemeCss),
      ...setByPayloadScripts
    ])
    expect(referencedProperties(allThemeCss).filter((token) => !known.has(token) && !documentedTokens.includes(token))).toEqual(
      []
    )
  })

  it('documents every token a user can set, and only those', () => {
    const internal = new Set(
      Object.keys(themeCss)
        .filter((file) => !PALETTE_FILES.includes(file))
        .flatMap((file) => declaredProperties(themeCss[file]))
    )
    const settable = uniqueSorted([
      ...optionalProperties(allThemeCss).filter((token) => !internal.has(token)),
      ...PALETTE_FILES.flatMap((file) => declaredProperties(themeCss[file])),
      ...declaredProperties(themeCss['options/motion.css']).filter((token) => token.startsWith('--payloadpack-motion-'))
    ])
    const onScopeRoot = uniqueSorted(
      Object.entries(SCOPE_SELECTOR_BY_STYLESHEET).flatMap(([file, scope]) =>
        flattenRules(themeCss[file])
          .filter((rule) => isRootScopedSelector(rule.selector, scope))
          .flatMap((rule) => rule.properties)
      )
    )
    expect(
      documentedTokens.filter((token) => !referencedProperties(allThemeCss).includes(token)),
      'documented but unused'
    ).toEqual([])
    expect(
      documentedTokens.filter((token) => !settable.includes(token) && !onScopeRoot.includes(token)),
      'documented without a default a user can override'
    ).toEqual([])
    expect(
      settable.filter((token) => !documentedTokens.includes(token)),
      'settable but undocumented'
    ).toEqual([])
    const belowRoot = flattenRules(themeCss['palettes/palette.css'])
      .filter((rule) => !isRootScopedSelector(rule.selector, SCOPE_SELECTOR_BY_STYLESHEET['palettes/palette.css']))
      .flatMap((rule) => rule.properties)
    expect(
      documentedTokens.filter((token) => belowRoot.includes(token)),
      'sheet token declared below the palette root'
    ).toEqual([])
  })

  it('has every palette set its background, surface and text for both modes, and its primary', () => {
    const required = {
      dark: ['--payloadpack-bg-app', '--payloadpack-bg-surface', '--payloadpack-text-primary'],
      light: ['--payloadpack-action-primary', '--payloadpack-bg-app', '--payloadpack-bg-surface', '--payloadpack-text-primary']
    }
    const missing = PALETTE_FILES.flatMap((file) => {
      const [light, dark] = flattenRules(themeCss[file]).filter((rule) => rule.selector.includes('[data-palette='))
      return [
        ...required.light.filter((token) => !light.properties.includes(token)).map((token) => `${file} light ${token}`),
        ...required.dark.filter((token) => !dark.properties.includes(token)).map((token) => `${file} dark ${token}`)
      ]
    })
    expect(missing).toEqual([])
  })

  it('sets each Payload token on the palette root from one stylesheet only', () => {
    const owners = new Map<string, string[]>()
    for (const file of Object.keys(themeCss).filter((name) => name.startsWith('palettes/'))) {
      const tokens = flattenRules(themeCss[file])
        .filter((rule) => isRootScopedSelector(rule.selector, SCOPE_SELECTOR_BY_STYLESHEET[file]))
        .flatMap((rule) => rule.properties)
        .filter((name) => name.startsWith('--') && !name.startsWith('--payloadpack-'))
      for (const token of uniqueSorted(tokens)) {
        owners.set(token, [...(owners.get(token) ?? []), file])
      }
    }
    expect([...owners].filter(([, files]) => files.length > 1).map(([token, files]) => `${token}: ${files.join(', ')}`)).toEqual(
      []
    )
  })

  it('lets palettes set only their own tokens', () => {
    expect(
      PALETTE_FILES.flatMap((file) => declaredProperties(themeCss[file])).filter((token) => !token.startsWith('--payloadpack-'))
    ).toEqual([])
  })

  it('gives every light color a palette sets a dark value, so it never leaks into dark mode', () => {
    const declarations = (text: string) =>
      Object.fromEntries([...text.matchAll(/(?:^|;)\s*(--[\w-]+)\s*:([^;]*)/g)].map(([, token, value]) => [token, value.trim()]))
    const leaks = PALETTE_FILES.flatMap((file) => {
      const [light, dark] = flattenRules(themeCss[file])
        .filter((rule) => rule.selector.includes('[data-palette='))
        .map((rule) => declarations(rule.declarations))
      return Object.entries(light)
        .filter(
          ([token, value]) =>
            token !== '--payloadpack-accent' &&
            /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|oklab|oklch|color-mix)\(/i.test(value) &&
            !(token in dark)
        )
        .map(([token]) => `${file}: ${token}`)
    })
    expect(leaks).toEqual([])
  })

  it('keeps every duration and easing in the motion tokens', () => {
    const timing =
      /(?<![\w.-])(?:\d*\.)?\d+m?s(?![\w-])|(?<![\w-])(?:ease(?:-in|-out|-in-out)?|linear|step-start|step-end)(?![\w-])|(?:cubic-bezier|steps|linear)\(/
    const loose = Object.entries(themeCss).flatMap(([file, css]) =>
      flattenRules(css).flatMap(({ declarations }) =>
        [...declarations.matchAll(/(?:^|;)\s*([\w-]+)\s*:([^;]*)/g)]
          .filter(([, property, value]) => timing.test(value.replace(/(?<![\w.])0s/g, '')))
          .filter(([, property]) => !(file === 'options/motion.css' && /^--payloadpack-(?:duration|ease|motion)-/.test(property)))
          .map(([, property, value]) => `${file}: ${property}: ${value.trim()}`)
      )
    )
    expect(uniqueSorted(loose)).toEqual([])
  })

  it('gives every relative color a fallback for browsers without relative colors', () => {
    const missing = Object.entries(themeCss).flatMap(([file, css]) => {
      const [enhanced, fallback = ''] = stripComments(css).split('@supports not (color: oklch(from red l c h))')
      return uniqueFirstCaptureGroups(enhanced, /(--[\w-]+):[^;]*\b(?:oklch|rgb)\(from /g)
        .filter((property) => !fallback.includes(`${property}:`))
        .map((property) => `${file}: ${property}`)
    })
    expect(missing).toEqual([])
  })

  it('uses no anchor positioning, which the supported browsers lack', () => {
    expect(Object.keys(themeCss).filter((file) => /anchor|position-area/.test(stripComments(themeCss[file])))).toEqual([])
  })

  it('falls back to the step Payload maps each color to in each mode', () => {
    const colors = readUtf8(path.join(uiDist, 'css/colors.css'))
    const palette = themeCss['palettes/palette.css']
    const blocks = [
      { payload: ':root', theme: "&:not([data-theme='dark'])" },
      { payload: "[data-theme='dark']", theme: "&[data-theme='dark']" }
    ]
    const mappings = blocks.flatMap(({ payload, theme }) => {
      const block = collapseWhitespaceAndParenthesisPadding(findRuleBody(palette, theme) ?? '')
      return [
        ...[...block.matchAll(/(--color-[\w-]+): var\(--payloadpack-[\w-]+, (var\(--ramp-[\w-]+\))\);/g)].map(
          ([, token, ramp]) => ({ mapping: `${token}: ${ramp};`, payload })
        ),
        ...[...block.matchAll(/(--ramp-[\w-]+): var\(--payloadpack-bg-subtle,/g)].map(([, ramp]) => ({
          mapping: `--color-bg-secondary: var(${ramp});`,
          payload
        }))
      ]
    })
    expect(mappings).toHaveLength(10)
    expect(
      mappings.filter(
        ({ mapping, payload }) => !collapseWhitespaceAndParenthesisPadding(findRuleBody(colors, payload) ?? '').includes(mapping)
      )
    ).toEqual([])
  })

  it("keeps Payload's enhanced-contrast value for every color the mode blocks remap", () => {
    const declarations = (body: string) =>
      Object.fromEntries(
        [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, token, value]) => [token, collapseWhitespace(value.trim())])
      )
    const contrast = flattenRules(stripComments(readUtf8(path.join(uiDist, 'css/colors.css')))).filter((rule) =>
      rule.selector.includes('html[data-enhanced-contrast]')
    )
    const palette = themeCss['palettes/palette.css']
    expect(contrast.length).toBeGreaterThan(0)
    const blocks = {
      dark: ["&[data-theme='dark']", "&[data-enhanced-contrast][data-theme='dark']"],
      light: ["&:not([data-theme='dark'])", "&[data-enhanced-contrast]:not([data-theme='dark'])"]
    }
    const lost = (['light', 'dark'] as const).flatMap((mode) => {
      const payload = Object.assign(
        {},
        ...contrast
          .filter(
            (rule) => !/\[data-theme='(?:light|dark)'\]/.test(rule.selector) || rule.selector.includes(`[data-theme='${mode}']`)
          )
          .map((rule) => declarations(rule.declarations))
      )
      const remapped = Object.keys(declarations(findRuleBody(palette, blocks[mode][0]) ?? ''))
      const theme = declarations(findRuleBody(palette, blocks[mode][1]) ?? '')
      expect(remapped.length, mode).toBeGreaterThan(0)
      expect(Object.keys(theme).length, mode).toBeGreaterThan(0)
      return remapped.filter((token) => token in payload && theme[token] !== payload[token]).map((token) => `${mode} ${token}`)
    })
    expect(lost).toEqual([])
  })

  it.each(COPIED_FROM_PAYLOAD)("falls back to Payload's own $token where the theme takes it over", ({ token, value }) => {
    expect(collapseWhitespaceAndParenthesisPadding(payloadCss), `${token} changed upstream, update the fallback`).toContain(
      `${token}: ${value};`
    )
    expect(collapseWhitespaceAndParenthesisPadding(allThemeCss)).toMatch(
      new RegExp(`${token}: var\\(--payloadpack-[\\w-]+, ${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\);`)
    )
  })

  it('lets nested themes inherit every token Payload pins on them, and maps the palette on the root only', () => {
    const payloadRules = payloadCssFiles.flatMap((file) => flattenRules(stripComments(readUtf8(file))))
    const readers = [...payloadRules, ...flattenRules(allThemeCss)]
    const pinned = uniqueSorted(
      payloadRules
        .filter((rule) =>
          rule.selector
            .replace(/@layer [\w-]+/g, '')
            .split(',')
            .some((part) => /(^|[\s>+~])\[data-theme/.test(part.trim()))
        )
        .flatMap((rule) => rule.properties)
        .filter((property) => property.startsWith('--'))
        .filter((token) => readers.some((rule) => referencedProperties(rule.declarations).includes(token)))
    )
    const palette = themeCss['palettes/palette.css']
    const nested = flattenRules(palette).filter((rule) =>
      /(^|[\s>+~,])\[data-theme/.test(
        rule.selector.replace('@layer payload', '').replace(SCOPE_SELECTOR_BY_STYLESHEET['palettes/palette.css'], '')
      )
    )
    expect(pinned.length).toBeGreaterThan(100)
    expect(nested).toHaveLength(1)
    expect(nested[0].selector).toContain('[data-theme]:not([data-palette])')
    expect(nested[0].properties).toEqual(pinned)
  })

  it("falls back to Payload's own blue steps for a palette without an accent", () => {
    const tokens = readUtf8(path.join(uiDist, 'css/design-tokens.css'))
    const fallbacks = [...themeCss['palettes/accent.css'].matchAll(/(--ramp-[\w-]+):\s*var\(--[\w-]+,\s*(#[\da-f]+)\)/g)]

    expect(fallbacks).toHaveLength(12)
    for (const [, token, fallback] of fallbacks) {
      expect(tokens).toContain(`${token}: ${fallback};`)
    }
  })

  it('remaps every blue step Payload reads from the accent', () => {
    expect(declaredProperties(themeCss['palettes/accent.css']).filter((token) => token.startsWith('--ramp-'))).toEqual(
      referencedProperties(payloadCss).filter((token) => /^--ramp-(?:pale-)?blue-/.test(token))
    )
  })

  it('keeps every color out of characters and options', () => {
    const paletteTokens = new Set(
      Object.keys(themeCss)
        .filter((file) => file.startsWith('palettes/'))
        .flatMap((file) => declaredProperties(themeCss[file]))
    )
    const colorTokens = new Set([
      ...['css/colors.css', 'css/design-tokens.css'].flatMap((file) => declaredProperties(readUtf8(path.join(uiDist, file)))),
      ...paletteTokens
    ])
    const literal =
      /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(|(?<![\w-])(?:transparent|white|black)(?![\w-])/i
    const colorProperty =
      /^(?:color|background(?:-color)?|border(?:-[a-z]+)*-color|outline-color|fill|stroke|caret-color|accent-color)$/
    const aliasesColor = (value: string) => colorTokens.has(value.match(/^\s*var\(\s*(--[\w-]+)\s*\)\s*$/)?.[1] ?? '')
    const setsColor = (property: string, value: string) =>
      literal.test(value) ||
      colorTokens.has(property) ||
      (colorProperty.test(property) && referencedProperties(value).some((token) => colorTokens.has(token))) ||
      (property.startsWith('--') && aliasesColor(value)) ||
      referencedProperties(value).some((token) => token.startsWith('--payloadpack-') && paletteTokens.has(token))

    const colored = Object.keys(themeCss)
      .filter((file) => /^(?:characters|options)\//.test(file))
      .flatMap((file) =>
        flattenRules(themeCss[file]).flatMap(({ declarations }) =>
          [...declarations.matchAll(/(?:^|;)\s*([\w-]+)\s*:([^;]*)/g)]
            .filter(([, property, value]) => setsColor(property, value))
            .map(([, property, value]) => `${file}: ${property}: ${value.trim()}`)
        )
      )
    expect(uniqueSorted(colored)).toEqual([])
  })

  it('targets only classes and ids that Payload still renders', () => {
    const selectorText = listSelectors(allThemeCss)
    const classes = uniqueFirstCaptureGroups(selectorText, /\.(-?[_a-zA-Z][\w-]*)/g)
    const ids = uniqueFirstCaptureGroups(selectorText, /#([\w-]+)/g)
    expect([...classes, ...ids].filter((name) => !name.startsWith('payloadpack-') && !existsInPayload(name))).toEqual([])
  })

  it('is never outranked by unlayered Payload rules on the properties it sets', () => {
    const pseudoElement = (selector: string) => selector.match(/::[\w-]+$/)?.[0] ?? ''
    const classes = (selector: string) => uniqueFirstCaptureGroups(selector, /\.(-?[_a-zA-Z][\w-]*)/g)
    const styledClasses = (selector: string) =>
      classes(selectorSubject(selector)).length
        ? classes(selectorSubject(selector))
        : classes(selector.replace(/\[[^\]]*\]/g, ''))
    const ours = flattenRules(allThemeCss)
    const conflicts = payloadCssFiles.flatMap((file) =>
      topLevelBlocks(stripComments(readUtf8(file)))
        .blocks.filter((block) => !/^@(layer|property|keyframes|font-face)\b/.test(block.prelude))
        .flatMap((block) => flattenRules(`${block.prelude}{${block.body}}`))
        .flatMap((theirs) =>
          ours
            .filter((mine) => pseudoElement(mine.selector) === pseudoElement(theirs.selector))
            .flatMap((mine) =>
              styledClasses(mine.selector)
                .filter((name) => name !== 'icon' && hasClass(selectorSubject(theirs.selector), name))
                .flatMap((name) =>
                  mine.properties
                    .filter((property) => theirs.properties.includes(property))
                    .map((property) => `${property} on .${name}: ${theirs.selector} in ${path.relative(root, file)}`)
                )
            )
        )
    )
    expect(uniqueSorted(conflicts)).toEqual([])
  })

  it('maps every Payload icon to Lucide or keeps it on purpose', () => {
    const payloadIcons = uniqueFirstCaptureGroups(
      listFiles(path.join(uiDist, 'icons'), '.js').map(readUtf8).join('\n'),
      /icon--([a-z]+(?:-[a-z]+)*(?:--[a-z]+)?)/g
    )
    const mapped = uniqueFirstCaptureGroups(themeCss['options/icons.css'], /svg\.icon--([a-z-]+)\s*\{\s*--payloadpack-icon:/g)

    expect(
      payloadIcons.filter((icon) => !mapped.includes(icon) && !KEPT_PAYLOAD_ICONS.includes(icon)),
      'unmapped Payload icons'
    ).toEqual([])
    expect(
      mapped.filter((icon) => !payloadIcons.includes(icon)),
      'mapped icons Payload no longer has'
    ).toEqual([])
  })

  it("records Payload's rules for every element the theme styles, so any upstream change shows up", async () => {
    const styled = new Set(
      uniqueFirstCaptureGroups(listSelectors(allThemeCss), /\.(-?[_a-zA-Z][\w-]*)/g).filter(
        (name) => !name.startsWith('payloadpack-')
      )
    )
    const label = (file: string) =>
      file.startsWith(uiDist)
        ? `@payloadcms/ui/${path.relative(uiDist, file)}`
        : file.startsWith(lexicalDist)
          ? `@payloadcms/richtext-lexical/${path.relative(lexicalDist, file)}`
          : 'sonner/dist/styles.css'
    const sections = payloadCssFiles
      .filter((file) => file !== path.join(uiDist, 'styles.css') && !file.endsWith('bundled.css'))
      .flatMap((file) => {
        const touched = flattenRules(stripComments(readUtf8(file))).filter(
          (rule) =>
            rule.declarations.trim() && [...rule.selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].some(([, name]) => styled.has(name))
        )
        return touched.length
          ? [
              [
                `== ${label(file)}`,
                ...touched.map(
                  (rule) =>
                    `${collapseWhitespace(rule.selector.replace(/@layer [\w-]+/g, '')).trim()} { ${collapseWhitespace(rule.declarations).trim()} }`
                )
              ].join('\n')
            ]
          : []
      })
    await expect(`${sections.sort().join('\n\n')}\n`).toMatchFileSnapshot('__snapshots__/payload-rules.txt')
  })

  it.each(HARD_CODED_BY_PAYLOAD)('Payload still hard-codes $selector ($declaration)', ({ declaration, file, selector }) => {
    const css = readUtf8(path.join(uiDist, file))
    expect(findRuleBody(css, selector), `${selector} changed upstream, re-check its fix`).toContain(
      collapseWhitespace(declaration)
    )
  })

  it('Payload still hard-codes the fixed-toolbar editor padding', () => {
    const css = readUtf8(path.join(lexicalDist, 'features/toolbars/fixed/client/Toolbar/index.css'))
    expect(findRuleBody(css, '.fixed-toolbar')).toContain('> .ContentEditable__root { padding-top: var(--spacer-2); }')
  })

  it('Payload still defaults Monaco to the font size the plugin replaces', () => {
    const constants = readUtf8(path.join(uiDist, 'elements/CodeEditor/constants.js'))
    const pluginDefault = readUtf8(path.join(sourceDir, 'hooks/use-monaco-font-size.ts')).match(/PAYLOAD_FONT_SIZE = (\d+)/)?.[1]
    expect(constants).toContain(`fontSize: ${pluginDefault},`)
    expect(constants).toContain('lineHeight: 16,')
  })
  it('references only Lucide icons that lucide-static ships', () => {
    const icons = uniqueFirstCaptureGroups(allThemeCss, /lucide-static\/icons\/([a-z0-9-]+)\.svg/g)
    expect(icons.length).toBeGreaterThan(0)
    expect(icons.filter((icon) => !existsSync(path.join(lucideIcons, `${icon}.svg`)))).toEqual([])
  })
})
