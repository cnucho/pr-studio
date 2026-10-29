# Finance Insight introduction video verification — 2026-10-29

## Scope and provenance

This is an edited tutorial assembled from genuine production UI captures. It is
not a continuous recording and does not show the generation wait in real time.
The side-by-side chat and app scene explicitly identifies the edited composition.
The example uses synthetic Excel + questionnaire inputs. The report was produced
by the separate GPT conversation through the production MCP, not authored by the
video renderer. No finance application or authentication code was changed here.

## Media evidence

- Output: `out/finance-insight-demo/finance-insight-guide-ko.mp4` (ignored)
- Duration: 175.726021 seconds
- Resolution: 1920 × 1080; H.264 video, AAC audio, 48 kHz
- Size: 5,156,039 bytes
- SHA-256: `2b386d3a649a7560407ac7fc029169e3294bdb94e4c5f6b1a4561643e2eec869`
- Korean meaning captions: 10, burned into the video and exported as SRT
- Narration: Korean Windows System.Speech through the existing PR Studio helper
- All 10 narration source texts match the manifest.
- Every scene retains at least one second after its narration.
- Audio/video duration difference is below 0.1 second.
- Full-file strict ffmpeg decode: PASS.
- ffprobe resolution/duration/stream verification: PASS.
- All title/caption layout bounds: PASS.
- Ten extracted scene frames reviewed: PASS for caption visibility and clipping.
- Final renderer rerun: PASS; output hash unchanged.
- App download performed during capture: ZIP SHA-256
  `f6e09a8613a90267ad1dd9ebf59cfa82fe881621e57203e71b9296c79b554b17`,
  matching the previously verified report archive.

## Honest verification limits

YouTube browser playback was observed from the start through `ended=true` at
175.761 seconds. Intermediate playback positions and Korean captions were
checked, and the CI Portal embedded player advanced to the narrated input scene.
This verifies continuous playback and visible caption/screen progress. It does
not claim a separate human listening review of pronunciation or voice quality.

## Repository checks

- Python compilation and renderer-root check: PASS.
- npm run lint: PASS.
- npm run build: PASS (Next.js 15.5.19; 12 static pages generated).

Generated screenshots, narration, clips and video are excluded from Git.

## Publication and operational verification

- Channel: MethodIQ (`@MethodIQTools`), existing channel selected by the user.
- Visibility: Unlisted, explicitly approved by the user.
- Upload terms: explicitly approved at the YouTube upload step.
- Video: https://www.youtube.com/watch?v=68QNXswrWM8
- YouTube result: Video published; checks complete, no issues found.
- Portal: https://ci.methodiq.tools/demos
- Portal code: `cnucho/ci-portal` commit `fa9d782883763f8c3b1ebd913978225db0e462cf`
- Railway deployment: `b95f52c8-ff65-46a7-abdb-3fb54276185e`, SUCCESS.
- Image: `sha256:01e9d1eec50a9b204417f2c3ae032b4accac32f0832005752aa2192e592c7203`
- Portal health: ok=true; demo page HTTP 200.
- Portal checks: syntax PASS, 62 tests PASS; existing auth/access regression tests included.
- Real portal menu -> demo page -> embedded video playback: PASS.
- Mobile 390px viewport: no horizontal overflow.
- Existing finance and portal authentication configuration was not changed.
