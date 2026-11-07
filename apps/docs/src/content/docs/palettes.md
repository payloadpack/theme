---
title: Palettes
description: The colors, in a light and a dark version. Every palette works with every style.
---

| Palette | Colors                                                                  |
| ------- | ----------------------------------------------------------------------- |
| Payload | Payload's own colors.                                                   |
| Neutral | White cards on a soft grey field, near-black in dark mode. The default. |
| Warm    | A copper-tinted field and nav, with copper filling what you press.      |
| Soft    | Quiet greys with a near-black primary and a blue accent.                |

## Custom colors

The dashed **Custom** tile turns the current palette into the editor's own. They pick a background, surface, text and primary color for light and for dark mode, and one accent for both. The rest of the colors are mixed from these, and secondary text always keeps AA contrast.

- **Primary** fills what you press and pick: primary buttons, checked checkboxes, radios and switches, a picked date and the focus ring.
- **Accent** marks links and statuses.

Picking another palette keeps the custom colors for later. **Remove custom colors** deletes them.

## Your own palette

To give every editor your brand's palette, add one CSS block to your admin stylesheet and list its slug in `palettes`. The quickest start is **Custom**: pick the colors, press **Copy as CSS**, paste the block and rename `custom` to your slug.

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
  palettes: [{ slug: 'neutral' }, { slug: 'warm' }, { label: 'Brand', slug: 'brand' }]
})
```

The panel draws the palette's card from the same CSS. The slug `custom` is reserved for each editor's own palette. Every token a palette can set is on [Customize](../customize/).
