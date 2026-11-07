---
title: Styles
description: How the whole admin is laid out and behaves. Every style works with every palette.
---

| Style    | What it is                                                                                  |
| -------- | ------------------------------------------------------------------------------------------- |
| Payload  | Payload's own layout. Nothing to fine-tune.                                                 |
| Enhanced | Payload touched up without changing its structure. The default.                             |
| Studio   | Each view sits in a soft card on a field, and the user menu moves to the bottom of the nav. |

Enhanced and Studio both draw a 2px focus ring, widen the nav to 288px, and show checkbox columns in lists as a check or a muted x. Payload's internal collections such as `payload-jobs`, the `_verified` field of auth collections, and every field when `characters` is only `['payload']` keep Payload's checkbox cell.

## Fine-tune

Enhanced and Studio have the same seven options, with different starting values.

| Option   | Values                           | Enhanced    | Studio      |
| -------- | -------------------------------- | ----------- | ----------- |
| Corners  | None, Small, Medium, Large, Full | Medium      | Large       |
| Typeface | Inter, Geist, System             | Inter       | Geist       |
| Frame    | Boxed, Flat                      | Flat        | Boxed       |
| Density  | Compact, Comfortable             | Comfortable | Comfortable |
| Icons    | Payload, Lucide                  | Lucide      | Lucide      |
| Motion   | Off, Auto                        | Auto        | Auto        |
| Nav      | Rail, Hidden                     | Rail        | Rail        |

Density, Motion and Nav belong to the editor, so they stay put when switching style. Corners, Typeface, Frame and Icons are kept per style. **Reset** returns every option to the style's starting values, and **Undo** brings them back for a few seconds.

## What each option does

- **Corners** scales Payload's corner sizes. Medium keeps them, None squares them, and Full makes buttons, fields and tabs pill-shaped.
- **Typeface**: Inter is Payload's own font. [Geist](https://vercel.com/font) is bundled, so builds need no network. System uses the operating system's font.
- **Frame**: Boxed puts each view in a soft card 6px from the window's edges. Flat drops the card.
- **Density**: Comfortable sets 14px text, 36px fields and buttons and roomier dialogs. Compact is Payload's own spacing.
- **Icons**: Lucide replaces Payload's icons and adds icons to the nav and the document menu. They are bundled, so nothing loads from a CDN.
- **Motion**: Auto brings back the transitions Payload 3 had and stays still when the operating system asks for reduced motion. Off turns them off.
- **Nav**: Rail turns the collapsed nav into a 64px column of icons with tooltips. Hidden closes it the way Payload does. The rail is kept per browser in a `<cookiePrefix>-nav-rail` cookie, so Reset leaves it alone. At 768px and below the nav is Payload's own drawer.
