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

## 게시 및 운영 재생 확인 — 2026-10-30

- 사용자에게 이번 영상의 약관 동의를 포함한 업로드 승인을 받은 후 게시했다.
- MethodIQ 채널 일부 공개: https://www.youtube.com/watch?v=FsCTx4uvMp8
- 운영 안내 페이지: https://ci.methodiq.tools/demos#finance-selection
- YouTube 게시 완료 및 검사 결과 문제 없음 확인.
- 실제 YouTube 플레이어에서 212.421초 끝까지 재생 완료, ended=true, 1920×1080 확인.
- 운영 포털에서도 iframe의 실제 재생 진행과 한글 자막 표시를 확인했다.
- 포털의 YouTube 주소가 게시 영상과 일치하고, 앱 주소에서 Finance Insight Studio 및 기존 중앙 로그인 안내가 표시됨을 확인했다.
- 최신 안내를 첫 번째에 추가하고 기존 2분 56초 영상도 유지했다.
- 포털 구현 커밋: `5f87944331ceaec123edac7d394c356ff8ff5e09`; 운영 배포 `7563caf5-8db5-4d73-9d69-9a6580c77ba1`, SUCCESS.
- 포털 검사 64/64 PASS, 운영 health 및 demos HTTP 200. 인증 및 운영 변수 변경 없음.

## 제작 앱 검증

- `npm run lint`: PASS
- `npm run build`: PASS (12 static pages)
- 모든 한글 자막의 가로 폭 검증: PASS
- YouTube 업로드와 운영 포털 게시·재생 검증 완료.

- 포털 검증기록 최종 커밋: 7b57b6bec0eb49aa795865fd0dc321d5787231ae; 배포 d98d2045-80df-4563-96f8-5c1d97a66d5c SUCCESS. 재배포 후 /health 및 /demos 200, 영상 ID 확인.
