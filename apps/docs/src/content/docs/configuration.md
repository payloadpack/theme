---
title: Configuration
description: Every key is optional. Without any, editors get Enhanced on Neutral and can pick anything.
---

```ts title="payload.config.ts"
themePlugin({
  character: 'enhanced',
  characters: ['payload', 'enhanced', 'studio'],
  options: { enhanced: { density: 'compact' }, studio: { frame: 'flat' } },
  palette: 'neutral',
  palettes: [{ slug: 'payload' }, { slug: 'neutral' }, { label: 'Brand', slug: 'brand' }],
  panel: ({ user }) => user?.role === 'admin',
  codeEditorFontSize: 13
})
```

| Key                  | Default               | What it does                                                                  |
| -------------------- | --------------------- | ----------------------------------------------------------------------------- |
| `character`          | `'enhanced'`          | The style everyone starts with. It must be one of `characters`.               |
| `characters`         | All three styles      | The styles editors may pick.                                                  |
| `options`            | Each style's defaults | Starting values per style, which Reset returns to. A typo is a type error.    |
| `palette`            | `'neutral'`           | The palette everyone starts with. It must be the `slug` of one of `palettes`. |
| `palettes`           | Every built-in one    | The palettes editors may pick, in order. Your own also needs a `label`.       |
| `panel`              | `true`                | Who gets the Appearance panel: `true`, `false` or `({ user }) => boolean`.    |
| `codeEditorFontSize` | `13`                  | Code editor font size in Comfortable density. `false` keeps Payload's 11.     |

An editor whose saved style or palette is no longer allowed gets the default. An editor's own palette applies only while more than one palette is allowed. A `label` on a built-in palette renames it.

When `panel` resolves to `false`, the editor gets no Appearance button and their saved setup is ignored. Signed-out views have no user, so they show the site default and `panel` is not asked.

Fields that set `admin.editorOptions.fontSize` keep their own size whatever `codeEditorFontSize` says.

## Make a shared setup the default

A setup copied with Share setup has the same shape as the config, so pasting it into `themePlugin()` makes it everyone's default:

```ts
themePlugin({
  character: 'payload',
  palette: 'payload'
})
```

A setup on an editor's own palette also carries its colors, which the config does not take. Ship those as [your own palette](../palettes/#your-own-palette).
