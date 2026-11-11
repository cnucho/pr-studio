# OTT viewing forecast demos

PR Studio owns the current two-part Korean demo package for the OTT viewing
forecast Beta app.

- Live app: https://forecast-web-production.up.railway.app/
- CI Portal demo page: https://ci.methodiq.tools/demos
- Stable media release tag: `ott-forecast-demo-20261112-v4`
- Renderer: `render.py`
- Part 1 manifest: `intro.json`
- Part 2 manifest: `tutorial.json`

## Current story

Part 1 explains the product boundary: the weekly dashboard workbook is converted
into current post-launch week 1, 2, and 3 viewing-experience forecasts; forecast
uncertainty and a frozen absolute five-grade scale are shown; the guide includes
absolute percentage ranges, median representative titles, content share, and
approximate viewing contribution; baseline, Ridge, histogram gradient boosting,
and CatBoost are compared; the historical review Viewer compares every stored
forecast point with later actuals and errors; new actuals feed error learning; and daily YouTube evidence is
used to draft change explanations. The on-screen responsibility statement is
`수행: Consumer Insight 연구분석팀` and `방법론 책임: 김양혁`.

Part 2 shows the weekly operating flow: submit the existing Excel format through
the app, conversation, email, or the dedicated MCP; review forecast/actual
snippets, the fixed week-two grade guide, method performance, and the historical
forecast-versus-actual Viewer; manage daily external-signal collection and historical recovery;
run the weekly AI review in the connected conversation, add collection instructions when needed;
edit the shared YouTube brief; and control
publication and forecast export with the designated operator/admin roles.

## Build and verification

The GitHub workflow `render-ott-forecast-demos.yml` captures the live Beta
screens, checks health and the published JSON contract, verifies that management
and Viewer routes enforce central sign-in, fails on browser console errors, renders Korean narration and burned-in captions, decodes both MP4 files
with ffmpeg, stores review artifacts, and publishes stable release assets.
Generated MP4, audio, screenshots, SRT, transcript, and receipt files remain
outside Git.

Run locally where ffmpeg, Playwright, Pillow, edge-tts, and Korean Noto fonts are
available:

```bash
python docs/demo-scripts/ott-forecast/render.py both
```

The release receipt records duration, dimensions, SHA-256, narration voice,
source URL, and captured live screens. `live-screen-receipt.json` separately
records HTTP status, required visible text, published schema/grade counts,
authentication boundaries, console errors, and screenshot paths. CI Portal embeds the stable release MP4s
and does not grant product-app access.

## v4 additions

The v4 package adds the internal admin signal collector, daily code collection,
historical YouTube reaction recovery, weekly conversation-based AI analysis, and
AI-issued follow-up collection instructions. The signal page remains protected;
local authenticated-equivalent capture is used for the review build and CI falls
back to an explicit workflow slide when credentials are unavailable.

The 2026-11-12 public review build completed without browser console or page
errors. Part 1 is about 144 seconds and Part 2 is about 139 seconds, both at
1280×720. The release receipt assets record the exact SHA-256 of the current
published render because neural narration can produce a different binary on a
later verified rerun. Both H.264/AAC files passed full ffmpeg decode
verification. The protected
signal page was also reviewed locally with real recovery and validation state,
but the public video uses the explicit workflow slide so internal title-level
data is not published.

## Previous verified v3 receipt

The 2026-11-11 live-screen run completed with no browser console or page errors.
Part 1 is 123.363 seconds at 1280×720 (SHA-256 `c0c1e51f4cc41862713ab03fecba51bf5582e9b7307924e167db5b9bfc856dea`).
Part 2 is 107.122 seconds at 1280×720 (SHA-256 `8b2bdb4d22483df57702ffeda2f7a79b1fd8e20f82589ca5f3aca00ff95d25b2`).
Both H.264/AAC files passed full ffmpeg decode verification.

## Superseded 2026-11-07 YouTube demos

The earlier unlisted videos `I6_JAs_qSh8` and `x1HSqwENA-g` describe the old
+1/+2-week trial and are retained only as history. They must not be presented as
the current workflow.
