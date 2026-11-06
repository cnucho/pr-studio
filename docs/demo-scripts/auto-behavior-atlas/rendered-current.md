# AutoBehavior Atlas demo — current render

- Rendered at: 2026-11-07 01:41 KST
- Local deliverable: `out/auto-behavior-atlas-demo/auto-behavior-atlas-demo-current.mp4`
- Duration: 138.6 seconds
- Resolution: 1920×1080
- Video/audio: H.264 + AAC, 24 kHz mono
- File size: 5,815,635 bytes
- SHA-256: `8cff8b148421ed37f1300135a2436c6464b3550af70a2def1f0040ad6318f2f0`
- Narration: Google Cloud Text-to-Speech, `ko-KR-Chirp3-HD-Kore`, speaking rate `0.94`
- Subtitles: Korean SRT and burned-in ASS captions
- Live source: `https://auto-behavior-atlas-production.up.railway.app`

## Verification

- Actual production UI was used for the opening, question, and answer captures.
- The final completed response includes the observed values 1.42%, KIA 47.75%, Hyundai 48.88%, and recent 12-month acquisition shares.
- Full video decoding completed without errors.
- `npm run lint` passed.
- `npm run build` passed.
- `ffprobe` confirmed the expected duration, resolution, and audio/video codecs.

Generated media remains outside Git under the ignored `out/` folder. The script, narration plan, verification metadata, and reproducible production procedure are tracked in Git.
