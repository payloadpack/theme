# Contributing

## Repository

| Path             | What                                                  |
| ---------------- | ----------------------------------------------------- |
| `packages/theme` | The published package                                 |
| `apps/demo`      | A Payload 4 app that uses the package, plus e2e tests |
| `apps/docs`      | The docs site, built with Astro Starlight             |
| `design`         | Design notes behind characters and palettes           |

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

## Test

| Command                             | What it checks                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| `cd packages/theme && bun run test` | Every Payload token, class, icon and hard-coded size the theme depends on still exists in Payload |
| `cd apps/demo && bun run test:e2e`  | The rendered sizes, colors and icons in a real browser                                            |

Run both after bumping Payload. A failing contract test names the token, class or hard-coded value that changed.

## Screenshots

The README and docs images in `.github/assets` come from the demo. When main changes the demo, the theme or `bun.lock`, the Screenshots workflow renders them on macOS and opens a pull request for any image that looks different. The same script runs locally and rewrites every image that renders differently on your machine, so leave committing them to the workflow:

```sh
cd apps/demo && bun run screenshots
```

The README's panel tour GIFs are recorded from the demo too, but every recording is a new file, so the workflow leaves them alone. Re-record them with [ffmpeg](https://ffmpeg.org) installed after a change to the Appearance panel:

```sh
cd apps/demo && bun run panel-tour
```

The icon tiles in `.github/assets/icons` are drawn from Lucide. Change the icons in `apps/docs/scripts/render-icon-tiles.mjs`, then:

```sh
cd apps/docs && bun run icons
```

## Docs

The docs site runs on http://localhost:4321/theme/:

```sh
cd apps/docs && bun run dev
```

The Release workflow deploys it to GitHub Pages after each release, so the site always matches the version on npm. To deploy it by hand, run the Docs workflow from the Actions tab.

## Release

Merge pull requests with a [Conventional Commits](https://www.conventionalcommits.org) title. Release Please opens a release pull request; merging it publishes the package to npm with provenance.

The release and screenshots workflows need the repository secret `PAYLOADPACK_RELEASE_BOT_TOKEN`. The release workflow publishes to npm through Trusted Publishing, so no npm token is stored.
