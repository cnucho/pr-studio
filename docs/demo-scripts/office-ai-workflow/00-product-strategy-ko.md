# MethodIQ AI Office Workflow 데모 전략

## 한 문장 소개

AI가 만든 초안을 사람이 필요한 부분만 정확히 고치고, 그 수정본을 AI가 다시 읽어 완성하도록 연결하는 편집형 Office 작업 흐름이다.

## 해결하려는 문제

GPT는 내용을 정리하고 초안을 만드는 데 강하다. 그러나 실제 업무에서는 마지막 편집에서 시간이 많이 든다.

- 문장 하나를 고쳐 달라고 했는데 다른 문단까지 다시 쓰는 경우가 있다.
- PPTX나 도식이 이미지처럼 굳어 텍스트, 도형, 연결선을 다시 편집하기 어렵다.
- 차트의 색상, 글꼴, 제목, 범례, 주석을 회사 스타일에 맞추는 데 시간이 든다.
- AI와 Office 파일 사이를 오가며 복사·붙여넣기와 서식 복구를 반복한다.
- 긴 PPTX 전체를 다시 보내면, 고치지 않아도 될 슬라이드까지 달라질 수 있다.

이 문제는 초안 생성의 문제가 아니라, **사람의 판단을 보존하면서 AI와 결과물을 왕복시키는 마지막 편집의 문제**다.

## 도구별 역할

### GPT Editor

AI 초안을 편집창에서 직접 고친다. 원본과 현재본을 비교하고, 선택한 문장이나 문단만 AI에 다시 보내 다듬은 뒤 결과를 반영한다. 사람의 수정은 사라지지 않고 다음 AI 작업의 기준이 된다.

### Chart Studio

데이터에서 완성도 높은 차트를 만든다. 국제적 공공기관·연구기관의 원칙을 반영한 스타일 프리셋을 먼저 선택하고, 제목·범례·색상·글꼴을 일관되게 적용한다. Sankey, slope, sunflower처럼 Excel에서 만들기 번거로운 차트도 편집 가능한 결과로 만들고, 해석과 함께 PPTX로 보낸다.

### Diagram Studio

GPT가 정리한 구조를 도식으로 바꾼다. 사람은 노드, 문구, 연결선을 편집하고, AI는 수정된 전체 구조를 다시 읽어 균형과 표현을 다듬는다. 최종 SVG는 요소별로 편집 가능하고 PPTX에 삽입할 수 있다.

### PPTX Studio

GPT가 만든 PPTX를 처음부터 다시 생성하는 도구가 아니다. 전체 파일은 한 번 불러오고, 목차와 선택한 1~2장만 AI에 전달해 필요한 부분만 다시 편집한다. 차트와 도식을 제 위치에 넣고, 최종 파일은 앱에서 내려받는다.

## 영상 구성

1. 통합 소개: 필요성, 실제 사용자 불만, 네 도구의 연결, 최종 가치
2. GPT Editor 사용법: AI 초고 → 인간 수정 → 선택 범위 AI 재편집 → 결과 반영
3. Chart Studio 사용법: 스타일 선택 → 고급 차트 → 해석 → PPTX 전달
4. Diagram Studio 사용법: 텍스트 구조 → 도식 → 인간 편집 → AI 재검토 → PPTX 전달
5. PPTX Studio 사용법: 전체 파일 불러오기 → 1~2장 선택 → 부분 재편집 → 다운로드

## 표현 원칙

- “AI가 대신 완성한다”가 아니라 “사람이 통제하고 AI가 다시 다듬는다”라고 말한다.
- 기능명보다 사용자가 줄이는 시간과 피하는 실수를 먼저 말한다.
- 실제 앱 화면을 사용하고, 존재하지 않는 자동화를 연출하지 않는다.
- 차트와 도식은 이미지가 아니라 편집 가능한 결과라는 점을 화면과 자막에서 반복한다.
- PPTX는 100장 전체를 매번 AI에 보내지 않고, 필요한 1~2장만 선택하는 구조라고 명확히 말한다.

## 공개 근거

- OpenAI Community: 전체 문서를 다시 만들지 않고 선택한 부분만 고치는 지속형 작업공간 요구
  - https://community.openai.com/t/canvas-again-restore-canvas-as-a-persistent-model-independent-workspace/1393271
- OpenAI Community: PPTX 구조를 보존하며 텍스트·도형·레이아웃을 정밀 편집하는 기능 요구
  - https://community.openai.com/t/production-grade-powerpoint-editing-for-chatgpt/1384928
- OpenAI Community: 생성 문서의 간격·머리글·레이아웃이 수정 과정에서 달라지는 문제
  - https://community.openai.com/t/feature-request-automatic-visual-qa-and-regression-checking-for-generated-documents/1398838
- OpenAI Community: 흐름도와 구조화 이미지를 편집 가능한 PPTX로 바꾸기 어려운 문제
  - https://community.openai.com/t/not-able-to-convert-structured-images/1129287

## 음성·자막

- Google Cloud TTS 남성 음성: `ko-KR-Chirp3-HD-Kore`
- 말하기 속도: 0.94
- 숫자와 영문 약어 앞뒤에 짧은 쉼을 주고, 한 문장에 기능을 두 개 이상 몰아넣지 않는다.
- 자막은 음성을 그대로 길게 옮기지 않고, 장면의 핵심만 한 줄로 표시한다.
