#!/usr/bin/env node
// Strip side-effect CSS imports from emitted .d.ts files.
// vite renames bundled css to dist/index.css, but the source .d.ts files keep
// the original `import "./styles.css"` which isn't present in dist/ and trips
// strict consumers (skipLibCheck: false). The runtime side-effect lives in
// dist/index.js and is also exposed via the `./styles` package export.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIST = new URL("../dist", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CSS_IMPORT = /^\s*import\s+["'][^"']+\.css["']\s*;?\s*\n?/gm;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (p.endsWith(".d.ts")) {
      const src = readFileSync(p, "utf8");
      const out = src.replace(CSS_IMPORT, "");
      if (out !== src) writeFileSync(p, out);
    }
  }
}

walk(DIST);
