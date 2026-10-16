// Renderiza frames representativos (um bundle só) para inspeção visual / auditoria.
// Uso: node scripts/stills.mjs <Composição> <pastaSaída> <seg1,seg2,...>
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";

const [comp, outDir, list] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = process.env.REMOTION_BROWSER ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, chromiumOptions: { gl: "swangle" } });
for (const s of list.split(",").map(Number)) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
  const output = path.join(outDir, `${comp}_${String(s.toFixed(2)).padStart(5, "0")}s.png`);
  await renderStill({ serveUrl, composition, frame, output, browserExecutable, chromiumOptions: { gl: "swangle" }, imageFormat: "png" });
  console.log("✔", output);
}
