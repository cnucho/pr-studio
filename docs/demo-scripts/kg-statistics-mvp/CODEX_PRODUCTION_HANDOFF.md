# Codex Production Handoff — KG Statistics Production System MVP Demonstration

## Mission

Build a polished presentation-and-demo package in PR Studio for the completed **KG Statistics Production System internal MVP**.

The final experience must alternate:

```text
explanatory slide
→ short recorded product demonstration
→ explanatory slide
→ short recorded product demonstration
```

The voice-over is English. Produce two separate subtitle tracks:

- English captions;
- Kyrgyz subtitles.

Do not burn subtitles permanently into the master video. Deliver them as selectable `.srt` and `.vtt` tracks. A caption-burned review copy may be generated only as an additional QA artifact.

## Repositories

Presentation/video production repository:

```text
https://github.com/cnucho/pr-studio.git
branch: codex/kg-statistics-demo-production
```

Target application repository:

```text
https://github.com/cnucho/survey-workflow-orchestrator.git
branch: codex/kg-mvp-golden-path
```

The KG system source must use the latest remote HEAD of `codex/kg-mvp-golden-path`. At the time this handoff was prepared, the verified Phase 6 report/evidence HEAD was:

```text
dcdc406dcb004433438753285b2873974755ca49
```

Do not reset the KG system to an earlier implementation-only commit if a later report/evidence or corrective commit exists.

## Local directory discovery

First locate the two repositories. Common Windows locations are:

```text
PR Studio:
C:\git-app\pr-studio
C:\github_app\pr-studio

KG system:
C:\github_app\_worktrees\survey-workflow-kg-mvp
C:\git-app\survey-workflow-orchestrator
```

Use the real existing path. Do not create a duplicate repository if one is already available.

Then run:

```powershell
cd <PR_STUDIO_PATH>
git fetch --all --prune
git checkout codex/kg-statistics-demo-production
git pull --ff-only

git rev-parse HEAD
git status --short

cd <KG_SYSTEM_PATH>
git fetch --all --prune
git checkout codex/kg-mvp-golden-path
git pull --ff-only
git rev-parse HEAD
git rev-list --left-right --count HEAD...origin/codex/kg-mvp-golden-path
git status --short
```

Required before production:

- PR Studio working tree is clean;
- KG system local/remote comparison is `0 0`;
- KG system working tree is clean;
- the KG system is treated as the demonstration target, not modified casually for video convenience.

If a deterministic demo fixture is necessary, prefer a test-only seed or recording helper. Never weaken production authentication, authorization, workflow evidence, release integrity, or separation of duties.

## Product statement

The core message is:

> The KG Statistics Production System is an evidence-backed internal production platform. Authenticated staff move a statistical project from questionnaire design to a verified immutable release, while every approval, verification, artifact, and output remains traceable and integrity-checked.

Avoid presenting it as a generic dashboard or an AI mock-up.

## Audience

Primary:

- National Statistical Committee leadership;
- survey managers;
- statisticians;
- reviewers and publication officers;
- implementation partners.

Secondary:

- international development partners;
- technical evaluators;
- government digital-transformation teams.

The language must be understandable to non-developers while retaining exact technical terms where they matter.

## Final duration and format

Target master duration:

```text
24–30 minutes
```

Video:

```text
1920×1080
16:9
30 fps
H.264 video
AAC audio
```

Audio:

- English narration;
- calm, confident product-demo voice;
- moderate pace;
- no advertising-style exaggeration;
- short pauses after approvals, verification results, and release creation.

Preferred TTS configuration:

```powershell
$env:PR_STUDIO_TTS_PROVIDER_EN="openai"
$env:PR_STUDIO_TTS_VOICE_EN="cedar"
$env:PR_STUDIO_TTS_INSTRUCTIONS="Speak in clear international English as a calm official product-demonstration narrator. Use a measured pace, precise pronunciation, and restrained emphasis. Pause briefly after workflow decisions, verification results, and release creation. Do not sound promotional or dramatic."
```

Google English TTS is an acceptable fallback using the repository-supported configuration. Test one narration segment before rendering the full project.

## Required deliverables

Create a project area such as:

```text
docs/demo-scripts/kg-statistics-mvp/
video-projects/kg-statistics-mvp/
```

Deliver at least:

```text
out/kg-statistics-mvp-demo/kg-statistics-mvp-demo-master.mp4
out/kg-statistics-mvp-demo/kg-statistics-mvp-demo-en.srt
out/kg-statistics-mvp-demo/kg-statistics-mvp-demo-ky.srt
out/kg-statistics-mvp-demo/kg-statistics-mvp-demo-en.vtt
out/kg-statistics-mvp-demo/kg-statistics-mvp-demo-ky.vtt
out/kg-statistics-mvp-demo/kg-statistics-mvp-demo-slides.pdf
out/kg-statistics-mvp-demo/kg-statistics-mvp-demo-slides.pptx
out/kg-statistics-mvp-demo/production-manifest.json
out/kg-statistics-mvp-demo/verification-report.json
```

Generated media, audio, browser recordings, and credentials must remain ignored and must not be committed.

Commit source scripts, presentation specifications, narration text, subtitle source, and verification logic only.

## Presentation sequence

Use the detailed sequence in:

```text
docs/demo-scripts/kg-statistics-mvp/presentation-sequence.md
```

The intended pattern is:

1. title slide;
2. login/dashboard video;
3. workflow-and-evidence slide;
4. project creation/access video;
5. questionnaire-evidence slide;
6. questionnaire submission video;
7. separation-of-duties slide;
8. independent approval video;
9. collection-and-sync slide;
10. collection/synchronization video;
11. cleaning-and-analysis slide;
12. cleaning/report-production video;
13. verification slide;
14. independent verification video;
15. publication-governance slide;
16. publication approval/export-intent video;
17. immutable-output slide;
18. release-generation video;
19. integrity-and-recovery slide;
20. download/backup evidence video;
21. completion and non-claims slide.

Do not combine all operations into one long recording. Record small independent clips and assemble them between slide segments.

## Demonstration scenario

Use one coherent fictional but realistic project:

```text
Project title:
Household Living Conditions Survey 2026

Objective:
Measure household composition, employment, and access to basic services.

Publication title:
Household Living Conditions Indicators 2026
```

The scenario must not contain real respondent records or personal data.

Demonstrate these authenticated actors with separate sessions where required:

- survey manager;
- questionnaire designer;
- reviewer;
- collection operator or enumerator;
- statistician/analyst;
- independent verifier;
- publication approver;
- publisher.

Never expose credentials in the recording, slide deck, subtitle files, console, URL, or production manifest.

Use pre-authenticated browser storage/state prepared by a recording helper where necessary, or mask the password field during login. Do not display built-in development passwords.

## Product actions that must appear

The demonstration must visibly cover the complete evidence-backed workflow:

```text
submit_questionnaire
approve_questionnaire
prepare_collection
synchronize_responses
approve_cleaning
produce_analysis
record_verification
approve_publication
request_publication_export
publication/process
```

The video should show the human-readable UI labels, not raw action identifiers, except in an optional architecture callout.

## Recording rules

Follow `AGENTS.md` and the style of `scripts/record-live-demo.mjs`.

Every clip must show a real running application flow:

```text
orient viewer
→ perform action
→ show authoritative result
→ pause on the decision/evidence point
→ state why it matters
```

Required visual guidance:

- visible but unobtrusive cursor;
- click ripple;
- slow cursor movement;
- zoom or crop for exact evidence cards;
- brief highlight box for hashes, status, and current action;
- 1.5–3 second hold after accepted receipts and release creation;
- no frantic scrolling;
- no global 2× speed-up.

Avoid showing:

- browser developer tools;
- database rows;
- local filesystem paths;
- secrets;
- raw API JSON as the main demonstration;
- raw respondent rows;
- test fixture labels;
- stack traces;
- placeholder or sample-release fallback.

## Slide design

Create a restrained official-statistics visual language:

- white and very light neutral background;
- deep teal or dark green primary accent;
- dark navy text;
- one warm accent for warnings or blocked states;
- Noto Sans or another font with reliable Latin and Cyrillic/Kyrgyz coverage;
- large headings;
- minimal text;
- workflow diagrams and evidence chains instead of decorative imagery;
- 16:9 safe margins;
- no stock-photo collage.

Use no more than:

- one primary claim;
- three supporting points;
- one diagram or UI image

per explanatory slide.

Slide text is English. Kyrgyz appears in the subtitle track and in the short localization demonstration inside the product UI.

## Narration and subtitle policy

Narration source:

```text
docs/demo-scripts/kg-statistics-mvp/narration-en.md
```

Subtitle sources:

```text
docs/demo-scripts/kg-statistics-mvp/subtitles-en.md
docs/demo-scripts/kg-statistics-mvp/subtitles-ky.md
```

English captions:

- closely follow narration;
- preserve important technical terms;
- correct punctuation;
- maximum two lines;
- target 32–42 characters per line;
- minimum 1 second, maximum 7 seconds per cue.

Kyrgyz subtitles:

- translate meaning accurately;
- do not mechanically translate canonical statuses and formats;
- retain `PASSED`, `FAILED`, `INCOMPLETE`, `APPROVED`, `SHA-256`, `HTML`, `PDF`, `CSV`, and `XLSX`;
- use natural Kyrgyz around those terms;
- maximum two lines;
- do not combine English and Kyrgyz on screen at the same time.

Generate timestamps from actual rendered narration duration. The source documents provide cue boundaries, not permission to use inaccurate fixed timing.

## PR Studio implementation

Do not hardcode this project into the generic renderer in an unmaintainable way.

Add a project-specific configuration and scripts, for example:

```text
video-projects/kg-statistics-mvp/project.mjs
video-projects/kg-statistics-mvp/slides.mjs
video-projects/kg-statistics-mvp/timeline.mjs
scripts/record-kg-statistics-demo.mjs
scripts/render-kg-statistics-demo.mjs
scripts/build-kg-statistics-subtitles.mjs
scripts/verify-kg-statistics-demo.mjs
```

Add package scripts with stable names:

```json
{
  "demo:kg-statistics:record": "node scripts/record-kg-statistics-demo.mjs",
  "demo:kg-statistics:render": "node scripts/render-kg-statistics-demo.mjs",
  "demo:kg-statistics:subtitles": "node scripts/build-kg-statistics-subtitles.mjs",
  "demo:kg-statistics:verify": "node scripts/verify-kg-statistics-demo.mjs",
  "demo:kg-statistics:all": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/render-kg-statistics-demo.ps1"
}
```

The project renderer must support a mixed timeline containing:

- generated slide frames;
- recorded application clips;
- narration audio;
- optional music disabled by default;
- independent subtitle sidecars.

The master MP4 should have English narration and no burned-in subtitles.

## PowerPoint and PDF deck

Generate a standalone deck matching the slide segments in the video.

The PPTX must:

- be 16:9;
- use editable text and shapes where possible;
- include static representative screenshots only where useful;
- contain speaker notes with the slide narration;
- use the same slide numbering and titles as the video timeline;
- exclude embedded credentials and private evidence.

The PDF is a presentation copy of the same deck.

If adding a new PPTX dependency, use a maintained library and pin the version. Do not commit generated deck binaries unless repository policy explicitly permits it; otherwise keep generation scripts and place binaries in `out/`.

## Required clip acceptance tests

For each recorded clip verify:

- target application loaded;
- no login failure or unauthorized error;
- expected UI action completed;
- correct resulting state visible;
- no console error;
- no failed essential network request;
- no credential or token in URL/DOM/console;
- correct 1920×1080 resolution;
- duration inside planned range;
- narration refers to what is visibly on screen.

## Final artifact verification

Run:

```powershell
npm install
npm run lint
npm run build
npm run demo:kg-statistics:all
```

Use `ffprobe` to verify:

- master duration;
- 1920×1080 resolution;
- frame rate;
- H.264 video;
- AAC audio;
- nonzero file size.

Also verify:

- English SRT parses and covers the full narration;
- Kyrgyz SRT parses and covers the same cue sequence;
- English and Kyrgyz cue counts match unless a documented language-specific split is required;
- no overlapping cues;
- no cue extends beyond master duration;
- slide titles match the production sequence;
- all recorded files are present;
- no generated media or credentials are staged in Git;
- at least five sampled frames look correct;
- one complete watch-through confirms speech-screen alignment.

Create:

```text
out/kg-statistics-mvp-demo/verification-report.json
```

with checks, measured durations, hashes, and result.

## Source-control closure

Work only on:

```text
codex/kg-statistics-demo-production
```

Recommended commit structure:

1. presentation specifications and scripts;
2. recording/render implementation;
3. verification corrections;
4. final production report.

Create:

```text
docs/demo-scripts/kg-statistics-mvp/PRODUCTION_REPORT.md
```

The report must state:

- PR Studio starting commit;
- KG system source commit;
- exact scripts and configuration added;
- English voice provider and voice;
- slide count;
- clip count;
- master duration;
- subtitle cue counts;
- final artifact paths and SHA-256 values;
- lint/build results;
- recording and render verification;
- known limitations;
- Git status and remote comparison.

Do not merge to `main` until the user has reviewed the rendered master or a low-resolution review copy.

## Stop condition

Stop after the complete presentation package is rendered, verified, documented, and pushed to `codex/kg-statistics-demo-production`.

Do not begin public-catalog, Phase 7, or unrelated PR Studio feature work.
