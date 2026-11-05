# Guided Tutorial Script — English

## Working Title

**Survey Workflow Tutorial: From Template to Tested Response Screen**

## Purpose

Teach a first-time institutional user how to complete the visible workflow in the running application using synthetic data. The tutorial explains user actions, not proprietary implementation logic.

## Target Duration

Approximately **10 to 12 minutes**.

## Recording Method

- Record the running application at 1920×1080.
- Use a clean synthetic environment.
- Show actual clicks, loading states, status changes, and results.
- Use English narration and concise English subtitles.
- The current UI may remain Russian or Kyrgyz. English callouts explain the action without claiming that an English interface is already available.

## Synthetic Project

- Survey type: Household survey
- Project name: `2027 Household Survey — Public Demo`
- Synthetic review comment: `Clarify the wording before approval.`
- Synthetic preview respondent: `Demo Respondent`
- Synthetic age: `35`

---

# Tutorial Sequence

## Step 1 — Open the Application

**Time:** 00:00–00:35  
**Screen:** Application home page.  
**Action:** Hold on the home screen, then move the cursor toward New Survey.  
**Visible Russian cue:** `Начать новое обследование`  
**Subtitle:** `Start a new survey project.`

**Narration:**

> This tutorial shows how to move from a survey template to a reviewed and technically tested response screen. We will use a running application and synthetic data. The demonstration does not use real respondents or real statistical-office records.

**Direction:**

- Start with a two-second silent hold.
- Show an English corner label: `Synthetic public demonstration`.

---

## Step 2 — Open the Template Catalog

**Time:** 00:35–01:10  
**Screen:** Survey-template catalog.  
**Action:** Click New Survey and wait for the catalog to finish loading.  
**Visible Russian cue:** `Выберите официальный шаблон`  
**Subtitle:** `Choose a survey template.`

**Narration:**

> Select New Survey to open the template catalog. A template gives the project a defined starting structure, visible sections, supported languages, and a reviewable questionnaire draft. In this tutorial, we use a synthetic household survey template.

**Direction:**

- Do not show template IDs, hashes, internal metadata, or source files.
- Pause after the catalog is visibly ready.

---

## Step 3 — Create the Project

**Time:** 01:10–01:48  
**Screen:** Selected household template card.  
**Action:** Highlight the template, click `Начать с этого шаблона`, and wait for project creation.  
**Subtitle:** `Create the project from the selected template.`

**Narration:**

> Choose the household survey template and start the project. The application creates a project workspace and preserves the selected template as the project’s starting point. The user works with the project through visible workflow stages rather than separate disconnected files.

**Direction:**

- Show the click and the creating/loading state.
- Do not narrate internal package creation or storage mechanics.

---

## Step 4 — Read the Project Workspace

**Time:** 01:48–02:35  
**Screen:** Newly created project workspace.  
**Action:** Point to project status, progress, recent activity, and the next-action card.  
**Visible Russian cues:**

- `Работа с проектом`
- `Что нужно сделать сейчас`
- `Ход работы`

**Subtitle:** `Read the status and the next required action.`

**Narration:**

> The project workspace shows the current status, the workflow stage, and the next action. This is the main orientation screen. It tells the user what is ready, what remains unfinished, and where to continue.

**Direction:**

- Use a slow zoom on the next-action card.
- Hold for two seconds after the zoom.

---

## Step 5 — Open the Review Screen

**Time:** 02:35–03:08  
**Screen:** Project workspace to review screen transition.  
**Action:** Click the visible review action.  
**Visible Russian cue:** `Открыть проверку`  
**Subtitle:** `Open the questionnaire review.`

**Narration:**

> Before the questionnaire can be approved, open the review screen. The review is attached to the actual project and questionnaire visible in the workspace.

**Direction:**

- Pause after the review page becomes ready.
- Keep the cursor away from internal technical details.

---

## Step 6 — Start a Review Cycle

**Time:** 03:08–03:42  
**Screen:** Review not yet opened.  
**Action:** Click Open Review and show the OPEN status.  
**Visible Russian cue:** `Открыть проверку`  
**Subtitle:** `Start a review cycle.`

**Narration:**

> Start the review cycle. The review status now becomes visible, and the reviewer can add findings against the questionnaire.

**Direction:**

- Show the review status marker clearly.
- Do not expose review-record JSON or IDs.

---

## Step 7 — Add a Blocking Comment

**Time:** 03:42–04:28  
**Screen:** Review comment controls and visible questionnaire list.  
**Action:** Select a synthetic question, choose a blocking severity, enter `Clarify the wording before approval.`, and add the comment.  
**Visible Russian cues:**

- `Добавить замечание`
- `Блокирует`
- `Текст замечания`

**Subtitle:** `Record a blocking issue against the questionnaire.`

**Narration:**

> Add a synthetic blocking comment to one questionnaire item. A blocking finding means that approval should not continue until the issue has been reviewed and resolved. The comment is visible to the project team together with its status.

**Direction:**

- Use only synthetic wording.
- Do not explain private validation-rule logic.
- Zoom briefly to the blocking count after the comment is added.

---

## Step 8 — Show the Approval Gate

**Time:** 04:28–04:56  
**Screen:** Review summary with one open blocker.  
**Action:** Move the cursor over the disabled approval control without clicking.  
**Subtitle:** `Approval remains unavailable while a blocker is open.`

**Narration:**

> With an open blocker, approval remains unavailable. The user can see exactly why the project cannot advance.

**Direction:**

- Hold on the disabled state for two seconds.
- Do not imply that every possible rule is shown publicly.

---

## Step 9 — Resolve the Comment

**Time:** 04:56–05:31  
**Screen:** Open review comment.  
**Action:** Click `Отметить решенным` and show the blocker count return to zero.  
**Subtitle:** `Resolve the finding after the correction is reviewed.`

**Narration:**

> After the correction has been reviewed, mark the finding as resolved. The blocking count returns to zero, and the review can proceed to approval.

**Direction:**

- Pause on the resolved status.
- Do not show actual private correction evidence.

---

## Step 10 — Approve the Review

**Time:** 05:31–06:04  
**Screen:** Review screen with no open blockers.  
**Action:** Click `Утвердить` and show the approved state.  
**Subtitle:** `Approve the review when blocking issues are closed.`

**Narration:**

> Approve the review once the blocking issues are closed. The approved state is now visible in the project workflow.

**Direction:**

- Hold on the approved label.
- Avoid discussing internal approval signatures or state-transition rules.

---

## Step 11 — Open the Technical Test

**Time:** 06:04–06:38  
**Screen:** Return to project workspace, then open the technical-test screen.  
**Action:** Click the technical-test action.  
**Visible Russian cues:**

- `Технический тест`
- `Открыть тест`

**Subtitle:** `Open the technical test before collection.`

**Narration:**

> The next step is the technical test. This checks the survey that will be used in the response experience before collection begins.

**Direction:**

- Show the workflow transition clearly.
- No developer console or network panel.

---

## Step 12 — Run the Technical Test

**Time:** 06:38–07:36  
**Screen:** Technical-test screen.  
**Action:** Click `Запустить тест`, show `Тест идет`, then wait for `Тест пройден`.  
**Subtitle:** `Run the survey’s pre-collection technical test.`

**Narration:**

> Start the technical test. The application evaluates the visible survey structure and runtime behavior. The user sees a running state and then a clear result. Do not leave this page while the test is running.

**Direction:**

- Keep the running state visible for at least two seconds.
- Do not accelerate the recording so much that the state change becomes invisible.

---

## Step 13 — Read the Test Results

**Time:** 07:36–08:42  
**Screen:** Passed technical-test result and check list.  
**Action:** Scroll slowly through representative checks.  
**Visible Russian examples:**

- `Структура анкеты`
- `Обязательные поля`
- `Переходы`
- `Расчеты`
- `Повторы и списки`
- `Матрица`
- `Экран ответа`
- `Сохранение`
- `Защита`

**Subtitle:** `Review which checks passed before fieldwork.`

**Narration:**

> The passed result includes visible checks for questionnaire structure, required fields, skip logic, calculations, choices, repeats and rosters, matrices, supported languages, response rendering, saving, submission readiness, and security. The purpose of this screen is operational: users can see whether the survey is ready or which area still needs attention.

**Direction:**

- Show representative rows, not implementation details.
- Do not explain hidden thresholds, rule compilation, test fixtures, or private acceptance methods.

---

## Step 14 — Open the Response Preview

**Time:** 08:42–09:17  
**Screen:** Passed technical-test page.  
**Action:** Click `Предпросмотр ответа`.  
**Subtitle:** `Open the tested response preview.`

**Narration:**

> From the passed test, open the response preview. This lets the project team inspect the generated respondent experience without creating a production submission.

**Direction:**

- Show the preview-isolation message clearly.
- Pause after the response page is ready.

---

## Step 15 — Enter Synthetic Answers

**Time:** 09:17–10:06  
**Screen:** Response preview.  
**Action:** Enter `Demo Respondent` and `35`. If a visible validation example is available, briefly enter an invalid age first, show the message, then correct it.  
**Visible Russian cues:**

- `Имя`
- `Возраст`
- `Это пробный экран; данные не уходят в сбор.`

**Subtitle:** `Use synthetic answers to inspect the runtime.`

**Narration:**

> Enter synthetic answers to inspect the response behavior. The preview can show validation and saving behavior while remaining isolated from production collection. Use only invented values in a public recording.

**Direction:**

- Never enter a real name, address, phone number, case identifier, or sample information.
- Do not expose runtime JSON or API traffic.

---

## Step 16 — Summarize the Current Scope

**Time:** 10:06–10:47  
**Screen:** Return to project workspace. Add a restrained English overlay.  
**Overlay:**

`Current survey-production core`

- Template-based projects
- Review and approval
- Technical testing
- Response runtime and preview
- Draft recovery
- Append-only response history

**Subtitle:** `The demonstrated product is a survey-production core.`

**Narration:**

> The demonstrated product is a survey-production core. It connects reusable templates, project workflow, internal review, approval, technical testing, and the tested response experience.

---

## Step 17 — Explain Complementary Systems

**Time:** 10:47–11:30  
**Screen:** Application dimmed behind an English overlay.  
**Overlay:**

`Complementary systems for national operations`

- Sample and case management
- Interviewer and assignment management
- Visit and contact tracking
- Fieldwork monitoring
- Identity and access management
- Full rule authoring and governance
- Backup and disaster recovery
- Statistical processing and official outputs

**Subtitle:** `National operations may require additional systems.`

**Narration:**

> A full national implementation may also connect sample and case management, interviewer assignments, visit tracking, fieldwork monitoring, enterprise identity, full rule authoring, backup and disaster recovery, statistical processing, and official-output production. These systems extend the operational environment around the demonstrated core.

---

## Step 18 — Close the Tutorial

**Time:** 11:30–11:50  
**Screen:** Clean application workspace, then closing title.  
**Subtitle:** `From template to a tested response screen.`

**Narration:**

> You have now created a survey project, completed an internal review, run the technical test, and opened the tested response preview. This public tutorial shows the user workflow while intentionally excluding proprietary implementation details and real statistical data.

**Closing title:**

**Survey Workflow Platform**  
`Template → Review → Technical Test → Response Preview`

---

# Voice Guidance

- Language: English.
- Tone: calm, precise, institutional, and practical.
- Recommended voice: OpenAI `cedar`.
- Avoid sales-ad enthusiasm.
- Use a measured tutorial pace with short pauses after each visible state change.
- Read Russian UI labels only when necessary; explain the action in English instead of attempting full translation of every label.

# Subtitle Guidance

- Use the concise subtitle line for each step.
- Do not burn the full narration transcript into the video.
- Maximum two lines on screen.
- Keep subtitles above the bottom browser edge and outside active button areas.

# Recording Acceptance Criteria

- [ ] Actual running application is visible throughout the workflow.
- [ ] Project creation is shown.
- [ ] Review OPEN, blocked, resolved, and approved states are shown.
- [ ] Technical-test ready, running, and passed states are shown.
- [ ] Response preview is shown with synthetic answers.
- [ ] Production-submission isolation is visible.
- [ ] No code, credentials, paths, repository information, or debug panels appear.
- [ ] No proprietary design method is narrated.
- [ ] Current scope is accurate.
- [ ] Complementary systems are clearly distinguished from included functions.
- [ ] English narration matches the visible action.
- [ ] Final MP4, SRT, transcript, chapters, and thumbnail frame are produced.