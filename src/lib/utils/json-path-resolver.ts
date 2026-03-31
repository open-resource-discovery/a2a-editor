/**
 * Resolves a dot-separated JSON path (e.g. "skills.0.id") to a line/column
 * position in raw JSON text. Used to place Monaco editor markers.
 *
 * Powered by jsonc-parser (Microsoft's VS Code JSON parser).
 */

import { parseTree, findNodeAtLocation } from "jsonc-parser";

export interface JsonPosition {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

/**
 * Convert a 0-based character offset to 1-based line/column.
 */
function offsetToLineCol(text: string, offset: number): { line: number; col: number } {
  let line = 1;
  let col = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}

/**
 * Convert a dot-path like "skills.0.id" to jsonc-parser segments ["skills", 0, "id"].
 */
function parsePathSegments(path: string): (string | number)[] {
  return path.split(".").map((s) => (/^\d+$/.test(s) ? Number(s) : s));
}

/**
 * Resolve a JSON path to an editor position. Falls back to parent paths or
 * line 1 if the path is not found (e.g. for missing required fields).
 */
export function resolveJsonPathToPosition(
  jsonText: string,
  path: string | undefined,
): JsonPosition {
  const fallback: JsonPosition = {
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: jsonText.indexOf("\n") > 0 ? jsonText.indexOf("\n") + 1 : jsonText.length + 1,
  };

  if (!path) return fallback;

  const root = parseTree(jsonText);
  if (!root) return fallback;

  const segments = parsePathSegments(path);

  // Try exact path, then progressively shorter parent paths
  for (let len = segments.length; len > 0; len--) {
    const node = findNodeAtLocation(root, segments.slice(0, len));
    if (node) {
      const start = offsetToLineCol(jsonText, node.offset);
      const end = offsetToLineCol(jsonText, node.offset + node.length);
      return {
        startLineNumber: start.line,
        startColumn: start.col,
        endLineNumber: end.line,
        endColumn: end.col,
      };
    }
  }

  return fallback;
}
