# PR Studio 2.0 단계 7 감사

- 단계: 기존 MP4 분석과 Railway 실행
- 감사 기준: `docs/plans/2026-10-25-pr-studio-2.0-implementation.md`
- 대상 브랜치: `agent/pr-studio-2.0`

## 계획 감사

### 고정 목표와의 일치

기존 영상을 참고하는 목적은 화면을 화려하게 복제하는 것이 아니라 기존 설명의 내용, 순서, 길이와 빠진 근거를 기획 자료로 삼는 데 있다. 업로드 파일은 비공개로 관리하고 분석 결과만 다음 기획 회차에 전달해야 한다.

### 계획 수정과 결정

- 계획서에 예시로 적은 외부 `mcp-video-analyzer` CLI는 현재 저장소에 고정 버전, 보안 검증과 Railway 재현 근거가 없다.
  - 결정: `수정 수용`
  - 처리: Docker에 이미 포함된 FFmpeg/FFprobe와 공식 OpenAI 파일 전사 API를 조합한 제한 분석기를 자체 구현한다.
- OpenAI 공식 문서에 따라 완성된 녹음 파일은 `/v1/audio/transcriptions`에 multipart로 보내고 일반 파일 전사에는 `gpt-transcribe`를 사용한다.
  - 근거: [OpenAI Speech-to-text guide](https://developers.openai.com/api/docs/guides/speech-to-text)
- 분석 입력은 인증 사용자가 비공개 Supabase Storage에 올린 MP4 식별자만 허용한다.
- 외부 URL과 모델이 만든 임의 로컬 경로는 입력으로 받지 않는다.
- 파일 크기, 형식, 길이, 처리 시간과 전사 출력 길이를 제한한다.
- 분석 결과는 메타데이터, 제한된 대표 프레임 경로와 전사문으로 구성하고 작업 디렉터리에 캐시한다.
- 원본 MP4를 Responses API나 기획 모델 본문에 직접 첨부하지 않는다.

### 계획 감사 결론

외부 CLI 자체를 목표로 삼지 않고 오류 감소와 재현성에 필요한 최소 도구만 사용한다. 고정 목표와 Railway 실행 조건에 부합하므로 구현 진행 가능.

## 구현 감사

### 구현 결과

- 인증된 MP4 multipart 업로드 API `/api/video-agent/source`를 추가했다.
- 업로드는 `video/mp4`, 최대 25MB와 실제 MP4 `ftyp` 서명을 확인한다.
- 원본은 사용자 ID와 임의 UUID로 구성한 경로에 비공개 Supabase Storage 객체로 저장한다.
- 작업 요청의 `sourceVideoId`가 작업 소유자 경로와 일치할 때만 worker가 다운로드한다.
- worker는 원본을 해당 작업 디렉터리의 `source/input.mp4`로만 저장한다.
- 분석기는 허용 작업 루트 내부의 `.mp4`만 받고 외부 URL, 다른 작업 경로와 임의 확장자를 거부한다.
- 파일 크기 25MB, 영상 길이 600초, 전사 20,000자, 명령 120초와 전사 180초 제한을 적용했다.
- FFprobe로 길이·해상도·오디오를 확인하고 FFmpeg로 10%, 50%, 90% 대표 프레임과 전사용 오디오를 만든다.
- OpenAI `gpt-transcribe`로 음성을 전사하며 결과는 원본 SHA-256 기준으로 작업 디렉터리에 캐시한다.
- Railway의 Tesseract가 있으면 대표 프레임 OCR도 분석 결과에 포함한다.
- 수집 보고는 메타데이터 JSON, 전사문과 대표 프레임 경로를 다음 기획 회차에 전달한다.
- 비공개 `video-agent-sources` bucket migration과 `/api/health`를 추가했다.
- Docker health check가 웹 health endpoint를 확인하게 했다.
- README를 현재의 제작 게이트, OpenAI 음성, 작업별 경로와 신규 migration 기준으로 수정했다.

### 감사에서 발견하고 수용한 수정

1. 외부 analyzer CLI를 도입하면 버전·보안·Railway 재현 검증이 별도로 필요하지만 현재 계획에는 검증 근거가 없었다.
   - 결정: `수정 수용`
   - 처리: 이미 필요한 FFmpeg/FFprobe와 공식 OpenAI 전사 API만 사용하는 제한 분석기로 대체했다.
2. 대표 프레임 파일 경로만 모델에 넘기면 모델은 화면 내용을 읽을 수 없다.
   - 결정: `수용`
   - 처리: Railway에서 한국어 Tesseract OCR 결과를 각 대표 프레임의 시간과 함께 JSON 증거에 포함한다.
3. 전사 결과에는 `짚습니다`가 `집습니다`, `초안의 재료`가 `초안에 재료`로 인식된 부분이 있었다.
   - 결정: `수용`
   - 처리: 전사문을 사실 원본으로 간주하지 않고 기획 참고 증거로만 사용한다. 최종 영상 검토의 승인 내레이션 원문은 manifest를 기준으로 유지한다.
4. OpenAI 공식 문서 MCP 등록은 로컬 `codex.exe` 실행 권한 오류로 실패했다.
   - 결정: `수정 수용`
   - 처리: 공식 `developers.openai.com` 문서만 조회해 현재 권장 파일 전사 모델과 제한을 확인했다.

### 자동 및 실제 검증 증거

- `npm test`: 9개 파일, 82개 테스트 통과
- `npm run lint`: 통과
- `npm run build`: Next.js production build 통과, 신규 source와 health route 포함
- 실제 분석 입력: 단계 5에서 생성한 52.595초, 1920×1080, 2,057,739바이트 MP4
- 분석 결과: 오디오 확인, 288자 한국어 전사, 대표 프레임 3장
- 수집기 결과: `video-analysis` capability가 `있음`과 메타데이터·전사·프레임 증거를 반환
- 캐시 재실행: OpenAI를 다시 호출하지 않고 같은 분석 결과 반환
- `/api/health`: 최신 production 서버에서 `ok: true`

### 배포 전 남은 확인

- 신규 Supabase migration 두 개는 실제 프로젝트에 적용하지 않았다.
- 실제 비공개 bucket 업로드·worker 다운로드·작업 재개 통합 테스트가 필요하다.
- 현재 Railway CLI는 `Unauthorized`이며 로그인된 배포 권한이 없다.
- 로컬 Docker 실행기가 없어 Dockerfile 이미지 빌드와 health check를 컨테이너 안에서 실행하지 못했다.
- Railway에서 `ocrStatus: checked`가 되고 한국어 핵심 문구 검사가 통과하는지 확인해야 한다.

### 구현 감사 결론

기존 MP4 분석과 Railway 실행을 위한 코드 수준의 단계 7 목표는 충족했다. 그러나 실제 Supabase migration과 Railway 웹·worker 배포, 재시작 복구 및 컨테이너 OCR 검증은 미완료다. 배포 권한과 대상 프로젝트가 확인되기 전에는 단계 7 전체 완료로 판정하지 않으며 단계 8로 진입하지 않는다.
