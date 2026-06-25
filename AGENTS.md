# PR Studio Agent Notes

## Voice Rendering

- This repo uses Google Cloud Text-to-Speech as the preferred narration provider for demo and tutorial videos.
- The local service account key should live outside the repo at `C:\secure\pr-studio-google-tts.json`.
- Never commit the Google service account JSON file, downloaded credentials, generated audio, generated clips, or rendered videos.
- `scripts/synthesize-speech.mjs` auto-detects `C:\secure\pr-studio-google-tts.json` and falls back in this order: Google TTS, ElevenLabs, OpenAI TTS, Windows `System.Speech`.
- Default Google tutorial voices are `ko-KR-Chirp3-HD-Kore` and `en-US-Chirp3-HD-Kore`; default speaking rate is `0.94`.
- Preferred split for tutorial/demo narration is Korean via Google TTS and English via OpenAI TTS, unless the user asks for a single provider.
- Quality recommendation for usage/tutorial demos: Korean narration should use Google Cloud TTS Chirp 3 HD; English narration should use OpenAI TTS. Use ElevenLabs only as an A/B option for more polished brand/advertising narration.
- To force Google TTS in the current shell:

```powershell
$env:PR_STUDIO_TTS_PROVIDER="google"
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\secure\pr-studio-google-tts.json"
$env:GOOGLE_TTS_VOICE_KO="ko-KR-Chirp3-HD-Kore"
$env:GOOGLE_TTS_VOICE_EN="en-US-Chirp3-HD-Kore"
$env:GOOGLE_TTS_SPEAKING_RATE="0.94"
```

- To use Google for Korean and OpenAI for English:

```powershell
$env:PR_STUDIO_TTS_PROVIDER_KO="google"
$env:PR_STUDIO_TTS_PROVIDER_EN="openai"
```

- Test a single narration clip before rendering the full video:

```powershell
node scripts\synthesize-speech.mjs --input video-assets\narration\01-pipeline.txt --output out\google-tts-test.wav
ffprobe -v error -show_entries stream=codec_name,sample_rate,channels:format=duration,size -of json out\google-tts-test.wav
```

- Render the full PR Studio demo video with:

```powershell
npm run render:video
```

## Verification

- After voice or video-rendering changes, run `npm run lint` and `npm run build`.
- For generated media, verify the actual artifact with `ffprobe`; do not treat a successful render command as sufficient proof.
- Keep generated output in ignored folders such as `out/`, `video-assets/audio/`, `video-assets/clips/`, and `video-assets/narration/`.

## Demo Video Craft

- This repo is usually a demo/video production workspace. Do not assume the target app is PR Studio itself. First identify the target app, target audience, and whether the requested asset is a product demo or a tutorial.
- Keep app-specific scripts under `docs/demo-scripts/<app-slug>/` rather than hardcoding them into renderer scripts.
- Use `docs/demo-script-template-ko.md` as the starting template for external app demos and tutorials.
- Do not solve pacing by applying one global speed multiplier such as 2x. Dense screens need slower narration and longer holds; sparse transition screens can be shorter.
- Prefer a timeline made of small beats instead of one long narration per screenshot. Each beat should define the visible screen state, the user's action or focus area, the narration sentence, the subtitle text, and the hold duration.
- Keep spoken narration tied to what the viewer can see at that moment. If the narration mentions a field, button, result card, or metric, the screen should show it and ideally highlight it.
- Use subtitles as concise meaning captions, not full transcripts. A good subtitle is usually one short sentence or phrase that summarizes the current point; full transcript files can be exported separately when needed.
- For tutorial videos, voice should be calm and slightly slower than a promotional ad. Default Google speaking rate for Korean is `0.94`; adjust per beat only when the visual density requires it.
- Add short pauses after important UI transitions, generated outputs, and result summaries so viewers can scan the screen before the next sentence starts.
- When a screen has high information density, split it into multiple beats: first orient the viewer, then explain the input, then explain the generated output, then state the decision or takeaway.
- When a screen has low information density, keep the beat short and use it as a bridge rather than stretching narration.
- Prefer visual focus tools over faster narration: cursor movement, zoom crop, highlight box, dimming, or callout labels should guide attention before the voice explains details.
- Verification for finished demos should include duration, resolution, file size, a few sampled frames, and at least one watch-through check for speech-screen alignment.
