# KG Statistics Production System MVP — English Narration Script

## Voice direction

Use clear international English with a calm official product-demonstration tone. Keep the pace measured. Avoid promotional exaggeration. Pause briefly after each accepted workflow decision, verification result, and release-creation event.

Canonical terms should be pronounced clearly:

- PASSED
- FAILED
- INCOMPLETE
- APPROVED
- SHA-256
- HTML
- PDF
- CSV
- XLSX

---

# Slide 1 — From survey design to verified release

Welcome to the KG Statistics Production System.

This is an internal production platform for taking a statistical project from questionnaire design to a verified official release.

The system is built around three principles. Users act through authenticated roles. Every workflow transition is supported by exact evidence. And every official output is produced as an immutable, integrity-verified release.

In this demonstration, we will follow one fictional household survey from project creation through questionnaire approval, field synchronization, analysis, independent verification, publication approval, and final delivery in HTML, PDF, CSV, and XLSX formats.

This is not a dashboard mock-up. Each action you will see is processed by the real workflow services and recorded in the transition ledger.

---

# Video 1 — Enter the platform

We begin at the operator application.

The user signs in with an assigned platform account. The interface does not ask the user to choose a role. Identity, role, and permissions come from the authenticated server session.

After login, the user sees only projects for which they have active access. A global job title by itself does not expose every project.

The interface supports English, Kyrgyz, and Russian. The selected language changes the navigation and action labels, but it does not change the underlying contract values or security decisions.

For this demonstration, we will use English in the application while providing separate English and Kyrgyz subtitle tracks for the presentation.

---

# Slide 2 — The workflow does not advance on a button alone

A button in the browser does not complete a statistical stage.

The browser sends an action request. The server then authenticates the actor, checks project access, checks the required domain permission, resolves the current state revision, and validates the exact evidence required for that action.

Only after those checks pass does the platform accept the transition, advance the authoritative state revision, and create an immutable receipt.

This distinction matters. The user interface may guide the user, but it is never the security boundary and it is never the workflow authority.

---

# Video 2 — Create the project and grant access

The survey manager creates a new project called Household Living Conditions Survey 2026.

The objective is to measure household composition, employment, and access to basic services.

When the project is created, the creator becomes the project owner. The Project Hub shows the authoritative workflow state, the current revision, active evidence, recent receipts, and the actions that the signed-in user can actually perform.

At this point, the project is in the project-created state and the revision is zero.

The manager grants access to the questionnaire designer and the reviewer. Project membership controls which projects a person can see. Domain permissions control what the person can do inside the project.

A viewer may read permitted project information, but cannot perform a modifying workflow action. Project ownership also does not grant questionnaire approval, verification, or publication authority by itself.

---

# Slide 3 — A questionnaire becomes an immutable artifact

The questionnaire is not stored as an informal screen state.

The designer edits questionnaire content, but the server creates or validates the trusted artifact identity, artifact version, authenticated producer reference, parent lineage, and SHA-256.

The accepted transition receipt binds the submitted questionnaire to the exact project revision and actor.

This means downstream approval cannot silently move from the questionnaire that was reviewed to a newer questionnaire that was not reviewed.

---

# Video 3 — Submit the questionnaire

The questionnaire designer opens the project and selects Submit questionnaire.

The form contains the questionnaire title, survey objective, primary locale, and the question definitions.

Here, the designer edits a real survey question. The browser sends the domain content, but it does not provide a trusted artifact ID, producer identity, or SHA-256.

When the designer submits the questionnaire, the server validates the content, generates the evidence identity, and records the transition.

The Project Hub now shows the questionnaire as the active artifact. The workflow revision has advanced, and the immutable receipt records who performed the action, which state was accepted, and which artifact was produced.

The artifact hash displayed here is the exact identity that the reviewer will see in the next step.

---

# Slide 4 — The producer cannot approve their own evidence

The platform enforces separation of duties.

The questionnaire author cannot approve their own questionnaire. The report producer cannot verify their own report. And the report verifier cannot also approve publication.

These rules are checked on the server. They are not implemented merely by hiding a button.

If a prohibited actor sends the request directly, the request is still rejected and the failed attempt remains visible as structured evidence where appropriate.

---

# Video 4 — Independent questionnaire approval

First, the questionnaire author attempts to approve the questionnaire. The platform rejects self-approval.

The user then signs out, and a distinct reviewer signs in.

The reviewer opens the same project and sees the exact questionnaire artifact that was submitted. The artifact ID, version, SHA-256, and producer are read-only evidence resolved from the server.

The reviewer records an APPROVED decision and provides a reason.

The decision is bound to the exact questionnaire hash shown on screen. The platform creates immutable decision evidence and advances the project to the questionnaire-approved state.

If the questionnaire were replaced, this approval would not automatically apply to the replacement.

---

# Slide 5 — Collection and synchronization use accepted server evidence

Collection preparation begins only from an approved questionnaire.

The resulting collection package is another immutable artifact in the project lineage.

Response synchronization then requires a batch that was already accepted by the server-side field intake process. The authenticated field identity must match the accepted batch.

The workflow form does not accept raw respondent rows and does not trust response counts supplied by the browser.

Accepted, received, duplicate, and rejected counts are resolved from persisted synchronization evidence.

---

# Video 5 — Prepare collection and synchronize responses

An authorized operator prepares the collection package.

The operator selects the collection mode, collection dates, and device profile. The server binds the package to the active questionnaire approval.

After acceptance, the Project Hub shows the collection package and its immutable receipt.

Next, the field operator signs in and synchronizes an accepted response batch.

The operator enters the accepted batch reference and a safe dataset label. The server resolves the batch, the field staff association, and the synchronization counts.

The resulting response artifact shows aggregate counts only. It does not expose respondent rows through the operator workflow.

A batch assigned to another field identity would be rejected. In this accepted path, the staff binding and batch evidence agree, so the state advances to responses synchronized.

---

# Slide 6 — Downstream work stays bound to the exact upstream version

Cleaning and analysis preserve the exact upstream lineage.

The cleaning review references the active synchronized response artifact. Analysis production references the accepted cleaning decision.

If an upstream artifact is replaced, stale downstream evidence is no longer treated as active. The historical artifacts and receipts remain immutable, but the current path moves to the new evidence chain.

This gives the platform both traceability and correction. It does not rewrite history to make the latest result appear as though it had always existed.

---

# Video 6 — Approve cleaning and produce the report

The reviewer opens the cleaning action and sees the synchronized response artifact that is being reviewed.

The reviewer records the cleaned dataset label, cleaned row count, review flag count, and the cleaning methods applied.

The decision is recorded as APPROVED with a reason. The platform verifies that the cleaned count does not exceed the accepted response count and binds the decision to the exact response evidence.

The project then moves to analysis production.

A statistician signs in and opens Produce analysis and report.

The statistician enters the report title, publication locale, template, summary, and statistical indicators. The indicator editor uses aggregate values only.

When the report is produced, the server persists the report package and the publication content required for downstream rendering.

The Project Hub now shows the active report artifact, its SHA-256, its authenticated producer, and its lineage to approved cleaning evidence.

This is a real persisted report package, not a sample report substituted for the project.

---

# Slide 7 — Verification is evidence, not a green badge

Verification has three explicit outcomes: PASSED, FAILED, and INCOMPLETE.

FAILED and INCOMPLETE results remain visible as blocking evidence. They do not disappear simply because the user tries the action again.

Only PASSED verification that is bound to the exact active report hash can proceed to publication approval.

Verification records the verifier, method, checked tables and cells, discrepancies, time, and subject report identity.

---

# Video 7 — Independent verification

The report producer first attempts to verify the report. The platform rejects self-verification.

A distinct authorized verifier then opens the verification action.

The exact report artifact ID, version, and SHA-256 are displayed as read-only evidence.

The verifier selects PASSED, identifies the independent recalculation method, and records the tables and cells that were checked.

When the verification is submitted, the platform computes and validates the verification evidence hash and creates an immutable receipt.

The project now contains PASSED verification bound to this exact report. A verification result for another report version would not satisfy the publication gate.

---

# Slide 8 — Approval and release are different authorities

Publication approval and publication release are separate actions.

The publication approver decides whether the independently verified report may be published.

The publisher then requests an export intent and processes the release.

Publisher authority alone does not create publication approval, and the browser cannot supply trusted approval, verification, or report evidence to the release service.

All of those values are resolved again from persisted workflow state.

---

# Video 8 — Approve publication and request export

The publication approver opens the project and reviews the active report together with its PASSED verification.

The approver records an APPROVED publication decision and provides the reason for the decision.

The decision is bound to the same report hash that was verified.

The user signs out, and the publisher signs in.

The publisher selects Request publication export and confirms the intended publication subject.

The platform creates a versioned publication export intent. That intent references the active report, verification, publication decision, and the actual transition receipt.

No rendering has been claimed yet. The intent is the controlled request that authorizes the next production step.

---

# Slide 9 — One release, one evidence lineage, multiple official formats

The official output is one atomic immutable release.

Human-readable outputs include accessible HTML and tagged PDF.

Machine-readable outputs include table CSV files, long-form cell-lineage CSV files, and an official XLSX workbook.

Every file is generated from the same validated normalized publication model and shares the same report, verification, decision, intent, gate, manifest, and export-receipt lineage.

If any required output fails generation, validation, or source-cell parity, no partial release becomes active.

---

# Video 9 — Generate and inspect the immutable release

The publisher opens the Releases workspace and processes the active publication intent.

The server resolves all trusted evidence again. It runs the publication gate, creates the normalized model, renders HTML, generates PDF, creates CSV and XLSX data packages, validates every output, verifies source-cell parity, and calculates each file hash.

Only after every required check passes does the platform atomically commit the release.

The active release now shows its stable release ID, immutable status, creation time, locale, template, renderer and generator versions, manifest SHA-256, and export receipt.

The file inventory is grouped into human-readable and machine-readable outputs.

Each file has a stable file ID, safe name, MIME type, byte size, SHA-256, and validation status.

All of these outputs belong to one release and one evidence chain.

---

# Slide 10 — Integrity is checked before and after release

Integrity checking does not stop when rendering finishes.

The download endpoint resolves a persisted project, release, and file identity. Before sending bytes, it checks storage containment, byte size, and SHA-256.

The browser also recomputes the downloaded hash before reporting a verified download.

Backup covers the database, immutable release files, and publication payloads. Restore verifies the backup manifest before writing into an empty environment.

Startup reconciliation detects missing files, abandoned staging data, and integrity mismatches without silently deleting historical evidence.

---

# Video 10 — Download official outputs and show recovery evidence

The authorized user downloads the HTML publication, PDF report, XLSX workbook, a table CSV, and a cell-lineage CSV.

For each file, the application receives the exact immutable bytes and verifies the SHA-256 against the persisted release metadata.

The PDF opens as the official human-readable report.

The XLSX workbook contains publication metadata, visible table sheets, and a lineage sheet that maps workbook cells back to normalized source-cell identities. It contains no formulas, macros, or external workbook links.

The table CSV provides a readable matrix. The cell-lineage CSV preserves canonical values, statuses, units, precision, confidence intervals, and source-cell references.

The operations evidence confirms that a backup manifest was verified, the database and release files were restored into an empty environment, and the active release pointer was preserved.

Reconciliation is non-destructive. It reports integrity gaps but does not erase immutable history.

---

# Slide 11 — Internal MVP complete

The internal MVP is complete.

Authenticated users can create a project, perform all nine role-separated workflow actions, produce independently verified evidence, approve publication, and generate an immutable release containing HTML, PDF, CSV, cell-lineage CSV, and XLSX files.

The platform also provides integrity-verified downloads, stable database operation, secure browser sessions, backup, restore, and non-destructive crash reconciliation.

This completion statement is deliberately limited.

The verified baseline includes the anonymous public catalog. It does not claim external single sign-on or multi-factor authentication, national-scale high availability, complete monitoring integration, or independent accessibility certification.

Those are separate deployment and governance decisions.

What is complete is the internal evidence-backed production path: from survey design to a verified official statistical release.
