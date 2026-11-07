---
title: Translations
description: The panel ships in English. Translate or rename any label from your own config.
---

Set the `payloadpack` keys from [translations.ts](https://github.com/payloadpack/theme/blob/main/packages/theme/src/translations.ts) in your own `i18n.translations`. They win over the plugin's. Style and palette names are keys too, so you can rename them.

```ts title="payload.config.ts"
export default buildConfig({
  i18n: {
    translations: {
      de: { payloadpack: { appearance: 'Darstellung', colorMode: 'Farbmodus' } }
    }
  }
})
```
