# NWSBox reference

Facts in this file come from the source tree at the documentation commit, plus public npm and GitHub reads on 2026-11-22. Secret values are omitted. Names are listed because the workflows and the CLI refer to them.

The user guide is the [README](../README.md). Architecture notes are in [TECHNICAL.md](../TECHNICAL.md).

## Version sources

| Source | Version | Notes |
| --- | --- | --- |
| `package.json` | 0.2.1 | What `npm version` reads when the publish workflow input is empty |
| `package-lock.json` | 0.2.1 | Matches `package.json` |
| `oclif.manifest.json` | 0.2.2 | Bumped in `8b39e09` without a matching `package.json` version change |
| git tag `0.4.6` | commit `8b39e09` | GitHub release "Latest", created 2025-12-06 |
| npm `nwsbox@latest` | 0.4.6 | `gitHead` `8b39e09`, engines `node >= 18`, maintainer account `xco.agency` |
| `HEAD` vs tag `0.4.6` | `c4b49cf` | Workflow triggers only |

npm versions that exist: 0.1.0, 0.2.0, 0.2.1, 0.4.3, 0.4.4, 0.4.6. GitHub release tags with no matching npm version include 0.4.0, 0.4.1, 0.4.2, 0.4.5, and `v0.0.1` through `v0.0.4`. Registry `time.modified` is 2026-09-03 with no version newer than 0.4.6.

## Environment variables

No `.env` file is checked in. The CLI does not require any variable to be set before `nwsbox` runs.

### Parent process (read)

`buildWorkspaceEnvironment` reads `PATH`, `TERM`, `SHELL`, `EDITOR`, `LANG`, and `LC_ALL`.

`activate` reads `SHELL` to choose bash/zsh syntax or fish syntax. When `SHELL` is unset it uses the bash form.

### `run` and `exec` (copied through, then overridden)

`mergeEnvironment` copies the whole parent environment, then applies the object from `buildWorkspaceEnvironment`. Parent variables that are not in that object stay as they are. That includes credentials that live in the environment.

| Name | When |
| --- | --- |
| `HOME` | Always. Workspace env directory (`.ws/env`). |
| `USERPROFILE` | Always. Same directory as `HOME`. |
| `XDG_CONFIG_HOME` | Always. `.ws/env/.config`. |
| `XDG_CACHE_HOME` | Always. `.ws/cache/xdg`. |
| `XDG_DATA_HOME` | Always. `.ws/env/.local/share`. |
| `XDG_STATE_HOME` | Always. `.ws/env/.local/state`. |
| `NPM_CONFIG_CACHE` | Always. `.ws/cache/npm`. |
| `YARN_CACHE_FOLDER` | Always. `.ws/cache/yarn`. |
| `PNPM_HOME` | Always. `.ws/cache/pnpm`. |
| `PATH` | Workspace Node `bin` (only if `config.node` is set), then `.ws/shims`, then the parent `PATH`. |
| `NODE_PATH` | Only when `config.node` is set. `<workspace>/node_modules`. |
| `TERM`, `SHELL`, `EDITOR`, `LANG`, `LC_ALL` | Set from the parent. An unset parent variable is passed as unset. |

### Bash shims (`.ws/shims/*`)

Each shim exports `HOME`, `USERPROFILE`, `XDG_CONFIG_HOME`, `XDG_CACHE_HOME`, `XDG_DATA_HOME`, `XDG_STATE_HOME`, `PATH`, `NPM_CONFIG_CACHE`, `YARN_CACHE_FOLDER`, and `PNPM_HOME`, using the same directory layout as the table above.

Shims do not export `NODE_PATH`, `TERM`, `SHELL`, `EDITOR`, `LANG`, or `LC_ALL`. Those keep whatever the calling shell already had. Shims are bash scripts (`#!/bin/bash`). The walk upward stops at `/`.

### GitHub Actions

| Name | Where |
| --- | --- |
| `NPM_TOKEN` | Actions secret referenced by the publish workflow. Presence in this repo's secret store returned HTTP 403 during the 2026-11-22 doc pass, so it is unverified. |
| `NODE_AUTH_TOKEN` | Environment variable on the `npm publish` step. The workflow sets it from `NPM_TOKEN`. |

No other `process.env` names appear in `src/`, `bin/`, or the workflows.

## Node install behavior

Download host is `https://nodejs.org/dist`.

- Input matching one numeric component after normalization (`v20`) loads `index.json` and picks the matching major with the newest `date`.
- Every other input is the tarball version. `18.17` is not expanded to a latest `18.17.x`.
- Unix extracts `.tar.gz` with `zlib` and `tar` (`strip: 1`) into `.ws/node/<version>/`.
- Windows requests `.zip` and rejects with `Windows ZIP extraction not yet implemented. Please extract manually or use WSL.`

`node install` writes the resolved version into `config.json` and makes it active. `node use` selects the first installed directory name that starts with the normalized version string.

## Commands that need a workspace

`node`, `run`, `exec`, `activate`, and `info` call `findWorkspaceRoot`. Missing `.ws/` raises `Not in a workspace. Run "nwsbox init" first.`

`init` refuses to run when `.ws/` already exists. It creates the directory tree and the shims before it downloads Node, so a failed download leaves a workspace with no active version.

`run` looks for `.ws/shims/<command>` and then uses `which`. `exec` does not look up a binary itself; the shell does.

## CI and publish

Both workflows are `workflow_dispatch` only as of `c4b49cf` (2026-08-24).

`CI` (`.github/workflows/ci.yml`):

- Job `test`: `ubuntu-latest` and `macos-latest` × Node 18, 20, 22. Steps: checkout, `npm ci`, `npm run typecheck`, `npm run build`, `npm test`.
- Job `lint-and-build`: Ubuntu, Node 20, `npm ci`, `npm run build`, then tests that `lib/`, `lib/index.js`, and `lib/commands/init.js` exist. No linter is installed.

`Publish to npm` (`.github/workflows/publish.yml`):

- Ubuntu, Node 20, registry `https://registry.npmjs.org`.
- Optional input `version`. Empty input reads `package.json`.
- `npm version <version> --no-git-tag-version`, then `npm ci`, typecheck, test, build, `oclif manifest`, `npm publish` with `NODE_AUTH_TOKEN`.
- A leftover `if` still checks `github.event_name == release`. The workflow no longer has a `release` trigger, so that branch is unused.

`gh run list` for `XCO-Agency/nwsbox` returned an empty list on 2026-11-22. Publish history is therefore taken from npm (`gitHead`) and from git tags, not from Actions logs.

## Coolify

Read-only search on 2026-11-22:

- Coolify production: query `nwsbox`, query `XCO-Agency/nwsbox`. Both returned count 0.
- Coolify staging: query `nwsbox`, query `github.com/XCO-Agency/nwsbox`. Both returned count 0.

The repo has no Docker or Coolify config of its own. A deploy outside those two teams would not show up in this search.

## Tests

`npm test` is `vitest run` (Vitest 1.6.1). 59 `it` cases, counted from the test files. They stay on the local filesystem. Coverage settings in `vitest.config.ts` name provider `v8` and reporters `text`, `json`, and `html`. The coverage package is not installed, and the test script does not pass `--coverage`.

`npm run test:ci` runs `test-ci.sh`, which repeats install, typecheck, build, test, and the `lib/` checks from CI.
