"""Render the Evidence Ledger introduction and live-search tutorial with Google narration."""

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
OUT = REPO / "out" / "evidence-ledger"
CAPTURES = OUT / "captures"
SIZE = (1600, 900)
FONT = Path(r"C:\Windows\Fonts\malgun.ttf")
BOLD = Path(r"C:\Windows\Fonts\malgunbd.ttf")
INK = "#123134"
TEAL = "#08756d"
CORAL = "#d76a4a"
PAPER = "#f6f8f4"


def run(*args, env=None):
    result = subprocess.run(args, check=True, text=True, capture_output=True, env=env)
    return result.stdout.strip()


def font(size, bold=False):
    return ImageFont.truetype(str(BOLD if bold else FONT), size)


def wrap(draw, value, selected_font, max_width):
    lines = []
    for raw in value.split("\n"):
        current = ""
        for token in raw.split(" "):
            trial = token if not current else current + " " + token
            if draw.textlength(trial, font=selected_font) <= max_width:
                current = trial
            else:
                if current:
                    lines.append(current)
                current = token
        lines.append(current)
    return lines


def caption_layer(subtitle, label):
    layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle((70, 24, 730, 78), radius=6, fill=(16, 50, 52, 235))
    draw.text((92, 34), label, font=font(26, True), fill="white")
    draw.rectangle((0, 758, 1600, 900), fill=(12, 37, 39, 240))
    selected = font(40, True)
    lines = wrap(draw, subtitle, selected, 1440)
    if len(lines) > 2:
        raise ValueError(f"Subtitle too long: {subtitle}")
    height = len(lines) * 54
    y = 771 + (118 - height) // 2
    for line in lines:
        width = draw.textlength(line, font=selected)
        draw.text(((1600 - width) / 2, y), line, font=selected, fill="white")
        y += 54
    return layer


def slide_frame(beat, index, total):
    frame = Image.new("RGBA", SIZE, PAPER)
    draw = ImageDraw.Draw(frame)
    draw.rectangle((0, 0, 26, 900), fill=TEAL if index % 2 == 0 else CORAL)
    draw.text((100, 80), "METHODIQ  /  EVIDENCE LEDGER", font=font(26, True), fill=TEAL)
    draw.text((1450, 80), f"{index + 1:02d}/{total:02d}", font=font(28, True), fill=INK)
    draw.text((100, 180), beat["title"], font=font(46, True), fill=INK)
    draw.line((100, 265, 1490, 265), fill="#cedbd6", width=3)
    visual_font = font(66 if index == 2 else 65, True)
    lines = wrap(draw, beat["visual"], visual_font, 1370)
    if len(lines) > 3:
        visual_font = font(54, True)
        lines = wrap(draw, beat["visual"], visual_font, 1370)
    y = 344 + max(0, 3 - len(lines)) * 44
    for line in lines:
        draw.text((100, y), line, font=visual_font, fill=INK)
        y += 116 if index == 2 else 100
    if beat.get("source"):
        draw.text((100, 720), beat["source"], font=font(26), fill="#3e6461")
    return Image.alpha_composite(frame, caption_layer(beat["subtitle"], "01  |  소개"))


def tutorial_frame(beat):
    screenshot = CAPTURES / beat["capture"]
    if not screenshot.exists():
        raise FileNotFoundError(screenshot)
    frame = Image.new("RGBA", SIZE, "#102e31")
    with Image.open(screenshot) as source:
        frame.alpha_composite(source.convert("RGBA").resize((1440, 900)), (80, 0))
    return Image.alpha_composite(frame, caption_layer(beat["subtitle"], f"02  |  {beat['title']}"))


def probe_audio(path):
    return float(run("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)))


def timestamp(seconds):
    milliseconds = round(seconds * 1000)
    hours, milliseconds = divmod(milliseconds, 3_600_000)
    minutes, milliseconds = divmod(milliseconds, 60_000)
    whole, milliseconds = divmod(milliseconds, 1000)
    return f"{hours:02d}:{minutes:02d}:{whole:02d},{milliseconds:03d}"


def synthesize(text, stem):
    text_file = OUT / f"{stem}.txt"
    audio = OUT / f"{stem}.wav"
    cache = OUT / f"{stem}-google.json"
    fingerprint = hashlib.sha256((text + "|ko-KR-Chirp3-HD-Kore|0.94").encode("utf-8")).hexdigest()
    if audio.exists() and cache.exists() and json.loads(cache.read_text(encoding="utf-8")).get("fingerprint") == fingerprint:
        return audio, f"Google TTS wrote {audio} (verified cached clip)"
    prefix = stem.rsplit("-", 1)[0]
    previous_receipt = OUT / f"{prefix}-render-receipt.json"
    if audio.exists() and text_file.exists() and text_file.read_text(encoding="utf-8") == text and previous_receipt.exists():
        prior = json.loads(previous_receipt.read_text(encoding="utf-8"))
        if f"Google TTS wrote {audio}" in prior.get("voiceReceipts", []):
            cache.write_text(json.dumps({"fingerprint": fingerprint, "receipt": "previous verified render"}), encoding="utf-8")
            return audio, f"Google TTS wrote {audio} (verified cached clip)"
    text_file.write_text(text, encoding="utf-8")
    env = os.environ.copy()
    env["PR_STUDIO_TTS_PROVIDER"] = "google"
    env["PR_STUDIO_TTS_PROVIDER_KO"] = "google"
    env["PR_STUDIO_TTS_LANGUAGE"] = "ko"
    env["GOOGLE_TTS_VOICE_KO"] = "ko-KR-Chirp3-HD-Kore"
    env["GOOGLE_TTS_SPEAKING_RATE"] = "0.94"
    receipt = run("node", str(REPO / "scripts" / "synthesize-speech.mjs"), "--input", str(text_file), "--output", str(audio), env=env)
    if "Google TTS wrote" not in receipt:
        raise RuntimeError(f"Google voice not confirmed: {receipt}")
    cache.write_text(json.dumps({"fingerprint": fingerprint, "receipt": receipt}), encoding="utf-8")
    return audio, receipt


def render_segment(frame_file, audio, duration, output, beat):
    common = ["ffmpeg", "-y", "-loglevel", "error"]
    if beat.get("clip"):
        clip = CAPTURES / beat["clip"]
        if not clip.exists():
            raise FileNotFoundError(clip)
        overlay_file = frame_file.with_name(frame_file.stem + "-overlay.png")
        caption_layer(beat["subtitle"], f"02  |  {beat['title']}").save(overlay_file)
        command = common + ["-ss", str(beat["clipStart"]), "-i", str(clip), "-loop", "1", "-i", str(overlay_file), "-i", str(audio),
            "-filter_complex", f"[0:v]trim=duration={beat['clipSeconds']},setpts=PTS-STARTPTS,scale=1440:900,pad=1600:900:80:0:color=0x102e31,tpad=stop_mode=clone:stop_duration=20[base];[base][1:v]overlay=shortest=0:format=auto,format=yuv420p[v];[2:a]apad=pad_dur=20[a]", "-map", "[v]", "-map", "[a]"]
    else:
        command = common + ["-loop", "1", "-i", str(frame_file), "-i", str(audio), "-vf", "format=yuv420p", "-af", "apad=pad_dur=20"]
    command += ["-t", f"{duration:.3f}", "-r", "25", "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-c:a", "aac", "-b:a", "160k", str(output)]
    run(*command)


def render(name, smoke=False):
    manifest = json.loads((HERE / f"{name}.json").read_text(encoding="utf-8"))
    prefix = "01-introduction" if name == "intro" else "02-usage-demo"
    beats = manifest["beats"]
    if smoke:
        audio, receipt = synthesize(beats[0]["narration"], f"{prefix}-smoke")
        print(json.dumps({"test": receipt, "seconds": probe_audio(audio)}, ensure_ascii=False))
        return
    segments = []
    captions = []
    spoken = []
    voice_receipts = []
    current = 0.0
    for index, beat in enumerate(beats):
        stem = f"{prefix}-{index + 1:02d}"
        audio, receipt = synthesize(beat["narration"], stem)
        voice_receipts.append(receipt)
        duration = max(probe_audio(audio) + 1.2, beat.get("clipSeconds", 0) + 0.5, 4.2)
        frame_file = OUT / f"{stem}.png"
        image = slide_frame(beat, index, len(beats)) if name == "intro" else tutorial_frame(beat)
        image.save(frame_file)
        segment = OUT / f"{stem}.mp4"
        render_segment(frame_file, audio, duration, segment, beat)
        segments.append(segment)
        captions.append(f"{index + 1}\n{timestamp(current)} --> {timestamp(current + duration)}\n{beat['subtitle']}\n")
        spoken.append(f"[{index + 1:02d}] {beat['narration']}")
        current += duration
        print(f"{stem}: {duration:.1f}s, Google voice confirmed", flush=True)
    concat = OUT / f"{prefix}-concat.txt"
    concat.write_text("".join(f"file '{segment.as_posix()}'\n" for segment in segments), encoding="utf-8")
    final = OUT / f"{prefix}.mp4"
    run("ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", str(final))
    (OUT / f"{prefix}.srt").write_text("\n".join(captions), encoding="utf-8")
    (OUT / f"{prefix}-transcript.txt").write_text("\n".join(spoken), encoding="utf-8")
    receipt = {"title": manifest["title"], "video": str(final), "seconds": probe_audio(final), "beats": len(beats), "tts": "Google Cloud Text-to-Speech / ko-KR-Chirp3-HD-Kore / 0.94", "sha256": hashlib.sha256(final.read_bytes()).hexdigest(), "voiceReceipts": voice_receipts}
    (OUT / f"{prefix}-render-receipt.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({key: value for key, value in receipt.items() if key != "voiceReceipts"}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("part", choices=["intro", "tutorial", "both"])
    parser.add_argument("--smoke", action="store_true")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    for part in (["intro", "tutorial"] if args.part == "both" else [args.part]):
        render(part, smoke=args.smoke)
