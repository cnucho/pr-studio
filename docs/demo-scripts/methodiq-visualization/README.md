# 좋은 시각화 만들기 · PR Studio 제작 패키지

MethodIQ 시각화 도구를 직접 광고하기보다, 조사·정책·학술 보고서에서 좋은 시각화를 만드는 방법을 설명하는 교육형 소개 패키지다.

## 산출물

- `good-visualization-guide-ko.md`: 블로그·사내 게시·수업 자료로 사용할 수 있는 본문
- `storyboard.json`: 영상 장면, 내레이션, 화면 자막의 단일 원본
- `visual-guide.html`: 1920×1080 장면 렌더러
- `render.mjs`: PR Studio의 음성 합성·검증 규칙을 재사용하는 영상 렌더러

## 핵심 방향

- 제품 기능 나열보다 시각적 판단 원칙을 먼저 설명한다.
- 도식, 수치 차트, 설문 시각화가 답하는 질문을 구분한다.
- 한 화면에는 하나의 결론만 둔다.
- 색상, 라벨, 축, 단위와 출처를 장식이 아닌 의미 체계로 다룬다.
- MethodIQ Diagram Studio, Chart Studio, Survey Visualization은 마지막에 원칙을 반복 적용하는 수단으로만 소개한다.

## 렌더링

```powershell
node docs\demo-scripts\methodiq-visualization\render.mjs
```

완성 영상과 중간 산출물은 Git에 포함되지 않는 `out/methodiq-visualization/`에 생성된다.

