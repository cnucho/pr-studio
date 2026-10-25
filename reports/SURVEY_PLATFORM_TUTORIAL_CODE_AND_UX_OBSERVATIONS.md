# Survey Platform tutorial — code and UX observations

Date: 2026-08-01
Status: product fixes deployed; overview re-recording in progress

## Recording policy

This file records defects and improvement opportunities observed while producing the six tutorial videos. Video production and application correction are deliberately separated: first preserve reproducible visual evidence, then prioritize and fix the source applications after all chapters are rendered and reviewed.

## Observations

### OBS-001 — authoring screen shows mixed language state

- Surface: Question Input Workbench
- Evidence: the global language selector displays English while the preview language control is set to RU; the browser file control is localized by the Windows environment.
- Viewer impact: a first-time user may interpret the Russian preview as an unintended global-language mismatch.
- Recommended follow-up: label the preview language control explicitly as independent from the workbench UI language, or synchronize the initial state when a project is loaded.
- Fix status: fixed in Survey Workflow Orchestrator commit `6c35799`; live read-back confirmed UI and preview languages both initialize to English in tutorial mode.

### OBS-002 — authoring workspace is too dense for a first-time 1080p walkthrough

- Surface: Question Input Workbench
- Evidence: library, sheet, form, preview, relation graph, checks, and contract panels are visible simultaneously; lower content is partially outside the first viewport.
- Viewer impact: important controls compete for attention and require deliberate zoom/focus in tutorials.
- Recommended follow-up: add a tutorial/focus mode or collapsible secondary panels, preserving the existing full workspace for expert users.
- Fix status: fixed in `6c35799`; `?tutorial=` now enables a three-column focus layout and hides the secondary form panel without changing the expert workspace.

### OBS-003 — tutorial stage handoff is explained in guidance but not presented as a prominent workflow action

- Surface: Question Input Workbench and downstream workbenches
- Evidence: guidance correctly says not to publish from authoring and to export a draft, but the next validated stage is not a visually dominant action.
- Viewer impact: new users may save/export without understanding where to continue.
- Recommended follow-up: add explicit “Continue to validation/distribution/cleaning/analysis/reporting” handoff actions that preserve the generated contract.
- Fix status: partially fixed in `6c35799`; authoring now exposes a prominent `Continue to validation` action. Contract-preserving handoffs across all downstream workbenches remain a separate enhancement.

### OBS-004 — distribution preview opens without a usable respondent token

- Surface: Distribution Workbench respondent preview.
- Evidence: after loading the sample runtime package and building the distribution package, the preview panel displays `respondent token is missing` and explains that a valid link requires `/?token=...`.
- Viewer impact: the workbench appears to have built a package successfully, but it does not prove that a respondent can actually enter the survey.
- Recommended follow-up: have the sample/build flow mint or attach a short-lived preview token, or disable the preview action until a valid tokenized URL exists. The UI should distinguish package generation success from respondent-access success.
- Fix status: fixed in `6c35799`; preview packages are copied to same-origin local storage as a fallback and live production read-back confirmed the respondent survey renders inside the iframe.

### OBS-005 — single-chapter renders overwrite the generated render manifest

- Surface: PR Studio `record-survey-platform-tutorial.mjs`.
- Evidence: sequential single-chapter invocations left `render-manifest.json` containing only the final chapter.
- Viewer impact: the videos are intact, but machine-readable production evidence is incomplete.
- Correction: merge results by chapter ID when updating the generated manifest.
- Fix status: corrected after all six chapter videos were rendered.

## Post-production correction procedure

1. Complete and watch all six tutorial chapters.
2. Add further observations with chapter/time evidence.
3. Separate PR Studio recorder defects from Survey Workflow Orchestrator product defects.
4. Prioritize by user-blocking impact, not visual preference alone.
5. Fix each target repository independently with focused tests and live read-back.

## Re-recording result

- The six existing chapters are now classified as the listening-oriented overview series, not the detailed training course.
- All six chapters were re-recorded from the corrected production deployment at 1920×1080 with Google Korean narration and burned-in Korean key subtitles.
- The first all-chapter render exceeded the command execution window after chapters 1–5. Chapter 6 was safely resumed as a single-chapter render; the recorder's manifest merge preserved the earlier results.
- The new combined overview is `survey-platform-overview-complete-ko.mp4` (390.4 seconds).

## Detailed-course production rule

Each independent lesson must be follow-along training rather than passive narration. Every lesson therefore needs: prerequisites, a safe tutorial fixture, exact user actions, pause-and-try checkpoints, a visible success criterion, and a reset/retry path. Any product defect that prevents those steps must be fixed and deployed before that lesson is recorded.

## Independent review gate

The separate Codex review task `Survey 튜토리얼 독립 검토` checked the live production workbenches and found three production blockers for follow-along lessons:

1. The production root URL was a respondent-token error page rather than a course entry point.
2. App samples use different projects and variables, so they must be taught as independent exercises rather than a single continuous sample.
3. The overview recorder moves among labels but does not demonstrate the actual user actions required for a hands-on course.

The first blocker was fixed in Survey Workflow Orchestrator commit `183bcb7`: the production root now serves a six-app tutorial hub with direct links, safety guidance, and an explicit independent-sample statement. The detailed course uses a separate action-driven recorder and curriculum; it does not reuse the overview recorder as proof of hands-on training.

### Production pipeline findings from the first hands-on lesson

- Google TTS rejected the long six-minute Korean script because a single synthesis request exceeded 5,000 bytes. `synthesize-speech.mjs` now splits long scripts at sentence boundaries, synthesizes each chunk with the same Google voice, and concatenates the WAV parts before duration normalization.
- The Question Input tutorial overlay intercepted the recorder's first real click. The hands-on recorder now leaves the overlay visible during orientation, removes it before automated practice actions, and fails loudly if an action target is missing or blocked.
- Independent review rejected the first A1/A2 render because all actions ran before the narration timeline; A2 moved to validation in the first 40 seconds and showed the wrong screen for most of the lesson. Commit `49b7391` replaced that behavior with timed actions, per-action assertions, start/action/final evidence frames, source-video trimming, and explicit subtitle time windows. Both authoring lessons were re-rendered after the correction.
