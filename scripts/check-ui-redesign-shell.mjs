import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const shellCssPath = path.join(root, "src", "styles", "playful-precision-shell.css");
const mainPath = path.join(root, "src", "main.jsx");
const appShellPath = path.join(root, "src", "components", "shell", "AppShellMain.jsx");
const authShellPath = path.join(root, "src", "components", "shell", "AuthShell.jsx");

const failures = [];

function rel(filePath) {
  return path.relative(root, filePath);
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    failures.push(`missing file: ${rel(filePath)}`);
    return "";
  }
}

const main = readText(mainPath);
const appShell = readText(appShellPath);
const authShell = readText(authShellPath);
const shellCss = readText(shellCssPath);
const temporaryPathMarker = ["/", "tmp", "/"].join("");

const routeOverrideImport = 'import "./styles/react-route-overrides.css";';
const shellImport = 'import "./styles/playful-precision-shell.css";';
expect(main.includes(shellImport), "src/main.jsx must import playful-precision-shell.css");
expect(
  main.indexOf(routeOverrideImport) !== -1
    && main.indexOf(shellImport) > main.indexOf(routeOverrideImport),
  "playful-precision-shell.css must import after react-route-overrides.css"
);

for (const marker of [
  "qg-app-shell",
  "qg-shell-rail",
  "qg-command-bar",
  "qg-route-container",
  "themeToggleBtn"
]) {
  expect(appShell.includes(marker), `AppShellMain.jsx missing ${marker}`);
}

for (const marker of [
  "qg-auth-screen",
  "qg-auth-brand",
  "qg-auth-card",
  "auth-brand-q-badge",
  "/assets/generated/playful-precision/mascot-hero-v5-clean.png"
]) {
  expect(authShell.includes(marker), `AuthShell.jsx missing ${marker}`);
}

for (const marker of [
  "body.is-authenticated #appShell.qg-app-shell",
  ".qg-shell-rail",
  ".qg-command-bar",
  ".qg-auth-screen",
  ".qg-auth-card",
  "body.is-authenticated.sidebar-collapsed #appShell.qg-app-shell",
  "@media (max-width: 860px)",
  "@media (prefers-reduced-motion: reduce)"
]) {
  expect(shellCss.includes(marker), `shell CSS missing ${marker}`);
}

expect(!shellCss.includes(temporaryPathMarker), "shell CSS must not reference temporary paths");

if (failures.length) {
  console.error("ui redesign shell check failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "pass",
  shellClasses: 5,
  authClasses: 3,
  cssMarkers: 8
}, null, 2));
