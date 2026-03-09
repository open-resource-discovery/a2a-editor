import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isLib = mode === "lib";
  const isProduction = process.env.NODE_ENV === "production";

  return {
    // Base path for GitHub Pages deployment (org/repo-name)
    base: isLib ? "/" : isProduction ? "/ORD/a2a-editor/" : "/",
    plugins: [
      react(),
      tailwindcss(),
      ...(isLib
        ? [
            dts({
              include: ["src/lib/**/*.ts", "src/lib/**/*.tsx"],
              outDir: "dist",
              rollupTypes: false,
              tsconfigPath: "./tsconfig.app.json",
              copyDtsFiles: true,
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        "@lib": resolve(__dirname, "./src/lib"),
        "@demo": resolve(__dirname, "./src/demo"),
      },
    },
    build: isLib
      ? {
          lib: {
            // Multiple entry points for tree-shaking
            entry: {
              index: resolve(__dirname, "src/lib/index.ts"),
              "playground-lite": resolve(
                __dirname,
                "src/lib/playground-lite.ts",
              ),
              viewer: resolve(__dirname, "src/lib/viewer.ts"),
              editor: resolve(__dirname, "src/lib/editor.ts"),
              "card-view": resolve(__dirname, "src/lib/card-view.ts"),
            },
            formats: ["es"],
          },
          rollupOptions: {
            external: ["react", "react-dom", "react/jsx-runtime"],
            output: {
              globals: {
                react: "React",
                "react-dom": "ReactDOM",
              },
              // Separate chunk files per entry
              chunkFileNames: "chunks/[name]-[hash].js",
              assetFileNames: "[name][extname]",
            },
          },
          // Enable CSS splitting to get separate CSS file
          cssCodeSplit: true,
        }
      : {},
  };
});
