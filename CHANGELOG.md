# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) rules.

## [unreleased]

### Fixed

- Fixed agent card overview scrolling to the bottom on load and on any user interaction (dropdown open, button click). The `ScrollArea` component defaults to `autoScroll={true}`, which attaches a `MutationObserver` that scrolls to the bottom on every DOM change. All non-chat `ScrollArea` instances (`RightPanel`, `EditorRightPanel`, `ViewerRightPanel`, `CardViewLayout`, `SettingsPanel`, `SettingsPanelLite`) now explicitly pass `autoScroll={false}`. Chat retains auto-scroll by its existing explicit `autoScroll` prop.

## [[0.4.2](https://github.com/open-resource-discovery/a2a-editor/releases/tag/v0.4.2)] - 2026-06-30

### Fixed

- Externalized all declared dependencies in the library build to prevent bundled CJS packages
  (e.g. `@base-ui/react`, `use-sync-external-store`) from emitting `require("react")` calls
  that throw in browser ESM contexts. Previously only `react`, `react-dom`, and
  `react/jsx-runtime` were externalized; all entries in `dependencies` and `peerDependencies`
  are now covered dynamically via a regex so new deps are excluded automatically.
- Fixed build failure on Windows caused by `new URL(...).pathname` returning a `/C:/...`
  prefixed path in `scripts/strip-css-from-dts.mjs`, which produced a doubled drive letter
  when concatenated. Replaced with `fileURLToPath()`.

### Changed

- Added icon buttons to the overview panel header for quick access to common actions.

## [[0.4.1](https://github.com/open-resource-discovery/a2a-editor/releases/tag/v0.4.1)] - 2026-06-25

### Fixed

- Published tarball now ships `.d.ts` declaration files. `vite-plugin-dts` was emitting them under `dist/src/lib/...` instead of `dist/`, so the package.json `files` allowlist filtered them all out at publish time. Replaced the plugin with a `tsc + tsc-alias` declaration pipeline (`tsconfig.build.json`, `build:types` script) that emits to the paths `exports.types` points at, rewrites `@lib/*` aliases to relative imports, and strips side-effect `.css` imports from declarations so strict (`skipLibCheck: false`) consumers stay green.

## [[0.4.0](https://github.com/open-resource-discovery/a2a-editor/releases/tag/v0.4.0)] - 2026-06-24

### Added

- Markdown rendering for agent card descriptions and skill card descriptions via ReactMarkdown
- Syntax highlighting for JSON, XML, and YAML code blocks in agent chat responses with copy buttons
- Tag-based multi-select filtering on the Skills section (replaces text search input)
- `mediaType`-aware text parts: structured content (XML, JSON, YAML) auto-rendered as highlighted code blocks
- Version-aware Zod schema validation for agent cards against authoritative A2A JSON schemas (`schemas/a2a-0.3.0.schema.json`, `schemas/a2a-1.0.0.schema.json`)
  - Auto-detects v0.3 vs v1.0 based on `supportedInterfaces` presence
  - v0.3: lenient (extra properties allowed); v1.0: strict (`additionalProperties: false`)
  - Version-specific field hints in validation error messages
- Zod-based compliance checks for JSON-RPC responses and streaming events (replaces hand-written structural checks)

### Fixed

- Registered `@tailwindcss/typography` plugin for Tailwind v4 (prose classes were silently ignored)
- Agent card description uses CSS `line-clamp-3` instead of character-count truncation

### Changed

- Migrate all UI components (`Button`, `Badge`, `Card`, `Input`, `PasswordInput`, `Switch`, `Separator`, `Select`, `Sheet`, `ScrollArea`, `Tabs`, `Collapsible`, `CodeBlock`, `MarkdownText`, `ValidationPass`, `ValidationEntry`) to re-export from `@open-resource-discovery/ui-components`, removing local shadcn-based implementations.
- Refactor all overview sections (`AgentHeader`, `CapabilitiesSection`, `ConnectionSection`, `ExtensionsSection`, `ModesSection`, `SecuritySection`, `SecurityRequirementsSection`, `SkillsSection`), settings panels, chat components, and validation UI to use library components (`InfoCard`, `SectionCard`, `CollapsibleSection`, `HttpLogEntry`, `ChatMessage`, `ChatInput`, `TypingIndicator`).
- Align CSS layer setup and Tailwind import style with `@open-resource-discovery/ui-components` conventions.
- Strip `@layer` wrappers from the standalone IIFE bundle so Tailwind utilities take precedence over unlayered host-page styles (e.g. Docusaurus Infima).
- Upgrade `vite-plugin-dts` to v5 (`outDirs`, `copyDtsFiles`, `tsconfigPath` API).

### Fixed

- E2E tests: added `data-testid` attributes to `AgentHeader` and agent description elements; corrected locator for agent description assertion.
- Standalone bundle styles now render correctly when embedded in Docusaurus (CSS layer order fixed).
- Long URLs in the connection panel are now truncated to prevent layout overflow.
- Removed drop shadows from agent list items to prevent visual artifacts when scrolling long lists.
- Broken link color in chat messages corrected.
- Left panel header vertical alignment fixed.

## [[0.3.0](https://github.com/open-resource-discovery/a2a-editor/releases/tag/v0.3.0)] - 2026-03-20

### Added

- Favicon using new `a2a-icon.svg` across playground, standalone, and Docusaurus website
- Open Graph / Twitter Card social card image with generation script (`npm run generate:og-image`)
- "Mocked LLM" badge on predefined agents (shown by default, opt-out via `"mocked": false`)
- Demo GIF in README
- Renovate configuration for automated dependency updates
- Bump GitHub Actions to latest major versions
- Unit test suite with vitest covering auth logic (connection store, PKCE, predefined agent auth helpers)
- Unit test step in CI workflow
- Full A2A protocol v1.0 compatibility layer in `a2a-protocol.ts`
  - `isV1()` helper for flexible version matching (`"1.0"`, `"1.0.0"`, etc.)
  - `buildOutboundParts()` converts internal parts to v1.0 unified Part format (including `bytes` → `raw`)
  - `SendMessageConfiguration` with `acceptedOutputModes` sent to v1.0 agents
  - `A2A-Version: 1.0` header on all outbound requests to v1.0 agents
- Inbound normalization for v1.0 response formats
  - `SendMessageResponse` `oneof` unwrapping (`result.task` / `result.message` wrapper keys)
  - Stream event `oneof` payload handling (`statusUpdate`, `artifactUpdate`, `task`, `message` wrapper keys, plus `taskStatusUpdate`/`taskArtifactUpdate` aliases)
  - `raw` (base64 inline bytes) and `data`-only part normalization
  - `auth-required` task state with UI badge support
- Compliance checker updated for dual v0.3.0/v1.0 format validation

### Changed

- Renamed `a2a-compat.ts` → `a2a-protocol.ts` and restructured as v1.0-first protocol boundary layer with human-readable internal types
- Added composite outbound helpers (`buildOutboundMessage`, `buildOutboundHeaders`, `buildOutboundConfiguration`) to consolidate protocol logic
- Added `PROTOCOL_VERSIONS` typed constants replacing scattered version string literals
- Version-aware outbound methods: `SendMessage`/`SendStreamingMessage` for v1.0, `message/send`/`message/stream` for v0.3.0
- `detectProtocolVersion()` now reads `supportedInterfaces[0].protocolVersion` for accurate version string
- Removed "Validate" button from the editor toolbar (validation still runs automatically)

### Fixed

- Overview now keeps showing the last valid agent card in read-only mode when the current JSON becomes invalid, with the parse error displayed inline
- Guarded overview capability rendering so malformed or non-object capability values no longer break the section

## [[0.2.0](https://github.com/open-resource-discovery/a2a-editor/releases/tag/v0.2.0)] - 2026-03-12

### Added

- SSE streaming support for agent communication with real-time message updates
- New SSE parser (`sse-parser.ts`) and streaming orchestrator (`a2a-stream.ts`) utilities
- Stream cancellation via a stop button in the chat input
- Visual "Streaming..." indicator on in-progress messages
- Rich media rendering in chat messages: inline images, audio players, and video players based on MIME type
- Collapsible `DataPartView` component for structured data parts with JSON syntax highlighting
- `FilePartView` component with MIME-type-aware rendering (image, audio, video, generic file)
- Separate `messagingUrl` field in connection store to distinguish the card's JSON-RPC endpoint from the user-entered discovery URL

### Changed

- Refactored `chatStore` to support streaming message lifecycle (create, append, finalize)
- Expanded `a2a-compat` normalization layer to handle streaming event types (`status-update`, `artifact-update`, `task`, `error`)
- Chat action buttons (copy, view HTTP, retry) are now hidden while a message is still streaming
- `httpLogStore` extended with a new field to track streaming responses
- Standalone bundle now exposes `cardView()`, `viewer()`, and `editor()` methods for rendering individual components via CDN
- Streaming artifact-update chunks are now concatenated into a single growing text part for correct progressive rendering and markdown formatting

### Fixed

- CSS file (`index.css`) was missing from npm package due to a filename mismatch in the Vite build output
- Standalone bundle (`dist-standalone/`) is now included in the npm package for CDN usage via unpkg/jsdelivr
- Added `unpkg` fields to `package.json` for automatic CDN resolution
- Compliance check now runs on streamed responses
- Custom agent URL no longer gets replaced with the card's messaging endpoint, fixing reconnect failures via auto-discovery

## [0.1.0]

Initial release of A2A Editor
