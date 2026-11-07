---
title: Add a palette
description: Ship your brand's colors as a palette every editor can pick.
---

A palette is one CSS block in your admin stylesheet and an entry in `palettes`. The quickest start is the panel: pick **Custom**, choose your colors, press **Copy as CSS**, then paste the block and rename `custom` to your slug.

```css title="src/app/(payload)/custom.css"
[data-palette='brand'] {
  --payloadpack-bg-app: #f4f5f9;
  --payloadpack-bg-surface: #ffffff;
  --payloadpack-text-primary: #1b1d29;
  --payloadpack-action-primary: #4f46e5;
  --payloadpack-accent: #4f46e5;

  &[data-theme='dark'] {
    --payloadpack-bg-app: #0f1018;
    --payloadpack-bg-surface: #151724;
    --payloadpack-text-primary: #e6e8f2;
    --payloadpack-action-primary: #818cf8;
  }
}
```

```ts title="payload.config.ts"
themePlugin({
  palette: 'brand',
  palettes: [{ slug: 'neutral' }, { label: 'Brand', slug: 'brand' }]
})
```

Set at least the background, surface, text and primary for light and dark. The rest of the colors are mixed from these, and any [token](../customize/) can override them. The slug `custom` is reserved for each editor's own colors.
