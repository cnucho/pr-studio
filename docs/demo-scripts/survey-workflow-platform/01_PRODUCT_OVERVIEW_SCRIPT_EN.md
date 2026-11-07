# Product Overview Script — English

## Working Title

**A Practical Survey Production Workspace for National Statistical Offices**

## Purpose

Present the visible capability, current scope, and institutional value of the running survey application without disclosing proprietary implementation methods.

## Target Audience

- national statistical offices;
- survey-methodology managers;
- official-statistics IT teams;
- international development partners;
- institutional decision makers.

## Target Duration

Approximately **5 minutes 40 seconds**.

## Recording Rule

This is an actual-product demonstration. Record the running application and real user-visible state changes using synthetic data. Do not substitute static concept slides for product screens except for the opening title and final scope summary.

## Disclosure Boundary

The video may show:

- template selection;
- project creation;
- workflow status;
- review and approval;
- technical-test results;
- response preview;
- current product scope;
- complementary systems required for full national operations.

The video must not show:

- source code or developer tools;
- repositories, branches, local paths, tokens, or credentials;
- internal schemas in full;
- private validation-rule logic;
- hidden prompts, orchestration, scoring, thresholds, repair logic, or test harnesses;
- signing internals or reusable cross-country platform-factory tools;
- real statistical-office data.

---

# Scene-by-Scene Script

## Scene 1 — Opening: What the Product Is

**Time:** 00:00–00:24  
**Screen:** Application home screen, clean 1920×1080 capture.  
**Action:** Slow cursor movement toward the New Survey entry point. No click yet.  
**English callout:** `Survey production, connected in one workspace`  
**Subtitle:** `A connected workspace for survey production.`

**Narration:**

> National surveys are rarely produced in one place. Questionnaire files, review comments, testing tools, response screens, and operational records are often separated. This application brings the core survey-production workflow into one guided workspace.

**Direction:**

- Begin with a two-second silent hold on the application.
- Fade in the title at the upper left.
- Keep the application visible behind the title.
- Do not show a product architecture diagram.

---

## Scene 2 — Start from a Survey Template

**Time:** 00:24–01:02  
**Screen:** Open the survey-template catalog.  
**Action:** Select a synthetic household survey template and create a new project.  
**Visible Russian UI cues:**

- `Начать новое обследование`
- `Выберите официальный шаблон`
- `Начать с этого шаблона`

**English callout:** `Start from an approved survey template`  
**Subtitle:** `Create a project from a reusable survey template.`

**Narration:**

> A user begins with a reusable survey template rather than a blank screen. The template supplies the visible questionnaire structure, supported languages, and the starting point for review. For this public demonstration, all content and respondent examples are synthetic.

**Direction:**

- Pause for one second after the template catalog loads.
- Highlight the chosen template card before clicking.
- Do not display template source files, IDs, hashes, or private metadata.

---

## Scene 3 — A Guided Project Workspace

**Time:** 01:02–01:43  
**Screen:** Newly created project workspace.  
**Action:** Move the cursor over the status, progress steps, and next-action area.  
**English callout:** `The system shows what must happen next`  
**Subtitle:** `Status, progress, and the next action stay visible.`

**Narration:**

> Each survey project has a visible status, a current stage, and a recommended next action. The user does not need to remember the full process. The workspace shows what has been completed, what is blocked, and which action should come next.

**Direction:**

- Use a gentle digital zoom on the progress and next-action panel.
- Hold for two seconds so viewers can read the screen.
- Avoid explaining the internal state-transition implementation.

---

## Scene 4 — Internal Review Before Approval

**Time:** 01:43–02:37  
**Screen:** Review screen.  
**Action:** Open a review, add one synthetic blocking comment, show that approval is unavailable, resolve the comment, then approve the review.  
**Visible Russian UI cues:**

- `Открыть проверку`
- `Добавить замечание`
- `Блокирует`
- `Отметить решенным`
- `Утвердить`

**English callout:** `Blocking issues must be resolved before approval`  
**Subtitle:** `Review findings are visible and actionable.`

**Narration:**

> Before approval, reviewers can record findings against the actual questionnaire. A blocking issue prevents approval until it is resolved. Once the correction has been reviewed, the comment is closed and the review can be approved. This creates a clear, visible review trail for the project team.

**Direction:**

- Use the synthetic comment: `Clarify the wording before approval.`
- Do not display hidden rule definitions or internal evidence records.
- Hold briefly on the disabled approval button.
- After resolution, pause on the approved state.

---

## Scene 5 — Technical Testing Before Collection

**Time:** 02:37–03:42  
**Screen:** Technical-test screen.  
**Action:** Start the test, show the running state, then show the passed result and visible check list.  
**Visible Russian UI cues:**

- `Запустить тест`
- `Тест идет`
- `Тест пройден`

**English callout:** `Test the survey before fieldwork begins`  
**Subtitle:** `The survey is tested before collection.`

**Narration:**

> Approval is not the end of preparation. The application runs a technical test against the survey that will be used in practice. The visible checks cover areas such as questionnaire structure, required fields, skip logic, calculations, choice values, rosters, matrices, localization, runtime rendering, saving, submission readiness, and security. The user sees which checks passed and whether any issue still blocks progress.

**Direction:**

- Show the running state for at least two seconds.
- Scroll slowly through representative checks; do not race through all rows.
- Do not explain how the checks are implemented or how thresholds are determined.
- It is acceptable to state the visible number of checks when the screen confirms it.

---

## Scene 6 — Tested Response Preview

**Time:** 03:42–04:21  
**Screen:** Response preview opened from the passed technical test.  
**Action:** Enter a synthetic name and age, trigger visible validation, correct the answer, and show the accepted state.  
**Visible Russian UI cues:**

- `Предпросмотр ответа`
- `Имя`
- `Возраст`
- `Это пробный экран; данные не уходят в сбор.`

**English callout:** `Preview the generated response experience`  
**Subtitle:** `Test the actual response screen with synthetic data.`

**Narration:**

> The response preview is not a static mock-up. It uses the generated survey runtime so the project team can inspect the respondent experience before collection. In this preview, synthetic answers can be entered, validated, saved, and reviewed without creating a production submission.

**Direction:**

- Clearly show the visible preview-isolation message.
- Use only synthetic values such as `Demo Respondent` and `35`.
- Do not expose API calls, runtime JSON, package paths, or internal identifiers.

---

## Scene 7 — What the Current Product Covers

**Time:** 04:21–04:54  
**Screen:** Return to the project workspace and briefly show the workflow stages.  
**English overlay panel:**

`Current core`

- Template-based survey projects
- Questionnaire review and approval
- Technical testing
- Collection-package preparation
- Response runtime and preview
- Draft recovery
- Append-only response history

**Subtitle:** `The current product is a survey-production core.`

**Narration:**

> The current product is a survey-production core. It connects template-based project creation, questionnaire work, review, approval, technical testing, collection-package preparation, response runtime, draft recovery, and append-only response history.

**Direction:**

- The overlay may appear over the running application.
- Do not present internal architecture, proprietary engine names, or code modules.

---

## Scene 8 — What a Full National System Still Needs

**Time:** 04:54–05:27  
**Screen:** Application remains in the background, slightly dimmed.  
**English overlay panel:**

`Complementary national systems`

- Sample-frame and case-list management
- Interviewer and assignment management
- Visit and contact-attempt tracking
- Fieldwork monitoring
- Enterprise identity and access
- Official code-list governance
- Full validation-rule authoring and approval
- Backup, disaster recovery, and security operations
- Statistical processing and official outputs

**Subtitle:** `Full national operations require complementary systems.`

**Narration:**

> A complete national survey environment may also require sample and case management, interviewer assignments, visit tracking, fieldwork monitoring, enterprise identity, official code-list governance, full validation-rule authoring, disaster recovery, and official statistical-output systems. These are complementary operational systems, not functions claimed in the current demonstration.

**Direction:**

- Present no more than five lines at once; reveal the list in two groups.
- Avoid language that makes the demonstrated core sound incomplete or defective.
- Say `may require`, not `already includes`.

---

## Scene 9 — Institutional Delivery and Closing

**Time:** 05:27–05:43  
**Screen:** Clean project workspace or response preview; fade to closing title.  
**English callout:** `Agency-controlled deployment · Synthetic demonstration data`  
**Subtitle:** `Designed for agency-controlled deployment.`

**Narration:**

> The platform is intended for agency-controlled deployment, where statistical data can remain inside the institution. This public demonstration shows the visible workflow and current scope while intentionally excluding proprietary implementation details and real statistical data.

**Closing title:**

**Survey Workflow Platform**  
`From survey template to tested response screen`

---

# Full Narration Transcript

National surveys are rarely produced in one place. Questionnaire files, review comments, testing tools, response screens, and operational records are often separated. This application brings the core survey-production workflow into one guided workspace.

A user begins with a reusable survey template rather than a blank screen. The template supplies the visible questionnaire structure, supported languages, and the starting point for review. For this public demonstration, all content and respondent examples are synthetic.

Each survey project has a visible status, a current stage, and a recommended next action. The user does not need to remember the full process. The workspace shows what has been completed, what is blocked, and which action should come next.

Before approval, reviewers can record findings against the actual questionnaire. A blocking issue prevents approval until it is resolved. Once the correction has been reviewed, the comment is closed and the review can be approved. This creates a clear, visible review trail for the project team.

Approval is not the end of preparation. The application runs a technical test against the survey that will be used in practice. The visible checks cover areas such as questionnaire structure, required fields, skip logic, calculations, choice values, rosters, matrices, localization, runtime rendering, saving, submission readiness, and security. The user sees which checks passed and whether any issue still blocks progress.

The response preview is not a static mock-up. It uses the generated survey runtime so the project team can inspect the respondent experience before collection. In this preview, synthetic answers can be entered, validated, saved, and reviewed without creating a production submission.

The current product is a survey-production core. It connects template-based project creation, questionnaire work, review, approval, technical testing, collection-package preparation, response runtime, draft recovery, and append-only response history.

A complete national survey environment may also require sample and case management, interviewer assignments, visit tracking, fieldwork monitoring, enterprise identity, official code-list governance, full validation-rule authoring, disaster recovery, and official statistical-output systems. These are complementary operational systems, not functions claimed in the current demonstration.

The platform is intended for agency-controlled deployment, where statistical data can remain inside the institution. This public demonstration shows the visible workflow and current scope while intentionally excluding proprietary implementation details and real statistical data.

# Production Notes

- Narration voice: calm, professional English; default recommendation `OpenAI cedar`.
- Subtitle text should use the concise subtitle lines above, not the full narration transcript.
- Keep subtitles within the lower safe area and away from active UI controls.
- Use no background music during dense product interaction. A very light opening and closing bed is acceptable.
- Record a clean application state with synthetic project names.
- Capture one separate thumbnail frame from Scene 5 or Scene 6.