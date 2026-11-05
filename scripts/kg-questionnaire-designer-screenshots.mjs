import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { outDir } from "./kg-statistics-demo-common.mjs";

const kgRoot = path.resolve(process.env.KG_SYSTEM_ROOT ?? "C:\\github_app\\_worktrees\\survey-workflow-kg-help");
const outputDir = path.join(outDir, "questionnaire-designer-candidates");
const rawVideoDir = path.join(outDir, "work", "questionnaire-designer-video");
const selectedVideoDir = path.join(outDir, "selected-video-clips");
await rm(outputDir, { recursive: true, force: true });
await rm(rawVideoDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await mkdir(rawVideoDir, { recursive: true });
await mkdir(selectedVideoDir, { recursive: true });

const requireKg = createRequire(path.join(kgRoot, "package.json"));
const { chromium } = requireKg("playwright");
const { spawnWorkbenchForBrowserTest } = await import(
  pathToFileURL(path.join(kgRoot, "scripts", "lib", "browser-test-server.mjs"))
);

const build = spawnSync(process.execPath, [
  path.join(kgRoot, "node_modules", "vite", "bin", "vite.js"),
  "build", "--config", "apps/question-input-react-designer/vite.config.js"
], { cwd: kgRoot, stdio: "inherit", timeout: 180000, env: { ...process.env } });
assert.equal(build.status, 0, "Questionnaire designer build failed");

process.chdir(kgRoot);
const server = await spawnWorkbenchForBrowserTest("scripts/serve-question-input-react-designer-dist.mjs", {
  env: { QUESTION_DESIGNER_DISABLE_REMOTE: "1" }
});
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  acceptDownloads: true,
  recordVideo: { dir: rawVideoDir, size: { width: 1920, height: 1080 } }
});
const page = await context.newPage();
const candidates = [];
let number = 0;

async function capture(slug, description, { fullPage = false } = {}) {
  number += 1;
  await page.waitForTimeout(250);
  const id = String(number).padStart(2, "0");
  const file = `${id}-${slug}.png`;
  await page.screenshot({ path: path.join(outputDir, file), fullPage });
  candidates.push({ id, slug, description, file, selected: false });
}

async function captureRegion(slug, description, locator) {
  number += 1;
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const id = String(number).padStart(2, "0");
  const file = `${id}-${slug}.png`;
  await locator.screenshot({ path: path.join(outputDir, file) });
  candidates.push({ id, slug, description, file, selected: false });
}

async function tab(name) {
  await page.locator(".workflow-tabs button").filter({ hasText: name }).first().click();
  await page.waitForTimeout(250);
}

try {
  await page.goto(`${server.url}/?fixture=kg_household&tab=author`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.setItem("kgQuestionDesignerAssistMode", "local"));
  await page.selectOption(".locale-switcher select", "en");

  await capture("author-sheet", "Spreadsheet-style direct questionnaire input");
  await page.locator(".sheet-table").scrollIntoViewIfNeeded();
  await capture("author-sheet-rows", "Question rows with identifiers, types, labels, required fields, and choices");

  await tab("Define");
  await capture("define-question", "Selected-question editor with wording, response type, and metadata");
  await page.locator(".question-row").nth(3).click();
  await capture("define-existing-question", "An existing household question loaded for editing");

  const condition = page.locator(".condition-builder-form");
  await condition.scrollIntoViewIfNeeded();
  await capture("condition-builder", "Deterministic response-condition and routing builder");
  const source = page.getByLabel("condition source");
  const target = page.getByLabel("condition target");
  if (await source.locator('option[value="worked_last_7_days"]').count() &&
      await target.locator('option[value="main_employment_status"]').count()) {
    await source.selectOption("worked_last_7_days");
    await target.selectOption("main_employment_status");
    await page.getByLabel("condition effect").selectOption("show_if");
    await page.getByLabel("condition operator").selectOption("==");
    await page.getByRole("textbox", { name: "Value", exact: true }).fill("yes");
    await page.getByRole("button", { name: "Build condition card", exact: true }).click();
    await captureRegion("condition-card", "Show employment status only when the person worked in the last seven days", page.locator(".condition-builder-form").locator(".."));
  }

  await tab("Flow");
  await page.locator(".flow-graph-workspace").waitFor();
  await capture("flow-map", "Survey flow map showing order, branches, and routes");
  await page.getByRole("button", { name: "Flow rules", exact: true }).click();
  await page.locator(".logic-studio").waitFor();
  await capture("flow-rules", "Plain-language flow rule with generated condition DSL");

  await tab("Bank");
  await page.locator(".bank-workspace").waitFor();
  await capture("survey-bank", "Survey Bank with import, search, save, and existing templates");
  await page.locator(".library-layer-panel").scrollIntoViewIfNeeded();
  await capture("module-library", "KG household module library with common questions and rule templates");
  await page.locator(".bank-grid").scrollIntoViewIfNeeded();
  await capture("existing-surveys", "Existing reusable surveys available for editing");
  await page.locator('input[type="file"]').setInputFiles(
    path.join(path.resolve(process.cwd(), "..", ".."), "pr-studio", "docs", "demo-scripts",
      "kg-statistics-mvp", "household-living-conditions-questionnaire.json")
  );
  await page.waitForTimeout(1200);
  const importStatus = await page.locator(".editor-head p").innerText().catch(() => "");
  assert.match(importStatus, /^Imported \d+ question rows from /, `Import did not complete: ${importStatus}`);
  await capture("imported-questionnaire", "A real existing questionnaire file imported into the editable question list");
  await page.locator(".editor-scroll").scrollIntoViewIfNeeded();
  await capture("imported-questionnaire-editor", "Imported questions immediately available for editing");

  await tab("Review");
  await page.getByRole("button", { name: "Question QA", exact: true }).click();
  await page.locator(".survey-test-workbench").waitFor();
  await capture("question-qa", "Questionnaire quality checklist and review workspace");

  await tab("Export");
  await page.waitForTimeout(500);
  await capture("export-contracts", "Validated questionnaire export options including XLSForm and collection package");

  const selected = new Set([
    "author-sheet", "define-existing-question", "condition-card", "flow-map",
    "survey-bank", "module-library", "imported-questionnaire-editor"
  ]);
  for (const item of candidates) item.selected = selected.has(item.slug);
  await writeFile(path.join(outputDir, "candidate-inventory.json"), JSON.stringify({
    sourceBranch: "codex/kg-mvp-internal-help",
    sourceCommit: spawnSync("git", ["rev-parse", "HEAD"], { cwd: kgRoot, encoding: "utf8" }).stdout.trim(),
    candidateCount: candidates.length,
    selectedCount: candidates.filter(item => item.selected).length,
    candidates
  }, null, 2));
  console.log(JSON.stringify({
    ok: true,
    candidateCount: candidates.length,
    selectedCount: candidates.filter(item => item.selected).length,
    outputDir
  }, null, 2));
} finally {
  const video = page.video();
  await context.close();
  if (video) {
    await cp(await video.path(), path.join(selectedVideoDir, "questionnaire-design-import-condition.webm"));
  }
  await browser.close();
  await server.close();
}
