# Finance researcher and customer guides — 2026-11-02

## Deliverables
- `guides.json`: Korean researcher/customer manual source; four pages per role.
- `build_guides.py`: reproducible PDF and matching readable HTML generator.
- `demo.json`: ten-scene narration/caption manifest for the existing PR Studio `finance-insight/render.py`.
- Published manuals belong in CI Portal's versioned `releases/finance-guides/2026-11-02`.
- Rendered MP4, WAV, clips and raw captures remain outside Git in ignored output folders.

## Evidence and limits
The demo uses actual production UI screenshots and real GPT/MCP execution, with synthetic data. It is an edited screen-capture tutorial, not continuous unedited recording. Waiting is omitted; the two-window scene combines genuine captures. Narration uses the existing Windows System.Speech fallback; no key or authentication setup was changed.

Private conversation and report identifiers are retained in local production notes, not published.

Researcher prompt: 이 합성자료 보고서의 구성을 재사용 템플릿으로 등록하고, “사용설명서 시연용 발간본”으로 확정해 줘.

Customer first supplied the publication link; after selecting the finance-AI evidence table, sent: 이 발간본에서 금융 AI 이용률을 연령별로 비교해서 결과 모음에 담고, 개인 요약보고서를 Word·PPT 포함 ZIP으로 저장해 줘.

No internal tool sequence or report prose was supplied to GPT. The demo uses the existing verification account, not a newly registered customer company. Actual customer use requires existing user/publication grants. No new unrestricted analysis/code-generation support is claimed. Reusable templates retain structure/questions, not old conclusions. Coverage appendices are documented for HTML/JSON only.

## Artifact checks
- Received actual personal-report ZIP: 264241 bytes; SHA-256 `7b30a6d485aba878b0255b1c8807701caa1914ad8b89e2cae714314e10a8d4a6`; matches saved result. ZIP CRC check passes, containing HTML, JSON, DOCX and PPTX.
- Manuals: two four-page PDFs; all eight pages rendered and visually checked for Korean text, screenshot layout and overflow.
- Video: 256.921406 seconds, 1920×1080 H.264, AAC stereo/48 kHz, 7990846 bytes; SHA-256 `844b700e88b1c740472fc4c8bdc0b82a9ba71c30e569ade6961f5a0ba5a52af6`.
- Full video decode succeeded. Encoded scene frames and narration durations checked; each scene holds the complete narration plus 1.3 seconds.
- Portal focused tests cover readable guides, PDF content/attachment/HEAD, unknown and traversal paths, method restriction and unchanged protected API denial.

## Rebuild
Run `build_guides.py --source guides.json --captures <actual-capture-folder> --out <manual-output> --font <Korean-font.ttf> --bold-font <Korean-bold.ttf>` using a Python environment with ReportLab and Pillow. Set the published `youtubeId` in `guides.json` before final generation.

Run `../finance-insight/render.py --manifest demo.json --capture-root <actual-capture-folder> --out <ignored-video-output>`. The renderer reuses PR Studio narration and ffmpeg; it does not generate app results.
## Publication
- YouTube: https://www.youtube.com/watch?v=PFsMjLDYJPA — MethodIQ, unlisted; upload Terms approved at submission.
- Portal: https://ci.methodiq.tools/demos
- PR Studio lint/build passed; full encoded decode and ten-scene visual review passed.
