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
- `lecture-materials/AI Company_lecture/materials-manifest.json`
- `docs/demo-scripts/correction-level-agent/demo-script-ko.md`
- `scripts/render-correction-level-agent-demo.mjs`

## Dropbox Materials

Large generated outputs are stored outside git:

```text
C:\Users\ciadmin\Dropbox\gitwork_data\AI Company_lecture
```

Expected Dropbox contents:

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
