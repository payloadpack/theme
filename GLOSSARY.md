# payloadpack/theme

An admin theme for Payload: editors pick how their admin panel looks, within the limits a developer sets in the plugin config.

## Language

**Character**:
How the whole admin panel is laid out and behaves: spacing, frame, nav, shape, type and motion. Everything except color. Each character declares which options it supports and their defaults.
_Avoid_: theme, style, skin, look

**Stock**:
The character with Payload's own layout and behavior, and no options. With the Payload palette it is plain Payload.
_Avoid_: default, none

**Enhanced**:
The character that touches up Payload's own layout without changing its structure.
_Avoid_: Neutral

**Studio**:
The first bold character: each view sits in a soft card on a field, the nav collapses to a rail and the user menu sits at the bottom. Also the name of the palette that tints that field from the accent.
_Avoid_: boxed theme

**Option**:
A setting inside a character, such as radius or density, with values and a default the character declares.
_Avoid_: control, appearance control, knob

**Palette**:
A named set of colors, in a light and a dark version, plus one accent. Payload's own light/dark setting picks the version. Palettes work with every character. Every palette is built from four base colors (background, surface, text, primary) per version, and an editor can make their own with New palette.
_Avoid_: theme, preset, color scheme, colorway

**Accent**:
The one color a palette builds its brand and selected states from, in both versions. It belongs to the palette: editors change it by making their own palette.
_Avoid_: primary, brand color

**Setup**:
What one editor picked: a character, its options, a palette and, when they made one, their own palette's colors. It can be copied and pasted between editors, and, on a built-in palette, pasted into the plugin config as the site default.
_Avoid_: preset, config, profile

**Rail**:
The narrow column of nav icons a collapsed nav becomes when a character's `nav` option is `icons`.
_Avoid_: mini sidebar, icon sidebar, collapsed sidebar

**Appearance panel**:
The panel where an editor picks their setup.
_Avoid_: customizer, settings dropdown, theme menu
