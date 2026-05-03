import fs from "node:fs";
import path from "node:path";

const srcDir = "src";
const distDir = "dist";

const assets = [
  "manifest.json",
  "popup.html",
  "options.html"
];

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

for (const asset of assets) {
  const srcPath = path.join(srcDir, asset);
  const distPath = path.join(distDir, asset);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, distPath);
    console.log(`Copied ${asset} to dist/`);
  }
}

// Ensure icons directory exists
if (!fs.existsSync(path.join(distDir, "icons"))) {
  fs.mkdirSync(path.join(distDir, "icons"), { recursive: true });
}
