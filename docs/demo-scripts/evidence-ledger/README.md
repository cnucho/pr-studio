# Evidence Ledger Studio: two-video production plan

## Audience and objective

Researchers and policy analysts who already use general AI chat for discovery, but need to know whether a cited source actually supports a claim. The first video introduces the problem and product. The second is a separate, reproducible usage demonstration.

## Production rules

- Narration: Korean Google Cloud Text-to-Speech, `ko-KR-Chirp3-HD-Kore`, rate 0.94. Do not fall back to another provider.
- Every beat has one visible point, one short spoken sentence, and one concise on-screen subtitle. Export both a burned-in MP4 and a UTF-8 SRT; keep the full spoken transcript separately.
- Read numbers slowly and pause after result screens. The subtitle summarizes the point rather than transcribing every word.
- The tutorial uses a real Crossref request executed by Evidence Ledger's `SearchService`; screen captures must come from its local Web UI. Label the demonstration as a limited academic-metadata search, not a complete policy-literature review.
- Search results are metadata, not acquired or verified full text. Do not present a returned title or DOI as proof of any substantive claim.
- The 2023 citation-verifiability study assessed four then-current generative search engines. Its percentages are not a measurement of today's ChatGPT, nor of Evidence Ledger's accuracy. Do not state a time-saving percentage until a matched-task experiment has been run.
- The Web UI displays the search ledger; its search plan and execution are performed by the connected MCP/backend. Do not imply the Web screen has a search-submit button.
- Generated media and captures belong in ignored `out/evidence-ledger/`, not Git. Commit source scripts and production notes only.

## Source and measurement

- Liu, Zhang, and Liang (2023), *Evaluating Verifiability in Generative Search Engines*, Findings of EMNLP. In their evaluated systems, 51.5% of generated sentences were fully supported and 74.5% of citations supported their associated sentence. https://aclanthology.org/2023.findings-emnlp.467/
- Product claims and demo limitations: `D:\Git\evidence-ledger-studio\docs\PRODUCT_INTRO_AI_SEARCH_EVIDENCE_20261106.md` and current Evidence Ledger code.
- Follow-up comparison: identical task, source set, and reviewer rubric; measure source-location time, claim-support decision time, unsupported claims caught, and unresolved cases. Record both groups' run IDs and reviewer decisions. This video does not report those results.

## Sequence

1. Review `intro.json` and `tutorial.json` for spoken beats, visible scenes, and subtitle wording.
2. Run `capture-live-search.mjs` from the Evidence Ledger checkout. Keep its receipt with the captures. A failed public request is a disclosed result, not something to replace with fixture data.
3. Test one Google TTS clip, then render with `render.py`. Rendering must fail if Google synthesis fails.
4. Inspect subtitle timing, sampled frames, actual audio, MP4 streams, and the search receipt. Revise any misleading scene or unreadable subtitle.

```powershell
Set-Location D:\Git\evidence-ledger-studio
node --import tsx D:\Git\pr-studio\docs\demo-scripts\evidence-ledger\capture-live-search.mjs
Set-Location D:\Git\pr-studio
python docs\demo-scripts\evidence-ledger\render.py intro --smoke
python docs\demo-scripts\evidence-ledger\render.py both
```

The live search ranking can change. The capture deliberately stops if its selected irrelevant example disappears; review the new results and update the script rather than fabricating an exclusion. `initialReconciliation` in the receipt is the run-end count before the recorded human exclusion. `searchTraceSha256` hashes the selected execution trace, not the SQLite database file.

## Deliverables

- `out/evidence-ledger/01-introduction.mp4`, `.srt`, and transcript.
- `out/evidence-ledger/02-usage-demo.mp4`, `.srt`, and transcript.
- `out/evidence-ledger/live-search-receipt.json` and UI capture images.

## Publication (2026-11-07)

- Part 1, introduction: https://youtu.be/NwXvDYLMIpg (unlisted, 1:01).
- Part 2, usage demo: https://youtu.be/FZNyzxsl9JE (unlisted, 1:25).
- Both were rendered from this PR Studio package with Google TTS and uploaded through the MethodIQ YouTube Studio browser; PR Studio does not currently have an in-app YouTube uploader. Korean SRT captions were uploaded separately and published.
- CI Portal demo entries: https://ci.methodiq.tools/demos#evidence-ledger-introduction and https://ci.methodiq.tools/demos#evidence-ledger-usage-demo.
- The Crossref run was partial metadata discovery (five hits, four unique, one duplicate); one irrelevant result was excluded. It does not establish complete coverage or verify that the source supports a substantive claim. The cited 2023 study is not a measurement of today's ChatGPT or Evidence Ledger.
- Rendered MP4s and search receipts remain in ignored `out/evidence-ledger/`; do not commit them.
