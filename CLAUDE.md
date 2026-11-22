# CLAUDE.md

Key facts for agents working in XCO-Agency/nwsbox. The user guide is `README.md`. Detail is in `docs/reference.md`. Architecture is in `TECHNICAL.md`.

## What this is

NWSBox is an oclif CLI (`nwsbox` and `nwsb`) from XCO Agency LLC. `nwsbox init` creates a `.ws/` directory so a project can use its own Node.js build and its own home, XDG, and npm/Yarn/pnpm cache paths. It is an npm package, not a web service. Coolify production and Coolify staging have no resource for this repo (checked 2026-11-22). There is no Dockerfile.

The repo looks dormant: product commits are all 2025-12-06; `c4b49cf` (2026-08-24) only made GitHub workflows manual.

## Versions

- `package.json` and `package-lock.json`: **0.2.1**
- `oclif.manifest.json`: **0.2.2**
- npm `latest` and git tag `0.4.6`: **0.4.6** at commit `8b39e09` (`gitHead` matches). `HEAD` differs only in `.github/workflows/`.
- Publish runs `npm version` in CI and does not commit it. An empty workflow version input would publish **0.2.1**.

Do not treat those three numbers as a single source of truth.

## Stack and commands

- Node `>=18`. TypeScript 5.9.3 (declared `^5.3.3`), target ES2022, CommonJS, `strict`, output `lib/` (gitignored).
- `@oclif/core` 4.8.0, `fs-extra` 11.3.2, `tar` 6.2.1, `which` 4.0.0. Tests: Vitest 1.6.1.
- Package manager: **npm**. Lockfile: `package-lock.json`. CI uses `npm ci`. `.npmrc` is empty.
- Scripts: `npm run build`, `npm run typecheck`, `npm test`, `npm run test:ci` (`test-ci.sh`).
- `prepack` runs `oclif manifest` and `oclif readme`. The README is hand-written. Review any README diff that command produces.
- Default branch is `main`. There is no `staging` branch.
- No ESLint. The CI job `lint-and-build` only checks that `lib/` was emitted.
- Both workflows (`ci.yml`, `publish.yml`) are `workflow_dispatch` only.

## Code map

- `bin/run` loads `lib/index.js`.
- `src/commands/`: `init`, `node`, `run`, `exec`, `activate`, `info`.
- `src/utils/workspace.ts`: walk upward for `.ws/`, config, directory creation.
- `src/utils/env.ts`: environment object for `run` / `exec`.
- `src/utils/node-installer.ts`: nodejs.org tarballs. Major-only (`20`) resolves via `index.json`. Other strings are exact tarball names (`18.17` is not "latest 18.17.x"). Windows `.zip` extraction throws.
- `src/utils/shim.ts`: bash shims for `node`, `npm`, `npx`, `yarn`, `pnpm`.
- `src/utils/command-runner.ts`: `spawn` with the merged environment. Parent env vars that are not overridden are kept, including credentials.

`init` creates `.ws/`, `node/`, `env/`, `env/.config/`, `cache/`, `shims/`, and `config.json`. Cache subdirectories and `.npmrc` are created later by the tools, not by `init`.

## Environment variable names

Parent reads: `PATH`, `TERM`, `SHELL`, `EDITOR`, `LANG`, `LC_ALL`.

Set for `run` / `exec`: `HOME`, `USERPROFILE`, `XDG_CONFIG_HOME`, `XDG_CACHE_HOME`, `XDG_DATA_HOME`, `XDG_STATE_HOME`, `NPM_CONFIG_CACHE`, `YARN_CACHE_FOLDER`, `PNPM_HOME`, `PATH`, `TERM`, `SHELL`, `EDITOR`, `LANG`, `LC_ALL`, and `NODE_PATH` when a Node version is active.

Shims export: `HOME`, `USERPROFILE`, `XDG_CONFIG_HOME`, `XDG_CACHE_HOME`, `XDG_DATA_HOME`, `XDG_STATE_HOME`, `PATH`, `NPM_CONFIG_CACHE`, `YARN_CACHE_FOLDER`, `PNPM_HOME`.

Publish: Actions secret `NPM_TOKEN`, passed as `NODE_AUTH_TOKEN`. Never write values for these. The secrets API returned 403 on 2026-11-22, so whether `NPM_TOKEN` is configured is unverified.

## Tests

59 `it` cases under `test/`. They do not download Node, spawn the CLI, or use the network. `commands.test.ts` calls workspace helpers, not the oclif command classes. Coverage is configured for V8 and the coverage package is not installed.

## License

`package.json` says MIT. No `LICENSE` file is in the tree.
