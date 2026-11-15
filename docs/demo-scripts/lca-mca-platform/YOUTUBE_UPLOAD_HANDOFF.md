# LCA–MCA YouTube upload handoff

Status on 2026-11-15: **not uploaded to YouTube**. Both final videos, subtitles,
the public example, and publishing copy are ready. The same MP4 files are
already published as GitHub Release assets and must be the files used for both
portal links and YouTube. Do not render a different answer or substitute a
precomputed analysis.

## Destination and exact assets

- YouTube Studio channel: **MethodIQ** (`UCxtq0PGRuRzFKlXM__45taA`). Verify
  this identity before publishing. Intended visibility: **Public**.
- Introduction: `D:\Git\pr-studio\out\lca-mca-platform\intro\lca-mca-intro-ko.mp4`
  SHA-256 `e796625c7d09f8d9334b39527f5766e70f421e862ebb799c37fa642ef7cc6384`.
  Korean SRT alongside it: `lca-mca-intro-ko.srt`.
- Follow-along tutorial: `D:\Git\pr-studio\out\lca-mca-platform\tutorial\lca-mca-tutorial-ko.mp4`
  SHA-256 `0f3e00feda5ccaa574fbc66aaa6d01f5cc78e05699a5c99ff8b8b911a88bb7d6`.
  Korean SRT alongside it: `lca-mca-tutorial-ko.srt`.
- Public fallback/download: https://github.com/cnucho/research-app-examples/releases/tag/lca-mca-tutorial-v1
- Exact titles and descriptions: [youtube-metadata-ko.md](youtube-metadata-ko.md).

## Task for the next Codex

1. In the authenticated MethodIQ YouTube Studio, upload the two **exact files**
   above. Browser-controlled local file selection was blocked in this session
   by the ChatGPT Chrome extension's file URL permission. Do not claim an
   upload happened because the dialog opened. Use an authorized file-selection
   path, or ask the human to choose the two files in the native picker; then
   continue every remaining YouTube step yourself.
2. Set the prepared titles/descriptions, mark the content as not made for kids
   if the channel's actual publishing policy agrees, upload the Korean SRT
   captions, check YouTube's processing and checks, choose Public, and publish.
   Do not change the video's statistical caveats.
3. Open both watch pages and verify playback, title, description, visibility,
   captions, and links. Record the two video IDs, watch URLs, publication time,
   and visible result in this handoff and `youtube-metadata-ko.md`.
4. The CI Portal `/demos` cards and the MethodIQ app card currently use the
   *same* release MP4 assets. After verifying YouTube, replace the video links
   in both portals with the two watch URLs if desired. Keep the example,
   manual, and handoff links; check both portal cards after deployment.

## Portal publication verified on 2026-11-15

- CI Portal: https://ci.methodiq.tools/demos#lca-mca-introduction and
  https://ci.methodiq.tools/demos#lca-mca-follow-along-tutorial . Both videos
  played in the live browser. The tutorial card links to the synthetic ZIP,
  questionnaire, manual, and this upload handoff.
- MethodIQ Portal: https://methodiq.tools/apps . The LCA–MCA card has an
  `예제·영상 안내` button to the CI demo and, under `자세히`, links to both exact
  release MP4 files. This was verified after production Railway deployment
  `f9c9c5e8-3343-4353-b5d3-f4898b0152bd` succeeded.
- CI Portal registration commit: `feb0d36`; MethodIQ Portal merge commit:
  `b781c27` (PR #8). These portal links do not imply YouTube publication.

## Verification already done

PR Studio render receipts for both files report Google Cloud
`ko-KR-Chirp3-HD-Kore` at rate `0.94`, H.264/AAC 1920×1080, and full decode
passed. The exact CSV in the release has SHA-256
`d09b7730ff5ef5bbf3746d9556db19cb1ba488d6001e9c5fb72c1b60e16a5685`.
The browser capture ran LCA and MCA on it and produced separate final DOCX
exports. No YouTube publication has been verified.
