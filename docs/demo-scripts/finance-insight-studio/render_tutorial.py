import argparse, json, os, textwrap
from PIL import Image, ImageDraw, ImageFont, ImageOps

p=argparse.ArgumentParser(); p.add_argument('--storyboard'); p.add_argument('--scene'); p.add_argument('--screens'); p.add_argument('--output'); a=p.parse_args()
data=json.load(open(a.storyboard,encoding='utf-8')); scene=next(x for x in data['scenes'] if x['id']==a.scene)
W,H=1920,1080; im=Image.new('RGB',(W,H),'#101b2b'); d=ImageDraw.Draw(im)
font='C:/Windows/Fonts/malgun.ttf'; bold='C:/Windows/Fonts/malgunbd.ttf'
def F(n,b=False): return ImageFont.truetype(bold if b else font,n)
def wrap(s,maxw,f):
    lines=[]
    for para in s.split('\n'):
        line=''
        for ch in para:
            cand=line+ch
            if d.textbbox((0,0),cand,font=f)[2]>maxw and line: lines.append(line); line=ch
            else: line=cand
        lines.append(line)
    return lines
d.rectangle((0,0,W,11),fill='#59d3c4')
d.text((70,43),data['title'],font=F(26,True),fill='#59d3c4')
d.text((70,91),scene['title'],font=F(47,True),fill='white')
d.text((1710,65),f"{data['scenes'].index(scene)+1:02d} / {len(data['scenes']):02d}",font=F(22),fill='#aabbd0')
box=(70,190,1420,955); d.rounded_rectangle(box,radius=21,fill='#e9eef4')
screen_path=os.path.join(a.screens,scene['screen'])
if not os.path.isfile(screen_path): raise FileNotFoundError(screen_path)
shot=Image.open(screen_path).convert('RGB'); shot.thumbnail((1302,697),Image.Resampling.LANCZOS)
im.paste(shot,(94+(1302-shot.width)//2,224+(697-shot.height)//2))
d.rounded_rectangle((1450,190,1850,955),radius=21,fill='#1d3047')
d.text((1483,226),scene['case'],font=F(21,True),fill='#59d3c4')
y=292
for line in wrap(scene['action'],336,F(29,True)):
    d.text((1483,y),line,font=F(29,True),fill='white'); y+=48
y=max(y+35,460)
d.line((1483,y,1815,y),fill='#54728c',width=2);y+=35
for line in wrap(scene['detail'],336,F(23)):
    d.text((1483,y),line,font=F(23),fill='#d3e3f3');y+=39
d.text((70,985),scene['footnote'],font=F(21),fill='#9aacc3')
im.save(a.output)
