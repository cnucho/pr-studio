# PR Studio (홍보물제작소)

PR Studio는 보도자료, 뉴스 분석, 영상 기획, AI 글쓰기, 타겟팅 전략, YouTube 성과 학습을 하나의 흐름으로 묶은 홍보 제작 스튜디오입니다.

한국어 별칭은 `홍보물제작소`입니다. 한국 사용자에게는 쉽고 친근하게, 외국 사용자에게는 `PR Studio`라는 이름으로 바로 이해되도록 정리했습니다.

## 통합 범위

- 기존 `pr-ai-demo-studio` 실험과 `ai-sidae-hongbo`의 정부홍보 마이크로타겟팅 데모를 하나의 Next 앱으로 정리했습니다.
- 정적 YouTube 성과 수집기와 기존 홍보 데모는 앱 탭과 레거시 자료로 통합했습니다.
- `AIAnalysisConferencePresentation`은 별도 repo로 유지하고, YouTube 메타데이터, 자막 파일명, 녹화 체크리스트 같은 제작 워크플로만 YouTube 결과 패키지에 반영했습니다.
- `ai-report-editor`, `reportDesk`, `gWriter Verify`는 별도 제품으로 유지하고, AI 검색 친화 글쓰기 프레임, storyline-first brief, 출처/검증 게이트, gWriter handoff 원칙만 `AI 글쓰기` 탭에 흡수했습니다.
- 기존 정적 HTML 원본은 `legacy/pr-studio-static/`에 보존했습니다.

## 주요 기능

- 16:9 영상 데모 스튜디오
- AI Agent 기반 YouTube MP4 생성
- 보도자료 작성기
- 뉴스 분석기
- 유튜브 콘텐츠 작성기
- YouTube 게시 메타데이터, 자막 파일명, 녹화 체크리스트 생성
- AI 검색/GEO 친화 글쓰기 설계
- ReportDesk/gWriter로 넘길 검증형 작성 handoff 패키지 생성
- 상태 기반 마이크로타겟팅 전략 시뮬레이션
- YouTube Data API 기반 공개 성과지표 수집 및 CSV 내보내기
- PDF 텍스트 추출 API

## AI Agent 영상 생성

`AI Agent` 탭에서 브리프를 입력하고 `영상 생성`을 누르면 앱이 제작 계획, 화면 캡처, MP4 렌더링, 파일 검증을 순서대로 실행합니다.

- `OPENAI_API_KEY`가 있으면 GPT가 제작 계획을 세웁니다.
- `OPENAI_MODEL`로 사용할 모델을 바꿀 수 있습니다. 기본값은 `gpt-5.5`입니다.
- API 키가 없거나 GPT 요청이 실패하면 로컬 플래너로 같은 렌더링 흐름을 실행합니다.
- 완성 파일은 `out/pr-studio-final.mp4`에 저장되고 앱 안에서 바로 재생하거나 다운로드할 수 있습니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://127.0.0.1:3016`을 엽니다.

## 녹화/제작 흐름

1. `영상 스튜디오` 탭에서 전체 설명 흐름과 자막을 확인합니다.
2. `AI Agent` 탭에서 앱이 직접 YouTube 데모 MP4를 생성합니다.
3. `보도자료`, `뉴스 분석`, `유튜브 제작` 탭에서 실제 입력과 생성 결과를 녹화합니다.
4. `AI 글쓰기` 탭에서 공개용 글, 보고서 초안, FAQ, 검증 체크리스트를 설계합니다.
5. `타겟팅 전략` 탭에서 시민 상태별 메시지 전략을 비교합니다.
6. `성과 수집` 탭에서 YouTube 성과지표를 수집하거나 샘플 데이터로 학습 루프를 확인합니다.
7. 1080p 16:9 기준으로 녹화하고, 자막과 메타데이터 패키지를 함께 정리합니다.

## 원격 repo

원격 저장소: https://github.com/cnucho/pr-studio
