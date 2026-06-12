# AI 시대 홍보 전략 플랫폼

정책홍보 콘텐츠 생성, 상태 기반 마이크로타겟팅, YouTube 성과 수집을 하나의 흐름으로 통합한 데모 플랫폼입니다.

## 통합 범위

- `pr-ai-demo-studio`의 Next 기반 실제 동작형 앱을 기본 구조로 흡수했습니다.
- 기존 `ai-sidae-hongbo`의 정부홍보 마이크로타겟팅 데모와 YouTube 성과 수집기를 앱 탭으로 통합했습니다.
- `AIAnalysisConferencePresentation`은 별도 repo로 유지하고, YouTube 메타데이터, 자막 파일명, 녹화 체크리스트 같은 제작 워크플로만 YouTube 결과 패키지에 반영했습니다.
- `ai-report-editor`, `reportDesk`, `gWriter Verify`는 별도 제품으로 유지하고, AI 검색 친화 글쓰기 프레임, storyline-first brief, 출처/검증 게이트, gWriter handoff 원칙만 `AI 글쓰기` 탭에 흡수했습니다.
- 기존 정적 HTML 원본은 `legacy/ai-sidae-hongbo-static/`에 보존했습니다.

## 주요 기능

- 16:9 영상 데모 스튜디오
- 보도자료 작성기
- 뉴스 분석기
- 유튜브 콘텐츠 작성기
- YouTube 게시 메타데이터, 자막 파일명, 녹화 체크리스트 생성
- AI 검색/GEO 친화 글쓰기 설계
- ReportDesk/gWriter로 넘길 검증형 작성 handoff 패키지 생성
- 상태 기반 마이크로타겟팅 전략 시뮬레이션
- YouTube Data API 기반 공개 성과지표 수집 및 CSV 내보내기
- PDF 텍스트 추출 API

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://127.0.0.1:3016`을 엽니다.

## 녹화/제작 흐름

1. `영상 스튜디오` 탭에서 전체 설명 흐름과 자막을 확인합니다.
2. `보도자료`, `뉴스 분석`, `유튜브 제작` 탭에서 실제 입력과 생성 결과를 녹화합니다.
3. `AI 글쓰기` 탭에서 공개용 글, 보고서 초안, FAQ, 검증 체크리스트를 설계합니다.
4. `타겟팅 전략` 탭에서 시민 상태별 메시지 전략을 비교합니다.
5. `성과 수집` 탭에서 YouTube 성과지표를 수집하거나 샘플 데이터로 학습 루프를 확인합니다.
6. 1080p 16:9 기준으로 녹화하고, 자막과 메타데이터 패키지를 함께 정리합니다.

## 원격 repo

통합 대상 원격 저장소: https://github.com/cnucho/ai-sidae-hongbo
