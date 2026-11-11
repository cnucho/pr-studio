import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const defaultGoogleCredentialsPath = "C:\\secure\\pr-studio-google-tts.json";
const defaultTesseractPath = "C:\\Program Files\\Tesseract-OCR\\tesseract.exe";
const userTessdataPath = process.env.LOCALAPPDATA
  ? `${process.env.LOCALAPPDATA}\\PRStudio\\tessdata\\kor.traineddata`
  : "";

function commandAvailable(command, args = ["--version"]) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  return result.status === 0;
}

function pythonModules() {
  const modules = ["PIL", "playwright", "reportlab"];
  const script = [
    "import importlib.util,json",
    `mods=${JSON.stringify(modules)}`,
    "print(json.dumps({m: bool(importlib.util.find_spec(m)) for m in mods}))",
  ].join(";");
  const result = spawnSync("python", ["-c", script], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (result.status !== 0) return Object.fromEntries(modules.map((name) => [name, false]));
  return JSON.parse(result.stdout);
}

async function browserAvailable() {
  try {
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    return true;
  } catch {
    return false;
  }
}

const python = pythonModules();
const required = {
  node: commandAvailable("node"),
  python: commandAvailable("python"),
  ffmpeg: commandAvailable("ffmpeg", ["-version"]),
  ffprobe: commandAvailable("ffprobe", ["-version"]),
  playwrightChromium: await browserAvailable(),
  pillow: Boolean(python.PIL),
  pythonPlaywright: Boolean(python.playwright),
  reportlab: Boolean(python.reportlab),
};

const optional = {
  googleTtsCredentials: Boolean(
    process.env.GOOGLE_CLOUD_ACCESS_TOKEN ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
      existsSync(defaultGoogleCredentialsPath),
  ),
  openAiTtsCredentials: Boolean(process.env.OPENAI_API_KEY),
  elevenLabsCredentials: Boolean(process.env.ELEVENLABS_API_KEY),
  edgeTts: commandAvailable("edge-tts"),
  tesseract: commandAvailable(existsSync(defaultTesseractPath) ? defaultTesseractPath : "tesseract"),
  tesseractKoreanData: Boolean(
    (userTessdataPath && existsSync(userTessdataPath)) ||
      existsSync("C:\\Program Files\\Tesseract-OCR\\tessdata\\kor.traineddata"),
  ),
};

const ok = Object.values(required).every(Boolean);
process.stdout.write(`${JSON.stringify({ ok, required, optional }, null, 2)}\n`);
if (!ok) process.exitCode = 1;
