# MCP와 SaaS 소개 영상

PR Studio 영상 프로젝트. `render.py`로 한국어 내레이션·자막이 포함된 1080p 영상을 생성한다.

## 목적과 범위

- 유형: 개념 설명 + 연결 사용법 튜토리얼
- 대상: MethodIQ 업무 앱을 ChatGPT·Claude와 함께 쓰려는 사용자
- 구성: SaaS/MCP의 공통점·차이점·향후 장단점, GPT Editor·MethodIQ Tools·Evidence Ledger 사례, ChatGPT·Claude 연결 절차
- 장면 자료: 운영 MethodIQ 앱 목록과 GPT Editor의 실제 화면 캡처. 나머지 설치 단계는 메뉴 경로를 설명하는 도식이다. 실제 설치 조작을 연속 촬영한 영상이 아니다.
- 제작물: `out/mcp-intro/mcp-saas-intro-ko.mp4`, `.srt`, `transcript-ko.txt`, `render-receipt.json`. 생성 파일은 Git에 넣지 않는다.

## 제작

`python docs/demo-scripts/mcp-intro/render.py`를 실행한다. Google Cloud TTS 자격증명은 저장소 밖의 `C:\secure\pr-studio-google-tts.json`을 사용한다. 한국어 Chirp 3 HD 음성은 0.94배속이다. 화면 캡처는 작업 트리의 무시된 `out/mcp-intro/`에 둔다.

## 검증 근거

- OpenAI 공식 안내: https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt
- Claude 공식 안내: https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
- MethodIQ 운영 앱 목록: https://methodiq.tools/apps
- CI Portal 설치 안내: https://ci.methodiq.tools/mcp/install

메뉴와 권한은 2026-11-12 기준이며 계정·플랜·관리자 설정에 따라 다를 수 있다. 영상의 설치 화면은 설명용 도식이고, 도구 연결 성공을 주장하지 않는다.
