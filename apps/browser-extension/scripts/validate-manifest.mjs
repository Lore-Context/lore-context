import fs from "node:fs";
import path from "node:path";

const manifestPath = path.join(process.cwd(), "src/manifest.json");

function validate() {
  console.log("Validating manifest.json...");
  
  if (!fs.existsSync(manifestPath)) {
    console.error("Error: manifest.json not found at", manifestPath);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  const errors = [];

  // Basic MV3 checks
  if (manifest.manifest_version !== 3) {
    errors.push("manifest_version must be 3");
  }

  if (!manifest.name) errors.push("Missing 'name'");
  if (!manifest.version) errors.push("Missing 'version'");
  
  if (!manifest.background || !manifest.background.service_worker) {
    errors.push("MV3 requires a background service worker");
  }

  if (manifest.background && manifest.background.scripts) {
    errors.push("MV3 does not support background scripts; use service_worker");
  }

  if (!manifest.action) {
    errors.push("MV3 prefers 'action' over 'browser_action' or 'page_action'");
  }

  if (manifest.permissions && manifest.permissions.includes("<all_urls>")) {
    errors.push("Broad '<all_urls>' permission detected. Ensure this is justified.");
  }

  if (errors.length > 0) {
    console.error("Validation FAILED:");
    errors.forEach(err => console.error(`- ${err}`));
    process.exit(1);
  }

  console.log("Manifest is valid for MV3.");
}

validate();
