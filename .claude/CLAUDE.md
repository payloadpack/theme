# payloadpack/theme

- `packages/theme` is the published package. `apps/demo` imports its `dist`, so run `bun run build` in `packages/theme` after every change.
- `apps/docs` is the docs site. The root `README.md` is the package README, and the build copies it into `packages/theme`, so never edit that copy.
- Run `bun run test` in `packages/theme` and `bun run test:e2e` in `apps/demo` before calling a change done. `bun run test:visual` in `apps/demo` (after e2e: they share a port) only compares against your own git-ignored macOS images; CI's visual job is the gate for how the admin looks.
- The visual baselines in `apps/demo/tests/__visual__` are Linux images from CI. Accept an intended visual change with the `update-visuals` pull request label, never by committing images by hand.
- Names in code, docs and UI follow `rules/naming.md`: use its terms and never its _Avoid_ words. When a change settles a new term, add it there.
- Commits and PR titles follow Conventional Commits. Never add AI attribution.
