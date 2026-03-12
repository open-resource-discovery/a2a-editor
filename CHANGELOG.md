# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) rules.

## [unreleased]

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
