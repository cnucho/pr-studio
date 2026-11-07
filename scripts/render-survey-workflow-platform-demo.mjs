import fs from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const mode = process.env.SURVEY_PLATFORM_VIDEO_MODE ?? "tutorial";
const baseUrl = process.env.SURVEY_PLATFORM_DEMO_URL;
if (!baseUrl) throw new Error("Set SURVEY_PLATFORM_DEMO_URL to a running Survey Workflow application.");

const outRoot = path.join(root, "out", `survey-workflow-${mode}-en`);
const narrationRoot = path.join(outRoot, "narration");
const audioRoot = path.join(outRoot, "audio");
const videoRoot = path.join(outRoot, "recording");
const finalPath = path.join(outRoot, `survey-workflow-${mode}-en.mp4`);
const cleanPath = path.join(outRoot, `survey-workflow-${mode}-en-clean.mp4`);
const srtPath = path.join(outRoot, `survey-workflow-${mode}-en.srt`);
const transcriptPath = path.join(outRoot, `survey-workflow-${mode}-en-transcript.md`);
const metadataPath = path.join(outRoot, "youtube-upload-metadata.md");
const reportPath = path.join(outRoot, "render-report.json");

const playwrightCandidates = [
  path.join(root, "node_modules", "playwright"),
  "C:/git-app/survey-workflow-orchestrator/node_modules/playwright",
  "C:/git-app/CI Plan Builder/node_modules/playwright",
];

function resolvePlaywright() {
  for (const candidate of playwrightCandidates) {
    try { return require(candidate); } catch { /* continue */ }
  }
  throw new Error("Playwright was not found. Install it in PR Studio or set up a known local workspace.");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", stdio: "inherit", shell: false, ...options });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

function capture(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result.stdout.trim();
}

function audioDuration(file) {
  return Number.parseFloat(capture("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file]));
}

function srtTime(seconds) {
  const total = Math.round(seconds * 1000);
  const ms = total % 1000;
  const secTotal = Math.floor(total / 1000);
  const sec = secTotal % 60;
  const minTotal = Math.floor(secTotal / 60);
  const min = minTotal % 60;
  const hour = Math.floor(minTotal / 60);
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function ffmpegFilterPath(value) {
  return value.replaceAll("\\", "/").replaceAll(":", "\\:");
}

const overviewBeats = [
  {
    id: "01-open",
    narration: "This is a practical survey production workspace for national statistical offices. It connects the visible stages from a reusable survey template to internal review, technical testing, and a tested response screen.",
    subtitle: "A connected survey-production workflow",
    action: async ({ page }) => {
      await page.goto(`${baseUrl}/new?locale=ru`, { waitUntil: "networkidle" });
      await page.locator("#root").waitFor();
      await page.locator('[data-template-catalog-ready="true"]').waitFor();
    },
  },
  {
    id: "02-template",
    narration: "The user begins with an approved survey template. The demonstration uses synthetic household content. The public video shows the workflow and result, but it does not expose the private library-production method behind the template.",
    subtitle: "Start from an approved survey template",
    action: async ({ page, state }) => {
      const card = page.locator("[data-template-id]").first();
      state.templateId = await card.getAttribute("data-template-id");
      await card.getByRole("button").click();
      await page.waitForURL("**/projects/prj_*", { timeout: 20_000 });
      state.projectId = decodeURIComponent(new URL(page.url()).pathname.split("/").pop());
    },
  },
  {
    id: "03-project",
    narration: "The project workspace presents the current stage, the next action, and the recent work in one place. This reduces the need to coordinate separate documents, review messages, and disconnected test tools.",
    subtitle: "Current stage, next action, and progress",
    action: async ({ page }) => {
      await page.locator('[data-page-ready="true"]').waitFor();
    },
  },
  {
    id: "04-review",
    narration: "The review screen supports an explicit internal review cycle. Blocking comments prevent approval until they are resolved, making the visible decision process clear to the survey team.",
    subtitle: "Internal review before approval",
    action: async ({ page, state }) => {
      await page.goto(`${baseUrl}/projects/${state.projectId}/review?locale=ru`, { waitUntil: "networkidle" });
      await page.locator('[data-page-ready="true"]').waitFor();
      await page.getByRole("button", { name: "Открыть проверку" }).click();
      await page.locator('[data-review-status="OPEN"]').waitFor();
    },
  },
  {
    id: "05-test",
    narration: "Before collection, the technical test checks the actual survey structure, including package integrity, required fields, routing, calculations, repeated records, matrices, localization, rendering, draft recovery, and submission readiness.",
    subtitle: "Test the real survey structure before collection",
    action: async ({ page, state }) => {
      await page.goto(`${baseUrl}/projects/${state.projectId}/test?locale=ru`, { waitUntil: "networkidle" });
      await page.locator('[data-page-ready="true"]').waitFor();
      await page.getByRole("button", { name: "Запустить тест" }).click();
      await page.locator('[data-technical-test-status="PASSED"][data-technical-test-run-id]').waitFor({ timeout: 90_000 });
    },
  },
  {
    id: "06-preview",
    narration: "The tested response preview runs the generated questionnaire. It is an isolated trial screen, so the demonstration can verify visible behavior without creating a production response.",
    subtitle: "Open an isolated response preview",
    action: async ({ page }) => {
      await page.getByRole("button", { name: "Предпросмотр ответа" }).click();
      await page.locator('[data-runtime-preview-ready="true"]').waitFor({ timeout: 60_000 });
    },
  },
  {
    id: "07-scope",
    narration: "This Beta One product is the survey-production core. A full national implementation may also require sample-frame management, interviewer and assignment management, visit tracking, fieldwork monitoring, enterprise identity, official code governance, production backup, and statistical output systems.",
    subtitle: "A core platform, with complementary production systems",
    action: async ({ page }) => {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    },
  },
  {
    id: "08-delivery",
    narration: "For a national statistical office, the preferred delivery is an agency-controlled deployment. Statistical data remains inside the institution. Country templates and validation packs can be supplied under a signed license, while the reusable cross-country platform factory remains protected.",
    subtitle: "Agency-controlled deployment with protected reusable core",
    action: async () => {},
  },
];

const tutorialBeats = [
  {
    id: "01-intro",
    narration: "This tutorial shows a real survey application using synthetic data. We will create a project, complete an internal review, run the technical test, and open the tested response screen.",
    subtitle: "From survey template to tested response screen",
    action: async ({ page }) => {
      await page.goto(`${baseUrl}/new?locale=ru`, { waitUntil: "networkidle" });
      await page.locator('[data-template-catalog-ready="true"]').waitFor();
    },
  },
  {
    id: "02-select",
    narration: "Begin by selecting the synthetic household survey template. The current interface is shown in Russian, while the English narration explains each action.",
    subtitle: "Choose a household survey template",
    action: async ({ page, state }) => {
      const card = page.locator("[data-template-id]").first();
      state.templateId = await card.getAttribute("data-template-id");
      await card.getByRole("button").click();
      await page.waitForURL("**/projects/prj_*", { timeout: 20_000 });
      state.projectId = decodeURIComponent(new URL(page.url()).pathname.split("/").pop());
      await page.locator('[data-page-ready="true"]').waitFor();
    },
  },
  {
    id: "03-project",
    narration: "The project page shows the current workflow stage and the next recommended action. The user does not need to infer the process from separate files or informal messages.",
    subtitle: "Read the current stage and next action",
    action: async ({ page }) => {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    },
  },
  {
    id: "04-open-review",
    narration: "Open the review page and begin the internal review cycle. The review state is now recorded explicitly in the project workflow.",
    subtitle: "Open the internal review cycle",
    action: async ({ page, state }) => {
      await page.goto(`${baseUrl}/projects/${state.projectId}/review?locale=ru`, { waitUntil: "networkidle" });
      await page.locator('[data-page-ready="true"]').waitFor();
      await page.getByRole("button", { name: "Открыть проверку" }).click();
      await page.locator('[data-review-status="OPEN"]').waitFor();
    },
  },
  {
    id: "05-add-blocker",
    narration: "Add a blocking review comment. While a blocker remains open, approval is disabled. This makes the unresolved decision visible rather than leaving it in an external message thread.",
    subtitle: "A blocking comment prevents approval",
    action: async ({ page }) => {
      await page.getByRole("button", { name: "Добавить замечание" }).click();
      await page.locator('[data-review-blocking-open="1"]').waitFor();
    },
  },
  {
    id: "06-resolve",
    narration: "After the issue has been reviewed, mark the comment as resolved. The blocking count returns to zero and the approval action becomes available.",
    subtitle: "Resolve the issue before approval",
    action: async ({ page }) => {
      await page.getByRole("button", { name: "Отметить решенным" }).click();
      await page.locator('[data-review-blocking-open="0"]').waitFor();
    },
  },
  {
    id: "07-approve",
    narration: "Approve the review. The recorded review cycle now shows an approved state, providing a clear handoff to technical testing.",
    subtitle: "Approve the completed review",
    action: async ({ page }) => {
      await page.getByRole("button", { name: "Утвердить" }).click();
      await page.locator('[data-review-status="APPROVED"]').waitFor();
    },
  },
  {
    id: "08-run-test",
    narration: "Open the technical-test page and run the test. The test exercises the generated survey package and its actual runtime structures rather than checking only a static document.",
    subtitle: "Run the technical test",
    action: async ({ page, state }) => {
      await page.goto(`${baseUrl}/projects/${state.projectId}/test?locale=ru`, { waitUntil: "networkidle" });
      await page.locator('[data-page-ready="true"]').waitFor();
      await page.getByRole("button", { name: "Запустить тест" }).click();
    },
  },
  {
    id: "09-test-passed",
    narration: "When the test passes, the screen records the test run and the completed checks. The public tutorial shows the result, but does not disclose private acceptance logic or proprietary test-generation methods.",
    subtitle: "The survey structure passes the technical test",
    action: async ({ page }) => {
      await page.locator('[data-technical-test-status="PASSED"][data-technical-test-run-id]').waitFor({ timeout: 90_000 });
    },
  },
  {
    id: "10-preview",
    narration: "Open the response preview. This is the generated questionnaire runtime in an isolated trial namespace. It demonstrates the respondent experience without creating a production submission.",
    subtitle: "Open the isolated response preview",
    action: async ({ page }) => {
      await page.getByRole("button", { name: "Предпросмотр ответа" }).click();
      await page.locator('[data-runtime-preview-ready="true"]').waitFor({ timeout: 60_000 });
    },
  },
  {
    id: "11-summary",
    narration: "The demonstrated core connects project creation, review, approval, technical testing, and response execution. Full national operations may add sample management, interviewer assignment, visit tracking, fieldwork monitoring, enterprise access control, production backup, and official statistical output systems.",
    subtitle: "The demonstrated core connects the main survey-production stages",
    action: async () => {},
  },
];

const beats = mode === "overview" ? overviewBeats : tutorialBeats;

async function prepareNarration() {
  await mkdir(narrationRoot, { recursive: true });
  await mkdir(audioRoot, { recursive: true });
  for (const beat of beats) {
    const textPath = path.join(narrationRoot, `${beat.id}.txt`);
    const wavPath = path.join(audioRoot, `${beat.id}.wav`);
    await writeFile(textPath, `${beat.narration}\n`, "utf8");
    run("node", [path.join(root, "scripts", "synthesize-speech.mjs"), "--input", textPath, "--output", wavPath], {
      env: { ...process.env, PR_STUDIO_TTS_LANGUAGE: "en", PR_STUDIO_TTS_PROVIDER_EN: process.env.PR_STUDIO_TTS_PROVIDER_EN ?? "openai" },
    });
    beat.audioPath = wavPath;
    beat.duration = audioDuration(wavPath) + 0.8;
  }
}

async function recordApplication() {
  const playwright = resolvePlaywright();
  await mkdir(videoRoot, { recursive: true });
  const browser = await playwright.chromium.launch({ headless: true, args: ["--disable-dev-shm-usage"] });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: videoRoot, size: { width: 1920, height: 1080 } },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  const state = {};
  try {
    for (const beat of beats) {
      await beat.action({ page, state });
      await page.waitForTimeout(Math.round(beat.duration * 1000));
    }
  } finally {
    const video = page.video();
    await page.close();
    await context.close();
    await browser.close();
    const source = await video.path();
    const target = path.join(outRoot, "application-recording.webm");
    await rename(source, target);
    return target;
  }
}

async function createAudioTrack() {
  const concatPath = path.join(outRoot, "audio-concat.txt");
  await writeFile(concatPath, beats.map((beat) => `file '${beat.audioPath.replaceAll("'", "'\\''")}'`).join("\n") + "\n");
  const output = path.join(outRoot, "narration.wav");
  run("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatPath, "-ar", "48000", "-ac", "2", output]);
  return output;
}

async function writeCaptionsAndMetadata() {
  let cursor = 0;
  const srt = [];
  const transcript = [`# Survey Workflow Platform — ${mode === "overview" ? "Product Overview" : "Guided Tutorial"}`, ""];
  const chapters = [];
  beats.forEach((beat, index) => {
    const end = cursor + beat.duration;
    srt.push(String(index + 1), `${srtTime(cursor)} --> ${srtTime(end)}`, beat.subtitle, "");
    transcript.push(`## ${beat.id}`, "", beat.narration, "");
    chapters.push(`${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(Math.floor(cursor % 60)).padStart(2, "0")} ${beat.subtitle}`);
    cursor = end;
  });
  await writeFile(srtPath, srt.join("\n"), "utf8");
  await writeFile(transcriptPath, transcript.join("\n"), "utf8");
  const title = mode === "overview"
    ? "A Practical Survey Production Workspace for National Statistical Offices"
    : "Survey Workflow Tutorial: From Template to Tested Response Screen";
  const description = mode === "overview"
    ? "This demonstration presents a survey-production workspace using synthetic data. It shows template-based project creation, review, technical testing, and an isolated response preview, while explaining the current scope and the complementary systems required for full national operations."
    : "This guided tutorial records a running survey application using synthetic data. It shows project creation, internal review, technical testing, and the tested response preview. Proprietary implementation details and real statistical data are intentionally excluded.";
  await writeFile(metadataPath, `# YouTube Upload Metadata\n\n## Title\n\n${title}\n\n## Description\n\n${description}\n\n## Chapters\n\n${chapters.join("\n")}\n\n## Suggested Tags\n\nofficial statistics, survey platform, national statistical office, questionnaire testing, survey workflow, data collection\n`, "utf8");
}

async function render(recording, narration) {
  const escapedSrt = ffmpegFilterPath(srtPath);
  run("ffmpeg", ["-y", "-loglevel", "error", "-i", recording, "-i", narration, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", cleanPath]);
  run("ffmpeg", ["-y", "-loglevel", "error", "-i", cleanPath, "-vf", `subtitles='${escapedSrt}':force_style='FontName=Arial,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=42'`, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "copy", finalPath]);
}

async function writeReport() {
  const probe = JSON.parse(capture("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", finalPath]));
  const report = {
    mode,
    baseUrl,
    finalPath,
    cleanPath,
    srtPath,
    transcriptPath,
    metadataPath,
    duration: Number(probe.format?.duration ?? 0),
    size: Number(probe.format?.size ?? 0),
    video: probe.streams?.find((stream) => stream.codec_type === "video") ?? null,
    audio: probe.streams?.find((stream) => stream.codec_type === "audio") ?? null,
    disclosure: {
      syntheticDataRequired: true,
      sourceCodeShown: false,
      credentialsShown: false,
      proprietaryMethodDisclosed: false,
    },
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

await rm(outRoot, { recursive: true, force: true });
await mkdir(outRoot, { recursive: true });
await prepareNarration();
const recording = await recordApplication();
const narration = await createAudioTrack();
await writeCaptionsAndMetadata();
await render(recording, narration);
await writeReport();
console.log(JSON.stringify({ ok: true, mode, finalPath, srtPath, transcriptPath, metadataPath, reportPath }, null, 2));
