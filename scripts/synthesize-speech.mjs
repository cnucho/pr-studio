import { readFile, unlink, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createSign } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const defaultGoogleCredentialsPath = "C:\\secure\\pr-studio-google-tts.json";

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const inputPath = argValue("--input");
const outputPath = argValue("--output");

if (!inputPath || !outputPath) {
  throw new Error("Usage: node scripts/synthesize-speech.mjs --input text.txt --output audio.wav");
}

function inferLanguage(text) {
  const hangul = text.match(/[\uac00-\ud7a3]/g)?.length ?? 0;
  const latin = text.match(/[a-zA-Z]/g)?.length ?? 0;
  return hangul >= latin ? "ko" : "en";
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function googleLanguageCode(language) {
  if (language === "ko") {
    return process.env.GOOGLE_TTS_LANGUAGE_KO ?? "ko-KR";
  }

  return process.env.GOOGLE_TTS_LANGUAGE_EN ?? "en-US";
}

function googleVoice(language) {
  if (language === "ko") {
    return process.env.GOOGLE_TTS_VOICE_KO ?? "ko-KR-Chirp3-HD-Kore";
  }

  return process.env.GOOGLE_TTS_VOICE_EN ?? "en-US-Chirp3-HD-Kore";
}

function openAiVoice(language) {
  if (language === "ko") {
    return process.env.PR_STUDIO_TTS_VOICE_KO ?? process.env.OPENAI_TTS_VOICE_KO ?? "marin";
  }

  return process.env.PR_STUDIO_TTS_VOICE_EN ?? process.env.OPENAI_TTS_VOICE_EN ?? "cedar";
}

function openAiInstructions(language) {
  if (process.env.PR_STUDIO_TTS_INSTRUCTIONS) {
    return process.env.PR_STUDIO_TTS_INSTRUCTIONS;
  }

  if (language === "ko") {
    return [
      "Speak in natural Korean as a polished product-demo narrator.",
      "Use a warm, confident, professional tone.",
      "Keep the pace measured, with subtle emphasis on product names and key claims.",
      "Avoid a robotic, news-anchor, or overly dramatic delivery.",
    ].join(" ");
  }

  return [
    "Speak in natural English as a polished product-demo narrator.",
    "Use a warm, confident, professional tone.",
    "Keep the pace measured, with subtle emphasis on product names and key claims.",
    "Avoid a robotic, news-anchor, or overly dramatic delivery.",
  ].join(" ");
}

function runCommand(command, args) {
  const result = spawnSync(
    command,
    args,
    {
      cwd: root,
      encoding: "utf8",
      stdio: "inherit",
      shell: false,
    },
  );

  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status}`);
  }
}

function runSystemSpeech() {
  runCommand("powershell", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(root, "scripts", "speak.ps1"),
    "-InputText",
    inputPath,
    "-OutputWav",
    outputPath,
  ]);
}

async function runOpenAiSpeech(text, language) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const model = process.env.PR_STUDIO_TTS_MODEL ?? process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts";
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      voice: openAiVoice(language),
      input: text,
      instructions: openAiInstructions(language),
      response_format: "wav",
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`OpenAI speech failed: ${message}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
}

function googleCredentialsJson() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? (
    existsSync(defaultGoogleCredentialsPath) ? defaultGoogleCredentialsPath : undefined
  );

  if (!credentialsPath) {
    return undefined;
  }

  return JSON.parse(readFileSync(credentialsPath, "utf8"));
}

async function googleAccessToken() {
  if (process.env.GOOGLE_CLOUD_ACCESS_TOKEN) {
    return process.env.GOOGLE_CLOUD_ACCESS_TOKEN;
  }

  const credentials = googleCredentialsJson();
  if (!credentials?.client_email || !credentials?.private_key) {
    throw new Error(
      "Set GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_SERVICE_ACCOUNT_JSON, or GOOGLE_CLOUD_ACCESS_TOKEN.",
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    base64UrlJson({ alg: "RS256", typ: "JWT" }),
    base64UrlJson({
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ].join(".");

  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(credentials.private_key, "base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Google auth failed: ${message}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("Google auth did not return an access token.");
  }

  return data.access_token;
}

function googleInput(text) {
  if (process.env.GOOGLE_TTS_INPUT_MODE === "markup") {
    return { markup: text };
  }

  if (process.env.GOOGLE_TTS_INPUT_MODE === "ssml") {
    return { ssml: text };
  }

  return { text };
}

async function runGoogleSpeech(text, language) {
  const token = await googleAccessToken();
  const languageCode = googleLanguageCode(language);
  const endpoint =
    process.env.GOOGLE_TTS_ENDPOINT ?? "https://texttospeech.googleapis.com/v1/text:synthesize";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: googleInput(text),
      voice: {
        languageCode,
        name: googleVoice(language),
      },
      audioConfig: {
        audioEncoding: "LINEAR16",
        speakingRate: Number(process.env.GOOGLE_TTS_SPEAKING_RATE ?? 0.94),
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Google speech failed: ${message}`);
  }

  const data = await response.json();
  if (!data.audioContent) {
    throw new Error("Google speech did not return audioContent.");
  }

  await writeFile(outputPath, Buffer.from(data.audioContent, "base64"));
}

function elevenLabsVoice(language) {
  if (language === "ko") {
    return process.env.ELEVENLABS_VOICE_ID_KO ?? process.env.ELEVENLABS_VOICE_ID;
  }

  return process.env.ELEVENLABS_VOICE_ID_EN ?? process.env.ELEVENLABS_VOICE_ID;
}

async function runElevenLabsSpeech(text, language) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not set.");
  }

  const voiceId = elevenLabsVoice(language);
  if (!voiceId) {
    throw new Error("Set ELEVENLABS_VOICE_ID, ELEVENLABS_VOICE_ID_KO, or ELEVENLABS_VOICE_ID_EN.");
  }

  const modelId = process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2";
  const tempMp3 = `${outputPath}.elevenlabs.mp3`;
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        language_code: language,
        voice_settings: {
          stability: Number(process.env.ELEVENLABS_STABILITY ?? 0.55),
          similarity_boost: Number(process.env.ELEVENLABS_SIMILARITY_BOOST ?? 0.75),
          style: Number(process.env.ELEVENLABS_STYLE ?? 0.25),
          use_speaker_boost: process.env.ELEVENLABS_SPEAKER_BOOST !== "false",
        },
      }),
    },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`ElevenLabs speech failed: ${message}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(tempMp3, buffer);
  runCommand("ffmpeg", ["-y", "-loglevel", "error", "-i", tempMp3, outputPath]);
  await unlink(tempMp3).catch(() => {});
}

const text = await readFile(inputPath, "utf8");
const language = process.env.PR_STUDIO_TTS_LANGUAGE ?? inferLanguage(text);
const provider =
  language === "ko"
    ? process.env.PR_STUDIO_TTS_PROVIDER_KO ?? process.env.PR_STUDIO_TTS_PROVIDER ?? "auto"
    : process.env.PR_STUDIO_TTS_PROVIDER_EN ?? process.env.PR_STUDIO_TTS_PROVIDER ?? "auto";

try {
  const hasGoogleCredentials = Boolean(
    process.env.GOOGLE_CLOUD_ACCESS_TOKEN ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
      existsSync(defaultGoogleCredentialsPath),
  );
  const hasElevenLabsVoice = Boolean(elevenLabsVoice(language));

  if (
    provider === "google" ||
    (provider === "auto" && hasGoogleCredentials)
  ) {
    await runGoogleSpeech(text, language);
    console.log(`Google TTS wrote ${outputPath}`);
  } else if (
    provider === "elevenlabs" ||
    (provider === "auto" && process.env.ELEVENLABS_API_KEY && hasElevenLabsVoice)
  ) {
    await runElevenLabsSpeech(text, language);
    console.log(`ElevenLabs TTS wrote ${outputPath}`);
  } else if (provider === "openai" || (provider === "auto" && process.env.OPENAI_API_KEY)) {
    await runOpenAiSpeech(text, language);
    console.log(`OpenAI TTS wrote ${outputPath}`);
  } else {
    runSystemSpeech();
  }
} catch (error) {
  if (provider === "google" || provider === "openai" || provider === "elevenlabs") {
    throw error;
  }

  console.warn(error instanceof Error ? error.message : String(error));
  console.warn("Falling back to Windows System.Speech.");
  runSystemSpeech();
}
