# OTT viewing forecast videos: publication handoff

Published on 2026-11-07 to the MethodIQ YouTube channel as unlisted videos.
These are live links; do not upload the same files again just to create a
PR Studio publication record.

| Part | YouTube | CI Portal demo |
| --- | --- | --- |
| 1. Forecast snippet and changes | https://www.youtube.com/watch?v=I6_JAs_qSh8 | https://ci.methodiq.tools/demos#ott-forecast-intro-part-1 |
| 2. Research-team operation | https://www.youtube.com/watch?v=x1HSqwENA-g | https://ci.methodiq.tools/demos#ott-forecast-intro-part-2 |

The trial app is at https://forecast-web-production.up.railway.app/ and is
registered in the CI Portal admin ledger as an admin-only Alpha APP and MCP.
The demo page does not grant app access. Survey-feed ingestion and customer
dashboard delivery remain unconnected; part 1 uses fictional example values.

## Production and upload boundary

- The source plan and renderer are in
  `cnucho/ott-viewing-forecast`, commit
  `6e0055ba875fd8dac1f8cd6bdf42255e62246bcf`, at
  `docs/intro-video-plan-ko.md` and `scripts/render-intro-videos.mjs`.
- The OTT renderer used PR Studio's `scripts/synthesize-speech.mjs` for Google
  Cloud TTS, with Korean male voice `ko-KR-Chirp3-HD-Algieba`. Each MP4 has
  burned-in Korean captions and a separate Korean SRT.
- Upload and visibility selection were performed in the authenticated YouTube
  Studio browser, **not** by a PR Studio YouTube-upload function. The current
  PR Studio YouTube kit prepares content and metadata; it does not publish a
  video to the account. Do not describe this upload as an in-app PR Studio
  publication.
- Both uploads completed without a YouTube copyright-check issue. The watch
  pages showed the unlisted state and a 1080p quality option. These checks do
  not establish that YouTube preserved the original encoded bytes.

## Local source-file receipt

Generated media are deliberately excluded from Git. At handoff the files were
under `D:\Worktrees\active\ott-viewing-forecast\initial-model-20261107\runs\intro-videos\`.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `ott-forecast-intro-part-1.mp4` | 1,532,650 | `8F1F0D8499C17CC5182523B686F002B5AE9C16536AD31BBC13611D2662C4B42D` |
| `ott-forecast-intro-part-2.mp4` | 1,632,786 | `5AC5FD4D7D01C22BCCAB650CF36B0BBAAE5A06047CB214E4D1BACBD85A66E5FE` |

CI Portal demo entry: `cnucho/ci-portal` main commit
`342b61002b5c14b6fc4a6456dfa944a1aa62615e`.
