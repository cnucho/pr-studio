import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { outDir } from "./kg-statistics-demo-common.mjs";

const kgRoot = path.resolve(process.env.KG_SYSTEM_ROOT ?? "C:\\github_app\\_worktrees\\survey-workflow-kg-help");
const candidateDir = path.join(outDir, "screenshot-candidates");
const selectedVideoDir = path.join(outDir, "selected-video-clips");
await mkdir(candidateDir, { recursive: true });
await mkdir(selectedVideoDir, { recursive: true });

const requireKg = createRequire(path.join(kgRoot, "package.json"));
const { chromium } = requireKg("playwright");
const { createPlatformTestEnvironment } = await import(pathToFileURL(path.join(kgRoot, "scripts", "lib", "platform-test-environment.mjs")));
const { spawnWorkbenchForBrowserTest } = await import(pathToFileURL(path.join(kgRoot, "scripts", "lib", "browser-test-server.mjs")));

const build = spawnSync(process.execPath, [
  path.join(kgRoot, "node_modules", "vite", "bin", "vite.js"),
  "build", "--config", "apps/kg-statistics-operator-app/vite.config.js"
], { cwd: kgRoot, stdio: "inherit", timeout: 180000, env: { ...process.env } });
assert.equal(build.status, 0, "React operator build failed");

const environment = createPlatformTestEnvironment("kg-demo-screenshot-candidates", {
  authRequired: true,
  membershipMigration: false,
  legacyProjectEndpoints: false
});
process.chdir(kgRoot);
const server = await spawnWorkbenchForBrowserTest("scripts/serve-kyrgyzstan-system-workbench-auth.mjs", {
  env: { ...environment.env, NSC_OPERATOR_PORTAL: "true" }
});
const base = server.url;
const browser = await chromium.launch({ headless: true });
const candidates = [];
let candidateNumber = 0;

const credentials = {
  admin: ["admin@nsc.kg", "nsc-admin"],
  manager: ["manager@nsc.kg", "nsc-manager"],
  designer: ["designer@nsc.kg", "nsc-design"],
  enumerator: ["enumerator@nsc.kg", "nsc-field"],
  analyst: ["analyst@nsc.kg", "nsc-stats"],
  reviewer: ["reviewer@nsc.kg", "nsc-review"],
  publisher: ["publisher@nsc.kg", "nsc-publish"]
};
const projectTitle = "Household Living Conditions Survey 2026";
let projectId = "";

async function api(endpoint, { token, method = "GET", body } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${base}${endpoint}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  let payload = null;
  try { payload = await response.clone().json(); } catch {}
  return { status: response.status, body: payload };
}

async function apiLogin(role) {
  const [email, password] = credentials[role];
  const response = await api("/api/auth/login", { method: "POST", body: { email, password } });
  assert.equal(response.status, 200, `${role}: ${JSON.stringify(response.body)}`);
  return response.body;
}

async function capture(page, group, slug, description, { fullPage = false } = {}) {
  candidateNumber += 1;
  await page.waitForTimeout(250);
  const id = String(candidateNumber).padStart(2, "0");
  const file = `${id}-${group}-${slug}.png`;
  await page.screenshot({ path: path.join(candidateDir, file), fullPage });
  candidates.push({ id, group, slug, description, file, selected: false });
}

async function browserLogin(page, role) {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill(credentials[role][0]);
  await page.getByLabel("Password").fill(credentials[role][1]);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Projects", exact: true }).waitFor();
}

async function openProject(page) {
  const card = page.locator(".project-card").filter({ hasText: projectTitle });
  await card.getByRole("button", { name: "Open project" }).click();
  await page.getByRole("heading", { name: projectTitle, exact: true }).waitFor();
}

async function rolePage(role, { recordName = "" } = {}) {
  let storageState;
  if (recordName) {
    const authContext = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await authContext.addInitScript(() => sessionStorage.setItem("kgOperatorLocale", "en"));
    const authPage = await authContext.newPage();
    await browserLogin(authPage, role);
    storageState = await authContext.storageState();
    await authContext.close();
  }
  const context = await browser.newContext({
    viewport: { width: recordName ? 1920 : 1600, height: recordName ? 1080 : 1000 },
    acceptDownloads: true,
    ...(storageState ? { storageState } : {}),
    ...(recordName ? { recordVideo: { dir: selectedVideoDir, size: { width: 1920, height: 1080 } } } : {})
  });
  await context.addInitScript(() => sessionStorage.setItem("kgOperatorLocale", "en"));
  const page = await context.newPage();
  if (storageState) {
    await page.goto(base, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Projects", exact: true }).waitFor();
  } else {
    await browserLogin(page, role);
  }
  return { context, page, recordName };
}

async function performAction(role, actionLabel, group, configure = async () => {}) {
  const videoGroups = new Set(["questionnaire", "synchronization", "analysis", "verification", "export"]);
  const recordName = videoGroups.has(group) ? `${group}-workflow` : "";
  const { context, page } = await rolePage(role, { recordName });
  await openProject(page);
  await page.locator(".action-card").filter({ hasText: actionLabel }).click();
  await page.getByRole("heading", { name: actionLabel, exact: true }).waitFor();
  await capture(page, group, "input", `${actionLabel}: operator input and exact active subject`);
  await page.locator(".action-workspace").getByRole("button", { name: "Help", exact: true }).click();
  await page.getByRole("dialog").getByRole("heading", { name: actionLabel, exact: true }).waitFor();
  await capture(page, group, "help", `${actionLabel}: contextual instructions opened by the operator`);
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  await configure(page);
  await page.locator(".action-workspace .form-actions .button-primary").click();
  if (actionLabel === "Request publication export") {
    await page.getByRole("heading", { name: "Releases", exact: true }).waitFor();
    await capture(page, group, "accepted", `${actionLabel}: export intent accepted and Releases opened`);
  } else {
    await page.locator(".notice-banner").waitFor();
    await page.locator(".receipt-panel").scrollIntoViewIfNeeded();
    await capture(page, group, "receipt", `${actionLabel}: immutable receipt and resulting state`);
  }
  const video = page.video();
  await context.close();
  if (recordName && video) {
    await cp(await video.path(), path.join(selectedVideoDir, `${recordName}.webm`));
  }
}

try {
  const sessions = Object.fromEntries(await Promise.all(
    Object.keys(credentials).map(async role => [role, await apiLogin(role)])
  ));

  const manager = await rolePage("manager");
  await manager.page.goto(base, { waitUntil: "networkidle" });
  await manager.page.getByRole("button", { name: "Sign out", exact: true }).click();
  await manager.page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();
  await capture(manager.page, "orientation", "sign-in", "English sign-in screen without exposed credentials");
  await manager.page.getByRole("button", { name: "Help", exact: true }).click();
  await capture(manager.page, "orientation", "sign-in-help", "Sign-in help displayed only after pressing Help");
  await manager.page.getByRole("button", { name: "Close", exact: true }).click();
  await browserLogin(manager.page, "manager");
  await capture(manager.page, "project", "project-list", "Authenticated project list and assigned identity");
  await manager.page.getByRole("button", { name: "New project", exact: true }).click();
  await capture(manager.page, "project", "create-form", "Controlled project-creation form");
  await manager.page.getByRole("dialog").getByRole("button", { name: "Help", exact: true }).click();
  await capture(manager.page, "project", "create-help", "Project-creation instructions opened on demand");
  await manager.page.getByRole("dialog").last().getByRole("button", { name: "Close", exact: true }).click();
  await manager.page.getByLabel("Project title").fill(projectTitle);
  await manager.page.getByLabel("Objective").fill("Measure household composition, employment, and access to basic services using fictional aggregate demonstration data.");
  await manager.page.getByRole("dialog").getByRole("button", { name: "Create project", exact: true }).click();
  await manager.page.getByRole("heading", { name: projectTitle, exact: true }).waitFor();
  await capture(manager.page, "project", "workflow-start", "New project at its authoritative starting revision");

  const projects = await api("/api/projects", { token: sessions.manager.token });
  projectId = projects.body.projects.find(project => project.title === projectTitle)?.projectId;
  assert.ok(projectId, "Created project was not found");
  for (const role of ["designer", "enumerator", "analyst", "reviewer", "publisher", "admin"]) {
    const grant = await api(`/api/projects/${projectId}/memberships`, {
      token: sessions.manager.token,
      method: "POST",
      body: { userId: sessions[role].user.userId, membershipLevel: "member" }
    });
    assert.equal(grant.status, 201, `${role}: ${JSON.stringify(grant.body)}`);
  }
  await manager.page.getByRole("button", { name: "Access", exact: true }).click();
  await manager.page.getByRole("heading", { name: "Project access", exact: true }).waitFor();
  await capture(manager.page, "project", "access", "Project-scoped membership and separation-of-duties context");
  await manager.page.locator(".sidebar").getByRole("button", { name: "Help", exact: true }).click();
  await manager.page.getByRole("heading", { name: "Help and user guide", exact: true }).waitFor();
  await capture(manager.page, "support", "survey-guide", "Ten-stage survey guide opened from navigation", { fullPage: true });
  await manager.context.close();

  const { getPlatformDb, closePlatformDbForTests } = await import(pathToFileURL(path.join(kgRoot, "libs", "platform", "database.mjs")));
  const fixtureDb = getPlatformDb();
  fixtureDb.prepare("UPDATE staff_roster SET user_id=? WHERE staff_id=?")
    .run(sessions.enumerator.user.userId, "staff_int_002");
  const now = new Date().toISOString();
  fixtureDb.prepare(`
    INSERT INTO offline_response_batches
      (batch_id, project_id, session_id, staff_id, status, payload_json, created_at, synced_at)
    VALUES (?, ?, ?, ?, 'synced', ?, ?, ?)
  `).run(
    "accepted_batch_001", projectId, "field_session_demo", "staff_int_002",
    JSON.stringify({
      offlineBatch: { contractVersion: "offline_response_batch.v1", batchId: "accepted_batch_001" },
      syncReceipt: { receivedCount: 122, acceptedCount: 120, duplicateCount: 2 },
      rawDataset: { datasetId: "raw_accepted_batch_001", rowCount: 120 }
    }), now, now
  );
  closePlatformDbForTests();

  await performAction("designer", "Submit questionnaire", "questionnaire");
  await performAction("reviewer", "Review questionnaire", "questionnaire-approval");
  await performAction("designer", "Prepare collection", "collection");
  await performAction("enumerator", "Synchronize responses", "synchronization");
  await performAction("reviewer", "Review cleaned data", "cleaning");
  await performAction("analyst", "Produce analysis and report", "analysis");
  await performAction("admin", "Record independent verification", "verification");
  await performAction("reviewer", "Approve publication", "publication-approval");
  await performAction("publisher", "Request publication export", "export", async page => {
    await page.getByLabel(/I confirm/).check();
  });

  const publisher = await rolePage("publisher", { recordName: "release-generation" });
  await openProject(publisher.page);
  await publisher.page.getByRole("button", { name: "Releases", exact: true }).click();
  await publisher.page.getByRole("heading", { name: "Releases", exact: true }).waitFor();
  await capture(publisher.page, "release", "ready", "Authorized publisher sees the accepted export intent");
  await publisher.page.getByRole("button", { name: "Process official release", exact: true }).click();
  await publisher.page.locator(".notice-banner").waitFor();
  await publisher.page.locator(".release-overview").waitFor();
  await capture(publisher.page, "release", "inventory", "Immutable release identity and official file inventory", { fullPage: true });
  await publisher.page.locator(".release-file").first().scrollIntoViewIfNeeded();
  await capture(publisher.page, "release", "file-evidence", "Representative file metadata, size, and SHA-256");
  const releaseVideo = publisher.page.video();
  await publisher.context.close();
  await cp(await releaseVideo.path(), path.join(selectedVideoDir, "release-generation.webm"));

  const selectedSlugs = new Set([
    "orientation-sign-in-help", "project-workflow-start", "project-access",
    "questionnaire-input", "questionnaire-approval-receipt",
    "collection-input", "synchronization-receipt", "cleaning-receipt",
    "analysis-input", "analysis-receipt", "verification-receipt",
    "publication-approval-receipt", "release-inventory", "support-survey-guide"
  ]);
  for (const candidate of candidates) {
    candidate.selected = selectedSlugs.has(`${candidate.group}-${candidate.slug}`);
  }
  await writeFile(path.join(candidateDir, "candidate-inventory.json"), JSON.stringify({
    sourceRepository: "cnucho/survey-workflow-orchestrator",
    sourceBranch: "codex/kg-mvp-internal-help",
    sourceCommit: spawnSync("git", ["rev-parse", "HEAD"], { cwd: kgRoot, encoding: "utf8" }).stdout.trim(),
    projectTitle,
    candidateCount: candidates.length,
    selectedCount: candidates.filter(candidate => candidate.selected).length,
    candidates
  }, null, 2));
  console.log(JSON.stringify({
    ok: true,
    candidateCount: candidates.length,
    selectedCount: candidates.filter(candidate => candidate.selected).length,
    selectedVideoCount: 6,
    candidateDir,
    selectedVideoDir
  }, null, 2));
} finally {
  await browser.close();
  await server.close();
}
