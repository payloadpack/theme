#!/bin/bash
set -euo pipefail

if [[ -n "${CI:-}" ]]; then
  exec playwright test --project=visual "$@"
fi

repo_dir=$(cd "$(dirname "$0")/.." && pwd)
playwright_version=$(node -p "require('$repo_dir/apps/demo/package.json').devDependencies['@playwright/test']")
bun_version=$(node -p "require('$repo_dir/package.json').packageManager.split('@')[1]")

linux_only_mounts=(-v payloadpack-visual-node-modules:/work/node_modules -v payloadpack-visual-demo-next:/work/apps/demo/.next)
for workspace_dir in "$repo_dir"/apps/*/ "$repo_dir"/packages/*/; do
  workspace=$(basename "$workspace_dir")
  linux_only_mounts+=(-v "payloadpack-visual-$workspace-node-modules:/work/${workspace_dir#"$repo_dir"/}node_modules")
done

exec docker run --rm --ipc=host --platform linux/amd64 \
  -v "$repo_dir:/work" "${linux_only_mounts[@]}" -v payloadpack-visual-cache:/cache \
  -e CI=1 -e npm_config_cache=/cache/npm -e BUN_INSTALL_CACHE_DIR=/cache/bun \
  -w /work "mcr.microsoft.com/playwright:v$playwright_version-noble" \
  bash -c "npm install --global --silent bun@$bun_version \
    && bun install --frozen-lockfile \
    && (cd packages/theme && bun run build) \
    && cd apps/demo && bun run test:visual \"\$@\"" bash "$@"
