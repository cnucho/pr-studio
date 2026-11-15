/** Capture the actual Streamlit tutorial-v1 path with public synthetic bytes. */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const example = process.env.LCA_MCA_EXAMPLE_DIR ?? "D:/Git/research-app-examples/out/lca-mca-tutorial-v1b";
const appUrl = process.env.LCA_MCA_APP_URL ?? "http://127.0.0.1:8765/";
const out = path.join(root, "out", "lca-mca-platform");
const shots = path.join(out, "captures");
await mkdir(shots, { recursive: true });
const expected = JSON.parse(await readFile(path.join(example, "manifest.json"), "utf8"));
const csv = path.join(example, "mobility_survey.csv");
const book = path.join(example, "codebook.json");
const digest = createHash("sha256").update(await readFile(csv)).digest("hex");
if (digest !== expected.sha256["mobility_survey.csv"] || expected.rows !== 1800 || expected.columns !== 21) {
  throw new Error("Example release identity mismatch");
}
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const errors = [];
const receipt = { appUrl, exampleVersion: expected.version, exampleSha256: digest, scenes: [], errors };

async function freshPage() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "LCA·MCA 분석" }).waitFor({ timeout: 30000 });
  return { context, page };
}
async function shot(page, name, focus) {
  await page.getByRole("button", { name: "Stop", exact: true }).waitFor({ state: "hidden", timeout: 45000 });
  if (focus) await focus.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const file = path.join(shots, `${name}.png`);
  await page.screenshot({ path: file });
  receipt.scenes.push({ name, file: path.relative(root, file).replaceAll("\\", "/"), text: (await page.locator("body").innerText()).slice(0, 3000) });
}
async function tab(page, name) { await page.getByRole("tab", { name, exact: true }).click(); }
async function selectOne(page, label, value) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: value, exact: true }).click();
  await page.keyboard.press("Escape");
}
async function enterBrief(page, method, question, indicators) {
  await tab(page, "연구문제");
  await page.getByRole("textbox", { name: "연구문제 원문" }).fill(question);
  await page.getByRole("textbox", { name: "지표 후보" }).fill(indicators.join(","));
  await selectOne(page, "분석 경로", method);
  await tab(page, "연구문제");
  await page.getByRole("button", { name: "분석 계획 후보 만들기" }).click();
}
async function importFiles(page) {
  await tab(page, "자료");
  const uploaders = page.locator('[data-testid="stFileUploader"] input[type="file"]');
  await uploaders.nth(0).setInputFiles(csv);
  await uploaders.nth(1).setInputFiles(book);
  await page.getByRole("button", { name: "불러오기", exact: true }).click();
  await page.getByText("행 1800, 열 21", { exact: false }).waitFor({ timeout: 30000 });
}
async function review(page) {
  await tab(page, "보고서");
  await page.getByRole("textbox", { name: "검토자", exact: true }).fill("예제 연구자");
  for (const name of ["질문을 확인했다", "문항 라벨을 확인했다", "분석 준비를 확인했다"]) {
    await page.getByText(name, { exact: true }).click();
    await page.waitForTimeout(450);
  }
  await page.getByRole("button", { name: "검토 기록", exact: true }).click();
  await page.getByText("질문과 문항 라벨의 검토 기록을 남겼다", { exact: false }).waitFor();
}
async function saveReport(page, button, stem) {
  await page.getByRole("button", { name: button, exact: true }).click();
  const downloadButton = page.getByRole("button", { name: "project_export.zip" });
  try {
    await downloadButton.waitFor({ timeout: 12000 });
  } catch (error) {
    await shot(page, `${stem}-export-error`, page.getByRole("heading", { name: "해석과 보고서" }));
    console.error((await page.locator("body").innerText()).slice(-3500));
    throw error;
  }
  const promise = page.waitForEvent("download");
  await downloadButton.click();
  const downloaded = await promise;
  await downloaded.saveAs(path.join(out, `${stem}-project_export.zip`));
  return path.join(out, `${stem}-project_export.zip`);
}

try {
  const lca = await freshPage();
  await shot(lca.page, "intro-home", lca.page.getByRole("heading", { name: "LCA·MCA 분석" }));
  await tab(lca.page, "자료");
  await lca.page.getByText("가상 예제 자료로 따라하기").click();
  await shot(lca.page, "intro-example", lca.page.getByText("가상 예제 자료로 따라하기"));
  const attitude = ["att_cost", "att_convenience", "att_environment", "att_safety", "att_digital", "att_transit", "att_flexibility", "att_ownership"];
  await enterBrief(lca.page, "LCA: 잠재유형", "응답자의 이동 태도 유형은 무엇인가?", attitude);
  await shot(lca.page, "tutorial-lca-question", lca.page.getByRole("textbox", { name: "연구문제 원문" }));
  await importFiles(lca.page);
  await shot(lca.page, "tutorial-import", lca.page.getByText("행 1800, 열 21", { exact: false }));
  await tab(lca.page, "전처리");
  await lca.page.getByRole("button", { name: "전처리 제안" }).click();
  await shot(lca.page, "tutorial-preparation", lca.page.getByRole("heading", { name: "전처리" }));
  await tab(lca.page, "LCA");
  await shot(lca.page, "intro-lca-ready", lca.page.getByRole("heading", { name: "LCA", exact: true }));
  await lca.page.getByRole("button", { name: "계층 탐색" }).click();
  await lca.page.getByText("BIC 최저 후보", { exact: false }).waitFor({ timeout: 120000 });
  await lca.page.getByText("상태: BIC 후보만 있다", { exact: false }).waitFor({ timeout: 30000 });
  await shot(lca.page, "tutorial-lca-result", lca.page.getByText("BIC 최저 후보", { exact: false }));
  await tab(lca.page, "모형 검토");
  await lca.page.getByRole("combobox", { name: "검토할 실행" }).click();
  await lca.page.getByRole("option", { name: /K=2/ }).click();
  await lca.page.getByRole("button", { name: "진단 계산" }).click();
  await shot(lca.page, "tutorial-lca-qc", lca.page.getByRole("button", { name: "모형 선택" }));
  await lca.page.getByText("연구자가 이 실행을 승인한다", { exact: true }).click();
  await lca.page.waitForTimeout(1000);
  if (!await lca.page.getByRole("checkbox", { name: "연구자가 이 실행을 승인한다" }).isChecked()) {
    throw new Error("Researcher approval checkbox did not stay checked");
  }
  await lca.page.getByRole("button", { name: "모형 선택" }).click();
  await lca.page.getByText("연구자 승인으로 실행을 표시했다", { exact: false }).waitFor({ timeout: 10000 });
  await review(lca.page);
  await shot(lca.page, "tutorial-lca-review", lca.page.getByRole("button", { name: "검토 기록" }));
  receipt.lcaExport = await saveReport(lca.page, "승인된 최종 산출물", "lca");
  await shot(lca.page, "intro-report", lca.page.getByRole("button", { name: "project_export.zip" }));
  await lca.context.close();

  const mca = await freshPage();
  const choices = ["choice_commute", "choice_priority", "choice_service", "choice_trip", "choice_info"];
  await enterBrief(mca.page, "MCA: 범주 관계", "응답자의 이동 서비스 선택 범주는 어떻게 함께 나타나는가?", choices);
  await importFiles(mca.page);
  await tab(mca.page, "MCA");
  await mca.page.getByRole("button", { name: "MCA 실행" }).click();
  try {
    await mca.page.getByRole("button", { name: "이 MCA 결과를 승인" }).waitFor({ timeout: 30000 });
  } catch (error) {
    console.error((await mca.page.locator("body").innerText()).slice(-1800));
    throw error;
  }
  await shot(mca.page, "tutorial-mca-result", mca.page.getByRole("heading", { name: "MCA 범주 관계" }));
  await mca.page.getByRole("button", { name: "이 MCA 결과를 승인" }).click();
  await mca.page.getByText("MCA 승인을 기록했다", { exact: false }).waitFor({ timeout: 10000 });
  await review(mca.page);
  receipt.mcaExport = await saveReport(mca.page, "MCA 최종 문서", "mca");
  await shot(mca.page, "intro-mca-report", mca.page.getByRole("button", { name: "project_export.zip" }));
  await mca.context.close();
} finally {
  await browser.close();
}
if (errors.length) throw new Error("Browser errors: " + errors.join(" | "));
await writeFile(path.join(out, "capture-receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify({ scenes: receipt.scenes.map(scene => scene.name), lcaExport: receipt.lcaExport,
                            mcaExport: receipt.mcaExport, errors }, null, 2));
