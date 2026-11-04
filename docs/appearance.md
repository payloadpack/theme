# Appearance

How characters, palettes and the Appearance panel work. Terms follow [GLOSSARY.md](../GLOSSARY.md).

An editor's look is two independent choices: a **character** (how the admin is laid out and behaves) and a **palette** (its colors, in a light and a dark version). Payload's own light/dark setting picks which version of the palette shows.

## Status

Built: the three characters with every option below, the Payload, Warm and Studio palettes defined from base colors in CSS with an accent each, setups with Copy setup and Paste setup, the Appearance panel and the rail.

Built since: an editor's own palette with **New palette** and **Copy as CSS**. The accent is part of a palette: the panel has no accent picker and the plugin has no `accent` option.

Planned, not built: palettes a developer defines in CSS and lists by name in `palettes`, and a heading font.

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

| Option    | Values                                                                     | Enhanced | Studio |
| --------- | -------------------------------------------------------------------------- | -------- | ------ |
| `radius`  | `none` `sm` `md` `lg` `full`                                               | yes      | yes    |
| `font`    | `payload` (Inter, which Payload already loads), `geist` or `system`        |          | yes    |
| `frame`   | `boxed` `flat`                                                             |          | yes    |
| `width`   | `centered` `full`                                                          |          | yes    |
| `density` | `compact` `comfortable`                                                    | yes      | yes    |
| `icons`   | `payload` `lucide`                                                         | yes      | yes    |
| `motion`  | `off` `on`: restores the transitions Payload 4 removed and animates popups | yes      | yes    |
| `nav`     | `icons` `hidden`: what a collapsed nav becomes                             | yes      | yes    |

`prefers-reduced-motion` always wins over `motion: 'on'`.

The `font` option will gain a heading font, `sans` or `serif`, so a character can pair a serif display face with a sans body.

Enhanced's defaults keep today's layout apart from motion and the rail:

| Option    | Enhanced default                                                            |
| --------- | --------------------------------------------------------------------------- |
| `radius`  | `md`: Payload's own radius tiers. `none`, `sm`, `lg` and `full` scale them. |
| `density` | `comfortable`                                                               |
| `icons`   | `lucide`                                                                    |
| `motion`  | `on`                                                                        |
| `nav`     | `icons` (provisional)                                                       |

Studio's defaults:

| Option    | Studio default |
| --------- | -------------- |
| `radius`  | `lg`           |
| `font`    | `geist`        |
| `frame`   | `boxed`        |
| `width`   | `centered`     |
| `density` | `comfortable`  |
| `icons`   | `lucide`       |
| `motion`  | `on`           |
| `nav`     | `icons`        |

## Palettes

A palette is CSS, the way Tailwind v4 defines design tokens: a block scoped to `[data-palette='<name>']` that sets `--payloadpack-background`, `--payloadpack-surface`, `--payloadpack-text` and `--payloadpack-accent`, with the dark values in a nested `&[data-theme='dark'], [data-theme='dark']:not([data-palette])` block that also reaches Payload's dark popups. The `:not([data-palette])` keeps one palette's dark values off another palette's preview card. No `light-dark()`: Next's CSS compiler rewrites it for its default browser targets. The same block is a built-in palette, an editor's palette (rendered in a `<style>` element) and the Copy as CSS export. One shared stylesheet, `palette.css`, derives Payload's grey ramp from them with `color-mix` in sRGB, with mixes that give back Payload's own light greys from white and `#1a1a1a`, and remaps Payload's translucent black (light) and white (dark) text ramps to the palette's text, so muted text and icons share its hue. Dark mode mixes in bigger steps than light, because the same step reads smaller on a dark surface. A palette pins any shade the mix doesn't give, as Warm does for its dark border, focus ring and muted text. Built-in and custom palettes are the same shape, so a new palette costs only its colors. Because the scope is the attribute and not only `<html>`, a preview card with `data-palette="clay"` shows the palette's real colors. Palettes work with every character, Stock included. There are no presets.

| Base color | What it paints                               |
| ---------- | -------------------------------------------- |
| background | the page, or the field behind Studio's cards |
| surface    | cards, fields, menus                         |
| text       | text and icons; muted text is mixed from it  |
| accent     | primary buttons, links, selection            |

| Palette | Light                               | Dark                                                              | Accent    |
| ------- | ----------------------------------- | ----------------------------------------------------------------- | --------- |
| Payload | Payload's own Figma UI3 colors      | Payload's own Figma UI3 colors                                    | `#0d99ff` |
| Warm    | Payload's light colors              | near-black: `#0a0a09` nav, `#0f0f0e` page, `#f3f2ed` text         | `#0d99ff` |
| Studio  | a faintly tinted field, white cards | the same tint on near-black, cards a shade lighter than the field | `#c2410c` |

- The Payload palette applies no overrides, so plain Payload is the Stock character with the Payload palette. Today's look is Enhanced with Warm, the zero-config default.
- A palette's accent is its `--payloadpack-accent` line, and a palette without one, like Warm, keeps Payload's blue. One accent serves both versions: the theme mixes the shades itself. Selected items get a light tint and darker accent text in light mode, and a tint mixed into the palette's own background in dark mode, so even a white accent stays visible.
- Editors create a palette with **New palette** in the panel: it starts from the current palette's colors, read from the browser so any CSS palette works, and shows the three color fields for each mode and the accent. Every color is a lowercase `#rrggbb`, checked on the server like every other choice. The provider renders it as the same CSS block, named `custom`, in a `<style>` element in the server HTML, and saves it into their setup, so Copy setup shares it with colleagues. Picking another palette keeps it in the setup; Reset drops it.
- **Copy as CSS** copies an editor's palette as the CSS block the page renders. Planned: developers paste it into their admin stylesheet (Payload's `custom.scss`) under their own name and list that name in `themePlugin({ palettes: [...] })` to offer it to everyone.
- The package ships no palette named after another company or product.

## Plugin config

```ts
themePlugin({
  character: 'studio',
  characters: ['enhanced', 'studio'],
  options: { studio: { frame: 'flat' } },
  palette: 'studio',
  palettes: ['payload', 'studio', 'clay'],
  panel: ({ user }) => user?.role === 'admin'
})
```

- `character` and `palette` are the defaults. Zero config is `'enhanced'` and `'warm'`.
- `characters` lists the characters editors may pick. `palettes` lists the palettes they may pick by name: built-in ones, and later your own palettes defined in CSS, such as `clay` above. The config never holds colors. Default: everything built in. The plugin throws at startup when a default isn't allowed.
- `options` holds option values per character. Each key is typed with only that character's options, so `options: { enhanced: { frame: 'flat' } }` is a type error. Stock has no key.
- `panel` is `true`, `false` or `({ user }) => boolean`. Default `true`. When it resolves to `false`, the editor gets no panel button and their saved setup is ignored.
- `codeEditorFontSize` stays as it is.

## Setups

A setup is what an editor picked: a character, that character's options, a palette and, when they made one, their own palette's colors. On a built-in palette it has the same shape as the plugin config above, minus `characters`, `palettes` and `panel`.

- Priority, lowest to highest: built-in defaults, the developer's config, the editor's setup.
- A setup holds only what differs from the defaults below it, kept per character and per palette, so switching back and forth keeps each one's tweaks.
- The server checks every value against the allowed characters, palettes and each option's values. Anything unknown falls back to its default.
- Signed-in editors' setups are saved in Payload's own preferences (`payload-preferences`, key `payloadpack-appearance`), so a setup follows the editor to every browser. The server reads it with the page and renders the attributes, so there is no flash.
- The same setup is mirrored into a `<cookiePrefix>-appearance` cookie, which the server uses on the login page and every other signed-out view. With no saved preference yet, the cookie applies for signed-in editors too.
- `panel` is not called on signed-out views, which have no user. The cookie applies there unless `panel` is `false`.
- Reset clears the setup: the preference and the cookie.
- Sharing: **Copy setup** copies the setup as JSON, with the character and palette always included, so another editor gets the same look. **Paste setup** reads a copied setup from the clipboard, checks it like any other, and says so for a moment when the clipboard holds no valid setup. A developer can paste the same JSON into `themePlugin()` to make it the site default, unless it uses the editor's own palette.
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
  4. New palette under the palette cards, and, while the editor's own palette is picked, its color fields for each mode, its accent and Copy as CSS.
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
- The rail hides the Collections and Folders tabs. While another tab is active it shows the tab icons instead, so the editor can switch back: Payload hides the inactive panel with `display: none !important` in its earlier cascade layer, which no theme rule can override.
- Payload closes the nav when the window shrinks past 1440px or 1024px. While the rail is on, the provider reopens it with `useNav().setNavOpen(true)`, without saving that.
- At 768px and below the rail is off and the nav is Payload's full-screen drawer.
- `nav: 'hidden'` leaves Payload's collapse exactly as it is.
- Under Studio the collapse button keeps its row at the top left of the nav and only centers itself in the rail, and the user menu at the bottom is hidden like the header's under Enhanced.

## Scoping and folders

The provider renders the active character, its option values and the palette onto `<html>`:

```html
<html
  data-character="studio"
  data-radius="lg"
  data-font="geist"
  data-frame="boxed"
  data-width="centered"
  data-density="comfortable"
  data-icons="lucide"
  data-motion="on"
  data-nav="icons"
  data-rail=""
  data-palette="studio"
  style="--payloadpack-font-geist: 'Geist', 'Geist Fallback'"></html>
```

`data-rail` is there only while the nav is collapsed to the rail. Under the Stock character, no option attribute is rendered, so no option stylesheet can apply. The palette applies under any character.

```
src/characters/index.ts             the registry of built-in characters and the option catalog
src/characters/enhanced/index.ts    defaults
src/characters/enhanced/enhanced.css
src/characters/studio/index.ts
src/characters/studio/studio.css
src/palettes/index.ts               the names of the built-in palettes
src/palettes/palette.css            derives Payload's colors from each palette's base colors, and what every palette but Payload's shares: focus ring, fields, toggles, date picker and toasts
src/palettes/warm.css
src/palettes/studio.css
src/palettes/accent.css
src/options/radius.css
src/options/density.css
src/options/icons.css
src/options/motion.css
src/options/nav.css
src/options/nav-icons.css           the nav's Lucide icons, shared by icons: 'lucide' and the rail
src/styles/appearance-panel.css
src/styles/rail.css                 the rail's tooltip colors
src/styles/fields/*
```

- Each stylesheet stays one `@layer payload` block with one scope selector: `html[data-character='studio']`, `[data-palette='warm']`, `html[data-density='comfortable']` and so on. A palette's dark version nests under `[data-theme='dark']`.
- The Payload palette has no stylesheet: it is Payload's own colors.
- Characters and options set only shapes, sizes, spacing and motion, which the contract test checks. Colors live in the palettes, `accent.css` and the `src/styles` sheets for the panel, the fields and the rail's tooltips.
- Option stylesheets set Payload's own variables. `accent.css` remaps Payload's blue ramp from `--payloadpack-accent`; a palette's stylesheet builds on the same variable. Where Payload hard-codes a value, the fix goes in the option's stylesheet with a contract-test entry, as `density.css` and `motion.css` do.
- Characters and palettes are plain typed objects. The plugin config types are derived from the registries. There is no `defineCharacter()` helper.

## Studio

The Studio character:

- `frame: 'boxed'` puts each view in a soft card on the field; `flat` drops the card. The card's corners are `--radius-large` plus 6px, so they follow `radius`.
- `width: 'centered'` caps the content width; `full` drops the cap.
- The user menu moves to the bottom of the nav with CSS only: `.nav__header { display: contents }`, then `order` on the user menu. Payload's popover flips upward by itself.

The Studio palette mixes its field, nav and card surfaces from the accent into Payload's light and dark surfaces with `color-mix`, so any hex gets matching surfaces. The tint is faint: Copper gives a field of about `#f0ebe6`.

## What each setting drives

From Payload 4.0.0-beta.6's CSS:

- `accent`: every brand and selected token (`--color-bg-brand*`, `--color-bg-selected*`, `--color-border-brand*`, `--color-border-selected*`, `--color-icon-brand`, `--color-icon-selected`, `--color-text-brand`, `--color-text-selected`, the focus ring) reads one of Payload's 11 `--ramp-blue-*` and `--ramp-pale-blue-*` steps, declared once on `:root`.
  - `accent.css` remaps those steps from `--payloadpack-accent` with `color-mix`. Payload's dark mode already picks the lighter steps, so one accent works in both versions.
  - Each step goes through its own variable, `--ramp-blue-200: var(--payloadpack-accent-200, #e5f4ff)`. Without an accent that variable is invalid, so the step falls back to Payload's exact value, and the contract test checks every fallback against Payload's tokens. No attribute or inline style switches it on.
  - In light mode, brand and selected text and icons take a darker ink of the accent, and primary buttons get a faint edge when the accent is nearly white.
  - Text and icons on the accent turn black or white by the accent's lightness.
  - Payload's blue info backgrounds and presence badges take the accent too.
  - A palette without an accent keeps Payload's exact ramp. A palette that sets `#0d99ff` gets mixed shades instead.
  - No component hard-codes a blue.
- `radius`: `--radius-small`, `--radius-medium`, `--radius-large`, `--button-radius`, `--field-border-radius`, `--popup-radius` and `--popup-item-radius`. Components pick a tier directly, so the option sets the tiers.
- `font`: `--font-family-sans`. Payload loads Inter with `next/font` as an unlayered class on `<html>`, so the option needs a layered `!important` declaration. Geist loads with `next/font/google` in the server provider, with `preload: false` so only editors who use it download it, and the provider sets its family as `--payloadpack-font-geist` on `<html>`.
- `density`: what `density.css` already does.
- `motion`: what Payload 3 animated and Payload 4 dropped:
  - the drawer's backdrop fade and panel slide, now 300ms on an iOS-style drawer curve, `cubic-bezier(0.32, 0.72, 0, 1)`
  - the tooltip's fade, now 150ms in and 100ms out
  - the small transitions on fields, buttons and cards
  - new in this theme: popups, select menus and the date picker fade in and scale up from 95% at their trigger, sliding in 8px from it when they open above or below, and scale back out on close. Submenus scale from their top edge without a slide, because Payload flips them to the other side without saying so. Payload 3 never animated them. Modals stay still.
  - Timing is fixed per kind of component, never measured: popovers, menus, the date picker and tooltips take 150ms in and 100ms out on a strong ease-out, `cubic-bezier(0.23, 1, 0.32, 1)`; drawers and the Appearance sheet take 300ms in on the drawer curve and 200ms out.
- `width`: Payload has no content-width token. Only `admin.constrainWidth` caps the edit view. `centered` caps every view below the app header at 880px.

## Open

- README screenshots across characters and palettes. The compare screenshots show only Stock on Payload and Enhanced on Warm.

## Out of scope

Replacing Payload views. Characters or palettes registered by apps. Dark-mode depth options. Shims. Bold characters after Studio.
