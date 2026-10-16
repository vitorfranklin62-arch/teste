// Captura das telas reais usadas no comercial (Playwright + Chromium pré-instalado).
//
// Fontes:
//  - Site oficial ConectFly (identidade, logo, portfólio, CTA)  -> CONECTFLY_URL
//  - Projetos reais rodando localmente a partir dos repositórios do portfólio:
//      Site Farmácia Preço Bom  -> FARMACIA_SITE_URL (repo SITE-FARMACIA-PRE-O-BOM)
//      CRM Farmácia Preço Bom   -> CRM_URL          (repo CRM-FARMACIA-PRE-O-BOM, só a tela pública de login)
//
// Uso: node scripts/capture.mjs            (pula fontes inacessíveis e registra no manifest)
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("assets/captures");
const CONECTFLY_URL = process.env.CONECTFLY_URL ?? "https://conectfly-site.vitinhonavoz18.workers.dev/";
const FARMACIA_SITE_URL = process.env.FARMACIA_SITE_URL ?? "http://127.0.0.1:3101/";
const CRM_URL = process.env.CRM_URL ?? "http://127.0.0.1:3102/auth/login";

const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

const jobs = [
  { id: "conectfly_home", url: CONECTFLY_URL, source: "Site oficial ConectFly" },
  { id: "farmacia_site", url: FARMACIA_SITE_URL, source: "Repo SITE-FARMACIA-PRE-O-BOM (build local)" },
  { id: "crm_farmacia_login", url: CRM_URL, source: "Repo CRM-FARMACIA-PRE-O-BOM (tela pública de login)" },
];

async function settle(page) {
  // Revela animações de entrada (IntersectionObserver) rolando a página e voltando ao topo.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
await fs.mkdir(OUT, { recursive: true });
const manifest = [];

for (const job of jobs) {
  for (const [variant, ctxOpts] of [["desktop", DESKTOP], ["mobile", MOBILE]]) {
    const ctx = await browser.newContext({ ...ctxOpts, locale: "pt-BR", colorScheme: "dark" });
    const page = await ctx.newPage();
    const entry = { id: job.id, variant, url: job.url, source: job.source };
    try {
      await page.goto(job.url, { waitUntil: "networkidle", timeout: 45000 });
      await settle(page);
      const file = `${job.id}_${variant}.png`;
      await page.screenshot({ path: path.join(OUT, file) });
      // Página inteira (útil para "rolagem" dentro do notebook / celular).
      const full = `${job.id}_${variant}_full.png`;
      await page.screenshot({ path: path.join(OUT, full), fullPage: true });
      Object.assign(entry, { ok: true, file, full, title: await page.title() });
    } catch (err) {
      Object.assign(entry, { ok: false, error: String(err.message).split("\n")[0] });
    }
    manifest.push(entry);
    console.log(entry.ok ? "✔" : "✘", job.id, variant, entry.error ?? "");
    await ctx.close();
  }
}

await browser.close();
await fs.writeFile(path.join(OUT, "manifest.json"), JSON.stringify({ captured_at: new Date().toISOString(), items: manifest }, null, 2));
