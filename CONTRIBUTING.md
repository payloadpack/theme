# Contributing

The conventions for code, naming and docs live in `.claude/`, next to the design notes.

## Repository

| Path             | What                                                  |
| ---------------- | ----------------------------------------------------- |
| `packages/theme` | The published package                                 |
| `apps/demo`      | A Payload 4 app that uses the package, plus e2e tests |
| `apps/docs`      | The docs site, built with Astro Starlight             |
| `.claude`        | Conventions, naming and design notes                  |

## Develop

```sh
bun install
cp apps/demo/.env.example apps/demo/.env
bun run dev
```

The demo runs on http://localhost:3020/admin and seeds itself on first start. Log in with `demo@payloadpack.com` / `demo`.

The demo imports the built package, so rebuild after changing it:

```sh
cd packages/theme && bun run build
```

The docs site runs on http://localhost:4321/theme/:

```sh
cd apps/docs && bun run dev
```

## Test

| Command                               | What it checks                                                                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cd packages/theme && bun run test`   | The plugin config, how an editor's setup resolves against it, the provider's server render, and that every Payload token, class, icon and hard-coded size the theme depends on still exists in Payload |
| `cd apps/demo && bun run test:e2e`    | The rendered sizes, colors and icons in a real browser, on a fresh production build of the demo                                                                                                        |
| `cd apps/demo && bun run test:visual` | Every admin view and overlay, pixel for pixel, against the approved screenshots in `apps/demo/tests/__visual__`                                                                                        |

Run all three after bumping Payload. A failing contract test names the token, class or hard-coded value that changed.

The approved screenshots are Linux images rendered in CI's Playwright container. `bun run test:visual` runs that same container in Docker as `linux/amd64`, so it needs Docker running and compares against exactly what CI does. The first run fills a few `payloadpack-visual-*` Docker volumes with Linux dependencies; later runs reuse them. It shares the e2e database with `test:e2e`, so run the two one after the other. To accept an intended visual change in a pull request, add the `update-visuals` label: CI renders the screenshots again, commits them to the branch, and the pull request shows each changed image.

## Images

| Command                                  | What it makes                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| `cd apps/demo && bun run screenshots`    | The README and docs screenshots. The Screenshots workflow opens a pull request with them |
| `cd apps/demo && bun run social-preview` | The social preview card. Upload it under the repository's Settings → Social preview      |
| `cd apps/demo && bun run panel-tour`     | The README's panel tour GIFs. Needs [ffmpeg](https://ffmpeg.org)                         |
| `cd apps/docs && bun run brand`          | The logo and the docs favicon                                                            |

## Release

Merge pull requests with a [Conventional Commits](https://www.conventionalcommits.org) title. Release Please opens a release pull request; merging it publishes the package to npm with provenance, and the docs site deploys to GitHub Pages. To deploy the docs by hand, run the Docs workflow from the Actions tab.

The release, screenshots and visual baseline workflows need the repository secret `PAYLOADPACK_RELEASE_BOT_TOKEN`. The release workflow publishes to npm through Trusted Publishing, so no npm token is stored.
