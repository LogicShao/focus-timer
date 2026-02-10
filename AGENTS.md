# Repository Guidelines

## Project Structure & Module Organization
- `src/main`: Electron main process (app lifecycle, windows, IPC wiring).
- `src/preload`: secure bridge between Electron and renderer (`contextBridge` exports).
- `src/renderer`: renderer entry (`index.html`) and React app code under `src/renderer/src`.
- `src/renderer/src/components`: UI components (for example `Versions.tsx`).
- `src/renderer/src/assets`: CSS and static assets.
- `build` and `resources`: packaging icons and platform build resources.
- Root-level config: `electron.vite.config.ts`, `electron-builder.yml`, `eslint.config.mjs`, and `tsconfig*.json`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start Electron + Vite dev workflow with HMR.
- `npm run start`: preview built output.
- `npm run lint`: run ESLint (`eslint --cache .`).
- `npm run format`: format the repository with Prettier.
- `npm run typecheck`: run both Node and web TypeScript checks.
- `npm run build`: typecheck, then build production bundles.
- `npm run build:win` / `npm run build:mac` / `npm run build:linux`: create platform packages.

## Coding Style & Naming Conventions
- Follow `.editorconfig`: UTF-8, LF, 2-space indentation, trim trailing whitespace.
- Follow Prettier config: single quotes, no semicolons, `printWidth: 100`.
- Use `PascalCase` for React component files (for example `App.tsx`), `camelCase` for functions/variables, and descriptive folder names.
- Keep responsibilities separated by process: renderer UI code should not directly call Node/Electron APIs; expose needed APIs via preload.

## Testing Guidelines
- No automated test framework is currently configured, and there is no `npm test` script yet.
- Minimum quality gate before opening a PR:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
- For UI or IPC changes, include manual verification steps in the PR (window launch, key interaction flow, IPC behavior).
- If adding tests, prefer colocated `*.test.ts` / `*.test.tsx` files and add the test command to `package.json`.

## Commit & Pull Request Guidelines
- This repository currently has no commit history; use Conventional Commits from now on.
- Suggested format: `type(scope): short summary` (for example `feat(renderer): add timer preset buttons`).
- Keep commits focused and atomic; avoid mixing refactor and feature changes.
- PRs should include: purpose, key changes, validation steps, linked issue, and screenshots/GIFs for renderer UI updates.

## Security & Configuration Tips
- Do not commit secrets or local credentials; use environment-specific files outside version control.
- Minimize preload surface area (`src/preload/index.ts`): expose only required APIs.
- Validate or strictly control external URLs before opening them with `shell.openExternal`.
