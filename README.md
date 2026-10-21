# payloadpack/theme

Source for [`@payloadpack/theme`](packages/theme), an admin theme for Payload 4.

| Path             | What                                                  |
| ---------------- | ----------------------------------------------------- |
| `packages/theme` | The published package                                 |
| `apps/demo`      | A Payload 4 app that uses the package, plus e2e tests |

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

## Release

Merge pull requests with a [Conventional Commits](https://www.conventionalcommits.org) title. Release Please opens a release pull request; merging it publishes the package to npm with provenance.

The release workflow needs the repository secret `PAYLOADPACK_RELEASE_BOT_TOKEN`. It publishes to npm through Trusted Publishing, so no npm token is stored.
