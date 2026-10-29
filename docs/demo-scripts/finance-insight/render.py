"""PR Studio renderer for genuine UI captures, Korean narration and captions.
Never drives a browser or invents application output; consumes supplied capture files.
"""
import argparse, hashlib, json, os, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[3]
def run(args):
    subprocess.run([str(x) for x in args], check=True, cwd=ROOT)
def probe(path):
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)],text=True))
def font(size,bold=False):
    return ImageFont.truetype('C:/Windows/Fonts/'+('malgunbd.ttf' if bold else 'malgun.ttf'),size)
def wrap_pixels(text,f,width):
    lines=[]; line=''
    for word in text.split():
        candidate=(line+' '+word).strip()
        if f.getlength(candidate)>width and line: lines.append(line); line=word
        else: line=candidate
    if line: lines.append(line)
    return lines

def compose(scene,captures,dest,disclosure):
    canvas=Image.new('RGB',(1920,1080),'#0b202c'); d=ImageDraw.Draw(canvas)
    d.rectangle((0,0,1920,10),fill='#dba734')
    d.text((64,42),'CI FINANCE INSIGHT STUDIO',font=font(26,True),fill='#7ed5df')
    d.text((64,95),scene['title'],font=font(48,True),fill='white')
    d.text((64,168),scene['label'],font=font(25),fill='#b6c8d2')
    def shot(name,box):
        image=Image.open(captures/name).convert('RGB')
        image=ImageOps.contain(image,(box[2]-box[0],box[3]-box[1]),Image.Resampling.LANCZOS)
        x=box[0]+(box[2]-box[0]-image.width)//2; y=box[1]+(box[3]-box[1]-image.height)//2
        d.rounded_rectangle((x-3,y-3,x+image.width+3,y+image.height+3),radius=8,fill='#58717e')
        canvas.paste(image,(x,y))
    if scene.get('pair'):
        d.text((70,254),'GPT 대화창',font=font(31,True),fill='white')
        d.text((1000,254),'독립 웹앱',font=font(31,True),fill='white')
        shot(scene['pair'],(60,320,930,860)); shot(scene['image'],(990,320,1860,860))
    else:
        shot(scene['image'],(480,230,1860,930))
        d.text((64,270),scene['id']+' / 10',font=font(60,True),fill='#e9b745')
        y=382
        for line in wrap_pixels(scene['caption'],font(35,True),360):
            d.text((64,y),line,font=font(35,True),fill='white'); y+=58
    d.rectangle((0,960,1920,1080),fill='#05121b')
    d.text((960,988),scene['caption'],anchor='mm',font=font(37,True),fill='white')
    d.text((960,1046),disclosure,anchor='mm',font=font(21),fill='#9bb0bb')
    canvas.save(dest)

def stamp(t):
    ms=round(t*1000); h,ms=divmod(ms,3600000); m,ms=divmod(ms,60000); s,ms=divmod(ms,1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--manifest',required=True); parser.add_argument('--capture-root',required=True); parser.add_argument('--out',required=True); a=parser.parse_args()
    data=json.loads(Path(a.manifest).read_text(encoding='utf-8')); captures=Path(a.capture_root); out=Path(a.out).resolve(); out.mkdir(parents=True,exist_ok=True)
    for part in ['screens','audio','clips','narration']: (out/part).mkdir(exist_ok=True)
    # Explicit local provider: this renderer never provisions an API key.
    env=os.environ.copy(); env['PR_STUDIO_TTS_PROVIDER']='system'; env['PR_STUDIO_TTS_PROVIDER_KO']='system'
    records=[]; subtitles=[]; elapsed=0
    for i,scene in enumerate(data['scenes'],1):
        ident=scene['id']; img=out/'screens'/f'{ident}.png'; wav=out/'audio'/f'{ident}.wav'; txt=out/'narration'/f'{ident}.txt'; clip=out/'clips'/f'{ident}.mp4'
        compose(scene,captures,img,data['disclosure'])
        narration_unchanged = txt.exists() and txt.read_text(encoding='utf-8') == scene['narration']
        txt.write_text(scene['narration'],encoding='utf-8')
        if not wav.exists() or not narration_unchanged: subprocess.run(['node',str(ROOT/'scripts/synthesize-speech.mjs'),'--input',str(txt),'--output',str(wav)],env=env,check=True,cwd=ROOT)
        audio_duration=float(probe(wav)['format']['duration']); duration=max(9,audio_duration+1.3)
        run(['ffmpeg','-y','-loglevel','error','-loop','1','-framerate','25','-i',img,'-i',wav,'-t',str(duration),'-vf','format=yuv420p','-af','apad','-c:v','libx264','-preset','fast','-crf','19','-c:a','aac','-b:a','160k','-ar','48000','-ac','2','-movflags','+faststart',clip])
        subtitles.append(f'{i}\n{stamp(elapsed)} --> {stamp(elapsed+duration)}\n{scene["caption"]}\n')
        records.append({'scene':ident,'start':elapsed,'duration':duration,'audio_duration':audio_duration,'capture_sha256':hashlib.sha256((captures/scene['image']).read_bytes()).hexdigest()}); elapsed+=duration
        print(f'Scene {ident}: {duration:.2f}s',flush=True)
    listing=out/'concat.txt'; listing.write_text(''.join("file '"+(out/'clips'/f'{s["id"]}.mp4').as_posix()+"'\n" for s in data['scenes']),encoding='utf-8')
    output=out/'finance-insight-guide-ko.mp4'; run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',listing,'-c','copy','-movflags','+faststart',output])
    (out/'finance-insight-guide-ko.srt').write_text('\n'.join(subtitles),encoding='utf-8')
    (out/'narration-ko.txt').write_text('\n\n'.join(s['title']+'\n'+s['narration'] for s in data['scenes']),encoding='utf-8')
    receipt={'kind':'edited genuine screen capture tutorial; not continuous recording','title':data['title'],'report_id':data['source_report_id'],'duration':elapsed,'scenes':records,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'probe':probe(output)}
    (out/'render-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
    print(output,flush=True)
if __name__=='__main__': main()
