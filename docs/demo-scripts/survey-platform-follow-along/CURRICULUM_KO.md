# 설문 플랫폼 따라하기 과정

이 과정은 총론과 다르다. 총론은 6단계의 역할과 경계를 듣고 이해하는 개관이고, 아래 독립편은 사용자가 영상을 멈추고 같은 조작을 직접 수행하는 실습이다. 각 편은 약 6분이며 앞 편을 보지 않아도 시작할 수 있다. 모든 앱은 서로 독립된 비식별 샘플을 사용한다.

## 공통 수업 구조

1. 준비물과 직접 URL을 확인한다.
2. 강사의 조작을 본 뒤 `직접 해보기` 자막에서 영상을 잠시 멈춘다.
3. 같은 조작을 수행한다.
4. 의도된 경고나 실패 상태를 한 번 확인한다.
5. 화면 수치, 상태, 산출물로 성공 여부를 판정한다.
6. 원본·미리보기·기계 검증·사람 승인 경계를 확인한다.

실제 개인정보, 응답자 토큰, 운영 원자료는 사용하지 않는다. 다운로드 산출물은 연습 폴더에만 저장한다.

## 12개 독립편

| ID | 앱 | 핵심 기능 | 직접 해보기 | 성공 기준 |
|---|---|---|---|---|
| A1 | 설문 입력 | 템플릿과 문항 편집 | 튜토리얼 샘플을 열고 문항 ID·유형·필수 여부를 확인한다 | 질문·섹션·오류 수를 설명하고 blocking 오류가 없다 |
| A2 | 설문 입력 | 조건 확인과 초안 인계 | 분기/범위 조건을 확인하고 저장·Export·검토 이동을 수행한다 | 초안 산출물과 다음 단계가 validation임을 식별한다 |
| V1 | 설문 검토 | finding과 severity | Sample을 불러 Review를 실행하고 error/warning/info를 구분한다 | 질문 2, finding 5, blocking 0의 의미를 설명한다 |
| V2 | 설문 검토 | 승인 경계와 receipt | 남은 번역 경고를 읽고 receipt의 project/run/decision을 확인한다 | approved가 사람의 최종 승인과 다름을 설명한다 |
| D1 | 응답 배포 | 정책 설정과 package | layout·필수 응답·검증 시점·privacy를 설정해 package를 만든다 | package가 생성되고 preview 버튼이 활성화된다 |
| D2 | 응답 배포 | 응답자 미리보기 | 필수 문항을 비워 Next 실패를 보고 답한 뒤 이동·제출한다 | 정책대로 차단·이동되며 preview 제출임을 구분한다 |
| C1 | 검증·정제 | 규칙 실행과 profile | Sample과 Run cleaning을 실행해 input/clean/flags/rules를 읽는다 | 3 input, 3 clean, 5 flags, 7 rules를 확인한다 |
| C2 | 검증·정제 | 자동수정·review flag·receipt | 자동 표준화와 사람 판단 플래그를 비교하고 산출물을 확인한다 | 원본과 정제본을 구분하고 미해결 flag를 설명한다 |
| N1 | 분석 | 입력과 task strategy | Sample을 불러 입력의 project/run과 task 생성 범위를 확인한다 | 세 입력의 연결과 분석 단위를 설명한다 |
| N2 | 분석 | segment crosstab과 DSL | 질문·segment·weight를 지정해 표를 만들고 preview/DSL을 대조한다 | table ID와 source task ID의 연결을 찾는다 |
| R1 | 보고서 | 검증 입력과 summary | Sample과 Build를 실행하고 요약 하나를 원표·receipt와 대조한다 | 주장에 supporting table/chart 근거가 있다 |
| R2 | 보고서 | caveat와 draft package | warning·caveat·상태를 점검하고 report package를 확인한다 | draft를 외부 공개 상태로 오해하지 않는다 |

## 제작 게이트

각 앱의 두 편을 녹화하기 전에 실제 운영 화면에서 모든 실습 동작을 재현한다. 실패하면 제품 코드를 먼저 수정·테스트·푸시·배포한다. 두 편을 렌더링한 뒤 해상도, 음성, 핵심 한글 자막, 실제 조작, 성공 기준을 검수하고 Dropbox에 앱별 폴더로 백업한다. 그다음 PR Studio를 커밋·푸시하고 독립 검토 작업에 리뷰를 요청한다.
