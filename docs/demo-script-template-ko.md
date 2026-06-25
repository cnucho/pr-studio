# External App Demo Script Template

## First Decision

데모 제작 전에 먼저 이것을 분리한다.

- Product demo: 이 앱이 무엇을 하는지, 왜 필요한지, 어떤 결과를 주는지 보여준다.
- Tutorial: 사용자가 실제로 어떻게 클릭하고 입력하고 결과를 확인하는지 따라 하게 한다.

같은 화면을 쓰더라도 두 영상은 스크립트 밀도, 자막, 화면 유지 시간, 강조 방식이 다르다.

## Target App Brief

- Target app:
- Repo or URL:
- Audience:
- Language:
- Video type: product demo / tutorial
- Main promise:
- Must-show workflow:
- Do-not-show items:
- Desired length:

## Product Demo Rules

- 목적은 이해와 설득이다.
- 구조는 `문제 -> 앱의 접근 -> 핵심 워크플로 -> 결과물 -> 가치`가 좋다.
- 클릭 세부 절차는 생략하거나 압축한다.
- 자막은 의미 요약형으로 쓴다.
- 한 화면의 모든 UI를 설명하지 말고, 가치가 드러나는 결과 화면을 중심으로 잡는다.

### Product Demo Cue Sheet

| Beat | Screen | Focus | Narration | Subtitle | Density | Hold |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | App opening | Product name and main workspace | 이 앱은 [대상 사용자]가 [핵심 업무]를 더 빠르게 처리하도록 돕습니다. | [핵심 업무]를 한 화면에서 | low | 4s |
| 02 | Problem state | Before workflow or pain point | 기존에는 [문제] 때문에 여러 도구를 오가야 했습니다. | 흩어진 작업을 하나로 | medium | 6s |
| 03 | Main input | First meaningful input | 사용자는 필요한 정보를 입력하고, 앱은 이를 작업 가능한 구조로 바꿉니다. | 입력을 작업 구조로 변환 | medium | 6s |
| 04 | Generated result | Output or decision panel | 결과는 [핵심 산출물]로 정리되어 바로 검토하거나 공유할 수 있습니다. | 결과물을 바로 검토 | high | 9s |
| 05 | Closing value | Final output or summary | 핵심은 단순 자동화가 아니라, 반복 업무를 일관된 제작 흐름으로 바꾸는 것입니다. | 반복 업무를 제작 흐름으로 | medium | 6s |

## Tutorial Rules

- 목적은 따라 하기다.
- 구조는 `클릭 -> 입력 -> 실행 -> 결과 확인 -> 다음 행동`이다.
- 한 beat에는 하나의 행동만 둔다.
- 자막은 단계형으로 쓴다.
- 화면에 정보가 많으면 속도를 올리지 말고 여러 beat로 쪼갠다.
- 클릭 직후와 결과 표시 직후에는 짧은 pause를 둔다.

### Tutorial Cue Sheet

| Step | Screen | User Action | Narration | Subtitle | Density | Hold |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Start screen | Open target feature | 먼저 [기능명]으로 이동합니다. | 1. [기능명] 열기 | low | 4s |
| 02 | Input form | Fill first field | 첫 번째로 [필드명]을 입력합니다. | 2. [필드명] 입력 | medium | 5s |
| 03 | Input form | Fill required fields | 다음으로 [필수 항목]을 채웁니다. 이 값이 결과의 기준이 됩니다. | 3. 필수 항목 입력 | high | 8s |
| 04 | Run action | Click generate/run | 입력을 확인한 뒤 [실행 버튼]을 누릅니다. | 4. 실행 | low | 4s |
| 05 | Result screen | Review output | 결과 화면에서는 먼저 [핵심 결과]를 확인합니다. | 5. 핵심 결과 확인 | high | 10s |
| 06 | Result screen | Next action | 문제가 없으면 [저장/공유/내보내기]로 다음 작업을 진행합니다. | 6. 다음 작업 진행 | medium | 6s |

## Subtitle Rules

Product demo subtitles:

- `[업무]를 한 흐름으로`
- `[입력]을 [결과]로 변환`
- `[산출물]을 바로 검토`

Tutorial subtitles:

- `1. 기능 열기`
- `2. 필수 항목 입력`
- `3. 결과 확인`

Avoid:

- Full transcript captions on every beat
- Captions that mention UI not visible on screen
- One caption with multiple unrelated claims

## Pacing Rules

- Do not use one global speed multiplier.
- Low-density bridge screens can be 3-5 seconds.
- Medium-density workflow screens can be 5-8 seconds.
- High-density result screens should be 8-12 seconds or split into separate beats.
- Use highlight boxes, zoom crops, cursor movement, and pauses instead of faster narration.
- For tutorials, narration should wait for the visual action. The viewer should see the click or result before hearing the explanation of that result.

## Manifest Shape

When moving from script to renderer, convert beats to JSON:

```json
{
  "id": "target-app-result-review",
  "type": "tutorial",
  "screen": "result-screen.png",
  "action": "Highlight the generated result panel",
  "focus": "generated result panel",
  "narration": "결과 화면에서는 먼저 핵심 결과를 확인합니다.",
  "subtitle": "5. 핵심 결과 확인",
  "density": "high",
  "minHoldMs": 9000,
  "postPauseMs": 900
}
```
