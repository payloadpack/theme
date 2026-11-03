# Appearance

How characters, palettes and the Appearance panel work. Terms follow [GLOSSARY.md](../GLOSSARY.md).

An editor's look is two independent choices: a **character** (how the admin is laid out and behaves) and a **palette** (its colors, in a light and a dark version). Payload's own light/dark setting picks which version of the palette shows.

## Characters

Three built-in characters. Apps cannot register their own. A character owns everything except color.

| Character | What it is                                                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Stock     | Payload's own layout and behavior. No options.                                                                                     |
| Enhanced  | Payload touched up without changing its structure: roomier, rounder popups and tabs, Lucide icons. The zero-config default.        |
| Studio    | The first bold character: each view sits in a soft card on a field, the nav collapses to a rail, the user menu sits at the bottom. |

Characters restyle only through CSS and Payload's own slots (providers, header actions, nav slots). No Payload view is replaced: no dashboard, command palette, login or document outline.

### Options

Each character declares which options it supports and their defaults. Option values belong to a character: Studio's radius and Enhanced's radius are separate values.

| Option    | Values                                                                | Enhanced | Studio |
| --------- | --------------------------------------------------------------------- | -------- | ------ |
| `radius`  | `none` `sm` `md` `lg` `full`                                          | yes      | yes    |
| `font`    | `payload` (Inter, which Payload already loads), `geist` or `system`   |          | yes    |
| `frame`   | `boxed` `flat`                                                        |          | yes    |
| `width`   | `centered` `full`                                                     |          | yes    |
| `density` | `compact` `comfortable`                                               | yes      | yes    |
| `icons`   | `payload` `lucide`                                                    | yes      | yes    |
| `motion`  | `off` `on`: restores the open and close transitions Payload 4 removed | yes      | yes    |
| `nav`     | `icons` `hidden`: what a collapsed nav becomes                        | yes      | yes    |

`prefers-reduced-motion` always wins over `motion: 'on'`.

The `font` option will gain a heading font, `sans` or `serif`, so a character can pair a serif display face with a sans body.

Enhanced's defaults keep today's layout apart from motion:

| Option    | Enhanced default                                                            |
| --------- | --------------------------------------------------------------------------- |
| `radius`  | `md`: Payload's own radius tiers. `none`, `sm`, `lg` and `full` scale them. |
| `density` | `comfortable`                                                               |
| `icons`   | `lucide`                                                                    |
| `motion`  | `on`                                                                        |
| `nav`     | `icons` (provisional)                                                       |

Studio's defaults are still open (see Open). The canvas uses provisional ones.

## Palettes

A palette is CSS, the way Tailwind v4 defines design tokens: a block scoped to `[data-palette='<name>']` that sets `--payloadpack-background`, `--payloadpack-surface` and `--payloadpack-text` with `light-dark(light, dark)`, plus one `--payloadpack-accent` for both modes. The same text works as a stylesheet block, as inline style for an editor's palette and as the Copy as CSS export. One shared stylesheet derives every Payload color token from them with `color-mix`: surfaces, borders, muted text, hover and selected states, the accent's shades and the text on the accent. Built-in and custom palettes are the same shape, so a new palette costs only its colors. Because the scope is the attribute and not only `<html>`, a preview card with `data-palette="clay"` shows the palette's real colors. Palettes work with every character, Stock included. There are no presets.

| Base color | What it paints                               |
| ---------- | -------------------------------------------- |
| background | the page, or the field behind Studio's cards |
| surface    | cards, fields, menus                         |
| text       | text and icons; muted text is mixed from it  |
| accent     | primary buttons, links, selection            |

| Palette | Light                               | Dark                                               | Accent    |
| ------- | ----------------------------------- | -------------------------------------------------- | --------- |
| Payload | Payload's own Figma UI3 colors      | Payload's own Figma UI3 colors                     | `#0d99ff` |
| Warm    | Payload's light colors              | today's Enhanced near-black (`#0f0f0e`, `#f3f2ed`) | `#0d99ff` |
| Studio  | a faintly tinted field, white cards | the same idea on near-black                        | `#c2410c` |

- The Payload palette applies no overrides, so plain Payload is the Stock character with the Payload palette. Today's look is Enhanced with Warm, the zero-config default.
- Editors override a palette's accent with 8 swatches or a hex field, and each palette remembers its own accent.
- Editors create a palette with **New palette** in the panel: it starts from the current palette and shows the three color fields for each mode and the accent. It sets the same variables inline on `<html>` and saves into their setup, so Copy setup shares it with colleagues.
- **Copy as CSS** exports an editor's palette as a CSS block. Developers paste it into their admin stylesheet (Payload's `custom.scss`) and list its name in `themePlugin({ palettes: [...] })` to offer it to everyone.
- The package ships no palette named after another company or product.

## Plugin config

```ts
themePlugin({
  character: 'studio',
  characters: ['enhanced', 'studio'],
  options: { studio: { frame: 'flat' } },
  palette: 'studio',
  palettes: ['payload', 'studio', 'clay'],
  accent: { studio: '#1d4ed8' },
  panel: ({ user }) => user?.role === 'admin'
})
```

- `character` and `palette` are the defaults. Zero config is `'enhanced'` and `'warm'`.
- `characters` lists the characters editors may pick. `palettes` lists the palettes they may pick by name: built-in ones, or your own palettes defined in CSS. The config never holds colors. Default: everything built in. The plugin throws at startup when a default isn't allowed.
- `options` holds option values per character. Each key is typed with only that character's options, so `options: { enhanced: { frame: 'flat' } }` is a type error. Stock has no key.
- `accent` holds a hex per palette.
- `panel` is `true`, `false` or `({ user }) => boolean`. Default `true`. When it resolves to `false`, the editor gets no panel button and their saved setup is ignored.
- `codeEditorFontSize` stays as it is.

## Setups

A setup is what an editor picked: a character, that character's options, a palette and that palette's accent. It has the same shape as the plugin config above, minus `characters`, `palettes` and `panel`.

- Priority, lowest to highest: built-in defaults, the developer's config, the editor's setup.
- A setup holds only what differs from the defaults below it, kept per character and per palette, so switching back and forth keeps each one's tweaks.
- The server checks every value against the allowed characters, palettes and each option's values. Anything unknown falls back to its default.
- Signed-in editors' setups are saved in Payload's own preferences (`payload-preferences`, key `payloadpack-appearance`), so a setup follows the editor to every browser. The server reads it with the page and renders the attributes, so there is no flash.
- The same setup is mirrored into a `<cookiePrefix>-appearance` cookie, which the server uses on the login page and every other signed-out view. With no saved preference yet, the cookie applies for signed-in editors too.
- `panel` is not called on signed-out views, which have no user. The cookie applies there unless `panel` is `false`.
- Reset clears the setup: the preference and the cookie.
- Sharing: **Copy setup** copies the setup as JSON, with the character and palette always included, so another editor gets the same look. **Paste setup** applies a copied setup, checked like any other, and says so when the text isn't a valid setup. A developer can paste the same JSON into `themePlugin()` to make it the site default.
- The old `admin-theme`, `density` and `icons` cookies are left to expire. There are no shims for the old attributes, cookies or the `appearanceControls` export.

## Color mode

Color mode is Payload's own light/dark preference: the panel calls `useTheme().setTheme('light' | 'dark' | 'auto')`, which switches without a reload and writes Payload's `<cookiePrefix>-theme` cookie. When `admin.theme` is fixed, Payload hides its own switch and the panel hides its Color mode row. Reset does not touch color mode.

## The Appearance panel

- A Lucide `palette` icon button in the header actions (`admin.components.actions`), on every Default-template view. Signed-out views have no slot for it.
- It opens a side sheet docked to the right edge, full height, 360px wide, built on the native `popover` attribute: Escape and a click outside close it. The page stays visible beside it.
- Below 768px the sheet fills the screen, with a close button in its header.
- Every change applies at once. There is no Save button.
- Sections, top to bottom:
  1. Character: one card per allowed character, each a small preview. Hidden when only one character is allowed.
  2. The active character's options, as segmented buttons. Under Stock, a note says Stock has no options.
  3. Palette: one card per allowed palette, showing its light and dark halves side by side. Hidden when only one palette is allowed.
  4. Accent: 8 swatches and a hex field.
  5. Color mode: Light, Dark, Auto.
  6. Reset, Copy setup and Paste setup.
- The panel is styled with Payload's `--color-*` tokens, so it follows the active character, palette and color mode.
- Every label is a Payload i18n key under a `payloadpack` namespace. English ships; apps add languages through their own `i18n.translations`. Character and palette names stay untranslated.

## The rail

With `nav: 'icons'`, a collapsed nav becomes a 64px rail of icons instead of disappearing.

- Our own collapse button replaces Payload's `.nav__close`. Payload's nav stays open as far as Payload knows; the rail is our attribute shrinking `--nav-width`. Payload's real closed state makes the nav `inert`, so it cannot be styled into a rail.
- The collapsed state lives in its own small cookie, so Reset does not expand the nav, and the server renders it with no flash.
- The rail always shows the Lucide nav icons, even with `icons: 'payload'`.
- Each icon shows its link's label as a tooltip on hover and focus, through CSS anchor positioning.
- Group labels give way to dividers. A collapsed group shows as one chevron button, with the group name as its tooltip, that opens the group through Payload's own toggle.
- Payload closes the nav when the window shrinks past 1440px or 1024px. While the rail is on, the provider reopens it with `useNav().setNavOpen(true)`, without saving that.
- At 768px and below the rail is off and the nav is Payload's full-screen drawer.
- `nav: 'hidden'` leaves Payload's collapse exactly as it is.

## Scoping and folders

The provider renders the active character, its option values, the palette and the accent onto `<html>`:

```html
<html
  data-character="studio"
  data-radius="lg"
  data-density="comfortable"
  data-icons="lucide"
  data-motion="on"
  data-nav="icons"
  data-frame="boxed"
  data-width="centered"
  data-font="geist"
  data-palette="studio"
  data-accent="#c2410c"
  style="--payloadpack-accent: #c2410c"></html>
```

Under the Stock character, no option attribute is rendered, so no option stylesheet can apply. The palette applies under any character.

```
src/characters/index.ts             the registry of built-in characters and the option catalog
src/characters/enhanced/index.ts    defaults
src/characters/enhanced/enhanced.css
src/characters/studio/index.ts
src/characters/studio/studio.css
src/palettes/index.ts               the registry of built-in palettes and their default accents
src/palettes/warm.css
src/palettes/studio.css
src/palettes/accent.css
src/options/radius.css
src/options/density.css
src/options/icons.css
src/options/motion.css
src/options/nav.css
src/styles/fields/*
```

- Each stylesheet stays one `@layer payload` block with one scope selector: `html[data-character='studio']`, `html[data-palette='warm']`, `html[data-density='comfortable']` and so on. A palette's dark version nests under `[data-theme='dark']`.
- The Payload palette has no stylesheet: it is Payload's own colors.
- Every declaration that sets a color lives in a palette or `accent.css`. Characters and options set only shapes, sizes, spacing and motion.
- Option stylesheets set Payload's own variables. `accent.css` remaps Payload's blue ramp from `--payloadpack-accent`; a palette's stylesheet builds on the same variable. Where Payload hard-codes a value, the fix goes in the option's stylesheet with a contract-test entry, as `density.css` does.
- Characters and palettes are plain typed objects. The plugin config types are derived from the registries. There is no `defineCharacter()` helper.

## Studio

The Studio character:

- `frame: 'boxed'` puts each view in a soft card on the field; `flat` drops the card.
- `width: 'centered'` caps the content width; `full` drops the cap.
- The user menu moves to the bottom of the nav with CSS only: `.nav__header { display: contents }`, then `order` on the user menu. Payload's popover flips upward by itself.
- A logo at the top of the nav comes from a small component in the `beforeNavLinks` slot that renders `admin.components.graphics.Icon` from the config. Payload 4.0.0-beta.6 renders `graphics.Icon` nowhere itself.

The Studio palette mixes its field, nav and card surfaces from the accent into Payload's light and dark surfaces with `color-mix`, so any hex gets matching surfaces. The tint is faint: Copper gives a field of about `#f0ebe6`.

## What each setting drives

From Payload 4.0.0-beta.6's CSS:

- `accent`: every brand and selected token (`--color-bg-brand*`, `--color-bg-selected*`, `--color-border-brand*`, `--color-border-selected*`, `--color-icon-brand`, `--color-icon-selected`, `--color-text-brand`, `--color-text-selected`, the focus ring) reads one of Payload's 11 `--ramp-blue-*` and `--ramp-pale-blue-*` steps, declared once on `:root`.
  - `accent.css` remaps those steps from `--payloadpack-accent` with `color-mix`. Payload's dark mode already picks the lighter steps, so one accent works in both versions.
  - Payload's blue info backgrounds and presence badges take the accent too.
  - Payload's own blue, `#0d99ff`, keeps Payload's exact ramp.
  - No component hard-codes a blue.
- `radius`: `--radius-small`, `--radius-medium`, `--radius-large`, `--button-radius`, `--field-border-radius`, `--popup-radius` and `--popup-item-radius`. Components pick a tier directly, so the option sets the tiers.
- `font`: `--font-family-sans`. Payload loads Inter with `next/font` as an unlayered class on `<html>`, so the option needs a layered `!important` declaration.
- `density`: what `density.css` already does.
- `motion`: what Payload 3 animated and Payload 4 dropped:
  - the drawer's 200ms backdrop fade and panel slide
  - the tooltip's 0.2s fade
  - the small transitions on fields, buttons and cards
  - Payload 3 never animated popups or modals.
- `width`: Payload has no content-width token. Only `admin.constrainWidth` caps the edit view.

## Open

- How Geist loads (ticket 3). Recommended: `next/font/google` in the package, the way Payload loads Inter.
- Studio's character defaults, the Studio palette's dark version and the exact surface mixes.
- Tests and README screenshots across characters and palettes.

## Out of scope

Replacing Payload views. Characters or palettes registered by apps. Dark-mode depth options. Shims. Bold characters after Studio.
