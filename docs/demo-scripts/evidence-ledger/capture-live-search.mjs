import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "../../../../evidence-ledger-studio/node_modules/playwright/index.mjs";
import { ContentStore } from "../../../../evidence-ledger-studio/src/content-store.js";
import { LedgerDatabase } from "../../../../evidence-ledger-studio/src/database.js";
import { Ledger } from "../../../../evidence-ledger-studio/src/ledger.js";
import { SearchService } from "../../../../evidence-ledger-studio/src/search.js";
import { SearchCoverageService } from "../../../../evidence-ledger-studio/src/search-coverage.js";
import { createApplicationApi } from "../../../../evidence-ledger-studio/src/web/application-api.js";

async function main() {
const evidenceRoot = resolve(process.cwd());
if (!evidenceRoot.endsWith("evidence-ledger-studio")) throw new Error("Run from the Evidence Ledger checkout");
const output = resolve(process.env.PR_STUDIO_DEMO_OUT ?? join(evidenceRoot, "..", "pr-studio", "out", "evidence-ledger"));
const captureDir = join(output, "captures");
mkdirSync(captureDir, { recursive: true });

const captureId = new Date().toISOString().replace(/[^0-9]/g, "");
const database = new LedgerDatabase(join(output, `live-demo-${captureId}.db`));
const content = new ContentStore(join(output, `content-${captureId}`));
const ledger = new Ledger(database.db, content);
const projectId = ledger.createProject("근거 확인 공개 검색 데모");
ledger.createBrief(projectId, {
  title: "생성형 검색 인용 검증",
  purpose: "공개 학술 메타데이터의 검색 과정 시연",
  audience: ["연구자"],
  policyQuestions: ["생성형 검색의 인용을 어떻게 검증하는가?"],
  asOfDate: new Date().toISOString().slice(0, 10),
  jurisdiction: "국제 학술자료",
});
const configSnapshotId = ledger.createConfigSnapshot(projectId, { demo: "public-crossref-v1" });
const requests = [];
const search = new SearchService(database.db, content, async (input, init) => {
  const response = await fetch(input, init);
  requests.push({ url: String(input), status: response.status, at: new Date().toISOString() });
  await new Promise(done => setTimeout(done, 900));
  return response;
});
const plan = search.createPlan(projectId, {
  title: "생성형 검색 인용 검증: 공개 학술 검색",
  purpose: "인용 검증 연구의 학술 메타데이터를 찾는 제한적 시연",
  researchQuestions: ["생성형 검색의 인용을 어떻게 검증하는가?"],
  coverageDimensions: ["Crossref 공개 학술 메타데이터"],
  configSnapshotId,
  sourceInventory: [{ sourceId: "crossref", provider: "crossref", rationale: "공개 학술 메타데이터 검색", limitations: ["Crossref 미등재 자료와 논문 원문은 포함되지 않음"] }],
  queryFamilies: [{ id: "citation-verification", label: "본 검색", sourceId: "crossref", query: "generative search citation verification", filters: {}, rowsPerPage: 3, maxPages: 1, maxResults: 3 }],
  validationQueries: [{ id: "source-verifiability", label: "검증 검색", sourceId: "crossref", query: "generative search engines verifiability", filters: {}, rowsPerPage: 2, maxPages: 1, maxResults: 2 }],
  selectionCriteria: [{ id: "relevant", decision: "include", description: "생성형 검색의 인용 검증과 직접 관련" }, { id: "unrelated", decision: "exclude", description: "질문과 관련 없음" }],
  stopRules: { maxTotalRequests: 2, maxTotalResults: 5, retryLimit: 0, stopOnShortPage: true },
  blindSpots: ["Crossref 미등재 보고서", "검색결과만으로는 원문과 주장 뒷받침 여부를 판정할 수 없음"],
  designNotes: ["한 자료원, 두 질의, 총 다섯 건 이내의 공개 데모"],
}, "demo:researcher");

const server = createApplicationApi({ db: database.db, ledger, staticRoot: join(evidenceRoot, "dist/web") });
await new Promise(done => server.listen(0, "127.0.0.1", done));
const address = server.address();
if (!address || typeof address === "string") throw new Error("No local server port");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, recordVideo: { dir: captureDir, size: { width: 1440, height: 900 } } });
const page = await context.newPage();
const screenshot = async name => page.screenshot({ path: join(captureDir, name), animations: "disabled" });
const view = async heading => { await page.getByRole("heading", { name: heading }).scrollIntoViewIfNeeded(); await page.waitForTimeout(350); };
let receipt = { projectId, configSnapshotId, planId: plan.id, startedAt: new Date().toISOString() };
try {
  await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: "networkidle" });
  await page.getByRole("combobox", { name: "프로젝트" }).waitFor();
  await page.getByRole("combobox", { name: "프로젝트" }).selectOption(projectId);
  await screenshot("01-project.png");
  await page.getByRole("button", { name: "검색 현황" }).click();
  await page.getByRole("heading", { name: "검색 범위와 작업 현황" }).waitFor();
  await view("검색계획 버전"); await screenshot("02-plan.png");
  await view("실행·선별·한계"); await screenshot("03-before.png");
  await page.waitForTimeout(1000);
  const running = search.execute(projectId, plan.id, `public-demo-${Date.now()}`);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "검색 현황" }).click();
  await page.getByRole("heading", { name: "검색 범위와 작업 현황" }).waitFor();
  await view("실행·선별·한계");
  await screenshot("04-running.png");
  const run = await running;
  receipt = { ...receipt, finishedAt: new Date().toISOString(), runId: run.runId, status: run.status, initialReconciliation: run.reconciliation, requests };
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "검색 현황" }).click();
  await page.getByRole("heading", { name: "검색 범위와 작업 현황" }).waitFor();
  await view("실행·선별·한계");
  await screenshot("05-after.png");
  await page.locator(".run-details").first().evaluate(element => { if (element instanceof HTMLDetailsElement) element.open = true; });
  await screenshot("06-details.png");
  const irrelevant = database.db.prepare("SELECT id, content_hash, normalized_json FROM search_results WHERE project_id=? AND run_id=? AND duplicate_of_id IS NULL AND normalized_json LIKE '%beef carcasses%' LIMIT 1").get(projectId, run.runId);
  if (!irrelevant) throw new Error("Expected irrelevant live search result was not returned; review before recording an exclusion");
  const decision = new SearchCoverageService(database.db).decideResult(projectId, {
    idempotencyKey: `demo-exclude-${run.runId}`,
    resultId: irrelevant.id,
    expectedResultHash: irrelevant.content_hash,
    expectedCurrentDecisionId: null,
    expectedCurrentDecisionHash: null,
    decision: "EXCLUDED",
    criterionIds: ["unrelated"],
    rationale: "육가공 공정의 검증 논문으로, 생성형 검색 인용 검증 질문과 무관",
    actor: "human:demo-reviewer",
  });
  receipt.exclusion = { resultId: irrelevant.id, title: JSON.parse(irrelevant.normalized_json).title, decisionId: decision.id };
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "검색 현황" }).click();
  await view("실행·선별·한계");
  await page.locator(".run-details .audit-list article").first().evaluate(element => element.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(350);
  await screenshot("07-exclusion.png");
  await view("원문 수집 기록");
  await page.locator(".source-url-form").first().getByRole("textbox", { name: "자료명" }).fill("생성형 검색 인용 검증 연구 원문");
  await page.locator(".source-url-form").first().getByRole("textbox", { name: "공개 원문 URL" }).fill("https://aclanthology.org/2023.findings-emnlp.467/");
  await page.getByRole("button", { name: "코드로 수집" }).click();
  await page.locator(".acquisition-row").first().waitFor({ timeout: 30000 });
  await page.locator(".acquisition-row").first().evaluate(element => element.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(350);
  await screenshot("08-acquisition.png");
  await view("추가 검색 결정").catch(async () => { await view("실행·선별·한계"); });
  await screenshot("09-next.png");
  const nextSearch = page.locator(".follow-up-panel").first();
  await nextSearch.locator("select").selectOption("CONTINUE");
  await nextSearch.locator("input").last().fill("검색 결과의 관련도가 낮고, 두 질의가 설정된 결과 수 제한에서 부분 종료되어 추가 검색이 필요함");
  await nextSearch.getByRole("button", { name: "판단 기록" }).click();
  await page.waitForTimeout(550);
  await screenshot("10-decision.png");
  await page.waitForTimeout(900);
  const results = database.db.prepare("SELECT provider, external_id, normalized_json FROM search_results WHERE project_id=? AND run_id=? AND duplicate_of_id IS NULL LIMIT 5").all(projectId, run.runId);
  receipt.results = results;
  receipt.acquisitions = database.db.prepare("SELECT status, requested_url, final_url, http_status, content_hash FROM source_acquisition_attempts WHERE project_id=?").all(projectId);
  receipt.searchTraceSha256 = createHash("sha256").update(JSON.stringify({ planId: plan.id, runId: run.runId, requests, results })).digest("hex");
} catch (error) {
  receipt = { ...receipt, error: error instanceof Error ? error.message : String(error), requests };
  throw error;
} finally {
  writeFileSync(join(output, "live-search-receipt.json"), JSON.stringify(receipt, null, 2));
  await context.close();
  if (page.video()) await page.video().saveAs(join(captureDir, "live-search.webm"));
  await browser.close();
  await new Promise(done => server.close(() => done()));
  database.close();
}
console.log(JSON.stringify(receipt, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
