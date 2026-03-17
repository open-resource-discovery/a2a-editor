# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) rules.

## [unreleased]

### Added

- Favicon using new `a2a-icon.svg` across playground, standalone, and Docusaurus website
- Open Graph / Twitter Card social card image with generation script (`npm run generate:og-image`)
- "Mocked LLM" badge on predefined agents (shown by default, opt-out via `"mocked": false`)
- Demo GIF in README
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
