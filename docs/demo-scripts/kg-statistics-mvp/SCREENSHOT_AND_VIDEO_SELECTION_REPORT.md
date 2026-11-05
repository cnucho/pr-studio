# KG Statistics Production System — NSC Briefing Production Report

## Purpose

Prepare an English, screen-led explanation for the Kyrgyz Republic National
Statistical Committee. The narrative follows the real survey-production
sequence first, then explains ease of use, internal help, updates, fault
response, and SaaS support.

## Source baseline

- Application repository: `cnucho/survey-workflow-orchestrator`
- Application branch: `codex/kg-mvp-internal-help`
- Application commit: `3bc7f25`
- Production repository: `cnucho/pr-studio`
- Production branch: `codex/kg-statistics-demo-production`
- Scenario: Household Living Conditions Survey 2026
- Data boundary: fictional aggregate demonstration data

## Screenshot funnel

The candidate set was captured from a new authenticated end-to-end workflow.
The process did not reuse the earlier project-hub scroll variants.

- Operator-workflow candidates: **38**
- Questionnaire-designer candidates: **15**
- Detailed-feature candidates: **19**
- Total screenshot candidates: **72**
- Selected screenshots: **36**
- Candidate-to-selection ratio: **2.00×**
- Application language: English
- Capture size: 1600×1000
- Credentials or tokens visible: no
- Respondent rows visible: no

The selected set now covers:

1. direct spreadsheet-style questionnaire input;
2. selected-question form editing;
3. a real ten-question household survey reopened from a saved project;
4. Survey Bank and supported import controls;
5. KG household modules, code lists, and rule templates;
6. response conditions and routing;
7. questionnaire flow-map review;
8. sign-in help;
9. project starting state and access;
10. governed questionnaire submission;
11. questionnaire approval receipt;
12. collection preparation;
13. synchronization receipt;
14. cleaning receipt;
15. analysis input and receipt;
16. independent verification receipt;
17. publication approval receipt;
18. immutable official release inventory;
19. ten-stage in-application guide;
20. phone, tablet, desktop, and print profiles;
21. English, Russian, and Kyrgyz interfaces;
22. mobile response controls and offline batch export;
23. explicit cleaning criteria, profile flags, and cleaning receipt;
24. table strategy, crosstab setup, preview tables, and table/chart package;
25. verified report inputs, evidence-supported summaries, and report package.

## English briefing

The 34-slide briefing is an expanded presenter-selectable master. It is
organized for the audience rather than the software architecture. A presenter
may omit detail slides for a shorter meeting without editing the source:

1. briefing purpose;
2. complete survey-stage coverage;
3. controlled project and access;
4. direct questionnaire input;
5. reopen a real existing household questionnaire;
6. Survey Bank and reusable modules;
7. response conditions and routing;
8. questionnaire flow review;
9. governed questionnaire submission;
10. independent questionnaire approval;
11. field preparation;
12. response formats;
13. mobile response;
14. device-profile setup;
15. tablet operation;
16. Kyrgyz-language operation;
17. Russian-language operation;
18. offline batch creation;
19. collection synchronization;
20. cleaning criteria;
21. cleaning profile and flags;
22. cleaning receipt;
23. analysis and crosstab settings;
24. preview tables;
25. table/chart package;
26. verified report inputs;
27. report summaries;
28. report package;
29. independent verification;
30. publication governance;
31. official HTML/PDF/CSV/XLSX outputs;
32. in-application learning;
33. maintenance, updates, and SaaS support;
34. proposed pilot decision.

Generated review files:

- `out/kg-statistics-mvp-demo/kg-statistics-nsc-briefing-en.pptx`
- `out/kg-statistics-mvp-demo/kg-statistics-nsc-briefing-en.pdf`
- `out/kg-statistics-mvp-demo/kg-statistics-nsc-briefing-contact-sheet.png`
- `out/kg-statistics-mvp-demo/kg-statistics-nsc-briefing-pdf-contact-sheet.png`

## Video selection

Only actions that benefit materially from motion were recorded:

1. questionnaire authoring, Survey Bank, import, condition setting, and flow review;
2. questionnaire submission;
3. accepted field-batch synchronization;
4. analysis and report production;
5. independent verification;
6. publication export request;
7. immutable release generation.

The seven selected clips are real Playwright recordings of the questionnaire
designer and authenticated React operator application at 1920×1080.
Authentication occurred in a separate non-recorded context. The clips contain
no password entry, token display, raw respondent rows, role-switch simulation,
or sample release fallback.

The clips are short review selects. They are intentionally kept separate from
the briefing master so the final presentation can use only the approved moments
and add English narration at the correct visual pace.

## Confirmed questionnaire-import boundary

The current React designer visibly accepts saved project JSON and XLS/XLSX.
The wider repository also contains adapters and documentation for CSV, TSV,
QSF, and Markdown authoring inputs, but those formats are not all exposed by
the React designer's current file picker. The briefing therefore does not claim
that every documented adapter is available through this specific screen.

The demonstration import uses a real `question_input_project.v1` file containing
ten household-living-conditions questions, multilingual labels, choices,
validation, and employment-routing conditions. It does not use an empty dialog
or a fabricated success image.

## Verification

| Check | Result |
| --- | --- |
| Application production build | PASS |
| Authenticated 10-stage workflow capture | PASS |
| Screenshot candidates | 72 |
| Selected screenshots | 36 |
| Candidate ratio | 2.00× |
| English PPTX pages | 34 |
| PowerPoint overflow test | PASS |
| English PDF pages | 34 |
| PDF page render inspection | PASS |
| Selected video clips | 7 |
| Video dimensions | 1920×1080 |
| Video codec | VP8/WebM |
| Visible secrets/respondent rows | none |

## Next editing action

Use the expanded briefing deck as the explanatory spine. The presenter may
remove detail slides to fit the meeting. Insert the seven selected clips
only after their corresponding static explanation. Add calm English narration,
concise English subtitles, and separate Kyrgyz subtitles after the screen and
clip selection is approved. Do not expand the video into a feature inventory.
