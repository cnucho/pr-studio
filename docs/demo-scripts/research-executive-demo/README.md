# 조사·연구회사 간부 대상 MethodIQ 통합 시연

## 제작 성격

- 유형: 제품 소개 영상
- 대상: 조사·연구회사 대표, 임원, 본부장, 연구책임자
- 핵심 약속: 조사 결과를 차트·도식·설문 시각화로 설명하고, PPTX와 검토 문서까지 한 흐름으로 이어 갈 수 있음을 보여 준다.
- 목표 길이: 약 2분 30초
- 언어: 한국어
- 화면: 1920×1080, 16:9

이 패키지는 연속 무편집 녹화가 아니라 검증된 제품 기능을 경영진 관점에서 설명하는 편집형 제품 소개다. 장면 화면은 설명용으로 재구성하며, 실제 도구에서 확인하지 않은 기능이나 성과 수치는 주장하지 않는다.

## 시연 범위

1. Chart Studio: 집단 비교와 추세 차트
2. Diagram Studio: 조사·분석 절차 도식
3. Survey Visualization: 문항별 응답 구조
4. PowerPoint 편집기: 시각화 삽입과 PPTX 내보내기
5. gWriter: 보고 문안 검토와 수정 제안

## 제작 파일

- `demo-goal-ko.md`: 시연목표와 성공 기준
- `video-plan-ko.md`: 장면 구성과 제작 규격
- `script-ko.md`: 내레이션·화면 자막 대본
- `storyboard.json`: 렌더러 입력 원본
- `youtube-metadata-ko.md`: 제목·설명·챕터·태그 초안
- `render.mjs`: PR Studio 공통 TTS·FFmpeg·검증 흐름

## 렌더링

```powershell
npm run check:video
node docs\demo-scripts\research-executive-demo\render.mjs
```

Google Cloud 자격 증명이 있으면 `ko-KR-Chirp3-HD-Kore`, 속도 0.94를 사용한다. 자격 증명이 없고 `OPENAI_API_KEY`가 있으면 OpenAI 한국어 음성으로 폴백한다. 실제 공급자는 `out/research-executive-demo/verification.json`에 기록한다.

완성 영상, 음성, 프레임, 자막, 대본과 검증 영수증은 Git에서 제외된 `out/research-executive-demo/`에 생성한다.
