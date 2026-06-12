import { mkdir, writeFile } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const assetRoot = path.join(root, "video-assets");
const screenDir = path.join(assetRoot, "screens");
const audioDir = path.join(assetRoot, "audio");
const clipDir = path.join(assetRoot, "clips");
const textDir = path.join(assetRoot, "narration");
const outDir = path.join(root, "out");
const draftPath = path.join(outDir, "ai-sidae-hongbo-draft.mp4");
const subtitlePath = path.join(assetRoot, "subtitles.ass");
const finalPath = path.join(outDir, "ai-sidae-hongbo-final.mp4");

const clips = [
  {
    id: "01-pipeline",
    image: "scene-01-pipeline.png",
    caption: "과거: 홍보업무 -> 개발 의뢰 -> 수개월 개발 -> 사용",
    narration:
      "AI 시대 홍보담당자는 왜 앱을 만들어야 할까요. 과거에는 홍보 업무를 앱으로 만들기 위해 개발 의뢰부터 시작했습니다. 업무를 설명하고, 요구사항을 문서로 만들고, 수개월을 기다린 뒤에야 사용할 수 있었습니다. 문제는 홍보 현장의 이슈가 그 기다림보다 훨씬 빠르게 바뀐다는 점입니다. 앱이 완성될 때쯤에는 이미 정책 메시지와 언론 질문, 시민 반응이 달라져 있는 경우가 많았습니다.",
  },
  {
    id: "02-specialized",
    image: "scene-02-specialized.png",
    caption: "문제: 홍보업무는 정책, 언론, 민원 맥락을 알아야 합니다",
    narration:
      "홍보 업무는 겉으로 보기보다 훨씬 전문적입니다. 정책홍보는 정책의 의도와 대상, 집행 절차를 알아야 하고, 보도자료는 언론이 궁금해할 쟁점을 먼저 정리해야 합니다. 언론 모니터링은 기사 한 줄의 뉘앙스를 읽어야 하며, 민원 분석은 반복되는 불편과 감정의 방향을 함께 봐야 합니다. 기자 응대 역시 단순한 답변이 아니라 맥락과 리스크를 관리하는 일입니다.",
  },
  {
    id: "03-market",
    image: "scene-03-market.png",
    caption: "작은 시장의 전문 업무는 상용 제품이 되기 어렵습니다",
    narration:
      "그런데 이런 업무를 위한 범용 제품은 쉽게 나오지 않습니다. 수백만 명이 쓰는 대중 앱은 개발회사가 투자할 이유가 있습니다. 하지만 특정 기관, 특정 부서, 특정 정책홍보 업무처럼 사용자가 수백 명 수준인 시장은 다릅니다. 필요는 분명하지만 시장은 작고, 업무는 너무 구체적입니다. 그래서 홍보 담당자는 늘 엑셀, 문서, 메일, 검색창을 이어 붙여 일해 왔습니다.",
  },
  {
    id: "04-press-input",
    image: "press-input.png",
    caption: "보도자료 작성기: 정책명, 사업내용, 예산, 대상, 기대효과 입력",
    narration:
      "첫 번째 데모는 보도자료 작성기입니다. 여기서는 정책명, 사업내용, 예산, 대상, 기대효과를 입력합니다. 이 화면은 가짜 목업이 아니라 실제로 동작하는 앱입니다. 홍보 담당자가 평소 보도자료를 쓰기 전에 정리하던 핵심 항목을 그대로 입력 구조로 바꾼 것입니다. 중요한 점은 개발자가 업무를 추측해서 만든 화면이 아니라, 홍보 담당자의 사고 흐름이 앱의 입력 양식이 된다는 점입니다.",
  },
  {
    id: "05-press-output",
    image: "press-output.png",
    caption: "출력: 보도자료 제목, 본문, SNS 요약, 언론 대응 포인트",
    narration:
      "생성 버튼을 누르면 결과가 바로 나옵니다. 보도자료 제목과 부제, 리드문, 본문 단락, 인용문이 만들어지고, 동시에 SNS 요약과 해시태그, 언론 대응 포인트까지 정리됩니다. 여기서 중요한 것은 글을 대신 써 준다는 사실만이 아닙니다. 홍보 담당자가 매번 반복하던 형식화 작업을 앱이 맡고, 담당자는 메시지의 정확성, 표현의 균형, 정책 리스크 검토에 더 많은 시간을 쓸 수 있게 됩니다.",
  },
  {
    id: "06-news-input",
    image: "news-input.png",
    caption: "뉴스 분석기: 여러 기사 원문을 그대로 입력",
    narration:
      "두 번째 데모는 뉴스 분석기입니다. 기사 여러 개를 그대로 붙여 넣습니다. 언론사, 제목, 본문이 섞여 있어도 앱은 각각의 기사를 분리해 분석합니다. 실제 홍보 현장에서는 보도량보다 중요한 것이 보도의 방향입니다. 어떤 언론사는 정책 효과를 강조하고, 어떤 언론사는 예산 부담이나 형평성 우려를 강조합니다. 담당자는 이 차이를 빠르게 읽어야 다음 브리핑과 대응 문안을 준비할 수 있습니다.",
  },
  {
    id: "07-news-output",
    image: "news-output.png",
    caption: "출력: 핵심 이슈, 긍정·부정 흐름, 언론사별 프레임, 자동 보고서",
    narration:
      "분석 결과는 핵심 이슈, 긍정과 부정의 흐름, 언론사별 차이, 자동 보고서로 정리됩니다. 단순히 긍정 기사와 부정 기사를 세는 것이 아니라, 기사들이 어떤 프레임으로 정책을 바라보는지 보여 줍니다. 이렇게 되면 홍보 담당자는 감으로 판단하지 않고, 기사 텍스트에 근거해 다음 메시지를 조정할 수 있습니다. 이 앱은 언론 모니터링을 보고서 작성 업무로 바로 연결합니다.",
  },
  {
    id: "08-youtube-input",
    image: "youtube-input.png",
    caption: "유튜브 콘텐츠 작성기: 정책자료 PDF 또는 텍스트 입력",
    narration:
      "세 번째 데모는 유튜브 콘텐츠 작성기입니다. 정책자료 PDF를 업로드하거나 텍스트를 붙여 넣으면, 영상 제작에 필요한 자료로 바꿔 줍니다. 정책 홍보는 이제 보도자료에서 끝나지 않습니다. 유튜브, 쇼츠, 블로그, SNS까지 같은 메시지를 다른 길이와 다른 문법으로 바꿔야 합니다. 이 과정이 수작업이면 시간이 오래 걸리고, 채널마다 메시지가 달라질 위험도 커집니다.",
  },
  {
    id: "09-youtube-output",
    image: "youtube-output.png",
    caption: "출력: 영상 대본, 쇼츠 문안, 썸네일 문구, 게시 패키지",
    narration:
      "생성 결과는 영상 대본, 쇼츠 문안, 썸네일 문구, 블로그 글에 더해 유튜브 게시 제목, 설명, 태그, 자막 파일명, 녹화 체크리스트까지 포함합니다. 하나의 정책자료가 여러 채널의 콘텐츠 패키지로 바뀌고, 제작과 게시 단계까지 같은 메시지로 연결됩니다.",
  },
  {
    id: "10-targeting-strategy",
    image: "targeting-strategy.png",
    caption: "마이크로타겟팅: 시민 상태별 메시지 전략",
    narration:
      "네 번째 데모는 상태 기반 마이크로타겟팅입니다. 같은 정책 대상자라도 어떤 사람은 정보를 몰라서 움직이지 않고, 어떤 사람은 기준을 믿지 못해서 멈춥니다. 앱은 시민 상태를 나누고, 목표에 따라 메시지, 근거, 다음 행동을 다르게 제안합니다.",
  },
  {
    id: "11-performance-collector",
    image: "performance-collector.png",
    caption: "성과 수집: YouTube 공개 지표와 다음 메시지 실험",
    narration:
      "다섯 번째 데모는 유튜브 성과 수집기입니다. 배포된 영상의 조회수, 좋아요, 댓글 같은 공개 지표를 모아 어떤 제목과 썸네일 약속이 반응을 만들었는지 비교합니다. 이렇게 되면 홍보는 일회성 캠페인이 아니라 다음 메시지를 더 정확하게 만드는 학습 루프가 됩니다.",
  },
  {
    id: "12-future",
    image: "scene-09-future.png",
    caption: "미래: 홍보담당자 -> AI -> 앱",
    narration:
      "핵심 메시지는 분명합니다. 앞으로의 경쟁은 홍보전문가 대 개발자가 아닙니다. AI를 활용하는 홍보전문가와 그렇지 않은 홍보전문가의 경쟁입니다. 개발 지식이 없어도 업무를 구조화하고, 입력과 출력을 정의하고, AI와 함께 앱으로 만들 수 있다면 홍보 담당자는 더 빠르게 실험하고 더 정확하게 대응할 수 있습니다. 이제 앱은 멀리 있는 개발 프로젝트가 아니라 내 업무를 확장하는 도구입니다.",
  },
  {
    id: "13-final",
    image: "scene-10-final.png",
    caption: "보도자료를 작성하는 홍보담당자에서 홍보용 AI를 만드는 홍보담당자로",
    narration:
      "이 변화는 홍보 담당자의 역할을 바꿉니다. 보도자료를 작성하는 사람에서, 홍보용 AI를 만드는 사람으로. 언론 대응을 반복하는 사람에서, 언론 대응 앱을 설계하는 사람으로. AI 시대의 홍보 역량은 도구를 잘 쓰는 능력을 넘어, 내 업무를 앱으로 바꾸는 능력이 됩니다. 이제 홍보 담당자가 직접 만드는 업무용 앱이 새로운 기준이 될 것입니다.",
  },
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
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
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `${command} failed`);
  }
  return result.stdout.trim();
}

function ffmpegPathSafe(value) {
  return value.replaceAll("\\", "/");
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

function assText(value) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll(" -> ", " \\N ");
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
  await mkdir(audioDir, { recursive: true });
  await mkdir(clipDir, { recursive: true });
  await mkdir(textDir, { recursive: true });
  await mkdir(outDir, { recursive: true });
}

async function makeAudio() {
  for (const clip of clips) {
    const textPath = path.join(textDir, `${clip.id}.txt`);
    const wavPath = path.join(audioDir, `${clip.id}.wav`);
    clip.audio = wavPath;
    await writeFile(textPath, clip.narration, "utf8");
    run("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      path.join(root, "scripts", "speak.ps1"),
      "-InputText",
      textPath,
      "-OutputWav",
      wavPath,
    ]);
    clip.duration = audioDuration(wavPath) + 0.75;
  }
}

async function makeClips() {
  const concatLines = [];

  for (const clip of clips) {
    const imagePath = path.join(screenDir, clip.image);
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Missing screenshot: ${imagePath}`);
    }
    const clipPath = path.join(clipDir, `${clip.id}.mp4`);
    clip.video = clipPath;
    const vf =
      "scale=1920:1080:force_original_aspect_ratio=decrease," +
      "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xf7f6f2," +
      "format=yuv420p";

    run("ffmpeg", [
      "-y",
      "-loop",
      "1",
      "-framerate",
      "30",
      "-i",
      imagePath,
      "-i",
      clip.audio,
      "-filter_complex",
      `[1:a]apad=pad_dur=0.75[a]`,
      "-map",
      "0:v",
      "-map",
      "[a]",
      "-t",
      clip.duration.toFixed(3),
      "-vf",
      vf,
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

    concatLines.push(`file '${ffmpegPathSafe(clipPath)}'`);
  }

  const concatPath = path.join(assetRoot, "concat.txt");
  await writeFile(concatPath, `${concatLines.join("\n")}\n`, "utf8");
  run("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatPath,
    "-c",
    "copy",
    draftPath,
  ]);
}

async function makeSubtitles() {
  let cursor = 0;
  const events = [];

  for (const clip of clips) {
    const start = cursor + 0.35;
    const end = cursor + clip.duration - 0.18;
    events.push(
      `Dialogue: 0,${assTime(start)},${assTime(end)},Caption,,0,0,0,,${assText(clip.caption)}`,
    );
    cursor += clip.duration;
  }

  const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Malgun Gothic,45,&H00FFFFFF,&H00FFFFFF,&H55221A14,&HD0221A14,-1,0,0,0,100,100,0,0,3,14,0,2,110,110,58,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join("\n")}
`;

  await writeFile(subtitlePath, ass, "utf8");
}

async function burnSubtitles() {
  const relativeSubtitlePath = ffmpegPathSafe(
    path.relative(root, subtitlePath),
  );
  run("ffmpeg", [
    "-y",
    "-i",
    draftPath,
    "-vf",
    `ass=${relativeSubtitlePath}`,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    finalPath,
  ]);
}

await ensureDirs();
await makeAudio();
await makeClips();
await makeSubtitles();
await burnSubtitles();

const finalDuration = capture("ffprobe", [
  "-v",
  "error",
  "-select_streams",
  "v:0",
  "-show_entries",
  "stream=width,height:format=duration",
  "-of",
  "json",
  finalPath,
]);

console.log(finalDuration);
console.log(`Final video: ${finalPath}`);
