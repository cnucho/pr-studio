"""Build online and PDF finance guides from one reviewed manuscript."""
import argparse, html, json, shutil
from pathlib import Path
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, KeepTogether
from PIL import Image as PILImage

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--source',required=True); ap.add_argument('--captures',required=True); ap.add_argument('--out',required=True); ap.add_argument('--font',required=True); ap.add_argument('--bold-font',required=True); a=ap.parse_args()
    data=json.loads(Path(a.source).read_text(encoding='utf-8-sig')); out=Path(a.out); out.mkdir(parents=True,exist_ok=True)
    pdfmetrics.registerFont(TTFont('Guide',a.font)); pdfmetrics.registerFont(TTFont('GuideBold',a.bold_font))
    pdfmetrics.registerFontFamily('Guide',normal='Guide',bold='GuideBold',italic='Guide',boldItalic='GuideBold')
    styles={
      'title':ParagraphStyle('title',fontName='GuideBold',fontSize=21,leading=29,textColor=colors.HexColor('#163b4d'),spaceAfter=8,wordWrap='CJK'),
      'h':ParagraphStyle('h',fontName='GuideBold',fontSize=17,leading=24,textColor=colors.HexColor('#163b4d'),spaceAfter=10,wordWrap='CJK'),
      'body':ParagraphStyle('body',fontName='Guide',fontSize=10.2,leading=16,spaceAfter=7,wordWrap='CJK'),
      'small':ParagraphStyle('small',fontName='Guide',fontSize=8.3,leading=12,textColor=colors.HexColor('#536c78'),spaceAfter=6,wordWrap='CJK'),
      'request':ParagraphStyle('request',fontName='GuideBold',fontSize=10.5,leading=17,backColor=colors.HexColor('#eef6f7'),borderPadding=9,spaceBefore=7,spaceAfter=14,wordWrap='CJK')}
    video='https://www.youtube.com/watch?v='+data['youtubeId'] if data.get('youtubeId') else data['portalUrl']
    esc=lambda s:html.escape(str(s))
    for guide in data['guides']:
        ident=guide['id']; elements=[]; sections=[]
        for i,page in enumerate(guide['pages']):
            if i: elements.append(PageBreak())
            elements.append(Paragraph('CI FINANCE INSIGHT STUDIO / '+esc(guide['title']),styles['small']))
            elements.append(Paragraph(esc(page['title']),styles['h']))
            elements.append(Paragraph(esc(page['intro']),styles['body']))
            source=Path(a.captures)/page['image']; dest=out/page['image']; shutil.copyfile(source,dest)
            with PILImage.open(source) as im: w,h=im.size
            draw_w=490; draw_h=min(245,draw_w*h/w); draw_w=draw_h*w/h
            elements.extend([Image(str(source),width=draw_w,height=draw_h),Spacer(1,9)])
            elements.append(Paragraph('실제 운영 화면 · 합성자료 시연',styles['small']))
            for n,step in enumerate(page['steps'],1): elements.append(Paragraph(f'<b>{n}.</b> '+esc(step),styles['body']))
            elements.append(Paragraph('짧은 요청 예시<br/>'+esc(page['request']).replace('\n','<br/>'),styles['request']))
            for check in page['checks']: elements.append(Paragraph('• '+esc(check),styles['small']))
            if i==len(guide['pages'])-1:
                elements.append(Paragraph(f'<link href="{esc(video)}" color="#096b88">YouTube 실제 시연 영상 보기</link>  |  <link href="{esc(data["portalUrl"])}" color="#096b88">포털 설명서·영상</link>',styles['body']))
                elements.append(Paragraph(f'<link href="{esc(data["installUrl"])}" color="#096b88">앱 연결 안내</link>  |  <link href="{esc(data["appUrl"])}" color="#096b88">금융 보고서 앱 열기</link>',styles['body']))
            steps=''.join('<li>'+esc(x)+'</li>' for x in page['steps']); checks=''.join('<li>'+esc(x)+'</li>' for x in page['checks'])
            sections.append(f'<section id="step-{i+1}"><h2>{esc(page["title"])}</h2><p>{esc(page["intro"])}</p><figure><img src="{esc(page["image"])}" alt="{esc(page["title"])} 실제 화면"><figcaption>실제 운영 화면 · 합성자료 시연</figcaption></figure><ol>{steps}</ol><div class="request"><strong>짧은 요청 예시</strong><p>{esc(page["request"]).replace(chr(10),"<br>")}</p></div><ul class="checks">{checks}</ul><a href="#top">맨 위로 ↑</a></section>')
        def footer(canvas,doc):
            canvas.setFont('Guide',8); canvas.setFillColor(colors.HexColor('#627986')); canvas.drawString(42,25,'사용 안내 '+data['version']+' · '+guide['title']); canvas.drawRightString(A4[0]-42,25,str(doc.page))
        pdf=out/f'finance-{ident}-guide-ko.pdf'
        SimpleDocTemplate(str(pdf),pagesize=A4,rightMargin=42,leftMargin=42,topMargin=35,bottomMargin=40,title=guide['title'],author='MethodIQ').build(elements,onFirstPage=footer,onLaterPages=footer)
        toc=''.join(f'<a href="#step-{i+1}">{esc(p["title"])}</a>' for i,p in enumerate(guide['pages']))
        css='*{box-sizing:border-box}body{margin:0;background:#f3f6f8;color:#173344;font:17px/1.8 system-ui,"Malgun Gothic",sans-serif}main{max-width:1000px;margin:auto;padding:36px 28px}header,section{background:white;padding:32px;border-radius:14px;margin-bottom:24px}h1{font-size:34px;line-height:1.4}h2{font-size:25px}a{color:#096b88}nav{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0}.button{padding:10px 18px;border:1px solid #a9c4d2;border-radius:8px;text-decoration:none}figure{margin:24px 0}img{width:100%;height:auto;border:1px solid #d6e1e8}figcaption,.checks,small{font-size:14px;color:#526b79}.request{background:#edf7f8;padding:18px 22px;border-left:4px solid #267e89}li{margin:10px 0}.toc{display:grid;gap:8px}@media(max-width:600px){main{padding:16px}header,section{padding:20px}h1{font-size:28px}}@media print{body{background:white}header,section{break-inside:avoid}nav{display:none}}'
        content=f'<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(guide["title"])} | 금융 보고서</title><style>{css}</style><main id="top"><header><a href="/demos">← 설명서·데모영상</a><h1>{esc(guide["title"])}</h1><p>{esc(guide["subtitle"])}</p><small>기준일 {data["version"]} · {esc(data["disclosure"])}</small><nav><a class="button" href="finance-{ident}-guide-ko.pdf" download>PDF 다운로드</a><a class="button" href="{esc(video)}" target="_blank" rel="noopener">YouTube 시연 보기</a><a class="button" href="{esc(data["appUrl"])}" target="_blank" rel="noopener">앱 열기</a></nav><div class="toc">{toc}</div></header>'+''.join(sections)+'</main></html>'
        (out/f'{ident}.html').write_text(content,encoding='utf-8')
        print(pdf)
if __name__=='__main__': main()