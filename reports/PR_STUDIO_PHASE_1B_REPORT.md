# PR Studio Phase 1B Operational Evidence Report

## Final verdict

`PHASE_1_BLOCKED_OUTPUT_VALIDATION`

The starting status was `PHASE_1_FOUNDATION_VERIFIED_PHASE_1B_BLOCKED`. The isolated staging database, authentication boundary, immutable revision history, real Creatomate lifecycle, callback handling, local render, private media, and review history now have real operational evidence. Phase 1B is not complete because the Creatomate free-trial account forced the requested 1280×720 render to 480×270. Persisted FFprobe validation correctly rejected that cloud output, and it was not approved.

## Identity

- Repository: `https://github.com/cnucho/pr-studio.git`
- Branch: `agent/phase1-video-production`
- Starting commit: `9937c2a63ddc039b6b4af61460e93abc88c3b5f4`
- Operational implementation commit: `43eb5431e9dfe66e7d944a0e7caef5df9d23a4bc`
- Draft PR: [#3](https://github.com/cnucho/pr-studio/pull/3)
- Remote branch at operational run: `43eb5431e9dfe66e7d944a0e7caef5df9d23a4bc`
- Preserved unrelated local file: `scripts/record-live-demo.mjs`
- Preserved stashes: none existed at baseline

### Migration checksums

| Migration | SHA-256 |
|---|---|
| `202607220001_video_agent_queue.sql` | `2BF46F30C4B5528A9A866C5918C4112B6CA818BD1F668C8C2661D71B2A036AB9` |
| `202607220002_video_production_phase1.sql` | `D4041655C3DA2B07ADE3278B8D286C6034BA34924E6DD4B4510D1689751B1BCF` |
| `202607220003_phase1b_closure.sql` | `596E7E1FC5E87D802B385CB631C386B44962E6BF7E447626716090CF84DC39A7` |

## Environment

- Supabase staging: `pr-studio-staging`, project reference ending `...adgzj`, Sydney region
- Railway project/environment: `pr-studio` / `staging` (`5546a096-fd0a-4997-bec9-a1174df6f506`)
- Railway service: `pr-studio-staging` (`40caf20a-50bf-463b-ad05-cab69af271ca`)
- Staging URL: `https://pr-studio-staging-staging.up.railway.app`
- Verified deployed commit: `43eb5431e9dfe66e7d944a0e7caef5df9d23a4bc`
- Creatomate project: ID ending `...a2183`
- Creatomate template: `Quick Promo`, ID ending `...07d21`
- Operational evidence run: `64d59577-4523-4b16-b4ee-b62618149756`

### Required server-side variables

| Variable | Status |
|---|---|
| `SUPABASE_URL` | PRESENT AND USABLE |
| `SUPABASE_ANON_KEY` | PRESENT AND USABLE |
| `SUPABASE_SECRET_KEY` | PRESENT AND USABLE |
| `SUPABASE_SERVICE_ROLE_KEY` | PRESENT AND USABLE |
| `CREATOMATE_API_KEY` | PRESENT AND USABLE |
| `CREATOMATE_TEMPLATE_ID` | PRESENT AND USABLE |
| `CREATOMATE_WEBHOOK_SECRET` | PRESENT AND USABLE |
| `WEBHOOK_BASE_URL` | PRESENT AND USABLE |

No secret value is included in this report, Git, generated evidence, application responses, or logs. Temporary credential-transfer files were removed after Railway configuration.

## Database evidence

- `202607220001`, `202607220002`, and the Phase 1B closure migration `202607220003` applied successfully in order through the Supabase SQL migration surface.
- Classification: `MIGRATION_APPLY_FROM_EMPTY`. No raw re-execution is claimed as idempotency evidence.
- Required tables, indexes, foreign keys, lifecycle constraints, queue claim function, ownership column, private bucket, immutable-revision triggers, and append-only review triggers were created by the applied migrations.
- Storage bucket `video-agent-results` is private.
- Real project: `ee46c866-1b41-47d0-990a-5da71e68c025`.
- Revision 1 and revision 2 persisted with different SHA-256 hashes.
- Direct revision-1 mutation was rejected with SQLSTATE `55000`.
- Revision 2 contains a changed timeline/text value while revision 1 remains readable and unchanged.
- Model A remains active: authenticated server routes plus server-only secret access; ordinary client table access is not broadened.

Queue claim and stale-lock recovery remain covered by migration/static and policy tests, but the evidence run did not execute a separately instrumented stale-lock recovery campaign. That gate is not overstated.

## Authentication and authorization evidence

- Two real staging Auth users were created for the run.
- User A created the project and both revisions through authenticated server APIs.
- User B project access returned concealed `404`.
- Unauthenticated project access returned `401`.
- Owner-only render, review, validation, and download resolution remained server-side.
- UUID knowledge alone did not grant access.

## Real Creatomate evidence

- Durable render: `5071834e-6a4d-4aca-9020-40a86aebf900`.
- Provider job: `c9e69175-4ad6-41ec-9600-f1a036c20c0c`.
- Submission HTTP status: `202`.
- Observed provider states: `planned`, `rendering`, `succeeded`.
- Template ID and provider job ID were persisted before later processing.
- The output contained H.264 video and AAC audio and had an 11.5-second duration.
- Creatomate free-trial rendering forced 480×270 at 60 fps despite the explicit 1280×720 request.
- Provider usage/cost: trial credits were used; exact actual monetary cost was unavailable.

## Webhook evidence

The endpoint implements a **secret-protected callback with authoritative provider API re-query**.

| Case | Result |
|---|---|
| Valid secret and known provider job | `200` |
| Duplicate replay | `200`, deduplicated |
| Missing secret | `401` |
| Malformed body | `400` |

The initial real callback exposed and led to correction of a lifecycle mismatch: adapter state `completed` was not a legal durable database state. Commit `43eb543` now persists provider completion as `validating`, after which FFprobe determines whether the render may enter approval. The corrected callback behavior was deployed and verified live.

Incorrect-secret, provider-timeout, unknown-job, and provider-job/render-mismatch automated campaigns were not all re-run as live provider events in this evidence run. Existing route behavior and tests cover parts of these paths, but they remain incomplete as full operational evidence.

## Persisted FFprobe evidence

### Cloud output

- Size: 1,140,157 bytes
- Container: MP4-compatible (`mov,mp4,m4a,3gp,3g2,mj2`)
- Codecs: H.264 video, AAC audio
- Streams: 1 video, 1 audio
- Dimensions: 480×270
- Duration: 11.5 seconds
- Checksum: `cba29c25945d6bc301f778f6ef894b841b3df4768f3b8f04db7927ecc8d90c7`
- Overall: **FAILED**, because requested dimensions were 1280×720
- Invalid-output approval attempt: rejected with `400`

### Local FFmpeg output

- Durable render: `2e017729-55ef-432e-995f-3ccd65f76d7d`
- Size: 128,669 bytes
- Container: MP4-compatible
- Codecs: H.264 video, AAC audio
- Streams: 1 video, 1 audio
- Dimensions: 1280×720
- Frame rate: 30 fps
- Duration: 11.5 seconds
- Checksum: `26a43dc7174fe295c95fc0fce889231977501b479b239a0cd387279f6f8a2157`
- Overall: **PASSED**
- Durable transition: `queued` → attempt persisted → private object stored → validation persisted → `awaiting_approval` → `approved`

## Private media evidence

The valid local output was uploaded to the private Supabase bucket and delivered through the authenticated download route.

| Caller | Result |
|---|---|
| Owner | `200` |
| Other authenticated user | concealed `404` |
| Unauthenticated caller | `401` |

Returned `Content-Length` was 128,669 bytes, matching the stored object. Permanent public Storage URLs were not used.

## Approval and rejection evidence

- Valid local render approval succeeded with `200`.
- A separate durable local render was advanced to `awaiting_approval` and rejected with an explicit reason; rejection returned `200`.
- Actor, render, project, revision, decision, reason, and timestamp are stored in append-only history.
- The invalid cloud output could not be approved.
- YouTube publishing remains disabled.

## Retry and fallback evidence

Automated policy tests continue to pass for bounded retry delay, retryable categories, allowed transient-provider fallback, and prohibited fallback categories. This run persisted a non-retryable `output_validation` cloud failure and did not fall back automatically, which is correct.

The full requested durable campaign for retry scheduling, retry exhaustion, stale lock recovery, duplicate worker claims, and a successful transient-cloud-to-local fallback was not executed. Gate H therefore remains incomplete even though the current final verdict is the earlier hard output-validation blocker.

## Verification results

```text
npm test
2 test files passed; 49 tests passed

npm run lint
passed

npm run build
passed; production compilation, lint/type validation, and 15 static pages completed

railway run node scripts/run-phase1b-staging.mjs
21 operational checks; run completed with OPERATIONAL_RUN_BLOCKED_OUTPUT_VALIDATION

npm audit --json
5 findings: 1 moderate, 4 high, 0 critical
```

### Automated test categories

| Category | Count | Result |
|---|---:|---|
| Domain schema | 4 | PASS |
| Migration static checks | 2 | PASS |
| Authorization policy | 7 | PASS |
| Renderer adapter | 5 | PASS |
| Orchestration lifecycle | 3 | PASS |
| FFprobe validation | 5 | PASS |
| Metadata validation regression | 3 | PASS |
| Retry | 4 | PASS |
| Fallback | 9 | PASS |
| Approval | 3 | PASS |
| Media delivery policy | 4 | PASS |
| **Total** | **49** | **PASS** |

The staging harness adds 21 real operational checks; it is reported separately from the 49 repeatable automated tests.

## Dependency audit

| Package | Scope | Severity | Runtime relevance | Fixed version | Major required | Action |
|---|---|---:|---|---|---|---|
| `brace-expansion` | ESLint/minimatch | High | Development only | `1.1.16`, `5.0.7` | No | Compatible lint dependency refresh |
| `js-yaml` | ESLint configuration | High | Development only | `4.3.0` | No | Upgrade when accepted by lint chain |
| `postcss` | Nested under Next.js | Moderate | Build/style processing | `8.5.10` | Current audit proposes unsuitable Next change | Track supported Next patch |
| `sharp` | Next image pipeline | High | Potential production path | `0.35.0` | Supported Next release required | Avoid untrusted remote images; upgrade with supported Next |
| `next` | Direct framework | High aggregate | Production | No suitable audit fix | Audit proposes unsuitable downgrade | Do not force; adopt supported patched release |

No forced audit fix or framework downgrade was performed.

## Gate status

| Gate | Status | Evidence |
|---|---|---|
| A — Staging database | PASS | Migrations applied to isolated staging |
| B — Revision immutability | PASS | Two revisions; mutation rejected `55000` |
| C — Access control | PASS | Owner success; cross-user `404`; anonymous `401` |
| D — Real Creatomate lifecycle | PASS | Real provider job completed |
| E — Live webhook lifecycle | PARTIAL | Valid/replay/missing/malformed live; remaining adversarial cases incomplete |
| F — Real output validation | **BLOCKED** | Cloud output failed required dimensions |
| G — Local renderer | PASS FOR COMPLETION PATH | Durable local render, storage, FFprobe, review; restart recovery remains unsupported |
| H — Retry and fallback | PARTIAL | Policy tests pass; full durable retry/fallback campaign incomplete |
| I — Approval | PASS | Valid approval and reasoned rejection persisted |
| J — Private media | PASS | Owner `200`, other `404`, anonymous `401` |
| K — Build and regression | PASS | 49 tests, lint, build pass |

## Remaining limitations and exact next action

1. Upgrade the Creatomate account to a plan that permits requested output dimensions, or provide an approved Creatomate project without the trial low-resolution restriction.
2. Re-run `railway run node scripts/run-phase1b-staging.mjs` and require the cloud FFprobe dimensions check to pass at 1280×720.
3. Complete the remaining live adversarial webhook and durable retry/fallback campaigns before declaring `PHASE_1_COMPLETE`.
4. Add durable cancellation/restart recovery for local rendering if that gate is required beyond the demonstrated completion path.
5. Range responses are not implemented for private media; full-object preview/download works.
6. Operator UI remains minimal; the documented server APIs and evidence harness are the supported closure surface.
7. ElevenLabs remains unimplemented.
8. YouTube OAuth and publishing remain disabled.

## Git evidence

- Operational implementation commit `43eb543` was pushed to the draft PR branch and deployed successfully to Railway staging.
- The final report/evidence commit is recorded in the task handoff after this file is committed.
- `scripts/record-live-demo.mjs` remains modified, unstaged, and excluded.
- No stash was changed.
- No secret or generated media was committed.
- Generated media was stored only in the private staging bucket; the committed JSON contains sanitized operational metadata and hashes only.
