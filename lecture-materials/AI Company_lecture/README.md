# AI Company_lecture

This folder is the git-tracked index for the AI company lecture demo materials.

## Lecture Theme

Working title: `AI Company_lecture`

Core question:

> Why do people still avoid using an agent app even when its features work well?

Core answer:

- Users want solved outcomes, not many methodological choices.
- Full automation creates anxiety when users cannot verify the result.
- The next step is not just better execution, but agent-level judgment about which layer should be repaired: code, rule, model/theory, or the question itself.
- Guardrails are necessary, but the lecture should distinguish guardrails from correction-level judgment.
- Coherence/validity checks are the bridge between impressive AI output and usable real-world work.

## Git Materials

These files are small, text-based, and should remain in git:

- `lecture-materials/AI Company_lecture/README.md`
- `lecture-materials/AI Company_lecture/demo-script-ko.md`
- `lecture-materials/AI Company_lecture/AI-Company-lecture-full-slides.md`
- `lecture-materials/AI Company_lecture/demo-index-ko.md`
- `lecture-materials/AI Company_lecture/demo-narration/02-pr-studio-press-release.txt`
- `lecture-materials/AI Company_lecture/slide-outline-ko.md`
- `lecture-materials/AI Company_lecture/blog-column-ko.md`
- `lecture-materials/AI Company_lecture/article-agent-era-marketing-planners-ko.md`
- `lecture-materials/AI Company_lecture/final-handoff-ko.md`
- `lecture-materials/AI Company_lecture/materials-manifest.json`
- `docs/demo-scripts/correction-level-agent/demo-script-ko.md`
- `scripts/render-correction-level-agent-demo.mjs`

## Dropbox Materials

Large generated outputs are stored outside git:

```text
C:\Users\ciadmin\Dropbox\gitwork_data\AI Company_lecture
```

Expected Dropbox contents:

- `slides-md/AI-Company-lecture-full-slides.md`
- `slides-md/demo-index-ko.md`
- `column/article-agent-era-marketing-planners-ko.md`
- `git_materials/final-handoff-ko.md`
- `demos/demo-01-text-analysis-repair.mp4`
- `demos/demo-02-pr-studio-press-release.mp4`
- `demos/demo-03-pr-studio-feedback-repair.mp4`
- `demos/demo-04-validation-server-ui.mp4`
- `demos/demo-05-validation-result.mp4`
- `screens/assets/`
- `slides/AI Company_lecture_deck.pptx`
- `slides/AI Company_lecture_deck_contact_sheet.png`
- `slides/build-ai-company-lecture-deck.mjs`
- `slides/preview/`
- `column/blog-column-ko.md`
- `video/correction-level-agent-demo.mp4`
- `metadata/render-report.json`
- `metadata/sample-frame.png`
- `screens/raw/`
- `screens/slides/`
- `audio/`
- `narration/`
- `clips/`
- `git_materials/`

## Regenerate Video

Required local apps:

- Text Analysis Copilot: `http://127.0.0.1:5173/?view=reflection&demo=repair-hard`
- PR Studio: `http://127.0.0.1:3026/?tab=performance`
- Insight Validation Server: `http://127.0.0.1:4020`

Command:

```powershell
npm run render:correction-demo
```

Output:

```text
C:\git-app\pr-studio\out\correction-level-agent-demo\correction-level-agent-demo.mp4
```

## Current Render

- Duration: `132.604333` seconds
- Resolution: `1920x1080`
- Audio: Korean narration generated through Google TTS
- Validation demo case: `cell_sum_001`
- Validation result: `do_not_release`
- Blocking evidence: `BASE_N_MISMATCH`, `CELL_SUM_MISMATCH`

## Current Lecture Deck

- Primary Markdown deck: `C:\Users\ciadmin\Dropbox\gitwork_data\AI Company_lecture\slides-md\AI-Company-lecture-full-slides.md`
- Demo index: `C:\Users\ciadmin\Dropbox\gitwork_data\AI Company_lecture\slides-md\demo-index-ko.md`
- Demo clips: `C:\Users\ciadmin\Dropbox\gitwork_data\AI Company_lecture\demos`
- Deck: `C:\Users\ciadmin\Dropbox\gitwork_data\AI Company_lecture\slides\AI Company_lecture_deck.pptx`
- Contact sheet: `C:\Users\ciadmin\Dropbox\gitwork_data\AI Company_lecture\slides\AI Company_lecture_deck_contact_sheet.png`
- Preview PNGs: `C:\Users\ciadmin\Dropbox\gitwork_data\AI Company_lecture\slides\preview`
- Build script backup: `C:\Users\ciadmin\Dropbox\gitwork_data\AI Company_lecture\slides\build-ai-company-lecture-deck.mjs`
- Markdown structure: 50+ slides, Korean, professional-user audience
- PPTX structure: 10-slide compact deck retained as a short summary only
- Main demos: PR Studio press release, PR Studio YouTube, PR Studio feedback repair, Text Analysis Copilot repair-level example

## Column Draft

- Git source: `lecture-materials/AI Company_lecture/blog-column-ko.md`
- Dropbox copy: `C:\Users\ciadmin\Dropbox\gitwork_data\AI Company_lecture\column\blog-column-ko.md`
- Audience: professional AI users who are not AI specialists
- Message: AI agents are powerful, but only well-designed agents become useful work systems.

## Marketing Planner Article Draft

- Git source: `lecture-materials/AI Company_lecture/article-agent-era-marketing-planners-ko.md`
- Dropbox copy: `C:\Users\ciadmin\Dropbox\gitwork_data\AI Company_lecture\column\article-agent-era-marketing-planners-ko.md`
- Audience: marketing and planning professionals who use survey data
- Message: the AI-agent era changes work from asking better prompts to delegating, validating, and deciding the proper level of correction.

## Final Handoff

- Git source: `lecture-materials/AI Company_lecture/final-handoff-ko.md`
- Dropbox copy: `C:\Users\ciadmin\Dropbox\gitwork_data\AI Company_lecture\git_materials\final-handoff-ko.md`
- Purpose: summarizes the lecture/article/demo/channel strategy and identifies what belongs in git versus Dropbox.
