# payloadpack/theme

- `packages/theme` is the published package. `apps/demo` imports its `dist`, so run `bun run build` in `packages/theme` after every change.
- The root `README.md` is the package README. The build copies it into `packages/theme`, so never edit that copy.
- CSS has no comments except numbered section headers. Each stylesheet is one `@layer payload` block with one scope selector: `html[data-character='<name>']` in `src/characters`, `html[data-palette='<name>']` or `html[data-accent]` in `src/palettes`, an option attribute such as `html[data-density='comfortable']` in `src/options`, or a `.payloadpack-*` class or `html[data-rail]` in `src/styles` (fields, the panel, the nav logo and the rail's tooltips). `src/styles/index.css` imports every stylesheet.
- The theme's own custom properties use the `--payloadpack-` prefix. Never declare a token that looks like Payload's.
- When Payload hard-codes a `--spacer-*` size, fix it in `src/options/density.css` and add the stock declaration to `hardCodedByPayload` in `test/contract.test.ts`.
- Run `bun run test` in `packages/theme` and `bun run test:e2e` in `apps/demo` before calling a change done.
- Commits and PR titles follow Conventional Commits. Never add AI attribution.
