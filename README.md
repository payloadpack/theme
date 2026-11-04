<h1 align="center">@payloadpack/theme</h1>

<p align="center">A warmer, roomier admin theme for Payload 4.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@payloadpack/theme"><img alt="npm version" src="https://img.shields.io/npm/v/@payloadpack/theme"></a>
  <a href="https://github.com/payloadpack/theme/actions/workflows/ci.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/payloadpack/theme/ci.yml?branch=main"></a>
  <a href="https://payloadcms.com"><img alt="Payload version" src="https://img.shields.io/npm/dependency-version/@payloadpack/theme/peer/payload"></a>
  <a href="https://github.com/payloadpack/theme/blob/main/packages/theme/LICENSE"><img alt="MIT license" src="https://img.shields.io/npm/l/@payloadpack/theme"></a>
</p>

<table>
  <tr>
    <th width="50%">Plain Payload</th>
    <th width="50%">With @payloadpack/theme</th>
  </tr>
  <tr>
    <td>
      <picture>
        <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/payloadpack/theme/main/.github/assets/compare-payload-light.png">
        <img alt="A plain Payload edit view" src="https://raw.githubusercontent.com/payloadpack/theme/main/.github/assets/compare-payload-dark.png">
      </picture>
    </td>
    <td>
      <picture>
        <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/payloadpack/theme/main/.github/assets/compare-themed-light.png">
        <img alt="The same edit view with the Enhanced style, the Neutral palette, Comfortable density and Lucide icons" src="https://raw.githubusercontent.com/payloadpack/theme/main/.github/assets/compare-themed-dark.png">
      </picture>
    </td>
  </tr>
</table>

Each editor picks how their admin panel looks from the Appearance panel: a style for the layout and a palette for the colors. The default is the Enhanced style, with a roomier density and Lucide icons, on the Neutral palette. The Payload style on the Payload palette is plain Payload. Setups are rendered on the server, so pages never flash.

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

## Appearance

Click the Appearance button, beside the collapse button at the top of the nav, or in the header under the Payload style and on phones, to open the Appearance panel:

<p>
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/payloadpack/theme/main/.github/assets/appearance-light.png">
    <img width="360" alt="The Appearance panel with Theme, Palette and Style sections: Payload, Neutral and Warm palette cards, a Custom colors button, Payload, Enhanced and Studio style cards, and Fine-tune open with Corners, Typeface, Frame, Density, Icons, Motion and Nav" src="https://raw.githubusercontent.com/payloadpack/theme/main/.github/assets/appearance-dark.png">
  </picture>
</p>

The panel opens as a sheet on the right, and from the bottom on phones. Every change applies at once, so there is no Save button. Escape or a click outside closes it.

- **Theme** is Payload's own light and dark setting, the same one as Admin Theme on the account page. It is hidden when `admin.theme` is `'light'` or `'dark'`.
- **Palette** is the colors, in a light and a dark version. Payload is Payload's own colors. Neutral, the default, puts white cards on a soft grey field in light mode and goes near-black in dark mode. Warm tints the field and the nav with copper and fills what you press with it. Every palette works with every style. The section is hidden when only one palette is allowed.
- **Custom colors** turns the current palette into your own: a background, surface, text and primary color for light and for dark mode, and one accent for both. Primary fills what you press and what is picked: primary buttons, checked checkboxes, radios and switches, a picked date and the focus ring. The accent marks links and the active tab. Each color applies as you pick it, and the rest of the colors are mixed from these. **Copy as CSS** copies your palette as the CSS block the theme renders for it. Picking another palette keeps yours for later, and **Remove custom colors** deletes it.
- **Style** is how the whole admin is laid out and behaves. Payload is Payload's own layout and has nothing to fine-tune. Enhanced touches up Payload's own design without changing its structure, and is the default. Studio puts each view in a soft card on a field. The style cards are hidden when only one style is allowed.
- **Fine-tune** holds the options of the style you picked. Enhanced and Studio have the same seven, with different starting values. Density, Motion and Nav are yours, so they stay put when you switch style. Corners, Typeface, Icons and Frame belong to each style, so switching to Payload and back keeps them. The heading counts what you changed. **Reset** puts every field back to the style's starting values, and **Undo** brings your changes back for a few seconds.
- **Share setup** copies your style, its options and your palette, with its colors when it is your own, as JSON, or pastes a setup another editor copied. The footer says when it worked, when the clipboard holds no setup, and when the browser blocks the clipboard. A setup with its own colors replaces yours. The JSON is also valid plugin config.

| Option   | Values                           | Enhanced default | Studio default |
| -------- | -------------------------------- | ---------------- | -------------- |
| Corners  | None, Small, Medium, Large, Full | Medium           | Large          |
| Typeface | Inter, Geist, System             | Inter            | Geist          |
| Frame    | Boxed, Flat                      | Flat             | Boxed          |
| Density  | Compact, Comfortable             | Comfortable      | Comfortable    |
| Icons    | Payload, Lucide                  | Lucide           | Lucide         |
| Motion   | Off, Auto                        | Auto             | Auto           |
| Nav      | Rail, Hidden                     | Rail             | Rail           |

- **Enhanced** and **Studio** both draw a 2px focus ring, widen the nav to 288px and line its buttons, tabs and items up 12px from its edges, inset the sidebar tabs and the dividers between nav groups, and move each nav group's chevron to the end of its row.
- **Enhanced** lifts the date picker and toasts like menus.
- **Studio** keeps the nav on the field, puts the collapse button at its top left, and moves the user menu to the bottom of it.
- Every palette except Payload's draws the focus ring in the primary color, gives all fields one border color, fades disabled and read-only fields to half their colors, softens checkbox and radio rings, lifts the selected nav link on a white pill with a shadow in light mode, mutes the other nav links, fills selected rows and options, open menus and hovered or open menu items in grey instead of the accent, fills every solid selection, such as a picked date, with the primary, fills a hovered nav group heading like a link, raises the active sidebar tab like the panel's segments, and gives the rich text slash menu a slim scrollbar that stays clear of its rounded corners in Chrome and Safari.
- **Neutral** puts white cards and inputs on a soft `#f6f6f6` grey with `#171717` text and a `#0a0a0a` primary in light mode, gives dark mode a near-black palette with its text color as primary, and takes its text color as accent, so selections, links and marks are greys and nothing is blue.
- **Warm** mixes a faint share of its copper accent into an off-white field and nav, with white cards and lines tinted the same way, and takes the copper as its primary too. Dark mode mixes it into near-black.
- **Corners** scales Payload's own corner sizes. Medium keeps them as they are, None squares every corner, Small and Large make them smaller or larger, and Full is Large with pill-shaped buttons, fields and tabs. Menus and toasts round a little more than the items inside them at every size, instead of taking the card size.
- **Geist** uses [Geist](https://vercel.com/font), bundled in the package under the SIL Open Font License, so builds need no network; the browser downloads it only when an editor uses it. **Inter** keeps Payload's own font. **System** uses the operating system's font.
- **Boxed** puts each view in a soft card with a border and rounded corners. **Flat** drops the card and keeps the nav's border.
- **Comfortable** sets 14px body text, 36px fields and buttons, 32px menu items and 18px checkboxes and radios, keeps nav group labels at 12px, gives dialogs more room, and fixes Payload components that hard-code their sizes.
- **Lucide** replaces Payload's icons with [Lucide](https://lucide.dev) and adds icons to the nav and the document menu. The icons are bundled, so nothing loads from a CDN.
- **Motion** brings back the transitions Payload 3 had: tooltips fade, fields, buttons and cards ease between states, every field's focus ring eases in, and switches slide. Popups and select menus fade and scale in from their trigger, nav group chevrons turn, and the Appearance panel slides in like a drawer. Drawers open at once, because Payload unmounts them on close and only their opening could animate. **Auto** stays still when the operating system asks for reduced motion. **Off** turns every transition off.
- **Rail** turns the nav's collapse button into a 64px rail of Lucide icons, with each label as a tooltip. The rail is kept per browser in a `<cookiePrefix>-nav-rail` cookie, so Reset leaves it alone. Below 768px the nav is Payload's own drawer. **Hidden** keeps Payload's own collapse.

A signed-in editor's setup is saved in Payload's own preferences, so it follows them to every browser. It is mirrored in one cookie, `<cookiePrefix>-appearance`, next to Payload's own theme cookie, which the server uses on the login page and until a setup is saved. The server renders the setup, so pages never flash.

The panel's labels ship in English. To translate them, or rename one, set the `payloadpack` keys from [translations.ts](https://github.com/payloadpack/theme/blob/main/packages/theme/src/translations.ts) in your own `i18n.translations`, which win over the plugin's. Style and palette names are keys too, so an app can rename them.

```ts
export default buildConfig({
  i18n: {
    translations: {
      de: { payloadpack: { appearance: 'Darstellung', colorMode: 'Farbmodus' } }
    }
  }
})
```

## Configuration

```ts
themePlugin({
  character: 'enhanced',
  characters: ['payload', 'enhanced', 'studio'],
  options: { enhanced: { density: 'compact', icons: 'lucide' }, studio: { frame: 'flat' } },
  palette: 'neutral',
  palettes: ['payload', 'neutral', 'warm'],
  panel: ({ user }) => user?.role === 'admin',
  codeEditorFontSize: 13
})
```

| Key                  | Default                                     | Description                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `character`          | `'enhanced'`                                | The style everyone starts with. It must be one of `characters`.                                                                                                                                                                                                                                                                                                                                |
| `characters`         | `['payload', 'enhanced', 'studio']`         | The styles editors may pick. An editor whose style is no longer allowed gets `character`.                                                                                                                                                                                                                                                                                                      |
| `options`            | Each style's defaults from the option table | Starting values per style, which editors start from and Reset returns to. Each style takes only its own options, so a typo is a type error. The Payload style has no options and no key. An editor's own Density, Motion and Nav carry to every style.                                                                                                                                         |
| `palette`            | `'neutral'`                                 | The palette everyone starts with. It must be one of `palettes`.                                                                                                                                                                                                                                                                                                                                |
| `palettes`           | `['payload', 'neutral', 'warm']`            | The palettes editors may pick. An editor whose palette is no longer allowed gets `palette`. An editor's own palette applies only while more than one is allowed, and is kept until then.                                                                                                                                                                                                       |
| `panel`              | `true`                                      | Who gets the Appearance panel: `true`, `false` or `({ user }) => boolean`. When it resolves to `false`, the editor gets no Appearance button and their saved setup is ignored. Signed-out views have no user, so there the cookie applies unless `panel` is `false`. With `true`, signing in loads the saved setup without a reload; with a function, it applies from the next full page load. |
| `codeEditorFontSize` | `13`                                        | Font size for code editors in Comfortable density. Payload's default is 11. Fields that set `admin.editorOptions.fontSize` keep their own size. `false` turns it off.                                                                                                                                                                                                                          |

A setup from Share setup has the same shape, so pasting it into `themePlugin()` makes it everyone's default:

```ts
themePlugin({
  character: 'payload',
  palette: 'payload'
})
```

A setup on an editor's own palette also carries that palette's colors, which the plugin config does not take.

## Vertical tabs

<p>
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/payloadpack/theme/main/.github/assets/vertical-tabs-light.png">
    <img width="640" alt="A tabs field with General and Advanced listed in a column beside a Meta Title field" src="https://raw.githubusercontent.com/payloadpack/theme/main/.github/assets/vertical-tabs-dark.png">
  </picture>
</p>

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

From 768px wide the tabs stack in a 270px column on the left. Narrower screens keep Payload's horizontal tabs. The layout applies whatever each person picks in Appearance. Payload's tab list moves between tabs with the Left and Right arrow keys, and that doesn't change.

## Radio cards

<p>
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/payloadpack/theme/main/.github/assets/radio-cards-light.png">
    <img width="640" alt="A Plan radio field shown as three stacked cards with Pro selected" src="https://raw.githubusercontent.com/payloadpack/theme/main/.github/assets/radio-cards-dark.png">
  </picture>
</p>

Give a radio field the `RADIO_CARDS` class to show its options as stacked cards with the radio on the right:

```ts
import { RADIO_CARDS } from '@payloadpack/theme'

const field = {
  name: 'plan',
  type: 'radio',
  admin: { className: RADIO_CARDS },
  options: ['plus', 'pro', 'enterprise']
}
```

A label can also be JSX. Its first element is the title and any element after it is shown as a muted description:

```tsx
{ value: 'plus', label: <><strong>Plus</strong><span>For individuals and small teams.</span></> }
```

## Switch

<p>
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/payloadpack/theme/main/.github/assets/switch-light.png">
    <img width="640" alt="A Notify subscribers checkbox shown as a switch that is turned on" src="https://raw.githubusercontent.com/payloadpack/theme/main/.github/assets/switch-dark.png">
  </picture>
</p>

Give a checkbox field the `SWITCH` class to show it as a switch:

```ts
import { SWITCH } from '@payloadpack/theme'

const field = {
  name: 'notify',
  type: 'checkbox',
  admin: { className: SWITCH }
}
```

It is still Payload's checkbox: it saves with the form, and screen readers announce it as a checkbox. Its size and thumb are set in [Customize](#customize).

## Nav icons

With Icons set to Lucide, and always in the rail, every collection and global in the nav gets an icon. Common names get a matching one automatically: a slug containing `page`, `post`, `media`, `user`, `categor`, `product`, `order`, `form`, `tag`, `event` or [more than 30 other words](https://github.com/payloadpack/theme/blob/main/packages/theme/src/options/nav-icons.css) is recognized. Anything else gets a generic icon.

To choose the icon for your own collection, set `--payloadpack-icon` on its nav link in your admin stylesheet, for example `src/app/(payload)/custom.css`. Nav links have the id `nav-<slug>` for collections and `nav-global-<slug>` for globals:

```css
#nav-recipes {
  --payloadpack-icon: url('/icons/chef-hat.svg');
}
```

Any single-color SVG works. It is used as a mask, so it takes the nav's text color. To use a Lucide icon, copy its SVG from [lucide.dev](https://lucide.dev) into `public/icons/`.

## Customize

The theme's CSS sits in `@layer payload`, so your own `custom.css` overrides it without specificity fights.

Each toolbar sizes its buttons from its own token. All but the menu items and sidebar tabs default to Payload's `--button-height`:

| Token                                       | Controls                                 |
| ------------------------------------------- | ---------------------------------------- |
| `--payloadpack-doc-header-button-height`    | Title bar with Edit, Versions and API    |
| `--payloadpack-doc-controls-button-height`  | Status and actions bar of a document     |
| `--payloadpack-list-header-button-height`   | List title bar and its selection bar     |
| `--payloadpack-list-controls-button-height` | List toolbar: Filters, Group by, Columns |
| `--payloadpack-row-button-height`           | Array and block rows                     |
| `--payloadpack-menu-item-height`            | Popup menu items, 32px                   |

Checkboxes and radios share their size and, on every palette but Payload's, their colors:

| Token                                 | Controls                                   |
| ------------------------------------- | ------------------------------------------ |
| `--payloadpack-toggle-size`           | Box and circle size in Comfortable density |
| `--payloadpack-toggle-bg`             | Unchecked background                       |
| `--payloadpack-toggle-bg-hover`       | Unchecked background on hover              |
| `--payloadpack-toggle-border`         | Unchecked border                           |
| `--payloadpack-toggle-checked-bg`     | Checked fill                               |
| `--payloadpack-toggle-checked-border` | Checked border                             |
| `--payloadpack-toggle-mark`           | Tick and dot                               |
| `--payloadpack-toggle-ring`           | Keyboard focus ring                        |

```css
html {
  --payloadpack-row-button-height: 2.5rem;
}
```

Switches take their colors from the toggle tokens and their shape from these. Set them on `.payloadpack-switch`:

| Token                         | Controls                                             |
| ----------------------------- | ---------------------------------------------------- |
| `--payloadpack-switch-size`   | Height, 1.5rem. The width follows                    |
| `--payloadpack-switch-gap`    | Space around the thumb as a share of the height, 0.1 |
| `--payloadpack-switch-radius` | Thumb corners, fully round. The track follows        |
| `--payloadpack-switch-thumb`  | Thumb color while off, light in both modes           |

```css
.payloadpack-switch {
  --payloadpack-switch-size: 1.5rem;
  --payloadpack-switch-radius: 4px;
}
```

## Requirements

- Payload `4.0.0-beta.6` or later
- Next.js `16.4.2` or later
- React 19

## License

[MIT](https://github.com/payloadpack/theme/blob/main/packages/theme/LICENSE)
