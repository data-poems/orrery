# Repository Guidelines

## Project Structure & Module Organization
This repository is a Vite-based React 19 + TypeScript app for an interactive 3D orrery. Core application code lives in `src/`: `scene/` contains Three.js and react-three-fiber rendering, `ui/` contains HUD and overlay components, `data/` holds static body definitions, and `lib/` contains orbital math and shared utilities. Public assets and prebaked datasets live in `public/`, especially `public/data/` and `public/textures/`. Data generation scripts are in `scripts/` (for example `scripts/prebake.ts`).

## Build, Test, and Development Commands
Install dependencies with `pnpm install`.

- `pnpm dev`: start the local Vite dev server.
- `pnpm build`: run `tsc -b` and produce the production bundle in `dist/`.
- `pnpm preview`: serve the built app locally.
- `pnpm lint`: run ESLint across the repo.
- `pnpm prebake`: regenerate bundled astronomy datasets used by the app.

## Coding Style & Naming Conventions
Follow the existing TypeScript + React style in `src/`: functional components, explicit types for non-trivial state, and small modules grouped by concern. Use 2-space indentation, semicolons, and single quotes to match current files such as `src/Orrery.tsx` and `vite.config.ts`. Use `PascalCase` for React component files (`Scene.tsx`, `Panels.tsx`), `camelCase` for helpers, and descriptive lowercase names for dataset modules (`planets.ts`, `moons.ts`). Run `pnpm lint` before opening a PR; ESLint is configured in `eslint.config.js`.

## Testing Guidelines
There is no committed automated test suite yet. Until one is added, treat `pnpm lint` and `pnpm build` as required validation for every change, then smoke-test the affected flows in `pnpm dev`. For UI work, verify camera presets, panel toggles, and any changed data overlays. If you add tests, prefer colocated `*.test.ts` or `*.test.tsx` files near the feature they cover.

## Commit & Pull Request Guidelines
Current git history uses timestamped checkpoint commits such as `session checkpoint: 2026-03-22 00:24`. Keep those automated checkpoints intact, but use concise imperative subjects for hand-written commits when possible, for example `add comet prebake caching`. PRs should include a short summary, testing notes (`pnpm lint`, `pnpm build`), and screenshots or short clips for visual changes to the scene or HUD. Link related issues when applicable.

## Assets & Configuration Notes
Do not move or rename files in `public/data/` or `public/textures/` casually; scene modules depend on those paths. The Vite base path is `/orrery/`, so preserve that in `vite.config.ts` unless deployment changes. Prefer updating prebake scripts in `scripts/` instead of hand-editing generated data blobs.
