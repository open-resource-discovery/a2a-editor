/**
 * Node.js helper for serving standalone files.
 * Similar to swagger-ui-dist's absolute-path.js
 *
 * Usage with Express:
 * ```javascript
 * const { getAbsoluteFSPath } = require('@open-resource-discovery/a2a-editor/standalone');
 * const express = require('express');
 * const app = express();
 *
 * // Serve standalone files at /a2a-playground
 * app.use('/a2a-playground', express.static(getAbsoluteFSPath()));
 * ```
 */

const path = require("path");

/**
 * Get the absolute path to the standalone distribution directory.
 * Use this with express.static() or similar to serve the files.
 * @returns {string} Absolute path to dist-standalone directory
 */
function getAbsoluteFSPath() {
  return path.resolve(__dirname);
}

/**
 * Helper to create an Express middleware for serving the playground.
 * @param {string} [basePath='/'] - Base path for the playground routes
 * @returns {Function} Express middleware
 */
function createMiddleware(basePath = "/") {
  try {
    const express = require("express");
    const router = express.Router();
    router.use(basePath, express.static(getAbsoluteFSPath()));
    return router;
  } catch {
    throw new Error("express is required to use createMiddleware. Install it with: npm install express");
  }
}

module.exports = {
  getAbsoluteFSPath,
  createMiddleware,
  // Alias for compatibility
  absolutePath: getAbsoluteFSPath,
};
