# Direction and Recording Plan — English Survey Platform Videos

## Production Package

Create two public-facing English videos from the actual running application.

1. **Product Overview**  
   Target duration: 5–6 minutes.

2. **Guided Tutorial**  
   Target duration: 10–12 minutes.

The purpose is to show what the application can do, how a user works with it, its present scope, and which complementary systems are required for full national operations. The videos must not disclose the proprietary implementation method.

---

# 1. Production Principle

## Show

- actual application screens;
- actual clicks and state changes;
- template selection;
- project creation;
- review findings and approval gating;
- technical-test running and passed states;
- visible technical-test categories;
- response preview with synthetic answers;
- current product scope;
- complementary operational systems;
- agency-controlled deployment as a product direction.

## Hide

- source code;
- browser developer tools;
- repository names, branches, commits, or local paths;
- credentials, tokens, API keys, environment variables, or service URLs not intended for publication;
- full schemas or internal JSON;
- private validation-rule logic;
- hidden prompts or AI orchestration;
- scoring weights, thresholds, fallback logic, or repair strategy;
- signing internals;
- acceptance harnesses and corruption fixtures;
- reusable cross-country platform-factory tools;
- real respondent, sample, interviewer, or official statistical data.

## Public Product Language

Use phrases such as:

- `guided survey-production workflow`;
- `visible review and approval process`;
- `pre-collection technical testing`;
- `tested response preview`;
- `agency-controlled deployment`;
- `survey-production core`;
- `complementary national systems`.

Do not use phrases such as:

- `our secret architecture`;
- `proprietary algorithm`;
- `automatic proof engine`;
- `unbreakable security`;
- `fully production-ready national platform`;
- `complete fieldwork system`;
- `official final template` unless formally approved.

---

# 2. Recording Environment

## Preferred Environment

A stable local deployment is sufficient for video production. Railway is optional and is useful only when a public demonstration URL is also required.

The recording target may be:

```text
http://127.0.0.1:<port>
```

or an approved synthetic-data demonstration URL.

## Required Conditions

- clean synthetic dataset;
- no real users or respondents;
- stable application build;
- browser viewport 1920×1080;
- browser zoom 100 percent;
- system notifications disabled;
- bookmarks bar hidden;
- no password manager pop-ups;
- no developer tools;
- no visible terminal or file explorer in the final edit;
- no machine-specific paths;
- deterministic project-reset procedure.

## Browser

- Chromium or Google Chrome;
- dark extensions disabled;
- default font rendering;
- service workers blocked during controlled recording when they may retain stale state;
- cursor visible, but not enlarged excessively.

## Synthetic Recording State

Before every recording:

1. reset the demo workspace;
2. confirm project list is empty or contains only clearly synthetic projects;
3. confirm the template catalog loads;
4. confirm review and technical-test endpoints respond;
5. confirm the response preview loads;
6. confirm no production submission will be created;
7. confirm no actual institution name or logo appears without permission.

---

# 3. Visual Style

## Overall Look

- restrained institutional presentation;
- application remains the primary visual;
- overlays support orientation but do not replace the product;
- use clean typography and neutral callouts;
- avoid animated marketing graphics during dense UI interaction.

## Framing

Use three shot types.

### A. Full Application View

Use when:

- introducing the application;
- showing project context;
- moving between workflow stages;
- summarizing scope.

### B. Detail Zoom

Use when:

- highlighting the next-action card;
- showing an open blocker;
- showing a disabled approval button;
- showing technical-test results;
- showing the response-preview isolation message.

Recommended zoom: 115–135 percent crop, not a full-screen magnification.

### C. State-Change Hold

After each important transition, hold the resulting screen for 1.5–2.5 seconds before continuing.

Important state holds:

- template catalog ready;
- project created;
- review opened;
- blocker count becomes one;
- approval disabled;
- blocker resolved;
- review approved;
- technical test running;
- technical test passed;
- response preview ready;
- answer validation shown;
- answer accepted.

## Cursor Direction

- Move the cursor before the narration names a control.
- Pause over the target for approximately 0.5 seconds before clicking.
- Avoid circular cursor movement.
- Keep the cursor away from identifiers, technical-detail drawers, or browser chrome.
- Do not click faster than a viewer can follow.

## Highlight Treatment

Preferred order:

1. cursor approaches target;
2. subtle highlight box appears;
3. narration explains the control;
4. user clicks;
5. highlight disappears;
6. resulting state receives a short hold.

Highlight style:

- 2–3 pixel border;
- soft corner radius;
- no flashing;
- maximum one primary highlight at a time.

---

# 4. English Callouts and Subtitles

## Callouts

Callouts explain Russian or Kyrgyz UI states without claiming that the UI itself is English.

Examples:

- `Start a new survey`
- `Choose a survey template`
- `Open the questionnaire review`
- `Blocking issue: approval unavailable`
- `Run the pre-collection technical test`
- `Open the tested response preview`

Position:

- upper left or upper right;
- never cover the active control;
- maintain a 60-pixel screen margin.

## Subtitles

- language: English;
- maximum two lines;
- concise meaning captions, not full transcripts;
- lower safe area;
- semi-transparent background or subtle outline;
- minimum display duration: 1.2 seconds;
- do not split a short sentence unnecessarily.

Deliver both:

- burned-in captioned MP4;
- clean MP4 plus separate SRT.

---

# 5. Narration Direction

## Voice

Recommended default:

```text
Provider: OpenAI TTS
Voice: cedar
Language: English
```

Alternative:

```text
Google Cloud TTS English Chirp 3 HD
```

## Delivery

- calm;
- precise;
- practical;
- institutional;
- confident without sounding promotional;
- slightly slower than a commercial advertisement.

## Pacing

- approximately 135–150 spoken words per minute;
- add 0.4–0.8 second pause after each major sentence;
- add 1.0–1.5 second pause after a major UI state change;
- do not speed narration to fit an overloaded scene;
- split dense scenes into multiple beats instead.

## Pronunciation

- Do not read every Russian or Kyrgyz label aloud.
- Explain the action in English.
- Read product names consistently.
- Use `national statistical office`, not an unexplained abbreviation on first mention.

---

# 6. Product Overview Shot Plan

## Clip O1 — Opening Workspace

- Duration: 8–12 seconds.
- Full application home screen.
- Title fade-in.
- No interaction during first two seconds.

## Clip O2 — Template Selection

- Open template catalog.
- Highlight household template.
- Create project.
- Capture loading and completed state.

## Clip O3 — Project Orientation

- Show workflow progress.
- Zoom to next action.
- Move across current status and recent activity.

## Clip O4 — Review Gate

- Open review.
- Add synthetic blocker.
- Show approval unavailable.
- Resolve blocker.
- Approve review.

## Clip O5 — Technical Test

- Open technical-test screen.
- Show ready, running, and passed states.
- Scroll through representative check categories.

## Clip O6 — Response Preview

- Open preview.
- Show preview-isolation message.
- Enter synthetic name and age.
- Show visible validation and accepted state.

## Clip O7 — Scope Summary

- Return to project workspace.
- Overlay current-core functions.

## Clip O8 — Complementary Systems

- Dim application slightly.
- Reveal complementary systems in two groups.

## Clip O9 — Closing

- Clean application background.
- Closing title and agency-controlled deployment statement.

---

# 7. Guided Tutorial Shot Plan

## Clip T1 — Home and New Survey

Show the starting state and click New Survey.

## Clip T2 — Template Catalog

Wait for ready state and select the household template.

## Clip T3 — Project Created

Show project title, workflow status, and next action.

## Clip T4 — Review Opened

Open the review page and start the cycle.

## Clip T5 — Blocker Added

Add the synthetic blocking comment and show blocker count one.

## Clip T6 — Approval Gate

Hold on disabled approval.

## Clip T7 — Blocker Resolved

Resolve the finding and show count zero.

## Clip T8 — Review Approved

Approve and hold on approved state.

## Clip T9 — Technical Test Ready

Open the technical-test page.

## Clip T10 — Test Running

Click Run Test and hold on running state.

## Clip T11 — Test Passed

Show passed result and representative check list.

## Clip T12 — Response Preview

Open preview and show isolation notice.

## Clip T13 — Synthetic Answers

Enter synthetic values and show validation behavior.

## Clip T14 — Scope and Complementary Systems

Return to workspace and add restrained English overlays.

## Clip T15 — Closing

End on a clean product screen.

---

# 8. Editing Plan

## Timeline Structure

Each beat should contain:

```text
screen state
user action
narration sentence
subtitle
highlight instruction
hold duration
```

Do not create one long narration clip over a continuous unstructured screen recording.

## Transitions

- simple cut for user actions;
- 6–10 frame dissolve between major sections;
- no spinning, flipping, or template-style transitions;
- maintain application continuity.

## Audio

- narration peak around -3 dBFS;
- integrated loudness target approximately -16 LUFS for YouTube stereo;
- no clipping;
- optional background bed at least 18–24 dB below narration;
- remove background music during technical-test explanation if it affects clarity.

## Color and Text

- use neutral white or light-gray callout panels;
- high contrast;
- avoid matching a government logo or identity without permission;
- do not use red except for a visible blocking state already present in the product.

---

# 9. File and Folder Layout

Use the following working folders in PR-Studio:

```text
out/survey-workflow-platform/overview-en/
  raw/
  clips/
  audio/
  captions/
  frames/
  survey-platform-overview-en-clean.mp4
  survey-platform-overview-en-captioned.mp4
  survey-platform-overview-en.srt
  survey-platform-overview-en-transcript.txt
  youtube-metadata.md
  render-report.json

out/survey-workflow-platform/tutorial-en/
  raw/
  clips/
  audio/
  captions/
  frames/
  survey-platform-tutorial-en-clean.mp4
  survey-platform-tutorial-en-captioned.mp4
  survey-platform-tutorial-en.srt
  survey-platform-tutorial-en-transcript.txt
  youtube-metadata.md
  render-report.json
```

Generated media must remain ignored and must not be committed to Git.

---

# 10. YouTube Thumbnail Direction

## Overview Thumbnail

Text:

```text
Survey Production
One Guided Workspace
```

Visual:

- project workspace on left;
- technical-test passed screen on right;
- no more than two interface panels;
- no code, metrics dashboard, or architecture diagram.

## Tutorial Thumbnail

Text:

```text
Template to Tested Survey
Step by Step
```

Visual:

- template card;
- review-approved marker;
- technical-test passed marker.

Recommended thumbnail size:

```text
1280 × 720
```

---

# 11. Pre-Recording Checklist

- [ ] Synthetic environment reset.
- [ ] No real projects or respondent data.
- [ ] Browser notifications disabled.
- [ ] Password manager disabled.
- [ ] Bookmarks bar hidden.
- [ ] No developer tools.
- [ ] No repository, branch, or local path visible.
- [ ] Template catalog ready.
- [ ] Review workflow confirmed.
- [ ] Technical test confirmed.
- [ ] Response preview confirmed.
- [ ] No production submission generated.
- [ ] Screen resolution 1920×1080.
- [ ] Cursor movement rehearsed.
- [ ] English narration script approved.
- [ ] Disclosure checklist reviewed.

---

# 12. Final Quality-Control Checklist

## Technical

- [ ] MP4 decodes successfully.
- [ ] Resolution is 1920×1080.
- [ ] Audio sample rate is valid.
- [ ] Duration matches the intended range.
- [ ] No black frames or corrupted segments.
- [ ] SRT timestamps are valid.
- [ ] Captioned and clean MP4 versions exist.

## Content

- [ ] Actual application interaction is visible.
- [ ] Narration matches the screen state.
- [ ] Synthetic data only.
- [ ] No proprietary implementation method disclosed.
- [ ] No credentials or internal identifiers visible.
- [ ] No unsupported product claim.
- [ ] Current scope accurately stated.
- [ ] Complementary systems accurately described.
- [ ] UI language is not misrepresented as English.

## Watch-Through

Complete at least one full watch-through and verify:

- speech-screen alignment;
- cursor clarity;
- subtitle readability;
- sufficient hold time after transitions;
- no accidental disclosure in a single frame;
- no real names or system notifications;
- closing message and YouTube description are consistent.