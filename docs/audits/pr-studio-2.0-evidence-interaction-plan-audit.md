# PR Studio 2.0 증거 생명주기·상호작용 수집 계획 독립 감사

- 감사일: 2026-10-26
- 감사 대상: `docs/plans/2026-10-26-evidence-lifecycle-interactive-collection-repair.md`
- 감사 방식: 구현 주체와 분리된 독립 에이전트의 문서·코드 대조
- 결론: 지적 반영 후 구현 진입 승인

## 1. 수용된 방향

- 증거 소실이 3차 MP4 망각의 직접 원인이라는 분석
- 최대 3회 모델 호출을 유지하면서 3차 이후 미사용 수집을 제거하는 방안
- 자연어를 브라우저 명령으로 변환하지 않고 등록된 track 시나리오만 실행하는 원칙
- 실제 입력→실행→결과를 확인해 화면·내용 적절성을 검증하는 방향
- 증거가 부족하면 `plan_exhausted`로 멈추고 제작 게이트를 완화하지 않는 방침
- 기존 Chromium과 앱 API를 재사용하는 Railway 방향

## 2. 감사 발견사항과 처리

### 높음 — 누적 증거 입력 예산과 중복 실행 방지 부재

MP4 분석 한 건에 최대 20,000자 전사와 OCR이 포함되고 회차당 주문이 최대 8개이므로 원문 누적만 하면 프롬프트·DB·메모리가 팽창하고 동일 분석이 반복될 수 있다.

처리: **수용**. 저장용 원본과 모델 입력용 정규화 보고를 분리하고, provenance 중복 제거, 성공 우선, 값별 상한, 전체 문자 예산, 잘림 표식, 성공 capability 재사용과 배치 내 단일 분석 Promise를 계획에 추가했다.

### 높음 — 능동 브라우저 동작의 origin 신뢰 경계 부재

현재는 http/https URL이면 열 수 있다. 입력·클릭·POST로 권한을 확대하려면 DB의 `app_url`을 그대로 신뢰할 수 없다.

처리: **수용**. Railway의 `PR_STUDIO_CAPTURE_URL`을 필수 신뢰 origin으로 사용하고 저장 URL·redirect URL 일치, 앱 contract/version 표식 확인 후에만 상호작용하도록 계획에 추가했다.

### 중간 — 3차 최종 판정 용어와 모델 스키마 불일치

모델 decision은 `collect | produce`이고 `plan_exhausted`는 orchestration outcome이다.

처리: **수용**. 3차 모델도 기존 decision을 유지하고 orchestration이 3차 `collect`를 `plan_exhausted`로 변환하도록 명시했다. 3차에는 수집기를 호출하지 않는다.

### 중간 — result-ready와 증거 provenance 부재

화면 결과에 수집 전용 안정 표식이 없고 보고에도 track, scenario, input identity와 result marker가 없다.

처리: **수용**. `data-*` contract/field/action/loading/error/result-ready 표식, 제한된 결과 텍스트, provenance를 계획에 추가했다.

### 추가 관찰 — 제작 전후 검증의 순환 차단

실제 작업은 제작 뒤에만 존재할 카드 이미지·적용 음성·자막을 제작 전 차단 조건으로 요구했다.

처리: **수용**. 제작 전에는 콘텐츠·실제 앱 결과·capability·preset을 판단하고, 실제 카드·음성·자막·MP4는 제작 후 검토하도록 계약을 명시했다. 검사를 없애지 않고 원래 단계로 배치한다.

## 3. 구현 진입 조건

다음 조건이 수정 계획에 모두 반영되었다.

1. 누적 증거 정규화와 명시적 문자 예산
2. 성공 capability 및 video analysis 중복 실행 방지
3. 신뢰 origin·redirect·앱 contract 검증
4. 안정적인 result-ready와 provenance
5. 3차 `collect`의 orchestration 변환 및 무수집
6. 제작 전후 검증 책임 분리

따라서 구현에 진입할 수 있다.
