# KG Statistics Production System MVP — Production Report

## Identification

- Production repository: `cnucho/pr-studio`
- Production branch: `codex/kg-statistics-demo-production`
- KG source repository: `cnucho/survey-workflow-orchestrator`
- KG source branch: `codex/kg-mvp-golden-path`
- Verified KG source commit: `f3edbc8dda642532da3b607d921790541abd83f5`
- Scenario: Household Living Conditions Survey 2026
- Production date: 2026-07-25 (Asia/Seoul)

## Result

The review/master production package was rendered and verified. It contains an
editable 11-slide PPTX, matching 11-page PDF, a 28-minute 17-second 1080p
H.264/AAC master, English narration, and separate English and Kyrgyz SRT/VTT
tracks with 46 cues each. Subtitles are not burned into the master.

The closing claim was updated for the current Phase 7 source baseline: the
verified baseline includes anonymous public-catalog capability. External
SSO/MFA, national deployment, high availability, full monitoring integration,
and independent accessibility certification remain outside this production.

## Application evidence and recording boundary

Before capture, the authoritative Phase 4 authenticated React operator closure
test passed against the current KG commit. That test proves the multi-actor,
nine-action workflow, server-side artifact identity, separation-of-duty
rejections, persistent idempotency, immutable release generation, and
hash-verified download across all official formats.

Ten browser-video assets were then captured from the real, running,
authenticated React operator application. Login occurred in a non-recorded
bootstrap context; the recording contexts reused authenticated cookies and did
not expose passwords or tokens. The review visuals show the project list and
the real project workflow hub at different scroll positions. They do not
simulate role switching or expose raw respondent rows. The full multi-actor
transition execution is proven by the closure test rather than replayed with
visible credentials in the recorded contexts.

No sample release fallback was used and no target-production authentication,
authorization, lineage, release-integrity, or separation-of-duty behavior was
weakened.

## Output package

Generated review artifacts are intentionally ignored by Git and are available
under `out/kg-statistics-mvp-demo/`:

- `kg-statistics-mvp-demo-master.mp4`
- `kg-statistics-mvp-demo-slides.pptx`
- `kg-statistics-mvp-demo-slides.pdf`
- `kg-statistics-mvp-demo-en.srt`
- `kg-statistics-mvp-demo-en.vtt`
- `kg-statistics-mvp-demo-ky.srt`
- `kg-statistics-mvp-demo-ky.vtt`
- `production-manifest.json`
- `verification-report.json`
- `slides-contact-sheet.png`
- `pdf-contact-sheet.png`
- `video-final-contact-sheet.png`

## Verification

| Check | Result |
| --- | --- |
| Authenticated React operator closure | PASS |
| Real recorded application clips | 10 |
| Explanatory slides | 11 |
| Master dimensions | 1920×1080 |
| Master frame rate | 30 fps |
| Video/audio codecs | H.264 / AAC |
| Duration | 1697.04 seconds |
| Target duration (1440–1800 seconds) | PASS |
| English SRT/VTT | 46 / 46 cues, PASS |
| Kyrgyz SRT/VTT | 46 / 46 cues, PASS |
| Burned subtitles | No |
| Sample release fallback | No |
| PPTX slide render inspection | PASS |
| PDF page render inspection | PASS |
| Master interval contact-sheet inspection | PASS after one corrected render |

The first video render was superseded after visual QA showed that application
intervals remained on the project list. The recorder was corrected to open the
workflow hub, the ten application intervals were re-recorded, and the master
was rebuilt and re-verified. Superseded first/second-pass files remain only in
the ignored output area for recoverability and are not release artifacts.

The authoritative hashes and stream metadata are recorded in
`out/kg-statistics-mvp-demo/verification-report.json`.

## Reproduction

```powershell
npm run kg-demo:slides
npm run kg-demo:subtitles
npm run kg-demo:record
npm run kg-demo:render
npm run kg-demo:verify
```

The convenience wrapper is:

```powershell
npm run kg-demo:all
```

Required local tools are Node.js, Playwright from the KG checkout, FFmpeg /
FFprobe, the Codex presentation artifact runtime, and the Codex Python runtime
with ReportLab. OpenAI TTS is used through the repository’s existing speech
synthesis convention.

## Source changes

- Added deterministic slide/PPTX generation with per-slide PNG and layout
  evidence.
- Added bilingual subtitle timing and SRT/VTT generation.
- Added authenticated KG workflow proof plus real Playwright capture.
- Added narration/timeline/PDF/master rendering.
- Added stream, duration, subtitle, layout, artifact-size, and SHA-256
  verification.
- Added a single production wrapper and package scripts.
- Corrected Phase 7 public-catalog wording in narration and sequence sources.

## Approval stop

The branch remains a draft-review branch. It has not been merged. Review the
ignored master artifacts and this report before approving the PR.
