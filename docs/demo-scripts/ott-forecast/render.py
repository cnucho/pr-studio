"""Render two current OTT forecast demo videos from the live Beta app.

This package belongs to PR Studio. It captures the deployed application, creates
Korean narration and subtitles, renders 720p H.264 MP4 files, and writes a
machine-readable verification receipt. Generated media stays outside Git.
"""

import argparse
from datetime import datetime, timezone
import hashlib
import json
import subprocess
import textwrap
import os
from pathlib import Path
from urllib.parse import urljoin
from urllib.parse import urlparse

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
OUT = REPO / "out" / "ott-forecast-v4"
CAPTURES = OUT / "captures"
SIZE = (1280, 720)
INK = "#12313A"
TEAL = "#087A72"
MINT = "#DDF3EE"
PAPER = "#F7FAF8"
NAVY = "#0B2E3B"
CORAL = "#D9664A"


def run(*args):
    result = subprocess.run(args, check=True, text=True, capture_output=True)
    return result.stdout.strip()


def font(size, bold=False):
    candidates = [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc" if bold else "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc" if bold else "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        r"C:\Windows\Fonts\malgunbd.ttf" if bold else r"C:\Windows\Fonts\malgun.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def wrap(draw, value, selected_font, max_width):
    lines = []
    for paragraph in value.split("\n"):
        current = ""
        for token in paragraph.split():
            trial = token if not current else current + " " + token
            if draw.textlength(trial, font=selected_font) <= max_width:
                current = trial
            else:
                if current:
                    lines.append(current)
                current = token
        if current:
            lines.append(current)
    return lines or [""]


def capture_live(source_url):
    CAPTURES.mkdir(parents=True, exist_ok=True)
    base = source_url.rstrip("/") + "/"
    public_base = "https://forecast-web-production.up.railway.app/" if urlparse(source_url).hostname in {"127.0.0.1", "localhost"} else base
    routes = {
        "snippets": {"path": "/snippets", "required": ["OTT 예측 스니펫", "등급"]},
        "methods": {"path": "/methods", "required": ["예측방법과 검증결과", "기준선 대비 오차감소"]},
        "preview": {"path": "/preview", "required": ["관리자가 게시한 실제 예측결과"]},
    }
    is_local = urlparse(source_url).hostname in {"127.0.0.1", "localhost"}
    if is_local:
        routes["signals"] = {
            "path": "/signals",
            "required": ["OTT", "복원", "분석"],
        }
    receipt = {
        "schemaVersion": "ott-live-screen-check/1.0",
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "sourceUrl": source_url,
        "routes": {},
        "api": {},
        "authBoundaries": {},
        "consoleErrors": [],
    }
    with sync_playwright() as playwright:
        launch = {"headless": True, "args": ["--disable-dev-shm-usage"]}
        edge = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
        if os.name == "nt" and edge.exists():
            launch["executable_path"] = str(edge)
        browser = playwright.chromium.launch(**launch)
        context = browser.new_context(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
        health = context.request.get(urljoin(base, "health"), timeout=90000)
        if health.status != 200 or health.json().get("status") != "ok":
            raise RuntimeError(f"health check failed: {health.status}")
        receipt["api"]["health"] = {"status": health.status, "body": health.json()}

        if not is_local:
            published = context.request.get(urljoin(base, "api/public/published"), timeout=90000)
            if published.status != 200:
                raise RuntimeError(f"published forecast failed: {published.status}")
            payload = published.json()
            if not payload.get("snippets") or not payload.get("week2_grade_reference"):
                raise RuntimeError("published forecast is missing snippets or the fixed week-two grade reference")
            if len(payload["week2_grade_reference"].get("grades", [])) != 5:
                raise RuntimeError("published forecast does not contain five grade definitions")
            receipt["api"]["published"] = {
                "status": published.status,
                "schemaVersion": payload.get("schema_version"),
                "asOfDate": payload.get("as_of_date"),
                "snippetCount": len(payload["snippets"]),
                "gradeReferenceN": payload["week2_grade_reference"].get("reference_n"),
                "gradeCount": len(payload["week2_grade_reference"].get("grades", [])),
            }

        for path in (() if is_local else ("/", "/viewer")):
            response = context.request.get(urljoin(base, path.lstrip("/")), max_redirects=0, timeout=90000)
            if response.status not in (302, 303):
                raise RuntimeError(f"{path} auth boundary returned {response.status}")
            location = response.headers.get("location", "")
            if not location.endswith("/auth/login"):
                raise RuntimeError(f"{path} did not redirect to central sign-in")
            receipt["authBoundaries"][path] = {"status": response.status, "location": location}

        for name, spec in routes.items():
            page = context.new_page()
            page.route("**/favicon.ico", lambda route: route.fulfill(status=204))
            errors = []
            page.on("pageerror", lambda error, errors=errors: errors.append(str(error)))
            page.on("console", lambda message, errors=errors: errors.append(message.text)
                    if message.type == "error" else None)
            route_base = base if name == "signals" else public_base
            response = page.goto(urljoin(route_base, spec["path"].lstrip("/")),
                                 wait_until="networkidle", timeout=90000)
            if response is None or response.status != 200:
                raise RuntimeError(f"{spec['path']} returned no successful document")
            page.add_style_tag(content="*{scroll-behavior:auto!important} ::-webkit-scrollbar{display:none!important}")
            page.wait_for_timeout(5000)
            body = page.locator("body").inner_text()
            for required in spec["required"]:
                if required not in body:
                    raise RuntimeError(f"{spec['path']} is missing required text: {required}")
            if name == "snippets":
                page.locator("#grid article").first.wait_for(state="visible", timeout=30000)
                guide = page.locator("#grade-guide")
                if guide.is_visible() and not guide.get_attribute("open"):
                    guide.locator("summary").click()
                    page.wait_for_timeout(700)
            if name == "preview":
                page.locator("ott-forecast-board").wait_for(state="visible", timeout=30000)
            if errors:
                receipt["consoleErrors"].extend({"route": spec["path"], "message": item}
                                                for item in errors)
                raise RuntimeError(f"{spec['path']} emitted browser errors: {errors}")
            page.screenshot(path=str(CAPTURES / f"{name}.png"), full_page=False)
            receipt["routes"][spec["path"]] = {
                "status": response.status,
                "title": page.title(),
                "requiredText": spec["required"],
                "screenshot": f"captures/{name}.png",
            }
            page.close()
        browser.close()
    (OUT / "live-screen-receipt.json").write_text(
        json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    return receipt


def slide_frame(beat, part, index, total):
    frame = Image.new("RGB", SIZE, PAPER)
    draw = ImageDraw.Draw(frame)
    draw.rectangle((0, 0, 22, SIZE[1]), fill=TEAL if index % 2 == 0 else CORAL)
    draw.text((70, 52), "CONSUMER INSIGHT  /  OTT FORECAST", font=font(23, True), fill=TEAL)
    draw.text((1110, 52), f"{index + 1:02d}/{total:02d}", font=font(22, True), fill=INK)
    draw.text((70, 126), beat["title"], font=font(39, True), fill=INK)
    draw.line((70, 188, 1210, 188), fill="#CBDDD8", width=3)
    visual_font = font(52, True)
    lines = wrap(draw, beat["visual"], visual_font, 1120)
    if len(lines) > 3:
        visual_font = font(44, True)
        lines = wrap(draw, beat["visual"], visual_font, 1120)
    y = 245 + max(0, 3 - len(lines)) * 34
    for line in lines[:4]:
        draw.text((70, y), line, font=visual_font, fill=INK)
        y += 74
    if beat.get("note"):
        note_font = font(23)
        for line in wrap(draw, beat["note"], note_font, 1120)[:2]:
            draw.text((70, 540), line, font=note_font, fill="#49656B")
    return add_caption(frame, beat["subtitle"], part, beat["title"])


def capture_frame(beat, part):
    source_path = CAPTURES / f"{beat['capture']}.png"
    if not source_path.exists() and beat["capture"] == "signals":
        fallback = {
            "title": "6. 신호 수집 관리",
            "visual": "매일 06:00 외부신호 수집\n과거 반응 복원 진행률\n입력시점별 내부·외부 AUC 비교\n주간 AI 분석과 추가 수집지시",
            "subtitle": beat["subtitle"],
        }
        return slide_frame(fallback, part, 5, 9)
    source = Image.open(source_path).convert("RGB")
    frame = Image.new("RGB", SIZE, NAVY)
    source.thumbnail((1160, 620), Image.Resampling.LANCZOS)
    frame.paste(source, ((SIZE[0] - source.width) // 2, 0))
    return add_caption(frame, beat["subtitle"], part, beat["title"])


def add_caption(frame, subtitle, part, label):
    layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle((34, 22, 760, 66), radius=9, fill=(11, 46, 59, 235))
    draw.text((52, 30), f"{part}  |  {label}", font=font(20, True), fill="white")
    draw.rectangle((0, 592, 1280, 720), fill=(8, 35, 43, 242))
    selected = font(34, True)
    lines = wrap(draw, subtitle, selected, 1160)
    if len(lines) > 2:
        selected = font(29, True)
        lines = wrap(draw, subtitle, selected, 1160)
    y = 610 + max(0, 2 - len(lines)) * 21
    for line in lines[:2]:
        width = draw.textlength(line, font=selected)
        draw.text(((1280 - width) / 2, y), line, font=selected, fill="white")
        y += 45
    return Image.alpha_composite(frame.convert("RGBA"), layer).convert("RGB")


def probe(path):
    return float(run("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)))


def stamp(seconds):
    millis = round(seconds * 1000)
    hours, millis = divmod(millis, 3600000)
    minutes, millis = divmod(millis, 60000)
    secs, millis = divmod(millis, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def speak(text, stem):
    audio = OUT / f"{stem}.mp3"
    run(
        "edge-tts",
        "--voice", "ko-KR-SunHiNeural",
        "--rate=-8%",
        "--text", text,
        "--write-media", str(audio),
    )
    return audio


def segment(frame, audio, duration, output):
    run(
        "ffmpeg", "-y", "-loglevel", "error",
        "-loop", "1", "-i", str(frame), "-i", str(audio),
        "-vf", "format=yuv420p", "-af", "apad=pad_dur=15",
        "-t", f"{duration:.3f}", "-r", "25",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
        "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart",
        str(output),
    )


def render(manifest_name):
    manifest = json.loads((HERE / manifest_name).read_text(encoding="utf-8"))
    slug = manifest["id"]
    beats = manifest["beats"]
    pieces = []
    captions = []
    transcript = []
    current = 0.0
    for index, beat in enumerate(beats):
        stem = f"{slug}-{index + 1:02d}"
        audio = speak(beat["narration"], stem)
        duration = max(probe(audio) + 1.0, float(beat.get("minSeconds", 5.0)))
        image = capture_frame(beat, manifest["partLabel"]) if beat["kind"] == "capture" else slide_frame(
            beat, manifest["partLabel"], index, len(beats)
        )
        frame = OUT / f"{stem}.png"
        image.save(frame)
        clip = OUT / f"{stem}.mp4"
        segment(frame, audio, duration, clip)
        pieces.append(clip)
        captions.append(f"{index + 1}\n{stamp(current)} --> {stamp(current + duration)}\n{beat['subtitle']}\n")
        transcript.append(f"[{index + 1:02d}] {beat['narration']}")
        current += duration
    concat = OUT / f"{slug}-concat.txt"
    concat.write_text("".join(f"file '{item.as_posix()}'\n" for item in pieces), encoding="utf-8")
    final = OUT / f"{slug}.mp4"
    run("ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", "-movflags", "+faststart", str(final))
    (OUT / f"{slug}.srt").write_text("\n".join(captions), encoding="utf-8")
    (OUT / f"{slug}-transcript.txt").write_text("\n".join(transcript), encoding="utf-8")
    receipt = {
        "id": slug,
        "title": manifest["title"],
        "sourceUrl": manifest["sourceUrl"],
        "video": final.name,
        "seconds": round(probe(final), 3),
        "width": 1280,
        "height": 720,
        "beats": len(beats),
        "narration": "Microsoft Edge neural TTS / ko-KR-SunHiNeural / rate -8%",
        "sha256": hashlib.sha256(final.read_bytes()).hexdigest(),
        "screens": sorted({beat.get("capture") for beat in beats if beat.get("capture")}),
    }
    (OUT / f"{slug}-receipt.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(receipt, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("part", choices=["intro", "tutorial", "both"])
    parser.add_argument("--source-url", default="https://forecast-web-production.up.railway.app/")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    capture_live(args.source_url)
    names = ["intro.json", "tutorial.json"] if args.part == "both" else [f"{args.part}.json"]
    for name in names:
        render(name)


if __name__ == "__main__":
    main()
