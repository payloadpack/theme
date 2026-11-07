---
title: Configuration
description: Every key is optional. Without any, editors start on Enhanced and Neutral and can pick anything.
---

## Set the default look

```ts
themePlugin({
  character: 'studio',
  palette: 'warm',
  options: { studio: { radius: 'md', density: 'compact' } }
})
```

Editors start here, and Reset in the panel brings them back.

## Limit what editors can pick

```ts
themePlugin({
  characters: ['enhanced', 'studio'],
  palettes: [{ slug: 'neutral' }, { slug: 'warm' }]
})
```

A section with only one choice disappears from the panel. An editor whose saved pick is no longer allowed gets the default.

## Give everyone the same look

```ts
themePlugin({
  character: 'studio',
  palette: 'warm',
  panel: false
})
```

Nobody gets the Appearance button, and saved picks are ignored.

## Show the panel to some users only

```ts
themePlugin({
  panel: ({ user }) => user.role === 'admin'
})
```

Everyone else sees the default. Signed-out pages, such as the login page, always show the default.

## Copy an editor's setup

Share setup in the panel copies JSON in the same shape as this config. Paste it into `themePlugin()` to make it the default. When it uses an editor's own colors, [add them as a palette](../add-a-palette/).

## Reference

| Key                  | Default               | Values                                                                                 |
| -------------------- | --------------------- | -------------------------------------------------------------------------------------- |
| `character`          | `'enhanced'`          | `'payload'`, `'enhanced'` or `'studio'`, one of `characters`                           |
| `characters`         | All three             | The styles editors may pick                                                            |
| `palette`            | `'neutral'`           | The `slug` of one of `palettes`                                                        |
| `palettes`           | Every built-in one    | `{ slug }` for `payload`, `neutral`, `warm` and `soft`, `{ slug, label }` for your own |
| `options`            | Each style's defaults | Per style, see [Options](#options)                                                     |
| `panel`              | `true`                | `true`, `false` or `({ user }) => boolean`                                             |
| `codeEditorFontSize` | `13`                  | Code editor font size in Comfortable density, or `false` for Payload's 11              |

A `label` on a built-in palette renames it.

### Options

Enhanced and Studio take these. The Payload style has none.

| Option    | Values                                     | Enhanced        | Studio          |
| --------- | ------------------------------------------ | --------------- | --------------- |
| `radius`  | `'none'`, `'sm'`, `'md'`, `'lg'`, `'full'` | `'md'`          | `'lg'`          |
| `font`    | `'inter'`, `'geist'`, `'system'`           | `'inter'`       | `'geist'`       |
| `frame`   | `'boxed'`, `'flat'`                        | `'flat'`        | `'boxed'`       |
| `density` | `'compact'`, `'comfortable'`               | `'comfortable'` | `'comfortable'` |
| `icons`   | `'payload'`, `'lucide'`                    | `'lucide'`      | `'lucide'`      |
| `motion`  | `'off'`, `'auto'`                          | `'auto'`        | `'auto'`        |
| `nav`     | `'rail'`, `'hidden'`                       | `'rail'`        | `'rail'`        |

`density`, `motion` and `nav` stay the same for an editor when they switch style.
