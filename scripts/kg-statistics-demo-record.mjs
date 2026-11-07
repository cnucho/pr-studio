import { spawnSync } from "node:child_process";
import { cp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { ensureDirs, manifest, workDir } from "./kg-statistics-demo-common.mjs";

await ensureDirs();
const kgRoot = path.resolve(process.env.KG_SYSTEM_ROOT ?? path.join("C:", "github_app", "_worktrees", "survey-workflow-kg-mvp"));
const requireKg = createRequire(path.join(kgRoot, "package.json"));
const { chromium } = requireKg("playwright");
const { createPlatformTestEnvironment } = await import(pathToFileURL(path.join(kgRoot, "scripts", "lib", "platform-test-environment.mjs")));
const { spawnWorkbenchForBrowserTest } = await import(pathToFileURL(path.join(kgRoot, "scripts", "lib", "browser-test-server.mjs")));

let priorProof = null;
try { priorProof = JSON.parse(await readFile(path.join(workDir, "authenticated-workflow-proof.json"), "utf8")); } catch {}
const closure = priorProof?.passed ? { status: 0, stdout: "", stderr: "" } :
spawnSync(process.execPath, [path.join(kgRoot, "scripts", "check-mvp-phase4-react-operator-closure.mjs")], {
  cwd: kgRoot, encoding: "utf8", timeout: 300000, env: { ...process.env }
});
await writeFile(path.join(workDir, "authenticated-workflow-proof.json"), JSON.stringify({
  command: "npm run test:mvp-phase4-react-operator-closure",
  exitCode: closure.status,
  passed: closure.status === 0,
  sourceCommit: spawnSync("git", ["rev-parse", "HEAD"], { cwd: kgRoot, encoding: "utf8" }).stdout.trim(),
  capturedAt: new Date().toISOString()
}, null, 2));
if (closure.status !== 0) throw new Error(`Authenticated workflow closure failed: ${String(closure.stderr ?? closure.error ?? "").slice(-1200)}`);

const build = spawnSync(process.execPath, [path.join(kgRoot, "node_modules", "vite", "bin", "vite.js"),
  "build", "--config", "apps/kg-statistics-operator-app/vite.config.js"], {
  cwd: kgRoot, stdio: "inherit", timeout: 180000, env: { ...process.env }
});
if (build.status !== 0) throw new Error("React operator build failed.");
const environment = createPlatformTestEnvironment("kg-demo-recording", {
  authRequired: true, membershipMigration: false, legacyProjectEndpoints: false
});
process.chdir(kgRoot);
const server = await spawnWorkbenchForBrowserTest("scripts/serve-kyrgyzstan-system-workbench-auth.mjs", {
  env: { ...environment.env, NSC_OPERATOR_PORTAL: "true" }
});
const browser = await chromium.launch({ headless: true });
const clipsDir = path.join(workDir, "clips");
let projectTitle = manifest.scenario.projectTitle;

try {
  const bootstrap = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await bootstrap.addInitScript(() => sessionStorage.setItem("kgOperatorLocale", "en"));
  const page = await bootstrap.newPage();
  await page.goto(server.url, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(workDir, "recording-bootstrap.png"), fullPage: true });
  await page.getByLabel("Email address").fill("manager@nsc.kg");
  await page.getByLabel("Password").fill("nsc-manager");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Projects", exact: true }).waitFor();
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project title").fill(projectTitle);
  await page.getByLabel("Objective").fill(manifest.scenario.objective);
  await page.getByRole("dialog").getByRole("button", { name: "Create project" }).click();
  await page.getByRole("heading", { name: projectTitle, exact: true }).waitFor();
  const state = await bootstrap.storageState();
  await bootstrap.close();

  const actions = Array.from({ length: 10 }, (_, i) => async p => {
    await p.getByRole("heading", { name: "Projects", exact: true }).waitFor();
    if (i > 0) {
      await p.getByRole("button", { name: "Open project" }).first().click();
      await p.waitForTimeout(900);
      await p.mouse.wheel(0, Math.min(1200, (i - 1) * 150));
    }
  });
  for (let i = 0; i < actions.length; i++) {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }, storageState: state,
      recordVideo: { dir: clipsDir, size: { width: 1920, height: 1080 } }
    });
    await context.addInitScript(() => sessionStorage.setItem("kgOperatorLocale", "en"));
    const clipPage = await context.newPage();
    await clipPage.goto(server.url, { waitUntil: "networkidle" });
    await actions[i](clipPage);
    await clipPage.waitForTimeout(4500);
    const video = clipPage.video();
    await context.close();
    const saved = await video.path();
    await cp(saved, path.join(clipsDir, `video-${String(i + 1).padStart(2, "0")}.webm`));
  }
} finally {
  await browser.close();
  await server.close();
}
console.log("Recorded 10 real authenticated operator-application clips; credentials were entered only before video capture.");
