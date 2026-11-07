import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { outDir } from "./kg-statistics-demo-common.mjs";

const kgRoot = path.resolve(process.env.KG_SYSTEM_ROOT ?? "C:\\github_app\\_worktrees\\survey-workflow-kg-help");
const outputDir = path.join(outDir, "feature-candidates");
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const requireKg = createRequire(path.join(kgRoot, "package.json"));
const { chromium } = requireKg("playwright");
const { spawnWorkbenchForBrowserTest } = await import(
  pathToFileURL(path.join(kgRoot, "scripts", "lib", "browser-test-server.mjs"))
);

const browser = await chromium.launch({ headless: true });
const candidates = [];
let number = 0;

async function capture(page, group, slug, description, { fullPage = false, locator = null } = {}) {
  number += 1;
  await page.waitForTimeout(250);
  const id = String(number).padStart(2, "0");
  const file = `${id}-${group}-${slug}.png`;
  if (locator) {
    await locator.scrollIntoViewIfNeeded();
    await locator.screenshot({ path: path.join(outputDir, file) });
  } else {
    await page.screenshot({ path: path.join(outputDir, file), fullPage });
  }
  candidates.push({ id, group, slug, description, file, selected: false });
}

async function withWorkbench(script, viewport, run) {
  process.chdir(kgRoot);
  const server = await spawnWorkbenchForBrowserTest(script);
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => localStorage.setItem("kgNspUiLocale.v2", "en"));
  const page = await context.newPage();
  try {
    await page.goto(server.url, { waitUntil: "networkidle" });
    await run(page);
  } finally {
    await context.close();
    await server.close();
  }
}

try {
  await withWorkbench("scripts/serve-response-screen-workbench.mjs", { width: 1440, height: 900 }, async page => {
    await page.click("#loadSample");
    await page.click("#loadRuntime");
    await capture(page, "response", "device-profiles", "Mobile, tablet, desktop, and print response profiles");
    await page.selectOption("#targetSelect", "desktop");
    await capture(page, "response", "desktop-profile", "Desktop response layout selected from the same runtime package");
    await page.selectOption("#targetSelect", "print");
    await capture(page, "response", "print-profile", "Print response target selected for paper-assisted operation");
    await page.selectOption("#uiLocaleSelect", "ru");
    await capture(page, "response", "russian-interface", "Russian operator interface selected without changing survey evidence");
    await page.selectOption("#uiLocaleSelect", "ky");
    await capture(page, "response", "kyrgyz-interface", "Kyrgyz operator interface selected without changing survey evidence");
  });

  await withWorkbench("scripts/serve-response-screen-workbench.mjs", { width: 390, height: 844 }, async page => {
    await page.click("#loadSample");
    await page.click("#loadRuntime");
    await capture(page, "response", "mobile-household-id", "Phone-sized interview screen for household identification", { fullPage: true });
    await page.fill('[data-answer="hh_id"]', "HH-BSH-0001");
    await page.click("#nextScreen");
    await capture(page, "response", "mobile-single-choice", "Phone-sized single-choice response screen", {
      locator: page.locator(".screen-panel")
    });
    await page.check('input[data-answer="oblast"][value="bishkek"]');
    await page.click("#nextScreen");
    await page.fill('[data-answer="household_size"]', "4");
    await page.click("#validateAnswers");
    await page.click("#exportBatch");
    await capture(page, "response", "mobile-offline-batch", "Validated interview exported as an offline response batch", {
      locator: page.locator(".batch-panel")
    });
  });

  await withWorkbench("scripts/serve-response-screen-workbench.mjs", { width: 768, height: 1024 }, async page => {
    await page.click("#loadSample");
    await page.click("#loadRuntime");
    await page.selectOption("#targetSelect", "tablet");
    await capture(page, "response", "tablet-profile", "Tablet interview layout from the same questionnaire runtime", {
      locator: page.locator(".screen-panel")
    });
  });

  await withWorkbench("scripts/serve-cleaning-workbench.mjs", { width: 1440, height: 900 }, async page => {
    await page.click("#loadSample");
    await page.click("#loadDefaultRules");
    await capture(page, "cleaning", "criteria", "Cleaning rule package and raw response dataset before execution", { fullPage: true });
    await page.click("#runCleaning");
    await capture(page, "cleaning", "profile-flags", "Row profile, applied rule count, and review flags", {
      locator: page.locator(".summary-panel")
    });
    await capture(page, "cleaning", "receipt", "Cleaning receipt preserving rules, flags, and lineage", {
      locator: page.locator(".receipt-panel")
    });
    await capture(page, "cleaning", "cleaned-dataset", "Cleaned dataset preview available for review and download", {
      locator: page.locator(".dataset-panel")
    });
  });

  await withWorkbench("scripts/serve-analysis-workbench.mjs", { width: 1440, height: 900 }, async page => {
    await page.click("#loadSample");
    await capture(page, "analysis", "table-settings", "Analysis strategy and segment crosstab settings", { fullPage: true });
    await page.click("#runAnalysis");
    await capture(page, "analysis", "preview-tables", "Generated analytical tasks and preview tables", {
      locator: page.locator(".table-panel")
    });
    await capture(page, "analysis", "table-chart-package", "Downloadable table and chart definition package", {
      locator: page.locator(".dsl-output-panel")
    });
  });

  await withWorkbench("scripts/serve-report-workbench.mjs", { width: 1440, height: 900 }, async page => {
    await page.click("#loadSample");
    await capture(page, "report", "verified-inputs", "Verified table definitions and verification receipt used as report inputs", { fullPage: true });
    await page.click("#runReport");
    await capture(page, "report", "table-summaries", "Evidence-supported table summaries and warning review", {
      locator: page.locator(".claim-panel")
    });
    await capture(page, "report", "report-package", "Versioned report package ready for publication rendering", {
      locator: page.locator(".report-panel")
    });
  });

  const selected = new Set([
    "device-profiles", "russian-interface", "kyrgyz-interface", "mobile-single-choice",
    "mobile-offline-batch", "tablet-profile", "criteria", "profile-flags", "receipt",
    "table-settings", "preview-tables", "table-chart-package", "verified-inputs",
    "table-summaries", "report-package"
  ]);
  for (const item of candidates) item.selected = selected.has(item.slug);
  await writeFile(path.join(outputDir, "candidate-inventory.json"), JSON.stringify({
    candidateCount: candidates.length,
    selectedCount: candidates.filter(item => item.selected).length,
    selectionRatio: Number((candidates.length / candidates.filter(item => item.selected).length).toFixed(2)),
    candidates
  }, null, 2));
  console.log(JSON.stringify({
    ok: true,
    candidateCount: candidates.length,
    selectedCount: candidates.filter(item => item.selected).length,
    outputDir
  }, null, 2));
} finally {
  await browser.close();
}
