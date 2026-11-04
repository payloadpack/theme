# Appearance

How characters, palettes and the Appearance panel work. Terms follow [GLOSSARY.md](../GLOSSARY.md).

An editor's look is two independent choices: a **character** (how the admin is laid out and behaves, labelled Style in the panel) and a **palette** (its colors, in a light and a dark version). Payload's own light/dark setting, labelled Theme in the panel, picks which version of the palette shows.

## Status

Built: the three characters with every option below, the Payload, Neutral and Warm palettes defined from base colors in CSS with an accent each, setups shared with Share setup, the Appearance panel and the rail.

Built since: an editor's own palette with **Custom colors** and **Copy as CSS**. The accent is part of a palette: the panel has no accent picker and the plugin has no `accent` option.

Planned, not built: palettes a developer defines in CSS and lists by name in `palettes`, and a heading font.

## Characters

Three built-in characters. Apps cannot register their own. A character owns everything except color.

| Character | What it is                                                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Payload   | Payload's own layout and behavior. No options.                                                                                     |
| Enhanced  | Payload touched up without changing its structure: roomier, lifted date picker and toasts, Lucide icons. The zero-config default.  |
| Studio    | The first bold character: each view sits in a soft card on a field, the nav collapses to a rail, the user menu sits at the bottom. |

Characters restyle only through CSS and Payload's own slots (providers, header actions, nav slots). No Payload view is replaced: no dashboard, command palette, login or document outline.

### Options

Each character declares which options it supports and their defaults. Enhanced and Studio support the same seven; the Payload character has none. The panel lists them under Fine-tune.

| Option    | Values                                                                       | Enhanced      | Studio        |
| --------- | ---------------------------------------------------------------------------- | ------------- | ------------- |
| `radius`  | `none` `sm` `md` `lg` `full`                                                 | `md`          | `lg`          |
| `font`    | `inter` (which Payload already loads), `geist` or `system`                   | `inter`       | `geist`       |
| `frame`   | `boxed` `flat`                                                               | `flat`        | `boxed`       |
| `density` | `compact` `comfortable`                                                      | `comfortable` | `comfortable` |
| `icons`   | `payload` `lucide`                                                           | `lucide`      | `lucide`      |
| `motion`  | `off` `auto`: restores the transitions Payload 4 removed and animates popups | `auto`        | `auto`        |
| `nav`     | `rail` `hidden`: what a collapsed nav becomes                                | `rail`        | `rail`        |

- `density`, `motion` and `nav` are personal options: an editor's pick carries to every character. The other four keep a value per character, so Studio's radius and Enhanced's radius are separate.
- `radius: 'md'` is Payload's own radius tiers; `none`, `sm`, `lg` and `full` scale them.
- `motion: 'auto'` follows `prefers-reduced-motion`.
- The `font` option will gain a heading font, `sans` or `serif`, so a character can pair a serif display face with a sans body.

## Palettes

A palette is CSS, the way Tailwind v4 defines design tokens: a block scoped to `[data-palette='<name>']` that sets `--payloadpack-background`, `--payloadpack-surface`, `--payloadpack-text`, `--payloadpack-primary` and `--payloadpack-accent`, with the dark values in a nested `&[data-theme='dark'], [data-theme='dark']:not([data-palette])` block that also reaches Payload's dark popups. The `:not([data-palette])` keeps one palette's dark values off another palette's preview card. No `light-dark()`: Next's CSS compiler rewrites it for its default browser targets. The same block is a built-in palette, an editor's palette (rendered in a `<style>` element) and the Copy as CSS export. One shared stylesheet, `palette.css`, derives Payload's grey ramp from them with `color-mix` in sRGB, with mixes that give back Payload's own light greys from white and `#1a1a1a`, and remaps Payload's translucent black (light) and white (dark) text ramps to the palette's text, so muted text and icons share its hue. Dark mode mixes in bigger steps than light, because the same step reads smaller on a dark surface. A palette pins any shade the mix doesn't give, as Neutral does for its dark border and muted text. Built-in and custom palettes are the same shape, so a new palette costs only its colors. Because the scope is the attribute and not only `<html>`, a preview card with `data-palette="clay"` shows the palette's real colors. Palettes work with every character, Payload included. There are no presets.

| Base color | What it paints                                                        |
| ---------- | --------------------------------------------------------------------- |
| background | the page, or the field behind Studio's cards                          |
| surface    | cards, fields, menus                                                  |
| text       | text and icons; muted text is mixed from it                           |
| primary    | primary buttons, checked toggles, solid selections and the focus ring |
| accent     | links, marks and selection borders                                    |

| Palette | Light                               | Dark                                                              | Accent                      |
| ------- | ----------------------------------- | ----------------------------------------------------------------- | --------------------------- |
| Payload | Payload's own Figma UI3 colors      | Payload's own Figma UI3 colors                                    | `#0d99ff`                   |
| Neutral | `#f7f7f7` field, white cards        | near-black: `#0a0a09` nav, `#0f0f0e` page, `#f3f2ed` text         | its text                    |
| Warm    | a faintly tinted field, white cards | the same tint on near-black, cards a shade lighter than the field | `#c2410c`, also its primary |

- The Payload palette applies no overrides, so plain Payload is the Payload character with the Payload palette. Today's look is Enhanced with Neutral, the zero-config default.
- A palette's primary is its `--payloadpack-primary` line, per version. Neutral sets it to its text color, so its primary buttons are near-black in light mode and near-white in dark mode; Warm sets it to its copper accent; a palette without one falls back to its text color. Text on it turns black or white by its lightness, and a nearly white primary gets a faint edge in light mode.
- A palette's accent is its `--payloadpack-accent` line, and a palette without one keeps Payload's blue. Neutral sets its accent to its text color in each version, so it has no blue at all. One accent serves both versions: the theme mixes the shades itself.
- Fills never take the accent. Selected and open items fill grey, from Payload's `--color-bg-tertiary`, with the text color on top. Every solid selection, such as a picked date, takes the primary. In menus an open item looks like a hovered one. The focus ring takes the primary's hue: the outline at most 0.6 oklch lightness in light mode and at least 0.6 in dark mode, the field ring at 0.7 with 60% of the chroma in light mode and 0.55 in dark mode, so it stays visible on any primary and Neutral's stays grey.
- Editors create a palette with **Custom colors** in the panel: it starts from the current palette's colors, read from the browser so any CSS palette works, and shows the three color fields for each mode and the accent. Every color is a lowercase `#rrggbb`, checked on the server like every other choice. The provider renders it as the same CSS block, named `custom`, in a `<style>` element in the server HTML, and saves it into their setup, so a shared setup carries it to colleagues. Picking another palette keeps it in the setup; **Remove custom colors** drops it.
- **Copy as CSS** copies an editor's palette as the CSS block the page renders. Planned: developers paste it into their admin stylesheet (Payload's `custom.scss`) under their own name and list that name in `themePlugin({ palettes: [...] })` to offer it to everyone.
- The package ships no palette named after another company or product.

## Plugin config

```ts
themePlugin({
  character: 'studio',
  characters: ['enhanced', 'studio'],
  options: { studio: { frame: 'flat' } },
  palette: 'warm',
  palettes: ['payload', 'warm', 'clay'],
  panel: ({ user }) => user?.role === 'admin'
})
```

- `character` and `palette` are the defaults. Zero config is `'enhanced'` and `'neutral'`.
- `characters` lists the characters editors may pick. `palettes` lists the palettes they may pick by name: built-in ones, and later your own palettes defined in CSS, such as `clay` above. The config never holds colors. Default: everything built in. The plugin throws at startup when a default isn't allowed.
- `options` holds option values per character. Each key is typed with only that character's options, so `options: { payload: { frame: 'flat' } }` is a type error: the Payload character has no key.
- `panel` is `true`, `false` or `({ user }) => boolean`. Default `true`. When it resolves to `false`, the editor gets no panel button and their saved setup is ignored.
- `codeEditorFontSize` stays as it is.

## Setups

A setup is what an editor picked: a character, that character's options, their personal options, a palette and, when they made one, their own palette's colors. On a built-in palette it has the same shape as the plugin config above, minus `characters`, `palettes` and `panel`.

- Priority, lowest to highest: built-in defaults, the developer's config, the editor's setup.
- A setup holds only what differs from the defaults below it. Options are kept per character, so switching back and forth keeps each one's tweaks; personal options are kept once, unless a pick matches every character's default, so the editor keeps following the defaults. A copied setup puts every option under `options[character]`, the plugin config's shape, and reading it lifts the personal ones out.
- The server checks every value against the allowed characters, palettes and each option's values. Anything unknown falls back to its default.
- Signed-in editors' setups are saved in Payload's own preferences (`payload-preferences`, key `payloadpack-appearance`), so a setup follows the editor to every browser. The server reads it with the page and renders the attributes, so there is no flash.
- The same setup is mirrored into a `<cookiePrefix>-appearance` cookie, which the server uses on the login page and every other signed-out view. With no saved preference yet, the cookie applies for signed-in editors too.
- `panel` is not called on signed-out views, which have no user. The cookie applies there unless `panel` is `false`.
- After the login form, the provider loads the saved setup without a reload when `panel` is `true`. The client cannot call a `panel` function, so with one the setup applies from the next full page load.
- Reset puts the active character's options and the personal options back to their defaults, and keeps the character, the palette and the editor's own colors. The footer offers Undo for a few seconds.
- Sharing: the **Share setup** menu's **Copy setup** copies the setup as JSON, with the character and palette always included, so another editor gets the same look. **Paste setup** reads a copied setup from the clipboard, checks it like any other, and the footer says so for a moment when the clipboard holds no valid setup. A pasted setup replaces the character, its options, the personal options that character has and the palette, and keeps your options for other characters and your other personal options. A setup that carries an editor's own palette replaces yours; one without keeps it. A developer can paste the same JSON into `themePlugin()` to make it the site default, unless it uses the editor's own palette.
- The old `admin-theme`, `density` and `icons` cookies are left to expire. There are no shims for the old attributes, cookies or the `appearanceControls` export.

## Theme

Theme is Payload's own light/dark preference: the panel calls `useTheme().setTheme('light' | 'dark' | 'auto')`, which switches without a reload and writes Payload's `<cookiePrefix>-theme` cookie. When `admin.theme` is fixed, Payload hides its own switch and the panel hides its Theme section. Reset does not touch it.

## The Appearance panel

- A Lucide `palette` icon button, on every Default-template view. Under Enhanced and Studio it sits in the nav beside the collapse button (`beforeNav`, placed with CSS anchor positioning): right of it under Studio, left of it under Enhanced, and under it in the rail. Under the Payload character, on phones and while a `hidden` nav is closed, it is in the header actions (`admin.components.actions`) instead. The sheet both buttons open renders once in the theme's provider, so the nav button opens it on custom views too. Custom views render no header actions, so under the Payload character, on phones and while a `hidden` nav is closed they have no Appearance button. Signed-out views have no slot for it.
- It opens a side sheet docked to the right edge, full height, 360px wide, built on the native `popover` attribute: Escape and a click outside close it. The page stays visible beside it.
- Below 768px the sheet rises from the bottom, 70% of the screen high, with a close button in its header.
- Every change applies at once. There is no Save button.
- Sections, top to bottom:
  1. Theme: Light, Dark, Automatic. Hidden when `admin.theme` is fixed.
  2. Palette: one card per allowed palette, showing its light and dark halves side by side, and Custom colors under them. While the editor's own palette is picked: its color fields for each mode, its accent, Copy as CSS and Remove custom colors. Hidden when only one palette is allowed.
  3. Style: one card per allowed character, each a small preview, and a one-line description of the picked one. Under it, Fine-tune: a collapsible with the character's options, a count of what changed and a Reset button. The Payload character has no Fine-tune.
  4. A footer with the Share setup menu and a status line, which says what Copy, Paste and Reset did instead of Payload's toasts, which would sit under the sheet in the top layer.
- Every choice is a native radio inside its label, so each group is one Tab stop and the arrow keys move through it. The panel keeps its own control height and Inter, whatever the density and typeface.
- The panel is styled with Payload's `--color-*` tokens, so it follows the active character, palette and theme.
- Every label is a Payload i18n key under a `payloadpack` namespace. English ships; apps add languages through their own `i18n.translations`. Character and palette names are keys too, so an app can rename them.

## The rail

With `nav: 'rail'`, a collapsed nav becomes a 64px rail of icons instead of disappearing.

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
  data-density="comfortable"
  data-icons="lucide"
  data-motion="auto"
  data-nav="rail"
  data-rail=""
  data-palette="warm"></html>
```

`data-rail` is there only while the nav is collapsed to the rail. Under the Payload character, no option attribute is rendered, so no option stylesheet can apply. The palette applies under any character.

```
src/characters/index.ts             the registry of built-in characters and the option catalog
src/characters/enhanced/index.ts    defaults
src/characters/enhanced/enhanced.css
src/characters/studio/index.ts
src/characters/studio/studio.css     the nav's layout: the collapse button's corner, the user menu at the bottom
src/characters/shared.css           what Enhanced and Studio share: the 2px focus ring, the sidebar tabs, the 288px nav on a 12px gutter, inset group dividers and the nav group chevron
src/palettes/index.ts               the names of the built-in palettes
src/palettes/palette.css            derives Payload's colors from each palette's base colors, and what every palette but Payload's shares: focus ring, fields, toggles, date picker, toasts and the slash menu's scrollbar
src/palettes/neutral.css
src/palettes/warm.css
src/palettes/accent.css
src/options/radius.css
src/options/font.css
src/options/frame.css
src/options/density.css
src/options/icons.css
src/options/motion.css
src/options/nav.css
src/options/nav-icons.css           the nav's Lucide icons, shared by icons: 'lucide' and the rail
src/styles/appearance-panel.css
src/styles/rail.css                 the rail's tooltip colors
src/styles/fields/*
```

- Each stylesheet stays one `@layer payload` block with one scope selector: `html[data-character='studio']`, `[data-palette='neutral']`, `html[data-density='comfortable']` and so on. A palette's dark version nests under `[data-theme='dark']`.
- The Payload palette has no stylesheet: it is Payload's own colors.
- Characters and options set only shapes, sizes, spacing and motion, which the contract test checks. A character may draw a line in Payload's own `--color-border`, which is Payload's line color rather than a palette color. Colors live in the palettes, `accent.css` and the `src/styles` sheets for the panel, the fields and the rail's tooltips.
- Option stylesheets set Payload's own variables. `accent.css` remaps Payload's blue ramp from `--payloadpack-accent`; a palette's stylesheet builds on the same variable. Where Payload hard-codes a value, the fix goes in the option's stylesheet with a contract-test entry, as `density.css` does.
- Characters and palettes are plain typed objects. The plugin config types are derived from the registries. There is no `defineCharacter()` helper.

## Studio

The Studio character:

- Its defaults pick `frame: 'boxed'`, which puts each view in a soft card on the field; `flat` drops the card. The card's corners are `--radius-large` plus up to 6px, so they follow `radius` and go square at `none`. The option lives in `options/frame.css`, so Enhanced can box its views too.
- The user menu moves to the bottom of the nav with CSS only: `.nav__header { display: contents }`, then `order` on the user menu. Payload's popover flips upward by itself.

The Warm palette mixes its field, nav and card surfaces from the accent into Payload's light and dark surfaces with `color-mix`, so any hex gets matching surfaces. The tint is faint: Copper gives a field of about `#f0ebe6`.

## What each setting drives

From Payload 4.0.0-beta.6's CSS:

- `primary`: `--color-bg-brand`, its hover and pressed shades, the `onbrand` text and icon colors, `--color-bg-selected-strong*` and the focus ring, in `palette.css`.
- `accent`: every other brand token and the selection borders (`--color-bg-brand-secondary`, `--color-bg-brand-tertiary*`, `--color-border-brand*`, `--color-border-selected*`, `--color-icon-brand`, `--color-text-brand`) read one of Payload's 11 `--ramp-blue-*` and `--ramp-pale-blue-*` steps, declared once on `:root`.
  - `accent.css` remaps those steps from `--payloadpack-accent` with `color-mix`. Payload's dark mode already picks the lighter steps, so one accent works in both versions.
  - Each step goes through its own variable, `--ramp-blue-200: var(--payloadpack-accent-200, #e5f4ff)`. Without an accent that variable is invalid, so the step falls back to Payload's exact value, and the contract test checks every fallback against Payload's tokens. No attribute or inline style switches it on.
  - In light mode, brand text takes a darker ink of the accent. Brand icons and marks, like the active tab's bar, take the accent itself, darkened only past an oklch lightness of 0.6 so a pale accent stays visible. Primary buttons get a faint edge when the accent is nearly white.
  - Text and icons on the accent turn black or white by the accent's lightness.
  - Payload's blue info backgrounds and presence badges take the accent too.
  - A palette without an accent keeps Payload's exact ramp. A palette that sets `#0d99ff` gets mixed shades instead.
  - No component hard-codes a blue.
- `radius`: `--radius-small`, `--radius-medium`, `--radius-large`, `--button-radius`, `--field-border-radius`, `--popup-radius` and `--popup-item-radius`. Components pick a tier directly, so the option sets the tiers. Menus and toasts take `--popup-radius`, the menu item's corner plus up to 4px, instead of Payload's card tier. `full` sets `--button-radius` and `--field-border-radius` to half the control height rather than 9999px: controls still draw as pills, and taller boxes that read the same token, such as collapsibles and the focus ring, keep plain corners.
- `font`: `--font-body`, the body font Payload reads, and the two body tokens Payload's dashboard widgets read, `--text-body-medium-font-family` and `--text-body-large-strong-font-family`, so `--font-family-sans` and the panel keep Inter. Geist ships in the package as a variable woff2 under the SIL Open Font License, declared with `@font-face` in `styles/index.css` as `payloadpack-geist`, so builds need no network and the browser downloads it only when an editor uses it. Until it loads, text sets in `payloadpack-geist-fallback`, Arial, or Arimo or Liberation Sans where Arial is missing, resized to Geist's metrics with the values `next/font` computes, so nothing shifts when Geist arrives.
- `density`: what `density.css` already does.
- `motion`: what Payload 3 animated and Payload 4 dropped:
  - not the drawer's fade and slide: Payload 4 unmounts a drawer on close, so only its opening could animate, and it opens at once instead. Select menus unmount too, but a menu that only animates in reads as quick, so they keep it.
  - the tooltip's fade, now 150ms in and 100ms out
  - the small transitions on fields, buttons and cards, now on every field's focus ring, checkboxes, radios and switches included, and the switch's 200ms slide. With motion off none of them animate.
  - new in this theme: popups and select menus fade in and scale up from 95% at their trigger, sliding in 8px from it when they open above or below, and scale back out on close. Submenus scale from their top edge without a slide, because Payload flips them to the other side without saying so. Payload 3 never animated them. Modals stay still. The date picker opens at once: react-datepicker unmounts it on close, so only its opening could animate, and floating-ui moves it with a `transform` that a scale would pull toward the page's top-left corner.
  - new in this theme: a nav group's chevron turns. Its links open and close at once, because Payload unmounts a closed group's links and an animation on open alone looks half done.
  - Timing is fixed per kind of component, never measured: popovers, menus and tooltips take 150ms in and 100ms out on a strong ease-out, `cubic-bezier(0.23, 1, 0.32, 1)`; the Appearance sheet takes 300ms in on an iOS-style drawer curve, `cubic-bezier(0.32, 0.72, 0, 1)`, and 200ms out; the nav group chevron takes 200ms. Menu items and nav links switch at once on hover, icon included.

## Open

- README screenshots across characters and palettes. The compare screenshots show only Payload on Payload and Enhanced on Neutral.

## Out of scope

Replacing Payload views. Characters or palettes registered by apps. Dark-mode depth options. Shims. Bold characters after Studio.
