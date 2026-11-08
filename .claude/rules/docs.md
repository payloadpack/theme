---
paths:
  - 'README.md'
  - 'apps/docs/**'
  - '.github/assets/**'
---

# README and docs

- The README is a short pitch: what the theme brings, install, a config overview and screenshots, linking to the docs site. Everything else goes in the docs pages.
- The docs site in `apps/docs` (Astro Starlight, deployed to GitHub Pages after each release) is for people installing the theme. Each page answers what they want to know: what it looks like, how to install, how to set the default or limit what editors can pick, with the real config keys and values. Never document internals or write an editor's manual of the panel.
- Every code example matches the screenshot beside it: copy the demo field that rendered it.
- Use the payloadpack brand: the two-cards logo, drawn by `apps/docs/scripts/render-brand-assets.mjs`, and the emerald to cyan gradient in `apps/docs/src/styles/docs.css`. Never invent a logo or a brand color.
- Images come from scripts, never by hand: screenshots from `apps/demo/tests/screenshots.ts`, the README GIFs from `apps/demo/tests/panel-tour.ts`, the social preview from `apps/demo/tests/social-preview.ts`, the logo and favicon from `render-brand-assets.mjs`.
- The social preview frames its own capture of the demo admin in `apps/demo/tests/social-preview.html`, and renders only when someone runs it. The docs site uses it as its `og:image`; GitHub's copy is uploaded by hand under Settings → Social preview, because GitHub has no API for it, so re-upload it after every render.
- The README marks its features with emojis, not drawn icons.
