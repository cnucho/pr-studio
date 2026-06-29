import fs from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const hubUrl = process.env.CAR_META_HUB_DEMO_URL ?? "https://hub-production-cffc.up.railway.app";
const outRoot = path.join(root, "out", "car-meta-hub-review-demo");
const rawScreenRoot = path.join(outRoot, "screens", "raw");
const slideRoot = path.join(outRoot, "screens", "slides");
const audioRoot = path.join(outRoot, "audio");
const clipRoot = path.join(outRoot, "clips");
const narrationRoot = path.join(outRoot, "narration");
const finalDraftPath = path.join(outRoot, "car-meta-hub-review-demo-draft.mp4");
const finalCaptionedPath = path.join(outRoot, "car-meta-hub-review-demo-captioned.mp4");
const concatPath = path.join(outRoot, "concat.txt");
const srtPath = path.join(outRoot, "car-meta-hub-review-demo.ko.srt");
const assPath = path.join(outRoot, "car-meta-hub-review-demo.ko.ass");
const reportPath = path.join(outRoot, "render-report.json");
const sampleFramePath = path.join(outRoot, "sample-frame.png");
const youtubeMetadataPath = path.join(outRoot, "youtube-upload-metadata.md");

const playwrightCandidates = [
  path.join(root, "node_modules", "playwright"),
  "C:/git-app/CI Plan Builder/node_modules/playwright",
  "C:/git-app/AcademicResearchCopilot/node_modules/playwright",
];

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";

function resolvePlaywright() {
  for (const candidate of playwrightCandidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next local workspace dependency.
    }
  }
  throw new Error("Could not find Playwright in the configured workspace candidates.");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status}`);
  }
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `${command} failed`);
  }
  return result.stdout.trim();
}

function ffmpegPath(value) {
  return value.replaceAll("\\", "/");
}

function ffmpegFilterPath(value) {
  return ffmpegPath(value).replaceAll(":", "\\:");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function imageDataUrl(value) {
  const extension = path.extname(value).toLowerCase();
  const mime = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${fs.readFileSync(value).toString("base64")}`;
}

function assTime(seconds) {
  const centiseconds = Math.round(seconds * 100);
  const cs = centiseconds % 100;
  const totalSeconds = Math.floor(centiseconds / 100);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function srtTime(seconds) {
  const msTotal = Math.round(seconds * 1000);
  const ms = msTotal % 1000;
  const totalSeconds = Math.floor(msTotal / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function assText(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll("\n", "\\N");
}

function audioDuration(file) {
  const output = capture("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  return Number.parseFloat(output);
}

async function ensureDirs() {
  await mkdir(rawScreenRoot, { recursive: true });
  await mkdir(slideRoot, { recursive: true });
  await mkdir(audioRoot, { recursive: true });
  await mkdir(clipRoot, { recursive: true });
  await mkdir(narrationRoot, { recursive: true });
}

async function fetchRunSummary() {
  const response = await fetch(`${hubUrl}/api/car-meta/review-run`, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(`Hub review-run failed: ${response.status} ${response.statusText}`);
  }
  const run = await response.json();
  return {
    runId: run.run_id,
    workspace: run.workspace,
    queueCount: Array.isArray(run.queue) ? run.queue.length : 0,
    queueIds: Array.isArray(run.queue) ? run.queue.map((item) => item.item_id).filter(Boolean) : [],
    correctionCount: Array.isArray(run.corrections) ? run.corrections.length : 0,
    decisionCount: Array.isArray(run.queue_decisions) ? run.queue_decisions.length : 0,
    totalQueueCount: run.queue_total_count,
    closedQueueCount: run.queue_closed_count,
  };
}

async function captureHubScreens(playwright) {
  const launchOptions = {
    headless: true,
    args: ["--disable-dev-shm-usage", "--font-render-hinting=none"],
  };
  if (fs.existsSync(chromePath)) {
    launchOptions.executablePath = chromePath;
  }

  const browser = await playwright.chromium.launch(launchOptions);
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  try {
    await page.goto(`${hubUrl}/car-meta/review`, { waitUntil: "networkidle", timeout: 90_000 });
    await page.waitForTimeout(1800);
    await page.screenshot({
      path: path.join(rawScreenRoot, "01-hub-overview.png"),
      fullPage: false,
    });

    await page.locator('button[data-view="queue"]').click({ timeout: 8_000 });
    await page.waitForTimeout(900);
    await page.screenshot({
      path: path.join(rawScreenRoot, "02-queue-five-items.png"),
      fullPage: false,
    });

    await page.locator('button[data-view="corrections"]').click({ timeout: 8_000 });
    await page.waitForTimeout(900);
    await page.screenshot({
      path: path.join(rawScreenRoot, "03-correction-records.png"),
      fullPage: false,
    });

    await page.goto(`${hubUrl}/car-meta/flow`, { waitUntil: "networkidle", timeout: 90_000 });
    await page.waitForTimeout(2800);
    await page.screenshot({
      path: path.join(rawScreenRoot, "04-flow-viewer.png"),
      fullPage: false,
    });
  } finally {
    await browser.close();
  }
}

function buildScenes(summary) {
  const queueList = summary.queueIds.length ? summary.queueIds.join(", ") : "현재 공개 queue 없음";
  return [
    {
      id: "01-purpose",
      eyebrow: "CAR-META HUB DEMO",
      title: "Hub에서 교정보는 방법",
      subtitle: "수정자는 전체 원자료를 뒤지는 사람이 아니라, 남은 확인 항목에 답을 남기는 사람입니다.",
      bullets: [
        "배포본에는 메타데이터 seed만 들어갑니다.",
        "현재 남은 확인 항목은 5건입니다.",
        "답변은 서버에 저장되고, 작업 종료 후 로컬로 회수합니다.",
      ],
      chips: ["metadata only", "review queue", "server store"],
      image: path.join(rawScreenRoot, "01-hub-overview.png"),
      narration:
        "이번 영상은 카 메타 허브에서 교정보는 방법을 보여주는 짧은 데모입니다. 수정자는 원자료 전체를 다시 뒤지는 사람이 아닙니다. 허브가 남겨 둔 확인 항목을 보고, 이상 없음, 수정 필요, 모르겠음 중 하나로 답을 남깁니다. 답변은 로컬 PC가 아니라 서버 저장소에 남고, 관리자가 작업이 끝난 뒤 로컬 작업장으로 내려받습니다.",
      caption: "수정자는 남은 확인 항목에 답을 남깁니다.",
      holdPad: 0.7,
    },
    {
      id: "02-seeded-deploy",
      eyebrow: "STEP 1",
      title: "배포본에 검토용 메타를 심어 둡니다",
      subtitle: `run ${summary.runId} 기준으로 남은 확인 ${summary.queueCount}건과 저장수정 ${summary.correctionCount}건을 바로 열 수 있습니다.`,
      bullets: [
        "원자료나 응답자 단위 데이터는 넣지 않습니다.",
        "enhanced review package, flow metadata, remaining queue만 포함합니다.",
        "수정자는 업로드 없이 공개 URL에서 검토를 시작합니다.",
      ],
      chips: ["seed workspace", "no raw data", "Railway"],
      diagram: [
        ["메타 seed", "Hub Docker image"],
        ["Flow viewer asset", "Hub 화면"],
        ["Railway volume", "수정자 답변 저장"],
      ],
      narration:
        "먼저 허브를 배포할 때 검토용 메타데이터를 함께 넣어 둡니다. 여기에는 설문 검토 패키지, 흐름 메타데이터, 남은 확인 큐가 들어갑니다. 중요한 점은 원자료나 응답자 단위 데이터는 넣지 않는다는 것입니다. 그래서 수정자는 별도 파일 업로드 없이 공개 허브 URL에서 바로 검토를 시작할 수 있습니다.",
      caption: "배포본에는 메타데이터 seed만 포함합니다.",
      holdPad: 0.6,
    },
    {
      id: "03-open-queue",
      eyebrow: "STEP 2",
      title: "남은 5건만 확인합니다",
      subtitle: "화면의 '확인할 일'에는 실제로 사람이 답해야 하는 항목만 남깁니다.",
      bullets: [
        `현재 항목: ${queueList}`,
        "각 행은 대상, 유형, 판단, 이유, 틀리면 생기는 영향을 보여줍니다.",
        "문제가 없으면 '이상 없음'으로 바로 닫습니다.",
      ],
      chips: ["5 items", "concise Korean", "answer required"],
      image: path.join(rawScreenRoot, "02-queue-five-items.png"),
      narration:
        "검토자는 확인할 일 화면으로 이동합니다. 여기에는 자동 처리로 닫히지 않은 다섯 건만 남아 있습니다. 각 행은 무엇을 봐야 하는지, 왜 애매한지, 틀리면 어떤 영향이 있는지 간단히 보여 줍니다. 문제가 없으면 이상 없음을 누르면 되고, 실제로 틀렸다면 수정 필요를 눌러 이유를 남깁니다.",
      caption: "확인할 일 화면에서 남은 5건만 봅니다.",
      holdPad: 0.8,
    },
    {
      id: "04-answer-rules",
      eyebrow: "STEP 3",
      title: "답은 세 가지입니다",
      subtitle: "메모만 남기는 것이 아니라, 서버가 처리 상태를 구분해서 저장합니다.",
      bullets: [
        "이상 없음: 적용할 수정 없음. 확인 기록만 저장합니다.",
        "수정 필요: 메모 필수. 구조화 수정으로 전환할 대상입니다.",
        "모르겠음: 메모 필수. 관리자나 Codex가 원문 재검토합니다.",
      ],
      chips: ["이상 없음", "수정 필요", "모르겠음"],
      callout: {
        title: "수정 필요를 누르면",
        body: "수정 방향을 한 문장으로 적습니다. 예: 실제 조건은 Q3가 아니라 Q5_15_2_1로 이동해야 함.",
      },
      narration:
        "답은 세 가지입니다. 이상 없음은 메타데이터를 바꾸지 않고 확인 기록만 저장합니다. 수정 필요는 반드시 메모를 받습니다. 이 메모는 바로 적용된 수정이 아니라, 구조화 수정으로 전환해야 할 대상입니다. 모르겠음도 메모가 필요합니다. 이 경우에는 관리자나 코덱스가 원문을 다시 확인합니다.",
      caption: "수정 필요와 모르겠음은 메모가 있어야 저장됩니다.",
      holdPad: 0.7,
    },
    {
      id: "05-flow-viewer",
      eyebrow: "STEP 4",
      title: "흐름 도식에서 관계를 확인합니다",
      subtitle: "도식은 전체를 한 번에 믿으라는 화면이 아니라, 선택한 문항과 관계를 확인하는 보조 도구입니다.",
      bullets: [
        "출발 문항, 도착 문항, 조건을 같이 봅니다.",
        "도식이 이상하면 수정 필요 또는 모르겠음으로 답합니다.",
        "도식 답변도 Hub API로 서버에 저장됩니다.",
      ],
      chips: ["flow viewer", "route check", "feedback API"],
      image: path.join(rawScreenRoot, "04-flow-viewer.png"),
      narration:
        "흐름이 의심되는 항목은 도식 보기에서 확인합니다. 도식은 전체 관계를 무조건 믿으라는 화면이 아닙니다. 출발 문항, 도착 문항, 조건을 같이 보면서 실제 흐름이 맞는지 확인하는 보조 도구입니다. 도식에서 남긴 이상 없음, 수정 필요, 모르겠음 답변도 허브 API를 통해 서버에 저장됩니다.",
      caption: "도식 화면에서도 같은 방식으로 답을 저장합니다.",
      holdPad: 0.8,
    },
    {
      id: "06-saved-records",
      eyebrow: "STEP 5",
      title: "저장된 수정과 답변을 확인합니다",
      subtitle: "수정 기록은 읽으라고 길게 보여 주는 문서가 아니라, 현재 서버에 무엇이 저장됐는지 보는 상태표입니다.",
      bullets: [
        "저장수정은 적용 대기 상태로 남습니다.",
        "이상 없음 답변은 적용 불필요 기록입니다.",
        "수정 필요 메모는 다음 구조화 단계의 근거가 됩니다.",
      ],
      chips: ["status table", "apply later", "review trail"],
      image: path.join(rawScreenRoot, "03-correction-records.png"),
      narration:
        "저장된 수정 화면은 수정자가 긴 파일 경로를 읽는 곳이 아닙니다. 현재 서버에 무엇이 저장되어 있고, 무엇이 적용 대기인지 보는 상태표입니다. 이상 없음은 적용할 것이 없다는 기록이고, 수정 필요 메모는 다음 구조화 단계에서 근거로 사용됩니다.",
      caption: "수정 기록은 서버 저장 상태를 확인하는 표입니다.",
      holdPad: 0.7,
    },
    {
      id: "07-server-store",
      eyebrow: "SERVER STORE",
      title: "답변은 서버에 저장됩니다",
      subtitle: "수정자 PC에 흩어져 저장하지 않습니다. Railway 볼륨이 임시 작업 저장소입니다.",
      bullets: [
        "서버 저장 위치: /data/car_meta_review_store",
        "review_resolution에는 답변 메모가 저장됩니다.",
        "corrections에는 구조화 수정 패키지가 저장됩니다.",
      ],
      chips: ["Railway volume", "/data", "JSON archive"],
      diagram: [
        ["수정자 답변", "Hub API"],
        ["Hub API", "/data/car_meta_review_store"],
        ["/data/car_meta_review_store", "관리자 export"],
      ],
      narration:
        "중요한 운영 규칙은 저장 위치입니다. 수정자 답변을 각자 로컬 컴퓨터에 저장하면 누락되고, 누가 무엇을 봤는지 추적하기 어렵습니다. 그래서 답변은 Railway 볼륨의 데이터 폴더에 저장합니다. 확인 답변은 리뷰 리솔루션 폴더에, 구조화 수정 패키지는 커렉션 폴더에 남습니다.",
      caption: "수정자 답변은 서버 볼륨에 JSON으로 저장됩니다.",
      holdPad: 0.7,
    },
    {
      id: "08-export-clear",
      eyebrow: "ADMIN CLOSE-OUT",
      title: "끝나면 로컬로 회수하고 서버를 비웁니다",
      subtitle: "허브 자체는 다음 작업에도 써야 하므로, 완료된 답변은 로컬에 보관하고 서버 저장소는 비웁니다.",
      bullets: [
        "GET /api/car-meta/review-store/export",
        "C:\\workspace\\car-meta\\artifacts\\review_exports 에 저장",
        "POST /api/car-meta/review-store/clear 로 서버 저장소 초기화",
      ],
      chips: ["export", "local archive", "clear server"],
      callout: {
        title: "운영 결론",
        body: "서버는 검토 중인 작업 공간입니다. 최종 보관소는 로컬 작업장입니다.",
      },
      narration:
        "작업이 끝나면 관리자가 서버 저장소를 로컬 작업장으로 내려받습니다. 내려받은 파일은 리뷰 익스포트 폴더에 보관합니다. 그 다음 서버 저장소를 비웁니다. 이렇게 해야 허브 자체를 다음 검토나 다른 프로젝트에 재사용할 수 있습니다. 서버는 작업 중 저장소이고, 최종 보관소는 로컬 작업장입니다.",
      caption: "작업 종료 후 export, 로컬 보관, server clear 순서로 마감합니다.",
      holdPad: 0.8,
    },
    {
      id: "09-upload",
      eyebrow: "YOUTUBE READY",
      title: "YouTube 업로드용 파일로 마무리합니다",
      subtitle: "이 세션에는 YouTube 업로드 권한이 없으므로, 업로드 가능한 영상과 자막, 설명문을 만들어 둡니다.",
      bullets: [
        "최종 mp4: 자막이 화면에 포함된 업로드본",
        "SRT/ASS: 별도 자막 업로드용",
        "제목, 설명, 태그, 챕터 문서 포함",
      ],
      chips: ["MP4", "SRT", "metadata"],
      narration:
        "마지막으로 이 데모는 유튜브에 올릴 수 있는 파일 형태로 정리합니다. 현재 세션에는 유튜브 계정 업로드 권한이 없기 때문에 자동 업로드는 하지 않습니다. 대신 자막이 들어간 엠피포 영상, 별도 자막 파일, 제목과 설명, 태그와 챕터 문서를 함께 만들어 둡니다.",
      caption: "자동 업로드 권한이 없으면 업로드 패키지로 제공합니다.",
      holdPad: 0.7,
    },
  ];
}

function diagramMarkup(rows) {
  if (!rows) return "";
  return `<div class="diagram">${rows.map(([from, to]) => `
    <div class="node">${escapeHtml(from)}</div>
    <div class="arrow">→</div>
    <div class="node strong">${escapeHtml(to)}</div>
  `).join("")}</div>`;
}

function calloutMarkup(callout) {
  if (!callout) return "";
  return `<div class="callout"><strong>${escapeHtml(callout.title)}</strong><p>${escapeHtml(callout.body)}</p></div>`;
}

function slideHtml(scene, index, total) {
  const imageMarkup = scene.image
    ? `<div class="media-frame"><img src="${imageDataUrl(scene.image)}" alt=""></div>`
    : "";
  const bullets = scene.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const chips = scene.chips.map((item) => `<span>${escapeHtml(item)}</span>`).join("");
  const hasMedia = Boolean(scene.image);

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      font-family: "Malgun Gothic", "Noto Sans KR", "Segoe UI", Arial, sans-serif;
      color: #15212b;
      background: #f4f7f8;
      letter-spacing: 0;
    }
    .slide {
      position: relative;
      width: 1920px;
      height: 1080px;
      padding: 64px 82px 74px;
      background:
        linear-gradient(135deg, rgba(40, 113, 167, 0.10), transparent 46%),
        linear-gradient(180deg, #f8fbfc 0%, #eef3f5 100%);
    }
    .slide:before {
      content: "";
      position: absolute;
      inset: 28px;
      border: 1px solid rgba(21, 33, 43, 0.12);
      pointer-events: none;
    }
    .kicker {
      display: inline-flex;
      align-items: center;
      height: 38px;
      padding: 0 15px;
      border-radius: 6px;
      background: #15212b;
      color: #ffffff;
      font-size: 18px;
      font-weight: 800;
    }
    .layout {
      display: grid;
      grid-template-columns: ${hasMedia ? "0.82fr 1.18fr" : "1fr"};
      gap: 54px;
      align-items: center;
      height: 824px;
      margin-top: 34px;
    }
    h1 {
      margin: 0;
      max-width: ${hasMedia ? "760px" : "1340px"};
      font-size: ${hasMedia ? "58px" : "78px"};
      line-height: 1.13;
      letter-spacing: 0;
    }
    .subtitle {
      margin: 24px 0 0;
      max-width: ${hasMedia ? "740px" : "1220px"};
      color: #4d5d68;
      font-size: ${hasMedia ? "28px" : "34px"};
      line-height: 1.45;
      font-weight: 650;
    }
    ul {
      display: grid;
      gap: 17px;
      margin: 34px 0 0;
      padding: 0;
      list-style: none;
      max-width: ${hasMedia ? "740px" : "1160px"};
    }
    li {
      position: relative;
      padding-left: 32px;
      font-size: ${hasMedia ? "24px" : "30px"};
      line-height: 1.38;
      font-weight: 720;
      color: #20303b;
    }
    li:before {
      content: "";
      position: absolute;
      left: 0;
      top: 0.58em;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #2871a7;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 11px;
      margin-top: 34px;
    }
    .chips span {
      display: inline-flex;
      align-items: center;
      height: 40px;
      padding: 0 14px;
      border: 1px solid rgba(21, 33, 43, 0.15);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.78);
      color: #15212b;
      font-size: 18px;
      font-weight: 800;
    }
    .media-frame {
      height: 724px;
      border: 8px solid #15212b;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 24px 70px rgba(21, 33, 43, 0.20);
      overflow: hidden;
    }
    .media-frame img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center center;
      display: block;
    }
    .diagram {
      width: 980px;
      max-width: 100%;
      margin-top: 44px;
      display: grid;
      grid-template-columns: 1fr 64px 1fr;
      gap: 15px;
      align-items: center;
    }
    .node {
      min-height: 78px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px 22px;
      border: 1px solid rgba(21,33,43,.16);
      border-radius: 8px;
      background: #ffffff;
      font-size: 25px;
      font-weight: 850;
      text-align: center;
      box-shadow: 0 14px 34px rgba(21,33,43,.08);
    }
    .node.strong { background: #e9f3fa; border-color: rgba(40,113,167,.32); color: #174a78; }
    .arrow {
      color: #2871a7;
      font-size: 38px;
      font-weight: 900;
      text-align: center;
    }
    .callout {
      width: 900px;
      max-width: 100%;
      margin-top: 44px;
      padding: 30px 34px;
      border-left: 8px solid #2871a7;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 20px 55px rgba(21,33,43,.14);
    }
    .callout strong {
      display: block;
      font-size: 30px;
      color: #174a78;
    }
    .callout p {
      margin: 10px 0 0;
      color: #2e3d48;
      font-size: 27px;
      line-height: 1.42;
      font-weight: 700;
    }
    .progress {
      position: absolute;
      left: 82px;
      right: 82px;
      bottom: 34px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: rgba(21, 33, 43, 0.54);
      font-size: 18px;
      font-weight: 800;
    }
    .bar {
      width: 520px;
      height: 6px;
      border-radius: 999px;
      background: rgba(21, 33, 43, 0.12);
      overflow: hidden;
    }
    .bar span {
      display: block;
      width: ${(index / total) * 100}%;
      height: 100%;
      background: #2871a7;
    }
  </style>
</head>
<body>
  <main class="slide">
    <div class="kicker">${escapeHtml(scene.eyebrow)}</div>
    <section class="layout">
      <div>
        <h1>${escapeHtml(scene.title)}</h1>
        <p class="subtitle">${escapeHtml(scene.subtitle)}</p>
        <ul>${bullets}</ul>
        <div class="chips">${chips}</div>
        ${diagramMarkup(scene.diagram)}
        ${calloutMarkup(scene.callout)}
      </div>
      ${imageMarkup}
    </section>
    <div class="progress">
      <span>car-meta Hub tutorial</span>
      <div class="bar"><span></span></div>
      <span>${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}</span>
    </div>
  </main>
</body>
</html>`;
}

async function renderSlides(playwright, scenes) {
  const launchOptions = {
    headless: true,
    args: ["--disable-dev-shm-usage", "--font-render-hinting=none"],
  };
  if (fs.existsSync(chromePath)) {
    launchOptions.executablePath = chromePath;
  }

  const browser = await playwright.chromium.launch(launchOptions);
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  try {
    for (const [index, scene] of scenes.entries()) {
      await page.setContent(slideHtml(scene, index + 1, scenes.length), { waitUntil: "networkidle" });
      await page.screenshot({
        path: path.join(slideRoot, `${scene.id}.png`),
        fullPage: false,
      });
    }
  } finally {
    await browser.close();
  }
}

async function synthesizeNarration(scenes) {
  for (const scene of scenes) {
    const textPath = path.join(narrationRoot, `${scene.id}.txt`);
    const wavPath = path.join(audioRoot, `${scene.id}.wav`);
    await writeFile(textPath, scene.narration, "utf8");
    run("node", [
      path.join(root, "scripts", "synthesize-speech.mjs"),
      "--input",
      textPath,
      "--output",
      wavPath,
    ]);
    scene.audio = wavPath;
    scene.duration = audioDuration(wavPath) + (scene.holdPad ?? 0.65);
  }
}

async function makeClips(scenes) {
  const concatLines = [];

  for (const scene of scenes) {
    const imagePath = path.join(slideRoot, `${scene.id}.png`);
    const clipPath = path.join(clipRoot, `${scene.id}.mp4`);
    scene.video = clipPath;

    run("ffmpeg", [
      "-y",
      "-loop",
      "1",
      "-framerate",
      "30",
      "-i",
      imagePath,
      "-i",
      scene.audio,
      "-filter_complex",
      `[1:a]apad=pad_dur=${scene.holdPad ?? 0.65}[a]`,
      "-map",
      "0:v",
      "-map",
      "[a]",
      "-t",
      scene.duration.toFixed(3),
      "-vf",
      "format=yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "18",
      "-tune",
      "stillimage",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      clipPath,
    ]);

    concatLines.push(`file '${ffmpegPath(clipPath)}'`);
  }

  await writeFile(concatPath, `${concatLines.join("\n")}\n`, "utf8");
  run("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatPath,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-ar",
    "24000",
    "-movflags",
    "+faststart",
    finalDraftPath,
  ]);
}

async function writeSubtitles(scenes) {
  let cursor = 0;
  const srt = [];
  const assEvents = [];

  for (const [index, scene] of scenes.entries()) {
    const start = cursor + 0.25;
    const end = Math.max(start + 1.2, cursor + scene.duration - 0.22);
    srt.push(`${index + 1}`);
    srt.push(`${srtTime(start)} --> ${srtTime(end)}`);
    srt.push(scene.caption);
    srt.push("");
    assEvents.push(`Dialogue: 0,${assTime(start)},${assTime(end)},Default,,0,0,0,,${assText(scene.caption)}`);
    cursor += scene.duration;
  }

  const ass = `[Script Info]
ScriptType: v4.00+
WrapStyle: 2
ScaledBorderAndShadow: yes
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,Malgun Gothic,54,&H00FFFFFF,&H000000FF,&H99000000,&HCC000000,1,0,0,0,100,100,0,0,1,4,1,2,110,110,64,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
${assEvents.join("\n")}
`;

  await writeFile(srtPath, `${srt.join("\n")}\n`, "utf8");
  await writeFile(assPath, ass, "utf8");
}

function burnSubtitles() {
  const subtitleFilter = `subtitles=${ffmpegFilterPath(path.relative(root, assPath))}`;
  run("ffmpeg", [
    "-y",
    "-i",
    finalDraftPath,
    "-vf",
    subtitleFilter,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "copy",
    "-movflags",
    "+faststart",
    finalCaptionedPath,
  ]);
}

function probeVideo(file) {
  return JSON.parse(capture("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height:format=duration,size",
    "-of",
    "json",
    file,
  ]));
}

async function writeYoutubeMetadata(summary, scenes) {
  const chapters = [];
  let cursor = 0;
  for (const scene of scenes) {
    chapters.push(`${srtTime(cursor).replace(",", ".").slice(0, 8)} ${scene.title}`);
    cursor += scene.duration;
  }

  const metadata = `# YouTube Upload Metadata

## Title

car-meta Hub 교정 검토 데모 - 남은 5건 확인, 서버 저장, 로컬 회수

## Description

car-meta Hub에서 수정자가 남은 검토 항목을 확인하고 답변을 저장하는 방법을 보여주는 데모입니다.

이 영상은 다음 흐름을 설명합니다.

- 배포본에 메타데이터 seed를 포함하는 이유
- 수정자가 확인할 일 5건만 보는 방식
- 이상 없음, 수정 필요, 모르겠음 답변 규칙
- 흐름 도식에서 관계를 확인하는 방법
- 수정자 답변을 Railway 서버 저장소에 남기는 방식
- 관리자가 작업 종료 후 로컬로 export하고 서버 저장소를 비우는 절차

데모 기준:

- Hub URL: ${hubUrl}
- run id: ${summary.runId}
- open queue: ${summary.queueCount}
- seeded correction packages: ${summary.correctionCount}

## Chapters

${chapters.join("\n")}

## Tags

car-meta, survey metadata, correction workflow, metadata review, question flow, Railway, Codex, 설문 메타데이터, 교정 검토, 허브 데모

## Upload Files

- Video: ${finalCaptionedPath}
- SRT subtitle: ${srtPath}
- ASS subtitle: ${assPath}

## Upload Note

This Codex session has no authenticated YouTube upload connector. Upload manually in YouTube Studio, or add a separate OAuth-based uploader before automating uploads to the user's account.
`;

  await writeFile(youtubeMetadataPath, metadata, "utf8");
}

async function writeRenderReport(scenes, summary) {
  const finalStats = await stat(finalCaptionedPath);
  const draftStats = await stat(finalDraftPath);
  const probe = probeVideo(finalCaptionedPath);

  run("ffmpeg", [
    "-y",
    "-ss",
    "00:00:05",
    "-i",
    finalCaptionedPath,
    "-frames:v",
    "1",
    "-update",
    "1",
    sampleFramePath,
  ]);

  await writeFile(reportPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    hub_url: hubUrl,
    output: finalCaptionedPath,
    draft_output: finalDraftPath,
    srt: srtPath,
    ass: assPath,
    youtube_metadata: youtubeMetadataPath,
    sample_frame: sampleFramePath,
    size_bytes: finalStats.size,
    draft_size_bytes: draftStats.size,
    probe,
    hub_summary: summary,
    scenes: scenes.map((scene) => ({
      id: scene.id,
      duration: scene.duration,
      caption: scene.caption,
      narration: path.join(narrationRoot, `${scene.id}.txt`),
      slide: path.join(slideRoot, `${scene.id}.png`),
      audio: scene.audio,
    })),
  }, null, 2), "utf8");

  return { probe, sizeBytes: finalStats.size };
}

await ensureDirs();
const playwright = resolvePlaywright();

console.log("Reading live Hub summary...");
const summary = await fetchRunSummary();

console.log("Capturing live Hub screens...");
await captureHubScreens(playwright);

const scenes = buildScenes(summary);

console.log("Rendering tutorial slides...");
await renderSlides(playwright, scenes);

console.log("Synthesizing Korean narration...");
await synthesizeNarration(scenes);

console.log("Building video clips...");
await makeClips(scenes);

console.log("Writing subtitles...");
await writeSubtitles(scenes);

console.log("Burning subtitles into final video...");
burnSubtitles();

await writeYoutubeMetadata(summary, scenes);
const report = await writeRenderReport(scenes, summary);

console.log(`Wrote ${finalCaptionedPath}`);
console.log(JSON.stringify(report, null, 2));
