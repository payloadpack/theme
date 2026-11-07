---
title: Customize
description: Restyle the whole admin from one short sheet of tokens.
---

The theme's CSS sits in `@layer payload`, so your own admin stylesheet overrides it without specificity fights.

## Token sheet

Every palette except Payload's is drawn from these tokens. A palette sets at least the background, surface, text and primary for light, and the first three again for dark, usually with an accent. The rest follow from them until you set them too. Danger, success and warning stay Payload's red, green and yellow, apart from the toast icons.

| Token                                 | Controls                                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `--payloadpack-bg-app`                | The field behind the nav and the views                                                              |
| `--payloadpack-bg-surface`            | Cards, fields, menus and dialogs                                                                    |
| `--payloadpack-text-primary`          | Text and icons                                                                                      |
| `--payloadpack-action-primary`        | Primary buttons, checked toggles, a picked date, selection borders, the active tab and the focus    |
| `--payloadpack-accent`                | Links and status marks                                                                              |
| `--payloadpack-bg-subtle`             | Quiet fills, hovers and presses: banners, pills, thumbnails and focused options                     |
| `--payloadpack-bg-selected`           | Selected nav links, rows and options; flat with `--payloadpack-elevation-selected: none`            |
| `--payloadpack-bg-field`              | Text fields, selects and code editors, a shade lighter than the surface in dark mode                |
| `--payloadpack-bg-popover`            | Menus, select lists, the date picker and the slash menu; the surface, lighter in dark               |
| `--payloadpack-border-default`        | Lines, field borders and the edge of menus, select lists and toasts                                 |
| `--payloadpack-text-secondary`        | Labels, descriptions, the nav and secondary icons                                                   |
| `--payloadpack-text-muted`            | Placeholders, group headings and hints                                                              |
| `--payloadpack-text-disabled`         | Disabled buttons, options and their icons                                                           |
| `--payloadpack-action-primary-text`   | Text on the primary color, black or white by default, whichever reads                               |
| `--payloadpack-focus-ring`            | Keyboard focus ring, the primary color by default                                                   |
| `--payloadpack-status-success`        | Success toast icon                                                                                  |
| `--payloadpack-status-info`           | Info toast icon                                                                                     |
| `--payloadpack-status-warning`        | Warning toast icon                                                                                  |
| `--payloadpack-status-error`          | Error toast icon                                                                                    |
| `--payloadpack-elevation-card`        | The active sidebar tab, the panel's segments and previews, the selected nav link and Studio's frame |
| `--payloadpack-elevation-selected`    | The selected nav link, the card shadow by default; `none` with a selected fill is flat              |
| `--payloadpack-elevation-popover`     | Menus, select lists, drawers, the list's sticky header and Enhanced's toasts                        |
| `--payloadpack-elevation-dialog`      | Dialogs, the command palette and the Appearance panel                                               |
| `--payloadpack-radius-control`        | Buttons, fields, banners and pills, on top of Corners                                               |
| `--payloadpack-radius-card`           | Cards, dialogs, the date picker and Studio's frame, on top of Corners                               |
| `--payloadpack-motion-hover-duration` | How long a field's focus ring and a card's shadow take to change                                    |
| `--payloadpack-motion-hover-easing`   | The curve of that change                                                                            |
| `--payloadpack-motion-enter-duration` | How long popups, menus and tooltips take to appear; they close in two thirds, tooltips within 200ms |
| `--payloadpack-motion-enter-easing`   | The curve they appear and close on                                                                  |
| `--payloadpack-motion-panel-duration` | How long the nav takes to collapse and open                                                         |
| `--payloadpack-motion-panel-easing`   | The curve it moves on                                                                               |

Set colors and shadows per mode inside a palette. A value set outside the dark block applies to dark mode too, so give it a dark value there or set it to `initial`. Enhanced contrast swaps in Payload's own stronger steps for lines and for secondary, muted and disabled text. Shapes and motion don't change with the mode, and apply under Enhanced and Studio:

```css
[data-palette='neutral'] {
  --payloadpack-border-default: #e5e5e5;

  &[data-theme='dark'] {
    --payloadpack-border-default: #262626;
  }
}

html {
  --payloadpack-radius-card: 1rem;
  --payloadpack-motion-panel-duration: 300ms;
}
```

## Toolbar heights

Each toolbar sizes its buttons from its own token. All but the menu items default to Payload's `--button-height`:

| Token                                       | Controls                                 |
| ------------------------------------------- | ---------------------------------------- |
| `--payloadpack-doc-header-button-height`    | Title bar with Edit, Versions and API    |
| `--payloadpack-doc-controls-button-height`  | Status and actions bar of a document     |
| `--payloadpack-list-header-button-height`   | List title bar and its selection bar     |
| `--payloadpack-list-controls-button-height` | List toolbar: Filters, Group by, Columns |
| `--payloadpack-row-button-height`           | Array and block rows                     |
| `--payloadpack-menu-item-height`            | Popup menu items, 32px                   |

```css
html {
  --payloadpack-row-button-height: 2.5rem;
}
```

## Checkboxes and radios

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

## Switch

Switches take their colors from the checkbox tokens and their shape from these. Set them on `.payloadpack-switch`:

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
