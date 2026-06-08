#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const featuresDir = path.join(root, "src/features");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const moduleMap = {
  "toolsHooks.js": "tools",
  "planHooks.js": "plan",
  "libraryHooks.js": "library",
  "overviewHooks.js": "overview",
  "skillsHooks.js": "skills",
  "communityHooks.js": "community",
  "accountHooks.js": "account",
  "pkHooks.js": "pk",
  "companiesHooks.js": null,
  "newsHooks.js": null,
  "settingsHooks.js": null
};

for (const filePath of walk(featuresDir)) {
  if (!/\.(js|jsx)$/.test(filePath)) continue;
  let text = fs.readFileSync(filePath, "utf8");
  if (!text.includes("legacyApp.pageApi") && !text.includes("useLegacyApp")) continue;

  if (!text.includes("usePageApi")) {
    text = text.replace(
      /import \{([^}]+)\} from "\.\.\/\.\.\/stores\/LegacyAppContext\.jsx";/,
      (match, imports) => {
        const parts = imports.split(",").map((s) => s.trim()).filter(Boolean);
        const withoutLegacy = parts.filter((p) => p !== "useLegacyApp");
        const legacyImports = withoutLegacy.length ? `import { ${withoutLegacy.join(", ")} } from "../../stores/LegacyAppContext.jsx";\n` : "";
        return `${legacyImports}import { useAppServices, usePageApi } from "../../stores/usePageApi.js";`;
      }
    );
  }

  if (text.includes("const legacyApp = useLegacyApp()")) {
    text = text.replace(/const legacyApp = useLegacyApp\(\);/g, "const legacyApp = useAppServices();\n  const pageApi = usePageApi();");
  }

  const base = path.basename(filePath);
  const moduleId = moduleMap[base];
  if (moduleId && text.includes(`legacyApp.pageApi?.${moduleId}`)) {
    text = text.replace(new RegExp(`legacyApp\\.pageApi\\?\\.${moduleId}`, "g"), `usePageApi("${moduleId}")`);
    text = text.replace(`const api = usePageApi("${moduleId}");`, `const api = usePageApi("${moduleId}");`);
    // fix double - if we already have usePageApi in import, assign api properly
    if (!text.includes(`const api = usePageApi("${moduleId}")`)) {
      text = text.replace(`usePageApi("${moduleId}");`, `const api = usePageApi("${moduleId}");`);
    }
  }

  text = text.replace(/legacyApp\.pageApi\?\./g, "pageApi?.");
  text = text.replace(/legacyApp\.pageApi\./g, "pageApi.");

  fs.writeFileSync(filePath, text);
  console.log("Updated", path.relative(root, filePath));
}
