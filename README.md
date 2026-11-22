# NWSBox

NWSBox is a command-line tool from [XCO Agency LLC](https://github.com/XCO-Agency). It gives one project directory its own Node.js install and points CLI config, auth files, and package-manager caches at a `.ws/` directory inside that project. The binaries are `nwsbox` and `nwsb`.

The repository is [XCO-Agency/nwsbox](https://github.com/XCO-Agency/nwsbox). It does not describe a hosted XCO service. People install the public npm package [`nwsbox`](https://www.npmjs.com/package/nwsbox). Searches of the Coolify production team and the Coolify staging team for `nwsbox` and for `XCO-Agency/nwsbox` returned no resources (2026-11-22). Use on machines outside those two Coolify teams is not recorded here.

## Status

The repository looks dormant. Every product commit is from 2025-12-06, the day the repo was created. The only later commit, `c4b49cf` on 2026-08-24, switched both GitHub workflows to manual `workflow_dispatch`. npm `latest` is **0.4.6**, published 2025-12-06 from git tag `0.4.6` (`8b39e09`). This branch is one commit after that tag, and that commit touches only `.github/workflows/`.

Committed version fields disagree with the registry:

| Source | Version |
| --- | --- |
| `package.json` and `package-lock.json` | 0.2.1 |
| `oclif.manifest.json` | 0.2.2 |
| npm `latest` and GitHub release `0.4.6` | 0.4.6 |

`npm publish` in `.github/workflows/publish.yml` runs `npm version` in the workflow and does not commit that version back. The registry `time.modified` timestamp is 2026-09-03. The version list has no release after 0.4.6, so that timestamp is not a newer package. What changed on the registry that day is not visible from `npm view`.

GitHub Actions run history for this repository returned no workflow runs. The 0.4.6 tarball's `gitHead` is `8b39e09`. Whether that publish went through Actions or a local `npm publish` is not visible in the run list. The npm maintainer account is `xco.agency`. Whether the `NPM_TOKEN` Actions secret still exists could not be checked (the secrets API returned 403).

## What a workspace isolates

`nwsbox init` creates `.ws/` in the current directory. Later commands and the generated shims:

- prepend a workspace Node.js `bin` directory and `.ws/shims` to `PATH`
- point `HOME` and `USERPROFILE` at `.ws/env`, so tools that store files under the home directory write there
- point the XDG config, cache, data, and state directories, plus npm, Yarn, and pnpm cache variables, at directories inside `.ws/`

`run` and `exec` copy the parent process environment and then apply those overrides. Variables already set in the parent (cloud tokens, `NPM_TOKEN`, and anything else) stay set. The shims do the same: they export the workspace paths and leave the rest of the shell environment in place. Isolation here is the Node binary plus the directories those tools treat as home, config, and cache.

Default shims are `node`, `npm`, `npx`, `yarn`, and `pnpm`.

## Requirements

- Node.js `>=18` (`engines` in `package.json`). CI is defined for Node 18, 20, and 22.
- macOS and Linux can download and extract official Node tarballs.
- Windows can run the CLI. `nwsbox node install` builds a `.zip` URL and then stops with `Windows ZIP extraction not yet implemented. Please extract manually or use WSL.`

## Install

The published package is 0.4.6. This checkout's `package.json` still says 0.2.1.

```bash
npm install -g nwsbox
nwsbox --version
nwsb --version
```

`pnpm` and `yarn` can install the same npm package. This repository is developed with npm (`package-lock.json`, `npm ci` in CI).

## Quick start

```bash
cd my-project
nwsbox init --node 20 --name "my-project"
eval "$(nwsbox activate)"
node --version
npm install
nwsbox info
```

`activate` prints a `PATH` export (`set -gx` under fish) plus comment lines. `eval "$(nwsbox activate)"` applies the export for the current shell. A shell profile snippet that checks `.ws/config.json` runs only in the directory where the shell started. `direnv` is the setup that re-runs on directory change:

```bash
echo 'eval "$(nwsbox activate)"' >> .envrc
direnv allow
```

Without activation:

```bash
nwsbox exec "node --version"
nwsbox exec "npm install && npm run build"
nwsbox run -- node --version
nwsbox run npm login
```

`run` is strict about flags. Put `--` before a command that has its own flags, or use `exec`, which joins its arguments and runs them in a shell.

## Commands

| Command | Behavior |
| --- | --- |
| `nwsbox init [--node <version>] [--name <name>]` | Create `.ws/` in the current directory, write `config.json`, and create the default shims. `--node` / `-n` also downloads that Node version and records it as active. A second `init` in the same directory errors: the workspace already exists. |
| `nwsbox node install <version>` | Download Node into `.ws/node/<version>/` and set it active. |
| `nwsbox node use <version>` | Point `config.json` at an installed directory whose name starts with the normalized version (`20` becomes `v20`). The match is the first `readdir` entry, not a semver sort. |
| `nwsbox node list` | Print installed directories. The active one is marked `(active)`. |
| `nwsbox run [--shell] <command> [args…]` | Resolve the command (workspace shim, then `which`) and spawn it with the workspace environment. `--shell` / `-s` uses a shell. |
| `nwsbox exec <command…>` | Join the arguments and run them with `shell: true` in the workspace environment. |
| `nwsbox activate` | Print the shim `PATH` line for bash, zsh, or fish. |
| `nwsbox info` | Print root, name, created, updated, active Node version, installed versions, and the home, XDG config, cache, and shim paths. |

Workspace lookup walks parent directories and stops at the first `.ws/` directory. The filesystem root itself is not checked. A `.ws` file is ignored.

### Node version strings

`parseNodeVersion` trims the string and adds a leading `v` when one is missing. The downloader then does one of two things:

- A single numeric component (`20`, `v20`) is resolved against `https://nodejs.org/dist/index.json`. The chosen tarball is the `v20.*` release with the latest `date` field.
- Any other string is used as the tarball version as written. `18.17.0` and `v20.11.0` request that exact filename. `18.17` requests `node-v18.17-<platform>-<arch>.tar.gz`. Node's dist server publishes full `x.y.z` names, so a minor-only string fails the download with `Failed to download: <status>`.

Platform is `darwin`, `linux`, or `win`. Architecture is `os.arch()` unchanged (`x64`, `arm64`, and so on).

A failed `init --node` still leaves `.ws/` on disk. The next `init` reports that the workspace already exists; use `nwsbox node install <version>` to finish.

## Workspace layout

`init` creates these directories: `.ws/`, `.ws/node/`, `.ws/env/`, `.ws/env/.config/`, `.ws/cache/`, `.ws/shims/`, and `.ws/config.json`.

```
my-project/
└── .ws/
    ├── config.json          # created, updated, optional name, optional node
    ├── node/                # populated by node install, one directory per version
    ├── env/                 # HOME / USERPROFILE
    │   └── .config/         # XDG_CONFIG_HOME (created empty)
    ├── cache/               # cache root (created empty)
    └── shims/               # node, npm, npx, yarn, pnpm
```

`config.json` fields are `created`, `updated`, `name`, and `node`. Writes merge into the existing JSON and refresh `updated`. Unreadable JSON is treated as an empty config.

npm, Yarn, and pnpm cache directories, XDG cache/data/state directories, and `.ws/env/.npmrc` are paths the environment points at. `init` does not create them. The tools create them when they run.

## Repository layout

```
nwsbox/
├── bin/run                         # Node entry; loads lib/index.js
├── src/commands/                   # activate, exec, info, init, node, run
├── src/utils/                      # workspace, env, node-installer, shim, command-runner
├── src/types/workspace.ts
├── src/index.ts                    # oclif execute()
├── test/                           # Vitest
├── test-ci.sh                      # local stand-in for the CI job
├── docs/reference.md               # env vars, CI, version notes
├── TECHNICAL.md                    # architecture notes
├── CLAUDE.md                       # short facts for coding agents
├── package.json
├── package-lock.json
├── oclif.manifest.json
├── tsconfig.json
├── vitest.config.ts
└── .github/workflows/              # ci.yml, publish.yml (manual only)
```

`lib/` is TypeScript output. It is gitignored and produced by `npm run build`. The npm package ships `bin/`, `lib/`, and `oclif.manifest.json` (`.npmignore` drops `src/`, tests, and workflows). `.npmrc` in this repo is empty. `publishConfig` sets the public npm registry.

## Stack

Declared ranges are from `package.json`. Locked versions are from `package-lock.json` at this commit.

| Piece | Declared | Locked |
| --- | --- | --- |
| Runtime | Node `>=18` | — |
| Language | TypeScript `^5.3.3`, target ES2022, CommonJS, `strict` | typescript 5.9.3 |
| CLI framework | `@oclif/core` `^4.0.0` | 4.8.0 |
| Files | `fs-extra` `^11.2.0` | 11.3.2 |
| Archives | `tar` `^6.2.0` | 6.2.1 |
| Binary lookup | `which` `^4.0.0` | 4.0.0 |
| Tests | Vitest `^1.0.0` | vitest 1.6.1 |
| Node types | `@types/node` `^20.10.0` | 20.19.25 |

Also locked: `@types/fs-extra` 11.0.4, `@types/tar` 6.1.13, `@types/which` 3.0.4. There is no ESLint (or other linter) dependency. The CI job named `lint-and-build` builds and checks that `lib/` exists. It does not lint.

## Local setup

Use npm. The lockfile is `package-lock.json`.

```bash
git clone https://github.com/XCO-Agency/nwsbox.git
cd nwsbox
npm ci
npm run typecheck
npm test
npm run build
npm link
```

| Script | What it runs |
| --- | --- |
| `build` | `tsc` into `lib/` |
| `dev` | `tsc --watch` |
| `typecheck` | `tsc --noEmit` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |
| `test:ci` | `./test-ci.sh` (`npm ci`, typecheck, build, test, then checks `lib/index.js` and `lib/commands/init.js`) |
| `prepack` | `oclif manifest` and `oclif readme` |
| `prepublishOnly` | `npm run build` |

The README in git is hand-written. `prepack` runs `oclif readme`, which rewrites README sections marked for generated help. Review that diff before committing it.

There is no `LICENSE` file in the tree. `package.json` declares MIT.

## Environment variables

Names only. Nothing in this repo assigns secret values. There is no `.env` file, and the CLI starts without any of these being set.

Read from the parent process: `PATH`, `TERM`, `SHELL`, `EDITOR`, `LANG`, `LC_ALL`.

Set on `run` / `exec` child processes: `HOME`, `USERPROFILE`, `XDG_CONFIG_HOME`, `XDG_CACHE_HOME`, `XDG_DATA_HOME`, `XDG_STATE_HOME`, `NPM_CONFIG_CACHE`, `YARN_CACHE_FOLDER`, `PNPM_HOME`, `PATH`, `TERM`, `SHELL`, `EDITOR`, `LANG`, `LC_ALL`. `NODE_PATH` is set only when `config.json` has a `node` version.

Exported by the bash shims: `HOME`, `USERPROFILE`, `XDG_CONFIG_HOME`, `XDG_CACHE_HOME`, `XDG_DATA_HOME`, `XDG_STATE_HOME`, `PATH`, `NPM_CONFIG_CACHE`, `YARN_CACHE_FOLDER`, `PNPM_HOME`.

Publish workflow: the job sets `NODE_AUTH_TOKEN` from the GitHub Actions secret `NPM_TOKEN`.

Where each name points, and which path sets it, is in [docs/reference.md](docs/reference.md).

## Docker

This repository has no Dockerfile, Compose file, or other container config.

## Distribution

The package is published to the public npm registry (`publishConfig.access` is `public`, package name `nwsbox`). Current workflow file `.github/workflows/publish.yml` runs only on `workflow_dispatch`. It checks out the repo, sets the package version from the optional `version` input or from `package.json`, runs `npm ci`, typecheck, test, and build, regenerates `oclif.manifest.json`, and runs `npm publish`. Node on that job is 20.

On 2025-12-06 the same file also ran on `release: types: [created]`. Commit `c4b49cf` (2026-08-24) removed that trigger. The "extract version from tag" step still contains a `github.event_name == release` branch. With only `workflow_dispatch` in `on:`, that branch does not run. A manual publish with an empty version input uses `package.json`, which is 0.2.1 today.

`.github/workflows/ci.yml` is also `workflow_dispatch` only. It does not run on push or pull request. The test matrix is `ubuntu-latest` and `macos-latest` with Node 18, 20, and 22. A second job on Ubuntu with Node 20 builds and checks `lib/`.

Coolify production and Coolify staging have no application, service, database, or project for this repo (searched 2026-11-22). This repo does not document another deploy target.

## Tests

`npm test` runs Vitest once. There are 59 `it` cases in eight files:

| File | Cases | Covers |
| --- | --- | --- |
| `test/workspace.test.ts` | 11 | Finding `.ws/`, paths, config read/write, directories `init` creates |
| `test/workspace-edge-cases.test.ts` | 14 | Root path, `.ws` as a file, odd paths, bad JSON |
| `test/env.test.ts` | 7 | Environment object and merge with the parent |
| `test/node-installer.test.ts` | 4 | `parseNodeVersion` only |
| `test/node-installer-edge-cases.test.ts` | 9 | `parseNodeVersion` edge strings |
| `test/shim.test.ts` | 7 | Shim file contents, mode `0755`, default command list |
| `test/command-runner.test.ts` | 4 | Workspace lookup and the workspace error string |
| `test/commands.test.ts` | 3 | Workspace helpers used by init (the oclif classes are not invoked) |

The suite does not download Node.js, does not spawn the `nwsbox` binary, and does not talk to the network. `vitest.config.ts` names the V8 coverage provider. `@vitest/coverage-v8` is not a dependency, and `npm test` does not collect coverage.

`test/setup.ts` is a temp-directory helper. Vitest does not load it as a global setup file.

## Further reading

- [docs/reference.md](docs/reference.md) — environment variable names, CI, and version sources
- [TECHNICAL.md](TECHNICAL.md) — architecture notes aligned with the source
- [CLAUDE.md](CLAUDE.md) — short facts for coding agents

## License

MIT, as declared in `package.json`. No `LICENSE` file is checked in.

NWSBox borrows the idea of a per-project environment from Python's `virtualenv`, and the idea of a per-project Node install from `nvm`, Volta, `asdf`, and `direnv`.
