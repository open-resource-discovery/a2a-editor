/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import postcss from "postcss";
import { resolve } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";

// The card root (`.a2a-root`) is rendered on the SAME element as `.ord-ui`
// (see src/lib/components/ThemeRoot.tsx).
const CARD_CLASS = "a2a-root";

/**
 * Confine ui-components' `.ord-ui`-scoped reset + token rules (pulled in via
 * `@import "@open-resource-discovery/ui-components/styles"` in styles.css) so
 * they can only match THIS library's own card, never a consumer app that is
 * itself wrapped in `.ord-ui`.
 *
 * ui-components ships a global `.ord-ui :where(*){margin:0;padding:0}` reset
 * (specificity (0,1,0) — the `.ord-ui` class sits outside the `:where()`). When
 * this library's CSS is loaded alongside a host that also uses ui-components,
 * that bare reset re-zeroes margin/padding on the host's own `.ord-ui`
 * components. Because `.a2a-root` is the same element as `.ord-ui`, we add the
 * card-root requirement to every bare `.ord-ui` — but via `:where(.a2a-root)`,
 * which contributes ZERO specificity. The reset therefore still can't match a
 * foreign `.ord-ui` (one without `.a2a-root`), yet stays at a single-class
 * specificity so the utility classes that add padding/borders back (also
 * single-class, emitted after the reset) keep winning by source order. Writing
 * the compound as `.a2a-root.ord-ui` instead would raise the reset to (0,2,0)
 * and out-rank those utilities, zeroing all card padding/borders. `:root`/
 * `:host` theme blocks are left untouched. Generated utilities and a2a-owned
 * classes are left untouched. Mirrors overlay-editor's scopeToCardView() intent
 * (confine to the card) while preserving the cascade.
 */
function confineOrdUiReset(css: string, cardClass: string): string {
  // `:where(.card)` keeps specificity at the single `.ord-ui` class.
  const compound = `.ord-ui:where(.${cardClass})`;
  const bareOrdUi = /\.ord-ui(?![-\w])/g;
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    const parent = rule.parent;
    if (parent?.type === "atrule") {
      const name = (parent as postcss.AtRule).name.toLowerCase();
      if (name.includes("keyframes") || name === "font-face") return;
    }
    rule.selectors = rule.selectors.map((sel) => {
      const s = sel.trim();
      if (!s || s.includes(`.${cardClass}`)) return sel;
      if (bareOrdUi.test(s)) {
        bareOrdUi.lastIndex = 0;
        return s.replace(bareOrdUi, compound);
      }
      return sel;
    });
  });
  return root.toResult().css;
}

/** Safety gate: any `.ord-ui` not confined via `:where(.<cardClass>)` would leak. */
function findLeakingOrdUi(css: string, cardClass: string): string[] {
  const leak = new RegExp(`\\.ord-ui(?![-\\w])(?!:where\\(\\.${cardClass}\\))`);
  const leaks: string[] = [];
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    for (const sel of rule.selectors) {
      if (leak.test(sel)) leaks.push(sel.trim());
    }
  });
  return leaks;
}

/**
 * Vite plugin: post-process the emitted library `index.css` to confine the
 * ui-components `.ord-ui` reset to the card root (lib build only).
 */
function confineOrdUiResetPlugin(outDir: string) {
  return {
    name: "confine-ord-ui-reset",
    writeBundle() {
      const cssPath = resolve(__dirname, outDir, "index.css");
      if (!existsSync(cssPath)) return;
      const confined = confineOrdUiReset(readFileSync(cssPath, "utf-8"), CARD_CLASS);
      const leaks = findLeakingOrdUi(confined, CARD_CLASS);
      if (leaks.length > 0) {
        throw new Error(
          `index.css has ${leaks.length} un-confined .ord-ui selector(s) that would leak to the host: ` +
            leaks.slice(0, 10).join(", "),
        );
      }
      writeFileSync(cssPath, confined);
      console.log(`Confined .ord-ui reset to .ord-ui:where(.${CARD_CLASS}) in ${outDir}/index.css (0 leaks)`);
    },
  };
}

// Externalize all declared deps so their CJS code is never bundled into the dist.
// Bundled CJS packages (e.g. @base-ui/react) emit require("react") calls that throw
// in a browser ESM context. The regex covers subpath imports (react/jsx-runtime, etc.)
const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};
const allDeps = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
  "react/jsx-runtime",
];
const externalRegex = new RegExp(`^(${allDeps.map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(/.*)?$`);

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isLib = mode === "lib";
  const isProduction = process.env.NODE_ENV === "production";

  return {
    // Base path for GitHub Pages deployment (org/repo-name)
    base: isLib ? "/" : isProduction ? "/ORD/a2a-editor/" : "/",
    test: {
      include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      environment: "jsdom",
      pool: "forks",
      execArgv: ["--no-experimental-webstorage"],
    },
    plugins: [react(), tailwindcss(), ...(isLib ? [confineOrdUiResetPlugin("dist")] : [])],
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        "@lib": resolve(__dirname, "./src/lib"),
        "@demo": resolve(__dirname, "./src/demo"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime"],
    },
    build: isLib
      ? {
          lib: {
            // Multiple entry points for tree-shaking
            entry: {
              "index": resolve(__dirname, "src/lib/index.ts"),
              "playground-lite": resolve(__dirname, "src/lib/playground-lite.ts"),
              "viewer": resolve(__dirname, "src/lib/viewer.ts"),
              "editor": resolve(__dirname, "src/lib/editor.ts"),
              "card-view": resolve(__dirname, "src/lib/card-view.ts"),
            },
            formats: ["es"],
          },
          rollupOptions: {
            external: (id) => externalRegex.test(id),
            output: {
              globals: {
                "react": "React",
                "react-dom": "ReactDOM",
              },
              // Separate chunk files per entry
              chunkFileNames: "chunks/[name]-[hash].js",
              assetFileNames: (assetInfo) => {
                // Rename styles.css → index.css to match package.json exports
                if (assetInfo.name?.endsWith(".css")) {
                  return "index.css";
                }
                return "[name][extname]";
              },
            },
          },
          // Enable CSS splitting to get separate CSS file
          cssCodeSplit: true,
        }
      : {},
  };
});
