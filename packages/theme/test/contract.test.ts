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

const scopes: Record<string, string> = {
  'characters/enhanced/enhanced.css': "html[data-character='enhanced']",
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
  'styles/fields/radio-cards.css': `.${RADIO_CARDS}`,
  'styles/fields/switch.css': `.${SWITCH}`,
  'styles/fields/vertical-tabs.css': `.${VERTICAL_TABS}`
}

const paletteFiles = ['palettes/neutral.css', 'palettes/soft.css', 'palettes/warm.css']

const keptPayloadIcons = ['dots', 'error', 'eye', 'minimize-maximize', 'sort', 'spinner', 'success']

const builtAtRuntime: Record<string, { file: string; snippets: string[] }> = {
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
  }
]

const readByDescendants: Record<string, string[]> = {
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

const readByTheme = ['--elevation-400-menu-panel']

const copiedFromPayload = [
  {
    token: '--elevation-400-menu-panel',
    value:
      '0 0 0 1px rgba(0, 0, 0, 0.04), 0 0 0.5px rgba(0, 0, 0, 0.12), 0 10px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.12)'
  },
  {
    token: '--elevation-500-modal-window',
    value: '0 0 0.5px 0 rgba(0, 0, 0, 0.08), 0 10px 24px 0 rgba(0, 0, 0, 0.18), 0 2px 5px 0 rgba(0, 0, 0, 0.15)'
  },
  {
    token: '--elevation-500-modal-window',
    value:
      '0 0.5px 0 0 rgba(255, 255, 255, 0.08) inset, 0 10px 24px 0 rgba(0, 0, 0, 0.45), 0 0 0.5px 0 rgba(255, 255, 255, 0.35) inset, 0 3px 5px 0 rgba(0, 0, 0, 0.35)'
  },
  { token: '--field-color-bg', value: 'var(--color-bg)' },
  { token: '--radius-medium', value: '0.3125rem' },
  { token: '--radius-large', value: '0.8125rem' }
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

const themeCss = Object.fromEntries(Object.keys(scopes).map((file) => [file, stripComments(read(path.join(sourceDir, file)))]))
const allThemeCss = Object.values(themeCss).join('\n')

const unique = (values: string[]) => [...new Set(values)].sort()
const matchAll = (text: string, pattern: RegExp) => unique([...text.matchAll(pattern)].map((match) => match[1]))

const declaredProperties = (css: string) => matchAll(css, /(?<![\w-])(--[\w-]+)\s*:/g)
const referencedProperties = (css: string) => matchAll(css, /var\(\s*(--[\w-]+)/g)
const optionalProperties = (css: string) => matchAll(css, /var\(\s*(--payloadpack-[\w-]+)\s*,/g)
const documented = matchAll(read(path.join(root, '../../README.md')), /^\| `(--payloadpack-[\w-]+)`/gm)
const tight = (css: string) => squash(css).replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
const onRoot = (selector: string, scope: string) =>
  selector
    .replace('@layer payload', '')
    .replace(scope, '')
    .replace(/@media\s*\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '[]')
    .replace(/\([^()]*\)/g, '()')
    .split(/[\s,]+/)
    .every((part) => part === '' || part.startsWith('&'))
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

const rules = (css: string, parent = ''): { declarations: string; properties: string[]; selector: string }[] =>
  topLevelBlocks(css).blocks.flatMap((block) => {
    const selector = `${parent} ${block.prelude}`.trim()
    const declarations = block.body.replace(/[^{};]*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '')
    const properties = matchAll(declarations, /(?:^|;)\s*([\w-]+)\s*:/g)
    return [{ declarations, properties, selector }, ...rules(block.body, selector)]
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

const hasClass = (selector: string, name: string) => new RegExp(`\\.${name}(?![\\w-])`).test(selector)

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
    const stylesheets = listFiles(sourceDir, '.css').map((file) => path.relative(sourceDir, file))
    const imported = matchAll(read(path.join(stylesDir, 'index.css')), /@import '(.+?)'/g).map((file) =>
      path.relative(sourceDir, path.resolve(stylesDir, file))
    )
    expect(unique(imported)).toEqual(unique(stylesheets.filter((file) => file !== 'styles/index.css')))
    expect(unique(Object.keys(scopes))).toEqual(unique(imported))
  })

  it('imports styles/index.css in the server provider and no CSS in client modules', () => {
    const cssImports = (file: string) => matchAll(read(file), /^import '(.+\.css)'/gm)
    const clientModulesWithCss = [...listFiles(sourceDir, '.ts'), ...listFiles(sourceDir, '.tsx')]
      .filter((file) => read(file).startsWith("'use client'") && cssImports(file).length > 0)
      .map((file) => path.relative(sourceDir, file))

    expect(cssImports(path.join(sourceDir, 'components/appearance-server-provider.tsx'))).toEqual(['../styles/index.css'])
    expect(clientModulesWithCss).toEqual([])
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

  it('overrides only tokens that Payload still declares or reads', () => {
    const payloadTokens = new Set([...declaredProperties(payloadCss), ...referencedProperties(payloadCss)])
    const overridden = declaredProperties(allThemeCss).filter((token) => !token.startsWith('--payloadpack-'))
    expect(overridden.filter((token) => !payloadTokens.has(token))).toEqual([])
  })

  it('remaps only tokens that are still read where the theme sets them', () => {
    const payloadRules = payloadCssFiles.flatMap((file) => rules(stripComments(read(file))))
    const themeRules = rules(allThemeCss)
    const readsOn = (fragment: string, token: string) => {
      const pattern = new RegExp(`${fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`)
      const readers = readByTheme.includes(token) ? [...payloadRules, ...themeRules] : payloadRules
      return readers.some((rule) => pattern.test(rule.selector) && referencedProperties(rule.declarations).includes(token))
    }
    const readAnywhere = (token: string) =>
      [...payloadRules, ...themeRules].some((rule) => referencedProperties(rule.declarations).includes(token))
    const unread = themeRules.flatMap((rule) => {
      const classes = matchAll(subject(rule.selector), /\.([_a-zA-Z][\w-]*)/g).filter((name) => !name.startsWith('payloadpack-'))
      const element = unique(classes.flatMap((name) => [name, name.replace(/--.*$/, '')])).map((name) => `.${name}`)
      const isRead = (token: string) =>
        element.length === 0
          ? readAnywhere(token)
          : element.some((fragment) => readsOn(fragment, token)) ||
            (readByDescendants[token]?.every((fragment) => readsOn(fragment, token)) ?? false)
      return rule.properties
        .filter((token) => token.startsWith('--') && !token.startsWith('--payloadpack-') && !isRead(token))
        .map((token) => `${element[0] ?? 'root'} ${token}`)
    })
    expect(unique(unread)).toEqual([])
  })

  it('reads only tokens that Payload or the plugin declares', () => {
    const setByPayloadScripts = ['--caret-left']
    const known = new Set([
      ...declaredProperties(payloadCss),
      ...referencedProperties(payloadCss),
      ...declaredProperties(allThemeCss),
      ...setByPayloadScripts
    ])
    expect(referencedProperties(allThemeCss).filter((token) => !known.has(token) && !documented.includes(token))).toEqual([])
  })

  it('documents every token a user can set, and only those', () => {
    const internal = new Set(
      Object.keys(themeCss)
        .filter((file) => !paletteFiles.includes(file))
        .flatMap((file) => declaredProperties(themeCss[file]))
    )
    const settable = unique([
      ...optionalProperties(allThemeCss).filter((token) => !internal.has(token)),
      ...paletteFiles.flatMap((file) => declaredProperties(themeCss[file])),
      ...declaredProperties(themeCss['options/motion.css']).filter((token) => token.startsWith('--payloadpack-motion-'))
    ])
    const onScopeRoot = unique(
      Object.entries(scopes).flatMap(([file, scope]) =>
        rules(themeCss[file])
          .filter((rule) => onRoot(rule.selector, scope))
          .flatMap((rule) => rule.properties)
      )
    )
    expect(
      documented.filter((token) => !referencedProperties(allThemeCss).includes(token)),
      'documented but unused'
    ).toEqual([])
    expect(
      documented.filter((token) => !settable.includes(token) && !onScopeRoot.includes(token)),
      'documented without a default a user can override'
    ).toEqual([])
    expect(
      settable.filter((token) => !documented.includes(token)),
      'settable but undocumented'
    ).toEqual([])
    const belowRoot = rules(themeCss['palettes/palette.css'])
      .filter((rule) => !onRoot(rule.selector, scopes['palettes/palette.css']))
      .flatMap((rule) => rule.properties)
    expect(
      documented.filter((token) => belowRoot.includes(token)),
      'sheet token declared below the palette root'
    ).toEqual([])
  })

  it('has every palette set its background, surface and text for both modes, and its primary', () => {
    const required = {
      dark: ['--payloadpack-bg-app', '--payloadpack-bg-surface', '--payloadpack-text-primary'],
      light: ['--payloadpack-action-primary', '--payloadpack-bg-app', '--payloadpack-bg-surface', '--payloadpack-text-primary']
    }
    const missing = paletteFiles.flatMap((file) => {
      const [light, dark] = rules(themeCss[file]).filter((rule) => rule.selector.includes('[data-palette='))
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
      const tokens = rules(themeCss[file])
        .filter((rule) => onRoot(rule.selector, scopes[file]))
        .flatMap((rule) => rule.properties)
        .filter((name) => name.startsWith('--') && !name.startsWith('--payloadpack-'))
      for (const token of unique(tokens)) {
        owners.set(token, [...(owners.get(token) ?? []), file])
      }
    }
    expect([...owners].filter(([, files]) => files.length > 1).map(([token, files]) => `${token}: ${files.join(', ')}`)).toEqual(
      []
    )
  })

  it('lets palettes set only their own tokens', () => {
    expect(
      paletteFiles.flatMap((file) => declaredProperties(themeCss[file])).filter((token) => !token.startsWith('--payloadpack-'))
    ).toEqual([])
  })

  it('gives every light color a palette sets a dark value, so it never leaks into dark mode', () => {
    const declarations = (text: string) =>
      Object.fromEntries([...text.matchAll(/(?:^|;)\s*(--[\w-]+)\s*:([^;]*)/g)].map(([, token, value]) => [token, value.trim()]))
    const leaks = paletteFiles.flatMap((file) => {
      const [light, dark] = rules(themeCss[file])
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
      rules(css).flatMap(({ declarations }) =>
        [...declarations.matchAll(/(?:^|;)\s*([\w-]+)\s*:([^;]*)/g)]
          .filter(([, property, value]) => timing.test(value.replace(/(?<![\w.])0s/g, '')))
          .filter(([, property]) => !(file === 'options/motion.css' && /^--payloadpack-(?:duration|ease|motion)-/.test(property)))
          .map(([, property, value]) => `${file}: ${property}: ${value.trim()}`)
      )
    )
    expect(unique(loose)).toEqual([])
  })

  it('falls back to the step Payload maps each color to in each mode', () => {
    const colors = read(path.join(uiDist, 'css/colors.css'))
    const palette = themeCss['palettes/palette.css']
    const blocks = [
      { payload: ':root', theme: "&:not([data-theme='dark'])" },
      { payload: "[data-theme='dark']", theme: "&[data-theme='dark']" }
    ]
    const mappings = blocks.flatMap(({ payload, theme }) => {
      const block = tight(ruleBody(palette, theme) ?? '')
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
    expect(mappings.filter(({ mapping, payload }) => !tight(ruleBody(colors, payload) ?? '').includes(mapping))).toEqual([])
  })

  it("keeps Payload's enhanced-contrast value for every color the mode blocks remap", () => {
    const declarations = (body: string) =>
      Object.fromEntries(
        [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, token, value]) => [token, squash(value.trim())])
      )
    const contrast = rules(stripComments(read(path.join(uiDist, 'css/colors.css')))).filter((rule) =>
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
      const remapped = Object.keys(declarations(ruleBody(palette, blocks[mode][0]) ?? ''))
      const theme = declarations(ruleBody(palette, blocks[mode][1]) ?? '')
      expect(remapped.length, mode).toBeGreaterThan(0)
      expect(Object.keys(theme).length, mode).toBeGreaterThan(0)
      return remapped.filter((token) => token in payload && theme[token] !== payload[token]).map((token) => `${mode} ${token}`)
    })
    expect(lost).toEqual([])
  })

  it.each(copiedFromPayload)("falls back to Payload's own $token where the theme takes it over", ({ token, value }) => {
    expect(tight(payloadCss), `${token} changed upstream, update the fallback`).toContain(`${token}: ${value};`)
    expect(tight(allThemeCss)).toMatch(
      new RegExp(`${token}: var\\(--payloadpack-[\\w-]+, ${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\);`)
    )
  })

  it('lets nested themes inherit every token Payload pins on them, and maps the palette on the root only', () => {
    const payloadRules = payloadCssFiles.flatMap((file) => rules(stripComments(read(file))))
    const readers = [...payloadRules, ...rules(allThemeCss)]
    const pinned = unique(
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
    const nested = rules(palette).filter((rule) =>
      /(^|[\s>+~,])\[data-theme/.test(rule.selector.replace('@layer payload', '').replace(scopes['palettes/palette.css'], ''))
    )
    expect(pinned.length).toBeGreaterThan(100)
    expect(nested).toHaveLength(1)
    expect(nested[0].selector).toContain('[data-theme]:not([data-palette])')
    expect(nested[0].properties).toEqual(pinned)
  })

  it("falls back to Payload's own blue steps for a palette without an accent", () => {
    const tokens = read(path.join(uiDist, 'css/design-tokens.css'))
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
      ...['css/colors.css', 'css/design-tokens.css'].flatMap((file) => declaredProperties(read(path.join(uiDist, file)))),
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
        rules(themeCss[file]).flatMap(({ declarations }) =>
          [...declarations.matchAll(/(?:^|;)\s*([\w-]+)\s*:([^;]*)/g)]
            .filter(([, property, value]) => setsColor(property, value))
            .map(([, property, value]) => `${file}: ${property}: ${value.trim()}`)
        )
      )
    expect(unique(colored)).toEqual([])
  })

  it('targets only classes and ids that Payload still renders', () => {
    const selectorText = selectors(allThemeCss)
    const classes = matchAll(selectorText, /\.(-?[_a-zA-Z][\w-]*)/g)
    const ids = matchAll(selectorText, /#([\w-]+)/g)
    expect([...classes, ...ids].filter((name) => !name.startsWith('payloadpack-') && !existsInPayload(name))).toEqual([])
  })

  it('is never outranked by unlayered Payload rules on the properties it sets', () => {
    const pseudoElement = (selector: string) => selector.match(/::[\w-]+$/)?.[0] ?? ''
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
    const mapped = matchAll(themeCss['options/icons.css'], /svg\.icon--([a-z-]+)\s*\{\s*--payloadpack-icon:/g)

    expect(
      payloadIcons.filter((icon) => !mapped.includes(icon) && !keptPayloadIcons.includes(icon)),
      'unmapped Payload icons'
    ).toEqual([])
    expect(
      mapped.filter((icon) => !payloadIcons.includes(icon)),
      'mapped icons Payload no longer has'
    ).toEqual([])
  })

  it("records Payload's rules for every element the theme styles, so any upstream change shows up", async () => {
    const styled = new Set(
      matchAll(selectors(allThemeCss), /\.(-?[_a-zA-Z][\w-]*)/g).filter((name) => !name.startsWith('payloadpack-'))
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
        const touched = rules(stripComments(read(file))).filter(
          (rule) =>
            rule.declarations.trim() && [...rule.selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].some(([, name]) => styled.has(name))
        )
        return touched.length
          ? [
              [
                `== ${label(file)}`,
                ...touched.map(
                  (rule) =>
                    `${squash(rule.selector.replace(/@layer [\w-]+/g, '')).trim()} { ${squash(rule.declarations).trim()} }`
                )
              ].join('\n')
            ]
          : []
      })
    await expect(`${sections.sort().join('\n\n')}\n`).toMatchFileSnapshot('__snapshots__/payload-rules.txt')
  })

  it.each(hardCodedByPayload)('Payload still hard-codes $selector ($declaration)', ({ declaration, file, selector }) => {
    const css = read(path.join(uiDist, file))
    expect(ruleBody(css, selector), `${selector} changed upstream, re-check its fix`).toContain(squash(declaration))
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
    const icons = matchAll(allThemeCss, /lucide-static\/icons\/([a-z0-9-]+)\.svg/g)
    expect(icons.length).toBeGreaterThan(0)
    expect(icons.filter((icon) => !existsSync(path.join(lucideIcons, `${icon}.svg`)))).toEqual([])
  })
})
