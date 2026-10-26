# 좋은 시각화 만들기 · PR Studio 제작 패키지

MethodIQ 시각화 도구를 직접 광고하기보다, 조사·정책·학술 보고서에서 좋은 시각화를 만드는 방법을 설명하는 교육형 소개 패키지다.

## 산출물

- `good-visualization-guide-ko.md`: 블로그·사내 게시·수업 자료로 사용할 수 있는 본문
- `storyboard-lecture.json`: 약 13분 30초 수업 영상의 장면, 내레이션, 화면 자막 원본
- `storyboard.json`: 짧은 소개판의 원본(보존용)
- `visual-guide.html`: 전체 흐름을 브라우저에서 확인하는 미리보기
- `render_scene.py`: 1920×1080 강의 장면 렌더러
- `render.mjs`: PR Studio의 음성 합성·자막·검증 규칙을 재사용하는 영상 제작 파이프라인

## 핵심 방향

- 제품 기능 나열보다 시각적 판단 원칙을 먼저 설명한다.
- AI 시대에도 시각화가 필요한 이유와 기술 접근성 변화부터 설명한다.
- 같은 정보를 텍스트·표·차트로 제시하고 각각의 장단점을 비교한다.
- 도식, 수치 차트, 설문 시각화가 답하는 질문을 구분한다.
- 한 화면에는 하나의 결론만 둔다.
- 색상, 라벨, 축, 단위와 출처를 장식이 아닌 의미 체계로 다룬다.
- MethodIQ Diagram Studio, Chart Studio, Survey Visualization은 마지막에 원칙을 반복 적용하는 수단으로만 소개한다.
- 25개 장면 사이에 읽기 시간을 두어 발표 영상이 아니라 수업용 미니 강연으로 구성한다.

## 렌더링

```powershell
node docs\demo-scripts\methodiq-visualization\render.mjs
```

완성 영상 `good-visualization-lecture-ko.mp4`와 중간 산출물은 Git에 포함되지 않는 `out/methodiq-visualization/`에 생성된다.

