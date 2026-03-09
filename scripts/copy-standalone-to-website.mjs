import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const sourceDir = resolve(rootDir, "dist-standalone");
const targetDir = resolve(rootDir, "website/static/standalone");

if (!existsSync(sourceDir)) {
  throw new Error(`Standalone build output not found: ${sourceDir}`);
}

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });
cpSync(sourceDir, targetDir, { recursive: true });

console.log(`Copied standalone assets from ${sourceDir} to ${targetDir}`);
