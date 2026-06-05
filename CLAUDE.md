# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React component library for analyzing, validating, and interacting with [A2A (Agent-to-Agent) protocol](https://google.github.io/A2A/) agent cards. Provides a multi-mode playground (full, lite, viewer, editor, card-view) distributed as both an npm library and a standalone CDN bundle.

## Commands

```bash
# Development
npm run dev              # Vite dev server at localhost:5173
npm run website:start    # Docusaurus docs site at localhost:3000

# Building
npm run build            # Full build: lib + standalone
npm run build:lib        # ES module library only (dist/)
npm run build:standalone # IIFE CDN bundle only (dist-standalone/)
npm run build:demo       # Demo SPA for GitHub Pages

# Testing
npm test                 # Vitest unit tests (run once)
npm run test:watch       # Vitest in watch mode
npm run test:e2e         # Playwright e2e (requires servers on :5173 and :3000)

# Code quality
npm run lint             # ESLint check
npm run format           # Prettier + ESLint auto-fix
npm run format:check     # Check formatting without fixing
```

### Running a single unit test

```bash
npx vitest run src/lib/utils/__tests__/a2a-compliance.test.ts
```

### Running a single e2e test

```bash
npx playwright test e2e/tests/chat.spec.ts --project=vite
```

## Architecture

### Build modes

The project produces four distinct build artifacts:

| Command | Output | Format | Use case |
|---|---|---|---|
| `build:lib` | `dist/` | ES modules, multiple entry points | npm consumers |
| `build:standalone` | `dist-standalone/` | IIFE, React bundled | CDN / script tag |
| `build:demo` | `dist-demo/` | SPA | GitHub Pages demo |
| `website:build` | `website/build/` | Static | Docusaurus docs |

The lib build exports five separate entry points for tree-shaking: `index`, `playground-lite`, `viewer`, `editor`, `card-view`. The standalone build bundles everything into a single `a2a-playground.js` that exposes `window.A2APlayground` and `window.A2AEditor`.

### State management

Six Zustand stores in `src/lib/stores/`:

- **`agentCardStore`** — raw JSON input, parsed `AgentCard`, dirty state
- **`connectionStore`** — agent URL, auth credentials, connection status, OAuth flow
- **`chatStore`** — messages, streaming state, active task
- **`validationStore`** — validation results, compliance checks
- **`httpLogStore`** — HTTP request/response log
- **`uiStore`** — active tab, mobile overlay visibility
- **`editorSettingsStore`** — Monaco/textarea preference

Data flows one-way: raw JSON edit → `agentCardStore` parse → validation → connection/chat reads from parsed card.

### Component layouts

`src/lib/components/layouts/` contains four layout components that assemble the panels for each mode:

- `PlaygroundLayout` — 3-pane (editor, overview, chat/validation)
- `EditorLayout` — editor + right panel only
- `ViewerLayout` — textarea + right panel only
- `CardViewLayout` — overview only

The outer `ThemeRoot` component provides the CSS custom property scope (`.a2a-root`) needed for standalone isolation.

### A2A protocol handling

`src/lib/utils/a2a-protocol.ts` bridges A2A versions 0.3.0 and 1.0.0:
- `detectProtocolVersion()` — infers version from card structure
- `normalizeAgentCard()` — produces a canonical internal representation

Internal component types use simplified names (e.g., `"task"` state) that differ from wire format. All version differences are resolved here, not in components.

### Authentication

`src/lib/utils/connection-auth.ts` computes request headers from stored credentials. Supports basic, apiKey, oauth2, and mutualTLS. OAuth 2 PKCE flow is in `src/lib/utils/pkce.ts` — it uses `sessionStorage` for the code verifier across the redirect cycle.

### Standalone entry

`src/lib/standalone.ts` is the entry for the IIFE bundle. It mounts React into a host element and exposes an imperative API (`init()`, `setAgentCard()`, `connect()`, `validate()`, etc.) on the global objects. `vite.standalone.config.ts` handles this build with `inlineDynamicImports: true`.

## Testing

### Unit tests

Located alongside source in `src/lib/**/__tests__/`. Run with Vitest (jsdom environment). Cover stores and pure utility functions.

### E2E tests

`e2e/tests/` — Playwright tests targeting two servers simultaneously:
- `vite` project → `localhost:5173`
- `docusaurus` project → `localhost:3000`

Custom fixtures in `e2e/fixtures/playground.ts` provide helpers (`selectAgent`, `sendMessage`, `switchToTab`). Start both servers before running e2e tests.

## Dependency on ui-components

This project depends on `@open-resource-discovery/ui-components` via `file:../ui-components`. When that library changes:
1. Run `npm run build` in `../ui-components`
2. Re-run `npm install` here if the package interface changed

UI components from the library are used across `src/lib/components/`. Local `src/lib/components/ui/` wrappers (button, card, badge, tabs) re-export or thin-wrap Radix UI — these are candidates for replacement with the shared library equivalents.

## Path aliases

`@/` → `src/`, `@lib/` → `src/lib/`, `@demo/` → `src/demo/` (configured in `vite.config.ts` and `tsconfig.app.json`).
