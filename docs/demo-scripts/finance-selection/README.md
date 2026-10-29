# 금융 보고서 선택·추가 분석 데모

- 대상: CI Finance Insight Studio 운영 버전 `18d16f2a5b3b7942b966b916bb70cf0b0628ba0c`
- 방식: 실제 운영 UI 캡처를 편집한 한국어 사용 안내. 연속 녹화가 아니다.
- 자료: 프로그램 검증용 합성자료. 실제 금융시장 조사결과가 아니다.
- 핵심 흐름: 대화 연결 링크 → 제목 클릭 선택 → GPT 최소 요청 → 새 보고서 검토 → 앱 ZIP 다운로드.
- 원본 GPT 대화: https://chatgpt.com/c/6ae3cd0b-5cc8-83ee-878d-216bfd7aee8e
- 결과 보고서 ID: `1f05880a8f3dd45c3cae`
- 보고서와 분석 결과는 별도 GPT 대화가 운영 MCP로 생성했다. PR Studio는 화면·자막·내레이션만 구성한다.
- 7번 장면은 두 실제 화면을 나란히 편집했다. 실시간 동시 화면이라고 표시하지 않는다.
- 이번 검증에서 GPT 다운로드 카드는 표시되지 않았다. 영상은 실제로 확인한 앱의 ZIP 다운로드를 안내하며 대화 카드 성공을 주장하지 않는다.

## 재현

기존 PR Studio 제작기를 재사용한다. 캡처 폴더에는 `demo.json`의 이미지 파일들을 넣는다.

```powershell
python docs/demo-scripts/finance-insight/render.py --manifest docs/demo-scripts/finance-selection/demo.json --capture-root <실제화면캡처폴더> --out out/finance-selection-demo
```

Google TTS 키가 없는 로컬에서는 기존 Windows System.Speech를 사용했다. 새 인증이나 API 키를 추가하지 않았다. 결과 영상·음성·화면은 Git에 포함하지 않는다.

## 확인한 산출물

- 1920×1080, H.264/AAC, 212.393초(3분 32초), 6,279,390 bytes
- 영상 SHA-256: `dbc3dcd4150a8aaffe4c30cd5a85b7bd71dd6e8b4b9337148d26045816eca05f`
- 10개 장면, 한국어 의미 자막을 영상에 삽입하고 별도 SRT 출력
- 각 장면에 내레이션 뒤 1.3초 유지
- 단일 음성 시험, ffprobe, 전체 ffmpeg strict decode: PASS
- 구성 장면 및 인코딩 영상의 자막·선택 표시·표·차트 확인
- 운영 앱 ZIP 재다운로드 SHA-256: `15cb1b46f2abcb8f71c75a60548416549f1576400bc98f7afd79619100095685`
- 재다운로드 파일은 이전 독립 검증의 원본 ZIP과 동일하다.

YouTube 게시·재생 및 CI Portal 연결 결과는 업로드 완료 후 별도 기록한다.

## 제작 앱 검증

- `npm run lint`: PASS
- `npm run build`: PASS (12 static pages)
- 모든 한글 자막의 가로 폭 검증: PASS
- YouTube 업로드 직전 약관 동의 확인 요청 중. 게시 완료로 기록하지 않는다.
