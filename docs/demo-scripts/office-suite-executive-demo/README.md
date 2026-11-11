# MethodIQ Office Suite 전체 시연

조사회사 간부 앞에서 gWriter/GPT Editor, Chart Studio, Diagram Studio, PPTX Studio의 실제 업무 흐름을 한 번에 설명하기 위한 한국어 시연영상이다. 개요만 나열하지 않고 각 도구의 실제 화면, 사용 순서, PPTX로 이어지는 결과를 보여준다.

## 시연 구성

| 시작 | 구간 | 핵심 설명 |
| --- | --- | --- |
| 00:00 | Office Workflow 개요 | AI 초고, 인간 수정, 선택 범위 AI 재편집, 편집 가능한 최종 파일의 연결 |
| 02:10 | gWriter / GPT Editor | 원본·현재본 비교, 인간 직접 수정, 선택한 문장만 AI로 재편집, 결과 반영 |
| 03:08 | Chart Studio | 목적에 맞는 차트, 스타일 프리셋, Sankey·sunflower, AI 해석, PPTX 전달 |
| 04:17 | Diagram Studio | 텍스트 구조화, 편집 가능한 노드·연결선, 인간 수정 후 AI 재검토, PPTX 전달 |
| 05:09 | PPTX Studio | 전체 PPTX를 한 번 불러오고 필요한 1~2장만 선택해 재편집·다운로드 |

전체 길이는 약 6분이다. 각 구간 사이에는 0.6초 교차 전환을 적용한다.

## 간부 대상 시연 순서

1. 개요 구간에서 핵심 가치를 먼저 설명한다. 네 앱을 별도 제품으로 소개하기보다 `AI 초고 → 인간 판단 → AI 재검토 → 편집 가능한 산출물`이라는 하나의 작업 흐름으로 제시한다.
2. gWriter 구간에서는 문서 전체를 재생성하지 않고 고른 문장만 다시 다듬는 점을 강조한다.
3. Chart 구간에서는 Excel 기본 차트뿐 아니라 Sankey와 sunflower를 만들고 해석과 함께 PPTX로 넘기는 과정을 설명한다.
4. Diagram 구간에서는 결과가 이미지로 굳지 않고 노드, 문구, 연결선을 다시 고칠 수 있음을 강조한다.
5. PPTX 구간에서는 긴 발표도 전체 파일을 반복 전송하지 않고 필요한 장만 재편집한다는 점으로 마무리한다.

## 재현

먼저 `npm run render:office-ai-workflow-demo`로 다섯 개의 개별 튜토리얼을 만든다. Google TTS를 새로 생성할 때는 Railway의 `GOOGLE_SERVICE_ACCOUNT_JSON`을 환경 변수로 주입하며 자격증명 파일을 저장소에 두지 않는다.

개별 영상이 준비된 뒤 다음 명령으로 전체판을 만든다.

```powershell
npm run render:office-suite-full-demo
```

출력 파일은 `out/office-suite-executive-demo/methodiq-office-suite-full-demo-ko.mp4`이고 검증 결과는 같은 폴더의 `verification.json`에 기록된다. `out/`은 생성 산출물이므로 Git에 커밋하지 않는다.

## 검수 기준

- 1920×1080, 30fps, H.264 영상과 AAC 음성
- 다섯 구간 모두 실제 도구 화면과 한국어 내레이션·자막 포함
- 렌더 후 FFmpeg 전체 디코드 검사 통과
- 출력 SHA-256과 입력 영상별 SHA-256 기록
- CI Portal에는 관리자 전용 데모로 게시
