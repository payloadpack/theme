---
title: Installation
description: Add the package, add the plugin, regenerate the import map.
---

## Install the package

```sh
bun add @payloadpack/theme
```

With another package manager, run `npm install`, `pnpm add` or `yarn add` instead.

## Add the plugin

```ts title="payload.config.ts"
import { themePlugin } from '@payloadpack/theme'

export default buildConfig({
  plugins: [themePlugin()]
})
```

List `themePlugin()` after any plugin that adds collections, so their checkbox columns get the theme's list cell too.

## Regenerate the import map

```sh
bunx payload generate:importmap
```

Run it again after every upgrade of the theme.

## Upgrading to 0.3

- The `AppearanceOptions` component is gone, so an old import map fails `next build`. Regenerate it.
- The `--payloadpack-sidebar-tabs-height` token is gone. Sidebar tabs now follow the field height.
