"""PR Studio: Korean MCP/SaaS explainer, using real app captures and Google TTS."""
import hashlib
import json
import os
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
OUT = ROOT / "out" / "mcp-intro"
DATA = json.loads((HERE / "scenes.json").read_text(encoding="utf-8"))
W, H = 1920, 1080
NAVY = "#0c2334"
PANEL = "#17364a"
CYAN = "#72d7df"
GOLD = "#f1c469"
WHITE = "#f7fbfd"
MUTED = "#b7cbd5"


def font(size, bold=False):
    return ImageFont.truetype("C:/Windows/Fonts/" + ("malgunbd.ttf" if bold else "malgun.ttf"), size)


def lines(draw, value, selected_font, max_width):
    result = []
    for part in value.split("\n"):
        row = ""
        for word in part.split():
            test = (row + " " + word).strip()
            if row and draw.textlength(test, font=selected_font) > max_width:
                result.append(row)
                row = word
            else:
                row = test
        result.append(row)
    return result


def centered(draw, text, box, selected_font, fill, gap=85):
    wrapped = lines(draw, text, selected_font, box[2]-box[0]-80)
    y = (box[1]+box[3]-gap*(len(wrapped)-1))/2
    for row in wrapped:
        draw.text(((box[0]+box[2])/2, y), row, font=selected_font, fill=fill, anchor="mm")
        y += gap


def frame(scene, index):
    image = Image.new("RGB", (W,H), NAVY)
    d = ImageDraw.Draw(image)
    d.rectangle((0,0,W,12), fill=CYAN)
    d.text((80,54), "METHODIQ  /  MCP × SaaS", font=font(29,True), fill=CYAN)
    d.text((1840,58), f"{index:02d}/{len(DATA['scenes']):02d}", font=font(26), fill=MUTED, anchor="ra")
    d.text((80,128), scene["section"], font=font(26), fill=GOLD)
    d.text((80,185), scene["title"], font=font(62,True), fill=WHITE)
    d.line((80,290,1840,290), fill="#436174", width=3)
    kind = scene["kind"]
    if kind == "image":
        source = HERE / "captures" / scene["image"]
        with Image.open(source) as original:
            shot = ImageOps.contain(original.convert("RGB"), (1640,570), Image.Resampling.LANCZOS)
        x, y = (W-shot.width)//2, 325+(570-shot.height)//2
        d.rounded_rectangle((x-7,y-7,x+shot.width+7,y+shot.height+7), 18, fill="#79bac5")
        image.paste(shot, (x,y))
        d.text((W//2, 926), "실제 운영 웹 화면 · 설명을 위해 편집", font=font(25), fill=MUTED, anchor="mm")
    elif kind in {"hero","compare"}:
        boxes = [(80,345,940,800),(980,345,1840,800)]
        for j, (key,box) in enumerate(zip(("left","right"),boxes)):
            d.rounded_rectangle(box, 28, fill=PANEL, outline=CYAN if j==0 else GOLD, width=4)
            centered(d, scene[key], box, font(52 if kind=="hero" else 44,True), WHITE, 83)
        d.line((940,565,980,565), fill=GOLD, width=7)
    else:
        box=(140,365,1780,800)
        d.rounded_rectangle(box, 28, fill=PANEL, outline=CYAN, width=4)
        centered(d, scene["left"],box,font(55,True),WHITE,92)
    d.rounded_rectangle((90,925,1830,1035), 14, fill="#061923")
    d.text((W//2,980), scene["caption"],font=font(37,True),fill=WHITE,anchor="mm")
    d.text((80,1052), "설치 메뉴와 권한은 계정·플랜에 따라 다를 수 있습니다 · 2026-11-12 기준",font=font(18),fill=MUTED)
    return image


def call(args, env=None):
    subprocess.run([str(a) for a in args], check=True, cwd=ROOT, env=env)


def duration(path):
    data=json.loads(subprocess.check_output(["ffprobe","-v","error","-show_format","-of","json",str(path)],text=True))
    return float(data["format"]["duration"])


def stamp(seconds):
    ms=round(seconds*1000)
    h,ms=divmod(ms,3600000)
    m,ms=divmod(ms,60000)
    s,ms=divmod(ms,1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def main():
    for name in ("frames","audio","clips","narration"):
        (OUT/name).mkdir(parents=True,exist_ok=True)
    env=os.environ.copy()
    env["PR_STUDIO_TTS_PROVIDER"]="google"
    env["PR_STUDIO_TTS_PROVIDER_KO"]="google"
    env["PR_STUDIO_TTS_PROVIDER_EN"]="google"
    env["GOOGLE_TTS_SPEAKING_RATE"]="0.94"
    env["PR_STUDIO_TTS_LANGUAGE"]="ko"
    receipt=[]
    captions=[]
    clock=0.0
    for i,scene in enumerate(DATA["scenes"],1):
        key=f"{i:02d}"
        image=OUT/"frames"/f"{key}.png"
        speech=OUT/"audio"/f"{key}.wav"
        clip=OUT/"clips"/f"{key}.mp4"
        narration=OUT/"narration"/f"{key}.txt"
        frame(scene,i).save(image,optimize=True)
        previous=narration.read_text(encoding="utf-8") if narration.exists() else None
        narration.write_text(scene["narration"],encoding="utf-8")
        if not speech.exists() or previous!=scene["narration"]:
            call(["node",ROOT/"scripts"/"synthesize-speech.mjs","--input",narration,"--output",speech],env)
        audio_seconds=duration(speech)
        hold=max(audio_seconds+1.4,7.5 if scene["kind"]!="image" else 9.0)
        if not clip.exists() or previous!=scene["narration"]:
            call(["ffmpeg","-y","-loglevel","error","-loop","1","-framerate","25","-i",image,"-i",speech,"-t",str(hold),"-vf","format=yuv420p","-af","apad","-c:v","libx264","-preset","veryfast","-crf","21","-c:a","aac","-b:a","160k","-ar","48000","-ac","2","-movflags","+faststart",clip])
        captions.append(f"{i}\n{stamp(clock)} --> {stamp(clock+hold)}\n{scene['caption']}\n")
        receipt.append({"scene":key,"title":scene["title"],"start":round(clock,2),"duration":round(hold,2),"audio_duration":round(audio_seconds,2)})
        clock+=hold
        print(f"{key}/{len(DATA['scenes'])} {scene['title']} {hold:.1f}s",flush=True)
    listing=OUT/"concat.txt"
    listing.write_text("".join(f"file '{(OUT/'clips'/f'{i:02d}.mp4').as_posix()}'\n" for i in range(1,len(receipt)+1)),encoding="utf-8")
    final=OUT/"mcp-saas-intro-ko.mp4"
    call(["ffmpeg","-y","-loglevel","error","-f","concat","-safe","0","-i",listing,"-c","copy","-movflags","+faststart",final])
    (OUT/"mcp-saas-intro-ko.srt").write_text("\n".join(captions),encoding="utf-8")
    (OUT/"transcript-ko.txt").write_text("\n\n".join(s["title"]+"\n"+s["narration"] for s in DATA["scenes"]),encoding="utf-8")
    (OUT/"render-receipt.json").write_text(json.dumps({"title":DATA["title"],"duration":round(clock,2),"sha256":hashlib.sha256(final.read_bytes()).hexdigest(),"scenes":receipt},ensure_ascii=False,indent=2),encoding="utf-8")
    print(final,flush=True)


if __name__=="__main__": main()
