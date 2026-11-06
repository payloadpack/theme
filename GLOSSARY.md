# payloadpack/theme

An admin theme for Payload: editors pick how their admin panel looks, within the limits a developer sets in the plugin config.

## Language

**Character**:
How the whole admin panel is laid out and behaves: spacing, frame, nav, shape, type and motion. Everything except color. Each character declares which options it supports and their defaults. The Appearance panel labels it Style; code and config say character.
_Avoid_: theme, skin, look

**Payload** (character):
The character with Payload's own layout and behavior, and no options. With the Payload palette it is plain Payload.
_Avoid_: stock, default, none

**Enhanced**:
The character that touches up Payload's own layout without changing its structure.
_Avoid_: Neutral

**Studio**:
The first bold character: each view sits in a soft card on a field, the nav collapses to a rail and the user menu sits at the bottom.
_Avoid_: boxed theme

**Warm**:
The palette that tints the field and nav from its copper accent and takes the copper as its primary.
_Avoid_: Studio, which names a character

**Option**:
A setting inside a character, such as radius or density, with values and a default the character declares. The panel lists them under Fine-tune.
_Avoid_: control, appearance control, knob

**Personal option**:
An option an editor sets once for every character: density, motion and nav. The rest of the options keep a value per character.
_Avoid_: global option, shared option

**Palette**:
A named set of colors, in a light and a dark version, plus one accent. Payload's own light/dark setting picks the version. Palettes work with every character. Every palette is built from four base colors (background, surface, text, primary) per version, and an editor can make their own with Custom colors.
_Avoid_: theme, preset, color scheme, colorway

**Accent**:
The one color a palette marks links and statuses with, in both versions. Fills, selection borders and the active tab use the primary or grey instead. It belongs to the palette: editors change it by making their own palette.
_Avoid_: primary, brand color

**Token sheet**:
The short list of `--payloadpack-` tokens in the README's Customize section. Palettes set only these, a developer can override them in their own CSS, and the theme maps them onto Payload's own color, shadow, corner and motion tokens.
_Avoid_: design tokens, theme variables, CSS variables

**Setup**:
What one editor picked: a character, its options, a palette and, when they made one, their own palette's colors. It can be copied and pasted between editors, and, on a built-in palette, pasted into the plugin config as the site default.
_Avoid_: preset, config, profile

**Rail**:
The narrow column of nav icons a collapsed nav becomes when the `nav` option is `rail`.
_Avoid_: mini sidebar, icon sidebar, collapsed sidebar

**Appearance panel**:
The panel where an editor picks their setup.
_Avoid_: customizer, settings dropdown, theme menu
