"""Render four MethodIQ CSA videos with PR Studio's Google speech pipeline."""
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "out" / "csa-videos"
CAP = OUT / "captures"
FONT = r"C:\Windows\Fonts\malgun.ttf"
BOLD = r"C:\Windows\Fonts\malgunbd.ttf"
DATA = {
"ko-intro": [
("표본설계를 반영한 분석", "층, 피에스유, 가중치를 반영해 비율과 신뢰구간을 계산합니다.", "표본설계를 반영한 비율·신뢰구간", None),
("방법을 먼저 확인", "자료와 설계 근거를 등록하고, 분석 전에 점검 결과를 확인합니다.", "자료 등록 → 설계 점검 → 분석", "design-section.png"),
("결과와 불확실성", "합성 예제의 가중 긍정 비율은 이십육 점 칠 퍼센트입니다. 구간도 함께 읽어야 합니다.", "합성 예제: 26.7% · 95% 신뢰구간 10.9~52.0%", "08-report-section.png"),
("재현 가능한 보고", "해석을 저장하고, 보고서나 재현 자료를 내려받을 수 있습니다.", "해석 저장 · 보고서 · 재현 ZIP", "08-report-section.png")],
"ko-tutorial": [
("프로젝트 만들기", "연구 목적, 목표 모집단, 분석 단위와 조사 기간을 입력하고 새 프로젝트를 만듭니다.", "1. 연구 목적과 모집단을 입력", "project-section.png"),
("합성 자료 등록", "예제 씨에스브이 파일을 등록합니다. 화면의 자료는 실제 응답이 아닌 합성 자료입니다.", "2. 합성 CSV 등록 · 24행", "data-section.png"),
("설계와 변수 지정", "최종 가중치, 층, 피에스유, 결과 변수를 연결합니다. 질문과 설계 근거도 기록합니다.", "3. 가중치 · 층 · PSU · 결과 변수", "design-section.png"),
("점검 뒤 실행", "설계 점검에서 두 개 층, 여섯 개 피에스유, 유효응답 스물네 건을 확인한 뒤 분석을 실행합니다.", "4. 설계 점검 통과 → 분석 실행", "design-section.png"),
("결과 읽기", "전체 비율은 이십육 점 칠 퍼센트, 구십오 퍼센트 신뢰구간은 십 점 구에서 오십이 점 영 퍼센트입니다.", "5. 26.7% · 95% 신뢰구간 10.9~52.0%", "08-report-section.png"),
("해석과 보고서", "작은 합성 표본의 불확실성을 해석에 적고, 해석 저장 후 보고서를 내려받습니다.", "6. 해석 저장 → DOCX 보고서", "08-report-section.png")],
"en-intro": [
("Survey design matters", "Complex Survey Analysis estimates proportions and intervals using weights, strata, and sampling clusters.", "Design-aware estimates and intervals", None),
("Check before analysis", "Upload data, document the sampling design, and review the design check before running an analysis.", "Upload → design check → analysis", "design-section.png"),
("Read uncertainty", "In this synthetic example, the weighted positive rate is twenty-six point seven percent. Read its interval too.", "Synthetic example: 26.7% · 95% CI 10.9–52.0%", "08-report-section.png"),
("Keep a reproducible record", "Save your interpretation, then export a report or a reproducibility package.", "Interpretation · report · reproducibility ZIP", "08-report-section.png")],
"en-tutorial": [
("Create a project", "Enter the study purpose, target population, unit of analysis, and survey period. Then create a project.", "1. Define the study and population", "project-section.png"),
("Upload synthetic data", "Upload the example C S V file. These twenty-four responses are synthetic, not real survey data.", "2. Upload synthetic CSV · 24 rows", "data-section.png"),
("Map the design", "Select the final weight, stratum, primary sampling unit, and outcome columns. Record the question and design source.", "3. Weight · stratum · PSU · outcome", "design-section.png"),
("Check and run", "Confirm two strata, six primary sampling units, and twenty-four valid responses. Save the design, then run the analysis.", "4. Check design → run analysis", "design-section.png"),
("Read the result", "The weighted rate is twenty-six point seven percent. Its ninety-five percent confidence interval runs from ten point nine to fifty-two point zero percent.", "5. 26.7% · 95% CI 10.9–52.0%", "08-report-section.png"),
("Save and export", "Describe the uncertainty in your interpretation. Save it, then download the D O C X report.", "6. Save interpretation → DOCX report", "08-report-section.png")],
}

def run(*args, env=None):
    result = subprocess.run(args, capture_output=True, text=True, env=env)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or f"Command failed: {args[0]}")
    return result.stdout.strip()

def seconds(path):
    return float(run("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)))

def ff(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size)

def draw_frame(title, caption, shot, index, total):
    img = Image.new("RGB", (1280, 720), "#f5f8f6")
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 1280, 12), fill="#08756d")
    d.text((56, 36), "METHODIQ  /  COMPLEX SURVEY ANALYSIS", font=ff(22, True), fill="#08756d")
    d.text((1125, 38), f"{index:02d}/{total:02d}", font=ff(20, True), fill="#173337")
    d.text((56, 91), title, font=ff(42, True), fill="#173337")
    if shot:
        source = Image.open(CAP / shot).convert("RGB")
        if shot == "design-section.png" and ("점검" in title or "Check and run" in title):
            top = max(0, source.height - 490)
            source = source.crop((0, top, source.width, source.height))
        elif shot == "08-report-section.png" and ("보고" in title or "export" in title or "record" in title):
            top = max(0, source.height - 490)
            source = source.crop((0, top, source.width, source.height))
        else:
            limit = 490 if shot != "data-section.png" else 362
            source = source.crop((0, 0, source.width, min(source.height, limit)))
        source.thumbnail((1040, 425))
        x, y = (1280-source.width)//2, 180+(425-source.height)//2
        img.paste(source, (x, y))
        d.rectangle((x-2, y-2, x+source.width+2, y+source.height+2), outline="#a7cbc4", width=3)
    else:
        for j, word in enumerate(("WEIGHT", "STRATUM", "PSU", "RESULT")):
            x = 124+j*267
            d.rounded_rectangle((x, 297, x+225, 401), radius=14, fill="#dcefe9")
            d.text((x+22, 332), word, font=ff(27, True), fill="#08756d")
    d.rectangle((0, 614, 1280, 720), fill="#113638")
    d.text((640, 665), caption, font=ff(28, True), fill="white", anchor="mm")
    return img

def stamp(t):
    ms = round(t*1000); h, ms = divmod(ms,3600000); m,ms=divmod(ms,60000); s,ms=divmod(ms,1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def render(key):
    lang = key[:2]
    beats = DATA[key]
    work = OUT / key
    work.mkdir(parents=True, exist_ok=True)
    segments, subtitles, voice_receipts = [], [], []
    elapsed = 0.0
    for i, (title, speech, caption, shot) in enumerate(beats, 1):
        png, wav, mp4 = [work / f"{i:02d}.{ext}" for ext in ("png","wav","mp4")]
        draw_frame(title, caption, shot, i, len(beats)).save(png)
        speech_file = work / f"{i:02d}.txt"
        cache_file = work / f"{i:02d}-voice.sha256"
        fingerprint = hashlib.sha256(f"{lang}|{speech}|{'0.92' if lang=='ko' else '0.98'}|Chirp3 HD".encode()).hexdigest()
        speech_file.write_text(speech, encoding="utf-8")
        env=os.environ.copy()
        env.update(PR_STUDIO_TTS_PROVIDER="google", PR_STUDIO_TTS_PROVIDER_KO="google", PR_STUDIO_TTS_PROVIDER_EN="google", PR_STUDIO_TTS_LANGUAGE=lang, GOOGLE_TTS_SPEAKING_RATE="0.92" if lang=="ko" else "0.98")
        env["NODE_OPTIONS"] = f"{env.get('NODE_OPTIONS', '')} --use-system-ca".strip()
        cached = wav.exists() and cache_file.exists() and cache_file.read_text().strip() == fingerprint and seconds(wav) > 0
        receipt = f"Google TTS wrote {wav} (verified cached clip)" if cached else run("node", str(ROOT/"scripts"/"synthesize-speech.mjs"), "--input",str(speech_file),"--output",str(wav),env=env)
        if "Google TTS wrote" not in receipt: raise RuntimeError(receipt)
        cache_file.write_text(fingerprint, encoding="utf-8")
        voice_receipts.append(receipt)
        length=max(seconds(wav)+1.4,4.5)
        run("ffmpeg","-y","-loglevel","error","-loop","1","-i",str(png),"-i",str(wav),"-af","apad=pad_dur=5","-t",f"{length:.3f}","-r","25","-c:v","libx264","-preset","veryfast","-crf","22","-pix_fmt","yuv420p","-c:a","aac","-b:a","128k",str(mp4))
        segments.append(mp4)
        subtitles.append(f"{i}\n{stamp(elapsed)} --> {stamp(elapsed+length)}\n{caption}\n")
        elapsed+=length
        print(f"{key} scene {i}: {length:.1f}s",flush=True)
    (work/"concat.txt").write_text("".join(f"file '{p.as_posix()}'\n" for p in segments),encoding="utf-8")
    final=OUT/f"csa-{key}.mp4"
    run("ffmpeg","-y","-loglevel","error","-f","concat","-safe","0","-i",str(work/"concat.txt"),"-c","copy",str(final))
    (OUT/f"csa-{key}.srt").write_text("\n".join(subtitles),encoding="utf-8")
    receipt={"language":lang,"scenes":len(beats),"seconds":seconds(final),"sha256":hashlib.sha256(final.read_bytes()).hexdigest(),"tts":"Google Cloud Chirp3 HD","voiceReceipts":voice_receipts,"source":"CSA staging, synthetic example, 2026-11-22"}
    (OUT/f"csa-{key}-receipt.json").write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({k:v for k,v in receipt.items() if k!="voiceReceipts"},ensure_ascii=False),flush=True)

if __name__=="__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for key in (sys.argv[1:] or DATA.keys()): render(key)
