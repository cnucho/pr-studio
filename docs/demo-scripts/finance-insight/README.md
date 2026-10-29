# 금융기획조사 앱 소개 및 사용 안내

- 대상: 금융기획조사 보고서 사용자
- 형식: 제품 소개 + 사용 안내, 한국어 자막 및 내레이션
- 소스: 실제 운영 GPT 대화와 독립 웹앱의 화면 캡처
- 편집: 생성 대기 구간 생략, 나란히 배치한 두 화면은 편집 화면이라고 표시
- 금지: 가짜 실행 결과, 보고서 대필, 토큰/계정정보 노출, 실제 조사결과인 것처럼 소개
- 이번 자료: 엑셀 + 설문지 합성자료. SPSS 사용 시연을 했다고 주장하지 않음.
- 산출물: MP4, SRT, 대본, 검증 결과. 영상 원본은 ignored out/에 보관.

각 장면의 제목·내레이션·자막·화면 파일은 demo.json에 정의합니다.
금융 앱과 인증 코드를 변경하지 않습니다.

재생성:
```powershell
python docs/demo-scripts/finance-insight/render.py --manifest docs/demo-scripts/finance-insight/demo.json --capture-root <실제화면캡처폴더> --out out/finance-insight-demo
```

이 영상은 연속 무편집 녹화가 아닌 실제 화면 기반의 편집 안내 영상입니다.

환경: Python + Pillow, Node.js, ffmpeg/ffprobe, Windows 한국어 System.Speech.
이번 영상은 이 PC의 로컬 한국어 음성을 사용합니다. 새 API 키나 인증 설정은 만들지 않습니다.
