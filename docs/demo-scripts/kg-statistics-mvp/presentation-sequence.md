# KG Statistics Production System MVP — Presentation Sequence

## Working title

**KG Statistics Production System MVP**  
**From Survey Design to a Verified Official Release**

## Format

The final presentation alternates explanatory slides with recorded product clips.

```text
Slide → Video → Slide → Video
```

Target master duration: **24–30 minutes**.

## Demo scenario

- Project: **Household Living Conditions Survey 2026**
- Objective: Measure household composition, employment, and access to basic services.
- Final publication: **Household Living Conditions Indicators 2026**
- Data: fictional, aggregate, and free of respondent-level personal information.

---

# Segment 1 — Opening slide

## Slide 1 — From survey design to verified release

### On-slide copy

**KG Statistics Production System MVP**

From survey design to a verified official release

- Authenticated roles
- Evidence-backed workflow
- Immutable multi-format outputs

### Visual

A simple left-to-right chain:

```text
Questionnaire → Collection → Analysis → Verification → Publication
```

Under the chain, one continuous evidence line ending in:

```text
HTML · PDF · CSV · XLSX
```

### Narration intent

Orient the audience. State that this is a working internal production MVP, not a dashboard mock-up.

### Duration

45–55 seconds.

---

# Segment 2 — Video 1

## Video 1 — Enter the platform

### Goal

Show the application, English interface, role identity, and project list.

### Target length

50–65 seconds.

### Screen actions

1. Open the production React operator application.
2. Show the login screen briefly without exposing credentials.
3. Sign in as the survey manager using a prepared secure recording flow.
4. Show the authenticated user identity and role.
5. Show the project list and language selector.
6. Briefly switch to Kyrgyz and back to English to prove localization.
7. Open the demonstration project or create it in Video 2.

### Decision point to hold

The project list filtered to the authenticated user.

### Key takeaway

Users do not choose a role from the interface. Identity and permissions come from the authenticated session.

---

# Segment 3 — Evidence architecture slide

## Slide 2 — The workflow does not advance on a button alone

### On-slide copy

**Every stage requires trusted evidence**

1. Exact artifact identity and SHA-256
2. Authorized action by the signed-in user
3. Immutable transition receipt

### Visual

A three-layer diagram:

```text
User action
    ↓
Server authorization + evidence validation
    ↓
Accepted state revision + immutable receipt
```

A red side note:

```text
No client-side stage completion
```

### Narration intent

Explain that UI buttons request actions; only the server ledger decides whether a stage is accepted.

### Duration

60–75 seconds.

---

# Segment 4 — Video 2

## Video 2 — Create the project and grant access

### Goal

Show project-scoped access and authoritative Project Hub state.

### Target length

75–95 seconds.

### Screen actions

1. Manager selects **New project**.
2. Enter project title, objective, input source, and quality preset.
3. Create project.
4. Show Project Hub:
   - project ID;
   - current state `project_created` in human-readable form;
   - state revision `0`;
   - allowed next action.
5. Open project access.
6. Grant member access to the designer and reviewer.
7. Show that viewer access is read-only through a brief explanatory callout, not an error-heavy detour.

### Decision point to hold

Project Hub showing revision `0` and **Submit questionnaire** as the executable action for the designer.

### Key takeaway

Global role and project membership are both required. Ownership does not bypass domain permissions.

---

# Segment 5 — Questionnaire evidence slide

## Slide 3 — A questionnaire becomes an immutable artifact

### On-slide copy

**Questionnaire submission creates evidence**

- Server-generated artifact ID and version
- Authenticated producer identity
- SHA-256 bound to the submitted content

### Visual

A questionnaire card transformed into an artifact card:

```text
Question content
→ Artifact ID / Version / SHA-256
→ Transition receipt
```

### Narration intent

Explain that users edit domain content, while trusted identity and hash values are generated or validated by the server.

### Duration

50–65 seconds.

---

# Segment 6 — Video 3

## Video 3 — Submit the questionnaire

### Goal

Show real questionnaire editing and submission through the authenticated workflow.

### Target length

80–105 seconds.

### Screen actions

1. Sign in as the questionnaire designer.
2. Open the project.
3. Select **Submit questionnaire**.
4. Show title, objective, primary locale, and two or three questions.
5. Add or edit one question so the viewer sees real authoring.
6. Submit.
7. Show accepted status.
8. Hold on:
   - resulting workflow state;
   - revision change;
   - active questionnaire artifact;
   - immutable receipt.

### Decision point to hold

The receipt and active artifact hash displayed together.

### Key takeaway

The browser did not supply the trusted artifact hash or producer identity.

---

# Segment 7 — Separation-of-duties slide

## Slide 4 — The producer cannot approve their own evidence

### On-slide copy

**Separation of duties is enforced by the platform**

- Author ≠ questionnaire reviewer
- Report producer ≠ verifier
- Verifier ≠ publication approver

### Visual

Three paired roles with a blocked self-arrow and an approved cross-arrow.

### Narration intent

Explain that hiding a button is not the security control; the server rejects prohibited combinations.

### Duration

55–70 seconds.

---

# Segment 8 — Video 4

## Video 4 — Independent questionnaire approval

### Goal

Show exact-subject approval by a different authenticated actor.

### Target length

70–90 seconds.

### Screen actions

1. Optional 10-second insert: designer attempts approval and receives a concise self-approval rejection.
2. Sign out.
3. Sign in as reviewer.
4. Open the exact submitted questionnaire.
5. Show artifact ID, version, SHA-256, and producer as read-only metadata.
6. Choose **APPROVED** and enter a reason.
7. Record decision.
8. Show the immutable decision evidence and next workflow state.

### Decision point to hold

The approval receipt bound to the exact questionnaire hash.

### Key takeaway

Approval cannot silently move to a newer questionnaire version.

---

# Segment 9 — Collection slide

## Slide 5 — Collection and synchronization use accepted server evidence

### On-slide copy

**Field data enters through a trusted synchronization boundary**

- Collection package from approved questionnaire
- Authenticated field identity
- Accepted server batch and server-resolved counts

### Visual

```text
Approved questionnaire
→ Collection package
→ Accepted sync batch
→ Response artifact
```

A small lock icon on the batch-to-artifact step.

### Narration intent

Clarify that the operator cannot paste arbitrary respondent rows or claim response counts through the publication workflow form.

### Duration

55–70 seconds.

---

# Segment 10 — Video 5

## Video 5 — Prepare collection and synchronize responses

### Goal

Show collection preparation and trusted response synchronization.

### Target length

100–125 seconds.

### Screen actions

1. Sign in as authorized collection operator/designer.
2. Select **Prepare collection**.
3. Show mode, start/end dates, and device profile.
4. Submit and show collection package evidence.
5. Sign in as enumerator or field operator.
6. Select **Synchronize responses**.
7. Enter the accepted batch reference and dataset label.
8. Submit.
9. Show server-resolved received, accepted, duplicate, and rejected counts.
10. Show resulting response artifact and receipt.

### Optional adversarial insert

A very short callout explains that a batch belonging to another staff identity is rejected. Do not spend more than 8–10 seconds on the rejection.

### Decision point to hold

The response artifact showing aggregate counts and no raw respondent rows.

### Key takeaway

The accepted batch, staff identity, and counts are resolved from persisted server evidence.

---

# Segment 11 — Cleaning and analysis slide

## Slide 6 — Downstream work stays bound to the exact upstream version

### On-slide copy

**Cleaning and analysis preserve lineage**

- Cleaning review references synchronized responses
- Analysis references approved cleaning evidence
- Upstream replacement supersedes stale downstream outputs

### Visual

A lineage chain with version labels:

```text
Responses v1
→ Cleaning approval v1
→ Report package v1
```

A second branch shows `Responses v2` invalidating the old downstream active path without deleting history.

### Narration intent

Explain immutable history and active-evidence supersession.

### Duration

60–75 seconds.

---

# Segment 12 — Video 6

## Video 6 — Approve cleaning and produce the report

### Goal

Show cleaning review followed by real analysis/report production.

### Target length

110–140 seconds.

### Screen actions

1. Reviewer opens **Review cleaned data**.
2. Show source response artifact metadata.
3. Enter cleaned dataset label, cleaned row count, flag count, and cleaning methods.
4. Record **APPROVED** with reason.
5. Show cleaning receipt and next action.
6. Sign in as statistician/analyst.
7. Open **Produce analysis and report**.
8. Show report title, publication locale, template, summary, and indicator editor.
9. Edit at least one indicator value or label.
10. Produce report artifact.
11. Hold on the report package identity, SHA-256, and active state.

### Decision point to hold

The report artifact and its lineage to approved cleaning evidence.

### Key takeaway

The active publication report is persisted content, not a sample report or screen-only result.

---

# Segment 13 — Verification slide

## Slide 7 — Verification is evidence, not a green badge

### On-slide copy

**Verification has three explicit outcomes**

```text
PASSED · FAILED · INCOMPLETE
```

Only **PASSED** evidence bound to the exact report hash can continue.

### Visual

Three status cards. PASSED continues to publication approval; FAILED and INCOMPLETE point to correction.

### Narration intent

Explain that failed and incomplete verification remain visible as blocking evidence rather than being overwritten.

### Duration

55–70 seconds.

---

# Segment 14 — Video 7

## Video 7 — Independent verification

### Goal

Show self-verification rejection and a valid independent PASSED verification.

### Target length

85–105 seconds.

### Screen actions

1. Optional short insert: report producer attempts verification and receives **SELF_VERIFICATION** rejection.
2. Sign in as distinct verifier/administrator used for the approved demo path.
3. Open **Record independent verification**.
4. Show exact report ID/version/hash.
5. Select `PASSED`.
6. Show verification method, verified tables, and verified cells.
7. Record verification.
8. Hold on the verification receipt and the exact subject report hash.

### Decision point to hold

`PASSED` verification next to the exact report SHA-256.

### Key takeaway

Verification identity, method, subject, and result are immutable evidence.

---

# Segment 15 — Publication governance slide

## Slide 8 — Approval and release are different authorities

### On-slide copy

**Publication governance uses distinct actions**

1. Approver decides whether the verified report may be published
2. Publisher requests export and processes the immutable release

### Visual

```text
PASSED verification
→ APPROVED publication decision
→ Export intent
→ Release processing
```

### Narration intent

Explain that publisher authority alone cannot create approval evidence.

### Duration

50–65 seconds.

---

# Segment 16 — Video 8

## Video 8 — Approve publication and request export

### Goal

Show publication approval and explicit export intent.

### Target length

85–105 seconds.

### Screen actions

1. Sign in as publication approver/reviewer.
2. Open **Approve publication**.
3. Show exact report and PASSED verification metadata.
4. Record **APPROVED** with reason.
5. Sign out.
6. Sign in as publisher.
7. Open **Request publication export**.
8. Confirm the intended publication subject.
9. Request export.
10. Show the immutable export intent and resulting state revision.

### Decision point to hold

Export intent showing it is bound to the approved report evidence.

### Key takeaway

A release cannot be produced from browser-supplied report, approval, or verification claims.

---

# Segment 17 — Output slide

## Slide 9 — One atomic immutable release

### On-slide copy

**One release, one evidence lineage, multiple official formats**

Human-readable:

```text
HTML · PDF
```

Machine-readable:

```text
Table CSV · Cell-lineage CSV · XLSX
```

### Visual

One release box containing the five file groups, connected to one manifest and one SHA-256 chain.

### Narration intent

Explain atomic generation: no partial release is exposed if any required output fails validation.

### Duration

60–75 seconds.

---

# Segment 18 — Video 9

## Video 9 — Generate and inspect the immutable release

### Goal

Show Phase 3–6 release processing and file inventory.

### Target length

100–125 seconds.

### Screen actions

1. Publisher opens Releases.
2. Select **Process HTML release** or the current official-package processing label.
3. Show durable job status.
4. Wait for successful completion.
5. Hold on active release identity and immutable status.
6. Show:
   - report reference;
   - locale;
   - template;
   - renderer/generator versions;
   - manifest SHA-256;
   - export receipt.
7. Show grouped files:
   - HTML;
   - PDF;
   - matrix CSV;
   - cell-lineage CSV;
   - XLSX.
8. Show filename, MIME type, size, and SHA-256 for representative files.

### Decision point to hold

The release manifest hash and complete file inventory.

### Key takeaway

All formats were generated from the same normalized model and approved workflow evidence.

---

# Segment 19 — Integrity and recovery slide

## Slide 10 — Integrity is checked before and after release

### On-slide copy

**Release integrity continues after generation**

- Download bytes rechecked against persisted size and SHA-256
- Tampered files are not served
- Backup and restore verify every stored file
- Startup reconciliation reports integrity gaps without deleting history

### Visual

```text
Release file
→ Download verification
→ Backup manifest
→ Restore verification
```

### Narration intent

Connect publication integrity to operational recovery.

### Duration

60–75 seconds.

---

# Segment 20 — Video 10

## Video 10 — Download official outputs and show recovery evidence

### Goal

Show real downloads, browser hash verification, and the operations evidence.

### Target length

100–130 seconds.

### Screen actions

1. Download HTML.
2. Download PDF.
3. Download XLSX.
4. Download one table CSV and one cell-lineage CSV.
5. Show a concise confirmation that downloaded SHA-256 matches persisted metadata.
6. Open the PDF briefly.
7. Open the XLSX briefly to show Metadata, table, and Lineage sheets.
8. Show a non-sensitive operations evidence view or prepared slide insert summarizing:
   - backup manifest verified;
   - restore into empty environment passed;
   - active release pointer restored;
   - destructive reconciliation actions: zero.

### Decision point to hold

The successful hash verification and the restored active release result.

### Key takeaway

The platform protects the official files as immutable evidence, not merely as download links.

---

# Segment 21 — Closing slide

## Slide 11 — Internal MVP complete

### On-slide copy

**Internal MVP complete**

- Authenticated role-separated workflow
- Evidence-backed decisions and verification
- Immutable HTML, PDF, CSV, and XLSX releases
- Integrity-verified download, backup, and restore

### Footer: explicit boundaries

Not claimed in this MVP:

```text
External SSO/MFA · national deployment · high availability · independent accessibility certification
```

### Visual

A clean completion checkmark over the full workflow chain, with the excluded future items in a separate light-gray box.

### Narration intent

Close honestly. State what is complete and what remains deployment/governance work.

### Duration

70–90 seconds.

---

# Editing rhythm

Use the following transition pattern:

- slide enters with a subtle 250–400 ms fade;
- narration begins after a 300–500 ms visual orientation pause;
- slide holds 1 second after the final sentence;
- 300 ms cut or short dissolve into the application clip;
- application clip ends with a 2-second decision-point hold;
- brief dissolve into the next slide.

No background music is required. If used in a review copy, keep it extremely low and remove it from the official master unless approved.

# Final chapter markers

1. Introduction
2. Project and access
3. Questionnaire and approval
4. Collection and synchronization
5. Cleaning and analysis
6. Independent verification
7. Publication governance
8. Immutable release
9. Integrity and recovery
10. Completion and boundaries
