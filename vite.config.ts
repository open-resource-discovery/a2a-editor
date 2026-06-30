/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { readFileSync } from "fs";

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
    plugins: [react(), tailwindcss()],
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
