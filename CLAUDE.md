# payloadpack/theme

- `packages/theme` is the published package. `apps/demo` imports its `dist`, so run `bun run build` in `packages/theme` after every change.
- CSS has no comments except numbered section headers. Each stylesheet is one `@layer payload` block with one scope selector: `html[data-admin-theme='neutral']`, `html[data-density='comfortable']`, `html[data-icons='lucide']`, or the field's `.payloadpack-*` class in `src/styles/fields`. `src/styles/index.css` imports every stylesheet.
- The theme's own custom properties use the `--payloadpack-` prefix. Never declare a token that looks like Payload's.
- When Payload hard-codes a `--spacer-*` size, fix it in `src/styles/comfortable.css` and add the stock declaration to `hardCodedByPayload` in `test/contract.test.ts`.
- Run `bun run test` in `packages/theme` and `bun run test:e2e` in `apps/demo` before calling a change done.
- Commits and PR titles follow Conventional Commits. Never add AI attribution.
