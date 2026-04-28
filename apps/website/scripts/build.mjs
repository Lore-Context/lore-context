import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "src", "index.html");
const dist = join(root, "dist");

await mkdir(dist, { recursive: true });
await copyFile(src, join(dist, "index.html"));

console.log("Built apps/website/dist/index.html");
