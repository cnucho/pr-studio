"""PR Studio render: real LCA–MCA screen captures + Korean narration."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CAPTURES = ROOT / "out" / "lca-mca-platform" / "captures"
OUTPUT = ROOT / "out" / "lca-mca-platform"
FONT = Path("C:/Windows/Fonts/malgun.ttf")
BOLD = Path("C:/Windows/Fonts/malgunbd.ttf")


def run(*args: object, env: dict[str, str] | None = None) -> str:
    completed = subprocess.run([str(arg) for arg in args], cwd=ROOT, env=env,
                               text=True, encoding="utf-8", capture_output=True)
    if completed.returncode:
        raise RuntimeError(f"{args[0]} failed: {completed.stderr[-2000:]}")
    return completed.stdout.strip()


def probe(path: Path) -> dict:
    return json.loads(run("ffprobe", "-v", "error", "-show_entries",
                          "stream=codec_name,width,height,sample_rate,channels:format=duration,size",
                          "-of", "json", path))


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(BOLD if bold else FONT), size)


def lines(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, width: int) -> list[str]:
    result, current = [], ""
    for word in text.split():
        proposed = (current + " " + word).strip()
        if current and draw.textlength(proposed, font=face) > width:
            result.append(current)
            current = word
        else:
            current = proposed
    if current:
        result.append(current)
    return result


def compose(scene: dict, index: int, total: int, kind: str, target: Path) -> None:
    source = CAPTURES / scene["image"]
    if source.parent != CAPTURES or not source.is_file():
        raise ValueError(f"Missing actual browser capture: {scene['image']}")
    canvas = Image.new("RGB", (1920, 1080), "#102238")
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 1920, 12), fill="#e6ac43")
    draw.text((62, 43), "LCA·MCA 연구 분석", font=font(31, True), fill="#f6f8fa")
    draw.text((62, 101), "앱 소개" if kind == "intro" else "가상자료 따라하기", font=font(21), fill="#9ad9e8")
    draw.text((1835, 57), "TUTORIAL-V1", anchor="ra", font=font(21, True), fill="#d6e8ef")
    draw.rounded_rectangle((54, 202, 440, 920), radius=20, fill="#1b3854")
    draw.text((86, 242), f"{index:02} / {total:02}", font=font(38, True), fill="#f6bf5b")
    y = 340
    for line in lines(draw, scene["title"], font(45, True), 320):
        draw.text((86, y), line, font=font(45, True), fill="white")
        y += 60
    y += 28
    for line in lines(draw, scene["caption"], font(30), 320):
        draw.text((86, y), line, font=font(30), fill="#d1e1ed")
        y += 47
    image = Image.open(source).convert("RGB")
    image = ImageOps.contain(image, (1400, 785), Image.Resampling.LANCZOS)
    x = 475 + (1400 - image.width) // 2
    y = 170 + (785 - image.height) // 2
    draw.rounded_rectangle((x - 4, y - 4, x + image.width + 4, y + image.height + 4),
                           radius=10, fill="#7e9ab0")
    canvas.paste(image, (x, y))
    draw.rectangle((0, 965, 1920, 1080), fill="#081827")
    draw.text((960, 995), "실제 앱 화면 · 완전 합성 설문 · 1,800명 / 21변수", anchor="mt",
              font=font(27, True), fill="#f6f8fa")
    draw.text((960, 1040), "결과는 영상에 저장된 답을 재생하지 않고 앱에서 새로 계산합니다", anchor="mt",
              font=font(21), fill="#afc3d0")
    canvas.save(target)


def stamp(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    hours, milliseconds = divmod(milliseconds, 3_600_000)
    minutes, milliseconds = divmod(milliseconds, 60_000)
    secs, milliseconds = divmod(milliseconds, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{milliseconds:03}"


def render(kind: str) -> dict:
    data = json.loads((HERE / f"{kind}.json").read_text(encoding="utf-8"))
    scenes = data["scenes"]
    out = OUTPUT / kind
    for name in ("frames", "audio", "segments"):
        (out / name).mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env["PR_STUDIO_TTS_PROVIDER"] = "google"
    env["PR_STUDIO_TTS_PROVIDER_KO"] = "google"
    env.setdefault("GOOGLE_APPLICATION_CREDENTIALS", "C:/secure/pr-studio-google-tts.json")
    env.setdefault("GOOGLE_TTS_VOICE_KO", "ko-KR-Chirp3-HD-Kore")
    env.setdefault("GOOGLE_TTS_SPEAKING_RATE", "0.94")
    parts, captions, receipts = [], [], []
    cursor = 0.0
    for index, scene in enumerate(scenes, 1):
        stem = f"{index:02}-{scene['id']}"
        frame, script, audio, clip = (out / "frames" / f"{stem}.png",
                                      out / "audio" / f"{stem}.txt",
                                      out / "audio" / f"{stem}.wav",
                                      out / "segments" / f"{stem}.mp4")
        compose(scene, index, len(scenes), kind, frame)
        script.write_text(scene["narration"], encoding="utf-8")
        fingerprint = hashlib.sha256((scene["narration"] + "\n" + env["GOOGLE_TTS_VOICE_KO"] +
                                      "\n" + env["GOOGLE_TTS_SPEAKING_RATE"]).encode("utf-8")).hexdigest()
        audio_identity = audio.with_suffix(".sha256")
        if not audio.is_file() or not audio_identity.is_file() or audio_identity.read_text() != fingerprint:
            run("node", "--use-system-ca", ROOT / "scripts" / "synthesize-speech.mjs", "--input", script,
                "--output", audio, env=env)
            audio_identity.write_text(fingerprint, encoding="ascii")
        audio_seconds = float(probe(audio)["format"]["duration"])
        duration = max(audio_seconds + float(scene["hold"]), 8.0)
        run("ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-framerate", "30",
            "-i", frame, "-i", audio, "-vf", "format=yuv420p", "-af", f"apad=pad_dur={scene['hold']}",
            "-t", f"{duration:.3f}", "-c:v", "libx264", "-preset", "fast", "-crf", "19",
            "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", clip)
        parts.append(clip)
        captions.append(f"{index}\n{stamp(cursor)} --> {stamp(cursor + duration - .35)}\n{scene['caption']}\n")
        receipts.append({"id": scene["id"], "capture": scene["image"], "duration": duration,
                         "audio_duration": audio_seconds,
                         "capture_sha256": hashlib.sha256((CAPTURES / scene["image"]).read_bytes()).hexdigest()})
        cursor += duration
        print(f"{kind} {stem}: {duration:.1f}s", flush=True)
    listing = out / "concat.txt"
    listing.write_text("".join(f"file '{part.as_posix()}'\n" for part in parts), encoding="utf-8")
    video = out / f"lca-mca-{kind}-ko.mp4"
    run("ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
        "-i", listing, "-c", "copy", "-movflags", "+faststart", video)
    run("ffmpeg", "-v", "error", "-i", video, "-f", "null", "-")
    (out / f"lca-mca-{kind}-ko.srt").write_text("\n".join(captions), encoding="utf-8")
    (out / "transcript-ko.txt").write_text("\n\n".join(scene["narration"] for scene in scenes), encoding="utf-8")
    video_info = probe(video)
    for fraction in (.20, .50, .80):
        run("ffmpeg", "-y", "-loglevel", "error", "-ss", f"{cursor * fraction:.3f}",
            "-i", video, "-frames:v", "1", out / f"sample-{round(fraction * 100)}.png")
    receipt = {"title": data["title"], "kind": data["kind"], "example_version": data["example_version"],
               "source": "actual local Streamlit browser captures", "video": str(video),
               "sha256": hashlib.sha256(video.read_bytes()).hexdigest(), "probe": video_info,
               "tts": {"provider": "google", "voice": env["GOOGLE_TTS_VOICE_KO"],
                       "speaking_rate": env["GOOGLE_TTS_SPEAKING_RATE"]},
               "full_decode": "passed", "scenes": receipts}
    (out / "render-receipt.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"video": str(video), "duration": cursor, "sha256": receipt["sha256"]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kind", choices=["intro", "tutorial", "both"])
    chosen = parser.parse_args().kind
    for part in (["intro", "tutorial"] if chosen == "both" else [chosen]):
        print(json.dumps(render(part), ensure_ascii=False), flush=True)
