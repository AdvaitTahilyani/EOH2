# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the application code.
- `src/App.jsx` owns the lobby, game flow, leaderboard, and difficulty selection.
- `src/game/` contains gameplay code:
  - `ArcadeGame.jsx` bridges React and Phaser.
  - `FactoryScene.js` implements all mini-game logic and scoring.
  - `gameDefinitions.js` defines game metadata and difficulty settings.
- `src/styles.css` contains the shared UI styles.
- `dist/` is the production build output and should not be edited manually.
- There is currently no dedicated `tests/` directory.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the local Vite dev server.
- `npm run build`: create a production build in `dist/`.
- `npm run preview`: serve the production build locally for a final check.

Example:
```bash
npm install
npm run dev
```

## Coding Style & Naming Conventions
- Use 2-space indentation in JSX, JS, and CSS to match the existing codebase.
- Prefer functional React components and local state via hooks.
- Use `PascalCase` for React components (`ArcadeGame.jsx`), `camelCase` for functions and variables, and descriptive scene method names such as `setupSpeedGame`.
- Keep game-specific behavior inside `FactoryScene.js`; keep app flow and UI state in `App.jsx`.
- No formatter or linter is configured yet, so preserve the existing style when editing.

## Testing Guidelines
- There is no automated test framework configured yet.
- For now, validate changes with:
  - `npm run build`
  - manual browser checks in `npm run dev`
- When testing gameplay changes, verify full-run mode, single-game mode, leaderboard behavior, and difficulty selection.

## Architecture Notes
- React handles menus, results, and persistence.
- Phaser handles real-time gameplay and scoring.
- Local leaderboard data is stored in `localStorage`; avoid introducing secrets or sensitive data into client storage.
