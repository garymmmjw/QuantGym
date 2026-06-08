#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function htmlToJsx(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\bclass=/g, "className=")
    .replace(/\bfor=/g, "htmlFor=")
    .replace(/\breadonly\b/g, "readOnly")
    .replace(/\bmaxlength=/g, "maxLength=")
    .replace(/\bautocomplete=/g, "autoComplete=")
    .replace(/\bspellcheck=/g, "spellCheck=")
    .replace(/\btabindex=/g, "tabIndex=")
    .replace(/\baria-hidden=/g, "aria-hidden=")
    .replace(/\baria-label=/g, "aria-label=")
    .replace(/\baria-live=/g, "aria-live=")
    .replace(/\baria-expanded=/g, "aria-expanded=")
    .replace(/\baria-controls=/g, "aria-controls=")
    .replace(/\baria-pressed=/g, "aria-pressed=")
    .replace(/\baria-describedby=/g, "aria-describedby=")
    .replace(/\baria-labelledby=/g, "aria-labelledby=")
    .replace(/\bdata-([a-z-]+)=/g, "data-$1=")
    .replace(/<br>/g, "<br />")
    .replace(/<hr>/g, "<hr />")
    .replace(/<img([^>]*?)>/g, "<img$1 />")
    .replace(/<input([^>]*?)>/g, "<input$1 />")
    .replace(/<i([^>]*?)><\/i>/g, "<i$1></i>");
}

function componentName(moduleId) {
  return `${moduleId.charAt(0).toUpperCase()}${moduleId.slice(1)}PageMarkup`;
}

const modules = process.argv.slice(2);
const targets = modules.length
  ? modules
  : ["account", "community", "overview", "library", "plan", "problems", "interview", "skills", "tools", "pk", "poker"];

for (const moduleId of targets) {
  const htmlPath = path.join(root, "public", "pages", `${moduleId}.html`);
  if (!fs.existsSync(htmlPath)) {
    console.error(`Missing ${htmlPath}`);
    process.exitCode = 1;
    continue;
  }
  const raw = fs.readFileSync(htmlPath, "utf8").trim();
  const jsx = htmlToJsx(raw);
  const name = componentName(moduleId);
  const outDir = path.join(root, "src", "features", moduleId);
  fs.mkdirSync(outDir, { recursive: true });
  const out = `export function ${name}() {
  return (
    <>
${jsx.split("\n").map((line) => `      ${line}`).join("\n")}
    </>
  );
}
`;
  fs.writeFileSync(path.join(outDir, `${name}.jsx`), out);
  console.log(`Wrote src/features/${moduleId}/${name}.jsx`);
}
