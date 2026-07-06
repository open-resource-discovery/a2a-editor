import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import postcss from "postcss";
import { resolve } from "path";
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";

/**
 * Strip all @layer wrappers from CSS output and scope loose selectors to .a2a-root.
 *
 * This is needed because the standalone bundle is embedded in host pages
 * (e.g. Docusaurus) where Infima's un-layered global styles would always
 * beat our layered Tailwind utilities. By removing @layer wrappers,
 * all rules compete on specificity alone, and .a2a-root scoping wins.
 */
function stripCssLayers(css: string): string {
  // Match @layer <name> { ... } — need to handle nested braces
  let result = css;
  const layerRegex = /@layer\s+[\w-]+\s*\{/g;
  let match: RegExpExecArray | null;
  const matches: { start: number; end: number }[] = [];

  while ((match = layerRegex.exec(result)) !== null) {
    const start = match.index;
    let depth = 0;
    let i = start + match[0].length - 1; // position of opening brace
    for (; i < result.length; i++) {
      if (result[i] === "{") depth++;
      else if (result[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    matches.push({ start, end: i });
  }

  // Process in reverse order to preserve indices
  for (let j = matches.length - 1; j >= 0; j--) {
    const { start, end } = matches[j];
    const layerHeader = result.slice(start, result.indexOf("{", start) + 1);
    result = result.slice(0, start) + result.slice(start + layerHeader.length, end) + result.slice(end + 1);
  }

  // Remove bare @layer order declarations like "@layer components;"
  result = result.replace(/@layer\s+[\w,\s-]+;/g, "");

  // Scope zero-specificity :where() selectors to .a2a-root
  result = result.replace(/(?<![.\w])(:where\(\.[a-zA-Z])/g, ".a2a-root $1");

  // Scope the @supports properties block to .a2a-root
  result = result.replace(
    /(\{)\*\s*,\s*:before\s*,\s*:after\s*,\s*::backdrop\s*\{/g,
    "$1.a2a-root *,.a2a-root :before,.a2a-root :after,.a2a-root ::backdrop{",
  );

  return result;
}

/**
 * Use PostCSS to remove bare Tailwind preflight element rules from the built CSS.
 *
 * After @layer stripping, ui-components' preflight rules (h1-h6, img/svg, ol/ul,
 * etc.) become globally un-layered. Our own styles.css has a complete scoped
 * replacement under `.a2a-root :where(...)` — the bare rules are redundant and
 * break host-page styles when the bundle is embedded (e.g. in Docusaurus).
 *
 * We use PostCSS as a proper CSS parser rather than a hand-rolled text-walker, so
 * selector detection is accurate and handles all minified output structures.
 * A rule is considered "bare preflight" when ALL of its selectors start with a
 * letter or `*` (element names) and none start with `.` (classes already scoped).
 */
function stripBarePreflightRules(css: string): string {
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    // Skip rules inside @-rules (e.g. @keyframes, @media, @supports)
    if (rule.parent?.type === "atrule") return;
    const allBare = rule.selectors.every((sel) => {
      const s = sel.trim();
      return /^[a-zA-Z*]/.test(s) && !s.startsWith(".");
    });
    if (allBare) rule.remove();
  });
  return root.toResult().css;
}

/**
 * Vite config for standalone bundle (IIFE format with React bundled).
 * Used for CDN distribution and script tag usage.
 */
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "copy-standalone-files",
      closeBundle() {
        // Ensure dist-standalone exists
        const outDir = resolve(__dirname, "dist-standalone");
        if (!existsSync(outDir)) {
          mkdirSync(outDir, { recursive: true });
        }

        // Strip @layer wrappers then bare preflight element rules from the CSS so
        // the standalone bundle does not pollute host-page styles (e.g. Docusaurus)
        const cssPath = resolve(outDir, "a2a-playground.css");
        if (existsSync(cssPath)) {
          let css = readFileSync(cssPath, "utf-8");
          css = stripCssLayers(css);
          css = stripBarePreflightRules(css);
          writeFileSync(cssPath, css);
          console.log("Stripped @layer wrappers and bare preflight from a2a-playground.css");
        }

        // Copy static files from standalone/ to dist-standalone/
        const standaloneDir = resolve(__dirname, "standalone");
        const filesToCopy = ["index.html", "a2a-initializer.js", "index.cjs"];

        for (const file of filesToCopy) {
          const src = resolve(standaloneDir, file);
          const dest = resolve(outDir, file);
          if (existsSync(src)) {
            copyFileSync(src, dest);
            console.log(`Copied ${file} to dist-standalone/`);
          }
        }

        // Copy OAuth callback page directory
        const oauthSrcDir = resolve(standaloneDir, "oauth/callback");
        const oauthDestDir = resolve(outDir, "oauth/callback");
        const oauthFile = resolve(oauthSrcDir, "index.html");
        if (existsSync(oauthFile)) {
          if (!existsSync(oauthDestDir)) {
            mkdirSync(oauthDestDir, { recursive: true });
          }
          copyFileSync(oauthFile, resolve(oauthDestDir, "index.html"));
          console.log("Copied oauth/callback/index.html to dist-standalone/");
        }

        // Copy predefined-agents.json from public/
        const publicFile = resolve(__dirname, "public/predefined-agents.json");
        if (existsSync(publicFile)) {
          copyFileSync(publicFile, resolve(outDir, "predefined-agents.json"));
          console.log("Copied predefined-agents.json to dist-standalone/");
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@lib": resolve(__dirname, "./src/lib"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  define: {
    // Replace version placeholder with actual version
    "__VERSION__": JSON.stringify(process.env.npm_package_version || "0.0.0-standalone"),
    // Define process.env for browser compatibility
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": JSON.stringify({}),
  },
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, "src/lib/standalone.ts"),
      name: "A2APlayground",
      formats: ["iife"],
      fileName: () => "a2a-playground.js",
    },
    rollupOptions: {
      // Bundle everything including React (no external deps)
      external: [],
      output: {
        // All code in one file
        inlineDynamicImports: true,
        // Put CSS in same directory
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.[0]?.endsWith(".css")) {
            return "a2a-playground.css";
          }
          return "[name][extname]";
        },
      },
    },
    outDir: "dist-standalone",
    cssCodeSplit: false,
    // Optimize for size
    minify: "oxc",
    sourcemap: true,
  },
});
