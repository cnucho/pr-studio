# Survey Workflow Platform — English Demo and Tutorial Plan

## Audience

- national statistical offices;
- official-statistics modernization teams;
- survey-methodology and IT managers;
- international development partners;
- prospective institutional implementers.

## Disclosure Boundary

Show the running product, visible workflow, capability, scope, and limitations.

Do not show or explain:

- source code;
- private repositories or branches;
- private validation-rule logic;
- hidden prompts or orchestration;
- scoring weights or thresholds;
- signing internals;
- acceptance harnesses;
- corruption fixtures;
- private identifiers, credentials, local paths, or stack traces;
- the reusable cross-country platform factory.

Use synthetic survey projects and synthetic respondents only.

## Video 1 — Product Overview

Working title:

**A Practical Survey Production Workspace for National Statistical Offices**

Target duration: 5-6 minutes.

### Story

1. The problem: survey production is fragmented across documents, spreadsheets, review messages, runtime tools, and response systems.
2. What the application connects: template-based project creation, questionnaire work, review, approval, technical testing, collection-package preparation, response runtime, draft recovery, and append-only response history.
3. What viewers can see in the product today.
4. What the current Beta 1 does not attempt to replace.
5. What additional systems are needed for full national production use.
6. Delivery principle: agency-controlled deployment with statistical data remaining inside the institution.

### Visible Application States

- survey template catalog;
- newly created project workspace;
- workflow progress and next action;
- review screen;
- technical test running and passed states;
- response preview;
- concise scope summary.

### Claims Allowed

- The system connects core survey-production stages.
- The technical test exercises actual survey structures before collection.
- The response preview uses the generated survey runtime.
- Operational survey data can remain in an agency-controlled environment.
- The current product is a survey-production core, not a complete fieldwork-management suite.

### Claims Not Allowed

- Do not claim production deployment is complete unless separately verified.
- Do not claim official national templates are final unless officially reviewed.
- Do not claim interviewer, assignment, sample-frame, or full fieldwork management is included.
- Do not describe proprietary trust, validation, or orchestration methods.

## Video 2 — Guided Tutorial

Working title:

**From Survey Template to Tested Response Screen — Guided Tutorial**

Target duration: 9-12 minutes.

### Steps

1. Open the running application.
2. Choose a synthetic household survey template.
3. Create a project.
4. Read the project status and next action.
5. Open the review screen.
6. Start a review cycle.
7. Add a synthetic blocking comment.
8. Show that approval is disabled while a blocker remains.
9. Resolve the comment.
10. Approve the review.
11. Open the technical-test screen.
12. Run the technical test.
13. Show the passed status.
14. Open the response preview.
15. Explain the visible runtime without exposing internal implementation.
16. Summarize what the next operational systems would add.

## Additional Systems to Explain

The closing section should state that a full national implementation may also require:

- sample-frame and case-list management;
- interviewer and assignment management;
- visit and contact-attempt management;
- fieldwork monitoring and escalation;
- enterprise identity and access management;
- official code-list governance;
- full validation-rule authoring and approval;
- country library packaging and signing;
- production backup, disaster recovery, and security operations;
- statistical processing and official-output production.

These should be described as complementary systems, not defects in the demonstrated core.

## Language

- Narration: English.
- Subtitles: concise English.
- Transcript: full English narration.
- UI: current supported Russian or Kyrgyz locale.
- English callouts should explain the visible UI without claiming an English interface is already available.

## Recording Standard

- actual running application;
- 1920 × 1080 capture;
- controlled cursor movement;
- visible highlights before narration explains a control;
- no developer tools;
- no source code;
- no credentials;
- no real customer data;
- short pause after each state transition;
- narration timing derived from generated audio length;
- final MP4 plus SRT, transcript, chapters, thumbnail, and render report.

## YouTube Package

### Overview Video

Suggested title:

**A Practical Survey Production Workspace for National Statistical Offices**

Suggested description:

> This demonstration presents a survey-production workspace designed for institutional use. It shows template-based project creation, questionnaire review, technical testing, and a tested response preview using synthetic data. The video also explains the current scope of the product and the additional systems normally required for full national survey operations.

### Tutorial Video

Suggested title:

**Survey Workflow Tutorial: From Template to Tested Response Screen**

Suggested description:

> This guided tutorial uses a running survey application and synthetic data. It demonstrates how a user creates a survey project, completes an internal review, runs a technical test, and opens the generated response preview. Proprietary implementation details and real statistical data are intentionally excluded.

## Publication Checklist

- [ ] Actual application interaction is visible.
- [ ] Synthetic data only.
- [ ] No credentials, paths, repositories, or debug output.
- [ ] No private design principles or implementation logic.
- [ ] Capabilities match the current product.
- [ ] Limitations are stated accurately.
- [ ] Additional production systems are named.
- [ ] English narration matches the visible screen.
- [ ] English subtitles are concise.
- [ ] MP4, SRT, transcript, thumbnail, chapters, and metadata exist.
- [ ] Final watch-through completed.
