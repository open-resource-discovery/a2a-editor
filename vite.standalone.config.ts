import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";

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
          if (assetInfo.name?.endsWith(".css")) {
            return "a2a-playground.css";
          }
          return "[name][extname]";
        },
      },
    },
    outDir: "dist-standalone",
    cssCodeSplit: false,
    // Optimize for size
    minify: "esbuild",
    sourcemap: true,
  },
});
