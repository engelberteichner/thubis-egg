/**
 * Post-build script to generate index.html for static hosting.
 * TanStack Start's SSR build doesn't output index.html, so we generate one
 * that loads the client assets. This is needed for GitHub Pages deployment.
 */
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const clientDir = "dist/client";
const assetsDir = join(clientDir, "assets");

function findAssets() {
  const files = readdirSync(assetsDir);
  const css = files.find((f) => f.endsWith(".css"));
  const jsEntries = files.filter((f) => f.endsWith(".js"));
  return { css, jsEntries };
}

function generateHtml({ css, jsEntries }) {
  const cssTag = css
    ? `    <link rel="stylesheet" href="assets/${css}" />`
    : "";

  // Find the main entry (the one that imports from the other chunk)
  const mainEntry = jsEntries.find((f) => {
    const content = readFileSync(join(assetsDir, f), "utf8");
    return content.includes('from"./index-') || content.includes("from './index-") || content.includes('from "./index-');
  }) || jsEntries[0];

  const scriptTag = `    <script type="module" src="assets/${mainEntry}"></script>`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Thubis Egg Timer</title>
    <meta name="description" content="Egg Timer Pro is an iPhone app for cooking eggs with adjustable timers and visual feedback." />
${cssTag}
  </head>
  <body>
${scriptTag}
  </body>
</html>
`;
}

const assets = findAssets();
const html = generateHtml(assets);
writeFileSync(join(clientDir, "index.html"), html);
console.log("Generated dist/client/index.html");
