# App tutorial videos — 2026-11-12

Two Korean 1920×1080 videos are authored here. Both start with MCP installation, then show web and conversational paths. Google Cloud TTS (`ko-KR-Chirp3-HD-Kore`, speaking rate `0.94`) supplies the narration. Output MP4, SRT, transcript, frames, audio and verification JSON are generated under ignored `out/`; no respondent data or media is committed.

## Conjoint Research Studio

`docs/demo-scripts/conjoint-research-studio/storyboard.json` has 20 scenes covering MCP installation, web login and project selection, design, data import, MNL/HB estimation, simulator, report, and MCP design/analysis jobs.

Source: production-deployed Conjoint source commit `59b36a1` and read-only live login/OAuth checks on 2026-11-12. The app screens after login are captured from that source with a synthetic local project stub. They are examples, not authenticated production journey evidence. The prototype scene is explicitly marked as a prototype. The operational login screen was captured live and is labeled separately.

Render: `node docs/demo-scripts/conjoint-research-studio/render_tutorial.mjs`.

## CI Finance Insight Studio

`docs/demo-scripts/finance-insight-studio/storyboard.json` has 18 scenes covering MCP installation, web project/data selection, standard, summary and question-centered report paths, composition review, result download, MCP requests, revisions and publication distinction.

Source: `ci-dp-workflow` remote `main` synchronized on 2026-11-12 and actual public production web UI at `https://ci-research-hub-production.up.railway.app/finance.html`. Screens were captured without signing in; no report was generated or downloaded in this session. Text and actions beyond the login boundary are drawn from current source and documents, and the video labels unexecuted steps.

Render: `node docs/demo-scripts/finance-insight-studio/render_tutorial.mjs`.

## Verification

Each renderer checks a full FFmpeg decode and writes ffprobe codec, dimensions, duration, SHA-256 and three sampled frames to `out/<slug>/verification.json`. Inspect sampled frames before sharing. To rerender, supply the expected PNGs in `out/<slug>/screens/`; screenshots are deliberately not tracked in Git.
