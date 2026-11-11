# PR Studio 영상 제작 도구 수리 기록

## 목적

PR Studio의 웹 앱과 영상 워커를 유지하면서, 로컬·Railway 환경에서 데모 영상 제작 도구를 같은 절차로 점검하고 재현할 수 있도록 정비한다.

## 수리 핵심

- 운영 브랜치의 웹 앱, Supabase 연동, 영상 워커, 상태 확인 API와 Docker 구성을 보존했다.
- Next.js 16.4.6과 React 19.2.0으로 갱신하고 ESLint 구성을 Next.js 16 방식으로 전환했다.
- Playwright를 프로젝트 의존성으로 명시하고, 시스템 Chrome이 없을 때 설치된 Playwright Chromium을 사용하도록 캡처·렌더링 스크립트를 보완했다.
- Node.js, Python, FFmpeg/FFprobe, Playwright, Pillow, ReportLab, Tesseract 및 한국어 OCR 자료를 검사하는 `npm run check:video`를 추가했다.
- 영상 제작용 Python 패키지를 `requirements-video.txt`에 명시했다.
- 생성 영상, 오디오, 캡처 화면과 작업 JSON은 Git에 넣지 않고 기존 무시 경로에서 관리한다.
- 조사회사 간부 시연용 목표, 영상계획서, 대본, 스토리보드, YouTube 메타데이터와 렌더러를 `docs/demo-scripts/research-executive-demo/`에 추가했다.
- 실제 배포 화면을 녹화하는 피드백 워크스루는 PC별 Dropbox 경로를 하드코딩하지 않으며, 전체 영상 디코딩·표본 프레임·SHA-256 검증 결과를 함께 남긴다.

## Google Cloud TTS 자격증명

Google 서비스 계정 JSON은 파일이나 Git에 저장하지 않는다. Railway의 `GOOGLE_SERVICE_ACCOUNT_JSON` 변수를 현재 PowerShell 프로세스에만 주입하고 렌더링이 끝나면 즉시 원래 환경으로 복원한다.

```powershell
npm run render:executive-demo:google
```

이 명령은 `scripts/render-with-google-tts.ps1`을 통해 Railway 변수의 값을 출력하지 않고 읽으며, Google TTS 공급자와 한국어 음성을 강제로 선택한다. 실행 로그와 오류 메시지에도 자격증명 원문을 남기지 않아야 한다.

## 설치 및 점검

```powershell
npm ci
python -m pip install -r requirements-video.txt
npx playwright install chromium
npm run check:video
npm test
npm run lint
npm run build
npm audit --omit=dev
```

Tesseract 한국어 자료는 사용자별 데이터 경로에 둘 수 있다. 설치 상태는 `npm run check:video` 결과의 `tesseract`와 `tesseractKoreanData`로 확인한다.

## 배포 구조와 보존 정책

- Railway의 웹 서비스와 영상 워커는 동일 운영 브랜치에서 각각 Dockerfile과 Dockerfile.worker로 빌드한다.
- 두 서비스는 영속 볼륨을 사용하지 않는다. 컨테이너 로컬 파일은 임시 처리용이며, 영속 산출물은 Supabase Storage 등 외부 저장소에 둔다.
- 코드 복구 기준은 Git 커밋이고, 배포 복구 기준은 Railway의 마지막 성공 배포 ID다.
- 배포 전에 웹 앱 빌드, 테스트, 린트, 영상 도구 점검을 모두 통과시킨다.
- 배포 후 `/api/health`와 영상 워커 상태를 각각 확인한다.

## 롤백 기준

새 배포가 실패하면 Railway에서 직전 성공 배포로 되돌린다. 코드 수정이 필요한 경우 직전 Git 커밋을 기준으로 새 수정 커밋을 만들며, 운영 브랜치의 기록을 강제로 재작성하지 않는다.
