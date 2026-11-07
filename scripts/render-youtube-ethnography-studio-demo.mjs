import fs from "node:fs";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ffmpeg = require("ffmpeg-static");
const ffprobe = require("ffprobe-static").path;
const outRoot = path.join(root, "out", "youtube-ethnography-studio-demo");
const rawDir = path.join(outRoot, "screens", "raw");
const appUrl = (process.env.ETHNOLENS_DEMO_URL ?? "http://127.0.0.1:4318").replace(/\/$/, "");
const studyId = process.env.ETHNOLENS_DEMO_STUDY_ID ?? "study_605df338e1454fe1";
const reuseAudio = process.env.PR_STUDIO_REUSE_ETHNOLENS_AUDIO === "true";

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}
function capture(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result.stdout.trim();
}
function duration(file) {
  return Number.parseFloat(capture(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file]));
}
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
function dataUrl(file) { return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`; }
function srtTime(seconds) {
  const n = Math.round(seconds * 1000);
  return `${String(Math.floor(n / 3600000)).padStart(2, "0")}:${String(Math.floor(n / 60000) % 60).padStart(2, "0")}:${String(Math.floor(n / 1000) % 60).padStart(2, "0")},${String(n % 1000).padStart(3, "0")}`;
}

await mkdir(rawDir, { recursive: true });
const captureBrowser = await chromium.launch({ headless: true, args: ["--font-render-hinting=none"] });
try {
  const page = await captureBrowser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(`${appUrl}/studies/${studyId}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.screenshot({ path: path.join(rawDir, "01-study-overview.png") });
  await page.getByRole("heading", { name: "Facilitated discussion" }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(rawDir, "02-facilitated-discussion.png") });
  await page.getByRole("heading", { name: "Quality review" }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(rawDir, "03-quality-review.png") });
  await page.close();
} finally { await captureBrowser.close(); }

const screens = {
  overview: path.join(rawDir, "01-study-overview.png"),
  discussion: path.join(rawDir, "02-facilitated-discussion.png"),
  quality: path.join(rawDir, "03-quality-review.png"),
};

const video = {
  id: "methodiq-ethnolens-introduction",
  title: "MethodIQ EthnoLens 소개",
  youtubeTitle: "유튜브를 많이 봤다고 연구가 되는 것은 아닙니다 | MethodIQ EthnoLens",
  description: "YouTube 영상과 공개 댓글을 연구자료로 사용할 때 생기는 표집, 근거 추적, 사례 불균형, 성급한 해석의 문제를 MethodIQ EthnoLens가 어떻게 줄이는지 실제 재분석 화면으로 소개합니다. EthnoLens는 MCP를 통해 자료와 논의 순서를 관리하고, AI 대화창과 연구자가 사례별 근거를 함께 검토하도록 돕습니다.",
  scenes: [
    { id: "01-opening", kicker: "YouTube 연구의 함정", title: "유튜브를 많이 봤다고, 연구가 되는 것은 아닙니다", subtitle: "검색 결과 몇 개를 보고 바로 해석하면, 무엇을 왜 골랐는지부터 불분명해집니다.", points: ["검색 상위 영상만 선택", "댓글이 많은 사례에 편향", "인상적인 문장을 전체 경향으로 확대"], narration: "유튜브에는 소비자 경험과 사회 현상이 풍부하게 담겨 있습니다. 하지만 영상을 많이 봤다는 사실만으로 연구가 되지는 않습니다. 검색 결과 몇 개를 보고 바로 해석하면, 무엇을 왜 골랐는지부터 불분명해집니다.", caption: "풍부한 자료와 타당한 연구는 같은 말이 아닙니다." },
    { id: "02-chat-limit", kicker: "대화창만으로 어려운 일", title: "AI가 요약은 잘해도, 연구 과정을 대신 관리하지는 못합니다", subtitle: "표집 근거, 사례별 균형, 반례, 누락 자료를 한 대화 안에서 계속 추적하기는 어렵습니다.", flow: ["검색", "몇 개 읽기", "바로 요약", "그럴듯한 결론"], narration: "대화창의 AI는 내용을 정리하고 논점을 찾는 데 강합니다. 그러나 표집 근거와 사례별 균형, 반례와 누락 자료를 한 대화 안에서 계속 추적하기는 어렵습니다. 그래서 검색에서 결론으로 너무 빨리 점프하게 됩니다.", caption: "문제는 AI의 문장력이 아니라, 연구 과정의 누락입니다." },
    { id: "03-method", kicker: "EthnoLens의 역할", title: "먼저 연구할 필드를 만들고, 그 다음에 해석합니다", subtitle: "연구 질문과 범위, 포함·제외 이유, 수집 내역을 고정한 뒤 사례별 논의를 시작합니다.", flow: ["연구 범위", "후보와 표집", "근거 수집", "사례별 대화", "종합과 보고"], narration: "EthnoLens는 먼저 연구할 필드를 만듭니다. 연구 질문과 범위를 정하고, 후보 영상의 포함과 제외 이유를 남기며, 수집 내역을 고정합니다. 그 다음에야 사례별 해석을 시작합니다.", caption: "자료 선택과 해석을 분리해, 연구의 출발점을 보존합니다." },
    { id: "04-real-field", kicker: "실제 재분석 화면", title: "119개 후보에서 9개 사례를 정하고, 1,634개 근거를 모았습니다", subtitle: "이 수치는 연구 결과가 아니라, 연구자가 검토해야 할 필드의 크기입니다.", image: screens.overview, badge: "119 후보 · 9 사례 · 1,634 근거", narration: "화면은 전기차 전환 경험을 다룬 실제 재분석 작업입니다. 후보는 백십구 건, 포함 사례는 아홉 건, 수집된 근거는 천육백삼십사 건입니다. 이 수치는 연구 결과가 아니라, 연구자가 검토해야 할 필드의 크기입니다.", caption: "먼저 연구대상을 투명하게 만들고, 결과와 구분합니다." },
    { id: "05-mcp", kicker: "MCP 대화 진행", title: "앱은 자료를 정리하고, AI와 연구자가 대화창에서 해석합니다", subtitle: "한 사례의 근거를 작은 페이지로 보내고, 관찰·해석·반론·질문을 차례로 논의합니다.", chat: [["EthnoLens", "사례 2의 다음 근거 30건입니다. 무엇이 직접 관찰되고, 무엇이 해석인지 구분해 주세요."], ["AI", "충전 편의는 반복되지만, 경로 변경과 고장 경험이 반례가 됩니다."], ["연구자", "주거 조건이 빠져 있습니다. 일반화하지 말고 다음 페이지도 확인합시다."]], narration: "앱의 중심은 별도의 자동 분석 화면이 아니라, 사용자 대화창입니다. EthnoLens가 한 사례의 근거를 작은 페이지로 보내면, AI와 연구자는 관찰과 해석, 반론과 질문을 차례로 논의합니다. 자료 정리는 코드가 맡고, 의미 판단은 대화가 맡습니다.", caption: "MCP가 자료와 순서를 관리하고, 해석은 대화창에서 진행합니다." },
    { id: "06-discussion", kicker: "사례별 검토", title: "첫 사례의 결론도, 편의와 부담을 함께 남겼습니다", subtitle: "충전 접근성이 좋으면 주차 시간에 흡수되지만, 조건이 나쁘면 감시·계획·대안 마련의 일이 생깁니다.", image: screens.discussion, badge: "사례 1 결론 · 근거 11건 연결", narration: "첫 사례에서는 충전 접근성이 좋을 때 충전이 주차 시간에 흡수된다는 점과, 조건이 나쁠 때 감시와 계획, 대안 마련의 일이 늘어난다는 점을 함께 남겼습니다. 편리하다 또는 불편하다는 한 문장으로 줄이지 않았습니다.", caption: "찬성 사례와 반례를 함께 보며, 해석의 경계를 정합니다." },
    { id: "07-no-shortcut", kicker: "성급한 완료 방지", title: "끝까지 보지 않은 분석은, 완료된 것처럼 보이지 않습니다", subtitle: "이번 보완으로 사례의 모든 근거 페이지가 전달되기 전에는 사례 결론을 확정할 수 없습니다.", image: screens.quality, badge: "미완료와 누락을 명시", narration: "중요한 점은, 끝까지 보지 않은 분석을 완료된 것처럼 보이지 않게 하는 것입니다. 이번 보완으로 사례의 모든 근거 페이지가 대화창에 전달되기 전에는 사례 결론을 확정할 수 없습니다. 아직 남은 논의와 누락은 품질 화면에 그대로 표시됩니다.", caption: "그럴듯한 조기 결론보다, 미완료 상태를 정확히 드러냅니다." },
    { id: "08-output", kicker: "최종 산출물", title: "마지막에는 주장과 근거가 연결된 연구 기록을 남깁니다", subtitle: "사례 결론, 반론, 열린 질문, 한계, 출처 링크를 보고서와 후속 작업에 함께 전달합니다.", points: ["근거 추적 가능한 주장", "반례와 열린 질문", "보고서·차트·다이어그램 handoff"], narration: "논의가 끝나면 사례 결론과 반론, 열린 질문, 연구의 한계를 함께 남깁니다. 주장에는 근거 식별자와 출처가 연결됩니다. 이 기록은 보고서뿐 아니라 차트와 다이어그램, 글쓰기 도구의 다음 작업에도 전달할 수 있습니다.", caption: "결론만 남기는 것이 아니라, 결론에 이른 경로를 남깁니다." },
    { id: "09-close", kicker: "MethodIQ EthnoLens", title: "검색에서 결론으로 점프하지 않게 하는, 연구 진행자", subtitle: "AI를 연구자 대신 쓰는 것이 아니라, 연구자가 AI와 더 깊고 투명하게 논의하도록 돕습니다.", flow: ["필드 구성", "근거별 대화", "연구자 승인", "추적 가능한 결과"], narration: "EthnoLens는 AI를 연구자 대신 쓰는 도구가 아닙니다. 자료를 빠짐없이 정리하고, 논의 순서를 잡고, 성급한 결론을 막아서 연구자가 AI와 더 깊고 투명하게 논의하도록 돕는 연구 진행자입니다.", caption: "MethodIQ EthnoLens · YouTube 연구를 대화와 근거로 연결합니다." },
  ],
};

function sceneHtml(scene, index) {
  const image = scene.image ? `<div class="browser"><div class="bar"><i></i><i></i><i></i><span>MethodIQ EthnoLens</span></div><img src="${dataUrl(scene.image)}"><b>${escapeHtml(scene.badge)}</b></div>` : "";
  const points = scene.points ? `<div class="points">${scene.points.map((x) => `<div>${escapeHtml(x)}</div>`).join("")}</div>` : "";
  const flow = scene.flow ? `<div class="flow">${scene.flow.map((x, i) => `<div><small>${String(i + 1).padStart(2, "0")}</small><strong>${escapeHtml(x)}</strong></div>${i < scene.flow.length - 1 ? "<span>→</span>" : ""}`).join("")}</div>` : "";
  const chat = scene.chat ? `<div class="chat">${scene.chat.map(([who, text], i) => `<div class="${i === 2 ? "researcher" : i === 1 ? "ai" : "app"}"><b>${escapeHtml(who)}</b><p>${escapeHtml(text)}</p></div>`).join("")}</div>` : "";
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;color:#13263f;font-family:"Malgun Gothic","Noto Sans KR",sans-serif}.slide{width:1920px;height:1080px;padding:58px 76px 86px;position:relative;overflow:hidden;background:radial-gradient(circle at 92% 8%,rgba(210,89,53,.16),transparent 32%),linear-gradient(135deg,#fbfcf8,#eef4f1)}.top{display:flex;justify-content:space-between;align-items:center}.brand{font-size:21px;font-weight:900;letter-spacing:.09em;color:#2f765f}.kicker{padding:10px 18px;border:1px solid #b9d0c8;border-radius:99px;background:#fff;font-size:19px;font-weight:850;color:#2f765f}h1{margin:28px 0 12px;max-width:1720px;font-size:60px;line-height:1.16;letter-spacing:-.045em}.sub{margin:0;max-width:1660px;color:#58697b;font-size:27px;line-height:1.45;font-weight:650}.points{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:68px}.points div{min-height:190px;padding:30px;display:flex;align-items:center;justify-content:center;text-align:center;border-radius:23px;background:#fff;box-shadow:0 16px 48px rgba(20,38,63,.09);font-size:30px;font-weight:900;color:#2f765f}.flow{display:flex;align-items:stretch;gap:14px;margin-top:66px}.flow div{flex:1;min-height:180px;padding:28px;border-radius:23px;background:#fff;box-shadow:0 16px 48px rgba(20,38,63,.09);display:flex;flex-direction:column;justify-content:center;gap:15px}.flow small{font-size:20px;font-weight:900;color:#d25935}.flow strong{font-size:28px;line-height:1.35}.flow span{display:flex;align-items:center;font-size:42px;color:#d25935}.chat{margin-top:38px;display:flex;flex-direction:column;gap:17px}.chat div{width:78%;padding:20px 27px;border-radius:21px;background:#fff;box-shadow:0 13px 40px rgba(20,38,63,.1)}.chat .ai{align-self:flex-end;background:#13263f;color:#fff}.chat .researcher{align-self:flex-end;background:#2f765f;color:#fff}.chat b{font-size:18px}.chat p{margin:8px 0 0;font-size:26px;font-weight:750;line-height:1.4}.browser{position:absolute;left:76px;right:76px;top:270px;height:700px;overflow:hidden;border-radius:24px;background:#fff;border:1px solid #cbd6d2;box-shadow:0 28px 80px rgba(20,38,63,.16)}.bar{height:48px;display:flex;align-items:center;gap:10px;padding:0 18px;background:#edf1f1}.bar i{width:12px;height:12px;border-radius:50%;background:#d66d62}.bar i:nth-child(2){background:#d4ad4d}.bar i:nth-child(3){background:#58a67b}.bar span{margin-left:12px;color:#64777a}.browser img{width:100%;height:652px;object-fit:cover;object-position:top}.browser b{position:absolute;right:28px;top:72px;padding:13px 20px;border-radius:99px;background:#d25935;color:#fff;font-size:20px}.caption{position:absolute;left:0;right:0;bottom:0;height:70px;display:flex;align-items:center;justify-content:center;background:#13263f;color:#fff;font-size:27px;font-weight:850}.caption small{position:absolute;right:30px;color:#c6d0dc;font-size:16px}.progress{position:absolute;left:0;top:0;height:6px;background:#d25935;width:${((index + 1) / video.scenes.length) * 100}%}
  </style><main class="slide"><div class="progress"></div><div class="top"><div class="brand">CONSUMER INSIGHT · METHODIQ</div><div class="kicker">${escapeHtml(scene.kicker)}</div></div><h1>${escapeHtml(scene.title)}</h1><p class="sub">${escapeHtml(scene.subtitle)}</p>${points}${flow}${chat}${image}<div class="caption">${escapeHtml(scene.caption)}<small>${String(index + 1).padStart(2, "0")} / ${String(video.scenes.length).padStart(2, "0")}</small></div></main></html>`;
}

if (process.env.PR_STUDIO_TTS_PROVIDER_KO !== "google") throw new Error("Set PR_STUDIO_TTS_PROVIDER_KO=google.");
const videoRoot = path.join(outRoot, video.id);
const slidesDir = path.join(videoRoot, "slides");
const narrationDir = path.join(videoRoot, "narration");
const audioDir = path.join(videoRoot, "audio");
const clipsDir = path.join(videoRoot, "clips");
await Promise.all([slidesDir, narrationDir, audioDir, clipsDir].map((dir) => mkdir(dir, { recursive: true })));
const renderBrowser = await chromium.launch({ headless: true, args: ["--font-render-hinting=none"] });
try {
  const page = await renderBrowser.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const [index, scene] of video.scenes.entries()) {
    await page.setContent(sceneHtml(scene, index), { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(slidesDir, `${scene.id}.png`) });
    const textFile = path.join(narrationDir, `${scene.id}.txt`);
    const wavFile = path.join(audioDir, `${scene.id}.wav`);
    await writeFile(textFile, `${scene.narration}\n`, "utf8");
    if (!reuseAudio || !fs.existsSync(wavFile)) run("node", [path.join(root, "scripts", "synthesize-speech.mjs"), "--input", textFile, "--output", wavFile]);
    scene.audio = wavFile;
    scene.duration = duration(wavFile) + 0.9;
  }
  await page.close();
} finally { await renderBrowser.close(); }

let cursor = 0;
const concat = [];
const srt = [];
for (const [index, scene] of video.scenes.entries()) {
  const clip = path.join(clipsDir, `${scene.id}.mp4`);
  run(ffmpeg, ["-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", path.join(slidesDir, `${scene.id}.png`), "-i", scene.audio, "-filter_complex", "[1:a]apad=pad_dur=0.9[a]", "-map", "0:v", "-map", "[a]", "-t", scene.duration.toFixed(3), "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "24000", clip]);
  concat.push(`file '${clip.replaceAll("\\", "/")}'`);
  srt.push(String(index + 1), `${srtTime(cursor)} --> ${srtTime(cursor + scene.duration)}`, scene.caption, "");
  cursor += scene.duration;
}
const concatFile = path.join(videoRoot, "concat.txt");
const subtitleFile = path.join(videoRoot, `${video.id}.ko.srt`);
const finalFile = path.join(outRoot, `${video.id}-current.mp4`);
await writeFile(concatFile, `${concat.join("\n")}\n`, "utf8");
await writeFile(subtitleFile, `${srt.join("\n")}\n`, "utf8");
run(ffmpeg, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", "-movflags", "+faststart", finalFile]);
const sampleFrame = path.join(videoRoot, "sample-frame.png");
run(ffmpeg, ["-y", "-loglevel", "error", "-ss", Math.max(1, cursor * 0.55).toFixed(2), "-i", finalFile, "-frames:v", "1", sampleFrame]);
const report = { renderedAt: new Date().toISOString(), narrationProvider: "google", voice: process.env.GOOGLE_TTS_VOICE_KO ?? "ko-KR-Chirp3-HD-Kore", speakingRate: Number(process.env.GOOGLE_TTS_SPEAKING_RATE ?? 0.94), resolution: "1920x1080", fps: 30, studyId, sourceScreens: screens, videos: [{ id: video.id, title: video.title, youtubeTitle: video.youtubeTitle, description: video.description, file: finalFile, subtitle: subtitleFile, sampleFrame, durationSeconds: duration(finalFile), bytes: fs.statSync(finalFile).size, sha256: createHash("sha256").update(await readFile(finalFile)).digest("hex") }] };
await writeFile(path.join(outRoot, "render-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(path.join(outRoot, "youtube-metadata.json"), `${JSON.stringify([{ id: video.id, youtubeTitle: video.youtubeTitle, description: video.description }], null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
