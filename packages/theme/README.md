# @payloadpack/theme

An admin theme for Payload 4. It adds three settings to the user menu: a warm dark palette, a roomier density and Lucide icons. Each person picks their own, and the choice is rendered on the server, so pages never flash.

## Install

```sh
bun add @payloadpack/theme
```

```ts
import { themePlugin } from '@payloadpack/theme'

export default buildConfig({
  plugins: [themePlugin()]
})
```

Then regenerate the import map:

```sh
payload generate:importmap
```

## Settings

Open the user menu → **Settings**.

| Setting     | Options              | Default     |
| ----------- | -------------------- | ----------- |
| Admin theme | Stock, Neutral       | Neutral     |
| Density     | Compact, Comfortable | Comfortable |
| Icons       | Payload, Lucide      | Lucide      |

- **Neutral** gives dark mode a warm near-black palette and swaps Payload's blue selection for neutral greys. In both modes it draws a 2px focus ring in the text color and checks checkboxes with a text-colored tick instead of a blue fill.
- **Comfortable** sets 14px body text, 40px fields, 32px buttons and 18px checkboxes, gives dialogs more room, and fixes Payload components that hard-code their sizes.
- **Lucide** replaces Payload's icons with [Lucide](https://lucide.dev) and adds icons to the nav and the document menu. The icons are bundled, so nothing loads from a CDN.

Stock, Compact and Payload icons together are untouched Payload.

Choices are stored per browser in cookies named after your `cookiePrefix`, the same way Payload stores its light/dark theme.

## Options

```ts
themePlugin({
  codeEditorFontSize: 13
})
```

| Option               | Default | Description                                                                                                                                                           |
| -------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codeEditorFontSize` | `13`    | Font size for code editors in Comfortable density. Payload's default is 11. Fields that set `admin.editorOptions.fontSize` keep their own size. `false` turns it off. |

## Vertical tabs

Give a tabs field the `VERTICAL_TABS` class to list its tabs in a column beside the fields:

```ts
import { VERTICAL_TABS } from '@payloadpack/theme'

const field = {
  type: 'tabs',
  admin: { className: VERTICAL_TABS },
  tabs: [
    { label: 'General', fields: [] },
    { label: 'Advanced', fields: [] }
  ]
}
```

From 768px wide the tabs stack in a 270px column on the left. Narrower screens keep Payload's horizontal tabs. The layout applies whatever each person picks in Settings. Payload's tab list moves between tabs with the Left and Right arrow keys, and that doesn't change.

## Nav icons

With Icons set to Lucide, every collection and global in the nav gets an icon. Common names get a matching one automatically: a slug containing `page`, `post`, `media`, `user`, `categor`, `product`, `order`, `form`, `tag`, `event` or [more than 30 other words](src/lucide.css) is recognized. Anything else gets a generic icon.

To choose the icon for your own collection, set `--payloadpack-icon` on its nav link in your admin stylesheet, for example `src/app/(payload)/custom.css`. Nav links have the id `nav-<slug>` for collections and `nav-global-<slug>` for globals:

```css
#nav-recipes {
  --payloadpack-icon: url('/icons/chef-hat.svg');
}
```

Any single-color SVG works. It is used as a mask, so it takes the nav's text color. To use a Lucide icon, copy its SVG from [lucide.dev](https://lucide.dev) into `public/icons/`.

## Customize

The theme's CSS sits in `@layer payload`, so your own `custom.css` overrides it without specificity fights.

Each toolbar sizes its buttons from its own token. They all default to Payload's `--button-height`:

| Token                                       | Controls                                 |
| ------------------------------------------- | ---------------------------------------- |
| `--payloadpack-doc-header-button-height`    | Title bar with Edit, Versions and API    |
| `--payloadpack-doc-controls-button-height`  | Status and actions bar of a document     |
| `--payloadpack-list-header-button-height`   | List title bar and its selection bar     |
| `--payloadpack-list-controls-button-height` | List toolbar: Filters, Group by, Columns |
| `--payloadpack-row-button-height`           | Array and block rows                     |
| `--payloadpack-menu-item-height`            | Popup menu items                         |

```css
html {
  --payloadpack-row-button-height: 2.5rem;
}
```

## Requirements

- Payload `4.0.0-beta.3` or later
- React 19

## License

MIT
