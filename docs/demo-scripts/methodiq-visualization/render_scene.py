from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


W, H = 1920, 1080
INK = "#122033"
MUTED = "#6f7b8b"
PAPER = "#f4f0e8"
PANEL = "#fffdf8"
BLUE = "#1f5eff"
ORANGE = "#ef7d3b"
MINT = "#4db6a4"
LINE = "#d8d3c9"
GRAY = "#aeb7c5"
RED = "#d45f78"
FONT_REGULAR = Path(r"C:\Windows\Fonts\malgun.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\malgunbd.ttf")


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT_REGULAR), size)


def fit_lines(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in text.splitlines() or [""]:
        current = ""
        for char in paragraph:
            trial = current + char
            if draw.textbbox((0, 0), trial, font=fnt)[2] <= width or not current:
                current = trial
            else:
                lines.append(current)
                current = char
        lines.append(current)
    return lines


def text_block(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fnt: ImageFont.FreeTypeFont, fill: str, width: int, spacing: int = 10) -> int:
    x, y = xy
    lines = fit_lines(draw, text, fnt, width)
    line_h = fnt.size + spacing
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=fill)
        y += line_h
    return y


def rr(draw: ImageDraw.ImageDraw, box, radius=24, fill=PANEL, outline=LINE, width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def arrow(draw: ImageDraw.ImageDraw, start, end, fill=INK, width=5):
    draw.line([start, end], fill=fill, width=width)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    a = 16
    p1 = (end[0] - a * math.cos(angle - 0.55), end[1] - a * math.sin(angle - 0.55))
    p2 = (end[0] - a * math.cos(angle + 0.55), end[1] - a * math.sin(angle + 0.55))
    draw.polygon([end, p1, p2], fill=fill)


def chart_rows(draw, x, y, width, rows, active=2):
    label_f = font(22, True)
    value_f = font(21, True)
    for i, (label, value) in enumerate(rows):
        yy = y + i * 76
        draw.text((x, yy + 8), label, font=label_f, fill=INK)
        bx = x + 120
        draw.rounded_rectangle((bx, yy + 8, bx + width - 210, yy + 42), radius=6, fill="#e7eaee")
        fill = BLUE if i == active else GRAY
        draw.rounded_rectangle((bx, yy + 8, bx + int((width - 210) * value / 75), yy + 42), radius=6, fill=fill)
        draw.text((x + width - 72, yy + 8), f"{value}%", font=value_f, fill=INK)


def table(draw, x, y, width, rows, headers, hot=1):
    cols = len(headers)
    col_w = width // cols
    row_h = 68
    hf, tf = font(22, True), font(21)
    draw.rounded_rectangle((x, y, x + width, y + row_h * (len(rows) + 1)), radius=18, fill="#ffffff", outline=LINE, width=2)
    for c, h in enumerate(headers):
        draw.text((x + c * col_w + 18, y + 18), h, font=hf, fill=INK)
    draw.line((x, y + row_h, x + width, y + row_h), fill=INK, width=3)
    for r, row in enumerate(rows):
        yy = y + (r + 1) * row_h
        if r == hot:
            draw.rectangle((x + 2, yy, x + width - 2, yy + row_h), fill="#edf3ff")
        for c, value in enumerate(row):
            draw.text((x + c * col_w + 18, yy + 18), str(value), font=hf if r == hot else tf, fill=INK)
        if r < len(rows) - 1:
            draw.line((x + 12, yy + row_h, x + width - 12, yy + row_h), fill="#e3e6ea", width=2)


def draw_visual(draw: ImageDraw.ImageDraw, scene: dict, box: tuple[int, int, int, int]):
    x1, y1, x2, y2 = box
    kind = scene["kind"]
    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
    if kind == "opening":
        for radius, color in [(290, "#9fb8ff"), (210, "#f2b088"), (130, "#8fd3c6")]:
            draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=color, width=5)
        draw.line((cx - 210, cy + 230, cx + 220, cy - 235), fill=BLUE, width=7)
        draw.ellipse((cx - 23, cy - 23, cx + 23, cy + 23), fill=BLUE)
        return
    if kind == "memory":
        items = [("42.1", 90, 65, 34), ("57.8", 375, 90, 28), ("31.4", 620, 70, 42), ("49.6", 70, 315, 30), ("68.2", 650, 350, 34), ("24.9", 95, 600, 44), ("53.0", 430, 635, 32)]
        for txt, dx, dy, sz in items:
            draw.text((x1 + dx, y1 + dy), txt, font=font(sz, True), fill="#aab3bf")
        rr(draw, (x1 + 280, y1 + 245, x1 + 560, y1 + 345), 20, "#ffffff", "#b8c9ff", 4)
        draw.text((x1 + 335, y1 + 270), "상승  ↗", font=font(40, True), fill=BLUE)
        rr(draw, (x1 + 545, y1 + 540, x1 + 760, y1 + 640), 20, "#ffffff", "#f2b088", 4)
        draw.text((x1 + 600, y1 + 565), "예외!", font=font(38, True), fill=ORANGE)
        return
    if kind == "access":
        heights = [280, 420, 600]
        colors = ["#9ba7b7", MINT, BLUE]
        titles = ["과거", "지금", "AI 시대"]
        notes = ["통계 프로그램\n디자인 소프트웨어", "웹 도구\n템플릿·자동화", "자연어 요청\n대화형 수정\n편집 가능 출력"]
        for i in range(3):
            bx = x1 + 45 + i * 255
            by = y2 - 70 - heights[i]
            rr(draw, (bx, by, bx + 210, y2 - 70), 24, colors[i], colors[i], 1)
            draw.text((bx + 24, by + 25), titles[i], font=font(28, True), fill="#ffffff")
            text_block(draw, (bx + 24, by + 90), notes[i], font(20), "#ffffff", 168, 12)
        return
    if kind == "three-forms":
        labels = [("텍스트", "맥락·원인·해석"), ("표", "정확한 값·조회"), ("차트", "패턴·격차·예외")]
        for i, (title, foot) in enumerate(labels):
            bx = x1 + 22 + i * 270
            rr(draw, (bx, y1 + 45, bx + 246, y2 - 45), 22, "#ffffff", LINE, 2)
            draw.text((bx + 22, y1 + 75), title, font=font(27, True), fill=INK)
            draw.text((bx + 22, y2 - 100), foot, font=font(18, True), fill=BLUE)
            if i == 0:
                text_block(draw, (bx + 22, y1 + 145), "40대 이용률이 가장 높고 60대 이후 빠르게 낮아진다.", font(19), "#4b5768", 200, 12)
            elif i == 1:
                table(draw, bx + 18, y1 + 140, 210, [["20대", "42"], ["40대", "66"], ["60대+", "29"]], ["연령", "%"], 1)
            else:
                vals = [42, 66, 29]
                for j, v in enumerate(vals):
                    xx = bx + 35 + j * 65
                    draw.rectangle((xx, y2 - 150 - v * 4, xx + 40, y2 - 150), fill=BLUE if j == 1 else GRAY)
        return
    if kind == "text-case":
        rr(draw, (x1 + 45, y1 + 70, x2 - 45, y2 - 70), 30, "#ffffff", LINE, 2)
        draw.text((x1 + 90, y1 + 135), "만족도는", font=font(42, True), fill=INK)
        draw.text((x1 + 90, y1 + 205), "52%에서 61%로", font=font(56, True), fill=BLUE)
        draw.text((x1 + 90, y1 + 300), "상승했다.", font=font(42, True), fill=INK)
        draw.text((x1 + 90, y1 + 410), "가장 큰 이유는 응답 속도 개선이었다.", font=font(27), fill="#4b5768")
        draw.text((x1 + 90, y2 - 150), "값 2개  ·  메시지 1개  ·  이유 1개", font=font(20, True), fill=MUTED)
        return
    if kind == "table-case":
        table(draw, x1 + 35, y1 + 70, x2 - x1 - 70, [["서울", "78.2", "54.8", "41.3"], ["경기", "74.9", "57.1", "44.6"], ["충청", "69.5", "49.0", "38.7"], ["영남", "71.2", "51.8", "40.1"], ["호남", "67.8", "46.5", "37.9"]], ["지역", "인지", "이용", "추천"], 1)
        draw.text((x1 + 55, y2 - 100), "단위: % · 소수점 1자리 · 세로선 생략", font=font(20), fill=MUTED)
        return
    if kind in {"chart-case", "chart"}:
        draw.text((x1 + 35, y1 + 45), "모바일 투자 이용률은 40대에서 정점", font=font(29, True), fill=INK)
        chart_rows(draw, x1 + 40, y1 + 125, x2 - x1 - 80, [("20대", 42), ("30대", 56), ("40대", 66), ("50대", 49), ("60대+", 29)], 2)
        draw.text((x1 + 40, y2 - 75), "단위: % · n=1,204 · 가상 조사자료", font=font(18), fill=MUTED)
        return
    if kind == "question":
        cards = [("구조·관계", "도식 · 연구모형"), ("크기·차이", "막대 · 점 · 순위"), ("시간·변화", "선 · 기준선"), ("분포·응답", "분포 · 누적막대")]
        for i, (a, b) in enumerate(cards):
            col, row = i % 2, i // 2
            bx, by = x1 + 35 + col * 400, y1 + 45 + row * 330
            rr(draw, (bx, by, bx + 365, by + 285), 24, "#ffffff", LINE, 2)
            draw.text((bx + 28, by + 35), a, font=font(29, True), fill=INK)
            draw.text((bx + 28, by + 92), b, font=font(19), fill=MUTED)
            if i == 0:
                arrow(draw, (bx + 70, by + 200), (bx + 285, by + 200), BLUE, 5)
                draw.ellipse((bx + 42, by + 172, bx + 98, by + 228), outline=BLUE, width=5)
                draw.ellipse((bx + 275, by + 172, bx + 331, by + 228), outline=ORANGE, width=5)
            elif i == 1:
                for j, h in enumerate([55, 115, 85]): draw.rectangle((bx + 80 + j * 72, by + 235 - h, bx + 125 + j * 72, by + 235), fill=BLUE if j == 1 else GRAY)
            elif i == 2:
                draw.line((bx + 55, by + 230, bx + 120, by + 190, bx + 190, by + 205, bx + 300, by + 140), fill=BLUE, width=7)
            else:
                draw.rounded_rectangle((bx + 55, by + 175, bx + 305, by + 215), radius=8, fill=GRAY)
                draw.rounded_rectangle((bx + 55, by + 175, bx + 205, by + 215), radius=8, fill=MINT)
        return
    if kind == "before-after":
        for i, title in enumerate(["BEFORE · 주제만", "AFTER · 발견 문장"]):
            bx = x1 + 22 + i * 410
            rr(draw, (bx, y1 + 45, bx + 382, y2 - 45), 24, "#ffffff", "#b8c9ff" if i else LINE, 4 if i else 2)
            draw.text((bx + 25, y1 + 75), title, font=font(19, True), fill=BLUE if i else MUTED)
            heading = "모바일 투자 이용률은\n40대에서 가장 높다" if i else "연령별 금융상품\n이용 현황"
            text_block(draw, (bx + 25, y1 + 135), heading, font(25, True), INK, 325, 9)
            vals = [42, 56, 66, 49, 29]
            for j, v in enumerate(vals):
                xx = bx + 35 + j * 62
                color = BLUE if i and j == 2 else (["#9c7bd8", MINT, ORANGE, BLUE, RED][j] if not i else GRAY)
                draw.rectangle((xx, y2 - 100 - v * 4, xx + 42, y2 - 100), fill=color)
        return
    if kind == "hierarchy":
        draw.text((x1 + 55, y1 + 65), "47%", font=font(116, True), fill=BLUE)
        draw.text((x1 + 65, y1 + 205), "핵심 행동 전환율", font=font(27, True), fill=INK)
        chart_rows(draw, x1 + 55, y1 + 300, x2 - x1 - 110, [("주요 집단", 47), ("비교 A", 36), ("비교 B", 28)], 0)
        draw.text((x1 + 55, y2 - 75), "n=1,204 · 단위: % · 가중 결과", font=font(18), fill=MUTED)
        return
    if kind == "color":
        colors = [(BLUE, "핵심"), (ORANGE, "비교"), (GRAY, "맥락"), ("#d93f4a", "경고만")]
        for i, (color, label) in enumerate(colors):
            bx = x1 + 25 + i * 195
            rr(draw, (bx, y1 + 55, bx + 170, y1 + 190), 18, color, color, 1)
            draw.text((bx + 20, y1 + 135), label, font=font(21, True), fill="#ffffff" if i != 2 else INK)
        for i, (label, width, color) in enumerate([("현재 이용", 590, BLUE), ("향후 의향", 440, GRAY), ("이탈 위험", 260, ORANGE)]):
            yy = y1 + 300 + i * 100
            draw.text((x1 + 45, yy), label, font=font(23, True), fill=INK)
            draw.rounded_rectangle((x1 + 200, yy + 8, x1 + 200 + width, yy + 22), radius=7, fill=color)
        draw.text((x1 + 45, y2 - 75), "색 + 직접 라벨 + 길이로 의미를 중복 전달", font=font(19), fill=MUTED)
        return
    if kind == "axis-case":
        for i, title in enumerate(["절단된 축", "전체 축"]):
            bx = x1 + 25 + i * 410
            rr(draw, (bx, y1 + 50, bx + 380, y2 - 50), 24, "#ffffff", LINE, 2)
            draw.text((bx + 25, y1 + 80), title, font=font(25, True), fill=INK)
            px1, py1, px2, py2 = bx + 50, y1 + 170, bx + 330, y2 - 130
            draw.line((px1, py1, px1, py2, px2, py2), fill=GRAY, width=3)
            if i == 0:
                draw.line((px1 + 25, py2 - 35, px2 - 20, py1 + 45), fill=BLUE, width=8)
                draw.text((px1, py2 + 20), "50 ─ 54%", font=font(18), fill=MUTED)
            else:
                draw.line((px1 + 25, py2 - 180, px2 - 20, py2 - 205), fill=BLUE, width=8)
                draw.text((px1, py2 + 20), "0 ─ 100%", font=font(18), fill=MUTED)
        return
    if kind == "time-case":
        draw.text((x1 + 30, y1 + 45), "정책 시행 뒤 상승, 계절 변동은 지속", font=font(28, True), fill=INK)
        px1, py1, px2, py2 = x1 + 70, y1 + 150, x2 - 55, y2 - 120
        draw.line((px1, py1, px1, py2, px2, py2), fill=GRAY, width=3)
        pts = [(px1 + i * 72, py2 - v) for i, v in enumerate([80, 120, 95, 160, 125, 175, 250, 220, 300, 270])]
        draw.line(pts, fill=BLUE, width=8, joint="curve")
        event_x = pts[5][0]
        draw.line((event_x, py1, event_x, py2), fill=ORANGE, width=4)
        draw.text((event_x + 12, py1 + 5), "정책 시행", font=font(19, True), fill=ORANGE)
        draw.line((px1, py2 - 140, px2, py2 - 140), fill=GRAY, width=3)
        return
    if kind == "distribution":
        rng = random.Random(7)
        for i, title in enumerate(["집단 A · 평균 50", "집단 B · 평균 50"]):
            bx = x1 + 25 + i * 410
            rr(draw, (bx, y1 + 50, bx + 380, y2 - 50), 24, "#ffffff", LINE, 2)
            draw.text((bx + 25, y1 + 80), title, font=font(24, True), fill=INK)
            draw.line((bx + 40, y2 - 130, bx + 340, y2 - 130), fill=GRAY, width=3)
            draw.line((bx + 190, y1 + 155, bx + 190, y2 - 130), fill=ORANGE, width=3)
            for j in range(36):
                xx = rng.gauss(bx + 190, 42) if i == 0 else (rng.gauss(bx + 85, 28) if j % 2 else rng.gauss(bx + 295, 28))
                yy = y2 - 145 - (j % 9) * 25
                draw.ellipse((xx - 8, yy - 8, xx + 8, yy + 8), fill=BLUE if i == 0 else ORANGE)
        return
    if kind == "survey-case":
        draw.text((x1 + 35, y1 + 55), "서비스 경험 평가", font=font(30, True), fill=INK)
        rows = [("이해하기 쉽다", 18, 24, 58, 842), ("믿을 수 있다", 23, 31, 46, 842), ("다시 쓰고 싶다", 15, 20, 65, 617)]
        for i, (label, neg, neu, pos, n) in enumerate(rows):
            yy = y1 + 165 + i * 135
            draw.text((x1 + 35, yy + 8), label, font=font(21, True), fill=INK)
            bx, bw = x1 + 225, 510
            draw.rectangle((bx, yy, bx + bw * neg / 100, yy + 46), fill=RED)
            draw.rectangle((bx + bw * neg / 100, yy, bx + bw * (neg + neu) / 100, yy + 46), fill="#d7dce3")
            draw.rectangle((bx + bw * (neg + neu) / 100, yy, bx + bw, yy + 46), fill=MINT)
            draw.text((bx + bw + 20, yy + 8), f"n={n}", font=font(18), fill=MUTED)
        draw.text((x1 + 35, y2 - 95), "부정   중립   긍정 · 문항별 유효 응답자 수 표시", font=font(19), fill=MUTED)
        return
    if kind == "uncertainty":
        draw.text((x1 + 35, y1 + 55), "점 추정값과 95% 신뢰구간", font=font(30, True), fill=INK)
        for i, (label, value, left, right) in enumerate([("집단 A", 51, 43, 59), ("집단 B", 53, 44, 62), ("집단 C", 67, 62, 72)]):
            yy = y1 + 190 + i * 150
            draw.text((x1 + 45, yy - 15), label, font=font(23, True), fill=INK)
            sx = x1 + 220
            ex = x2 - 90
            lx = sx + (left - 35) / 45 * (ex - sx)
            rx = sx + (right - 35) / 45 * (ex - sx)
            px = sx + (value - 35) / 45 * (ex - sx)
            draw.line((lx, yy, rx, yy), fill=GRAY, width=6)
            draw.line((lx, yy - 14, lx, yy + 14), fill=GRAY, width=4)
            draw.line((rx, yy - 14, rx, yy + 14), fill=GRAY, width=4)
            draw.ellipse((px - 15, yy - 15, px + 15, yy + 15), fill=ORANGE if i == 2 else BLUE)
            draw.text((x2 - 75, yy - 16), f"{value}%", font=font(21, True), fill=INK)
        return
    if kind == "diagram":
        nodes = [(x1 + 35, cy - 60, "정책 경험", BLUE), (cx - 105, y1 + 75, "신뢰 인식", ORANGE), (x2 - 245, cy - 60, "이용 의향", MINT), (cx - 105, y2 - 180, "정보 이해도", GRAY)]
        arrow(draw, (x1 + 245, cy), (cx - 105, y1 + 135), INK, 5)
        arrow(draw, (cx + 105, y1 + 135), (x2 - 245, cy), INK, 5)
        arrow(draw, (x1 + 245, cy + 20), (x2 - 245, cy + 20), BLUE, 5)
        arrow(draw, (cx, y2 - 180), (cx, cy + 40), ORANGE, 5)
        for bx, by, label, color in nodes:
            rr(draw, (bx, by, bx + 210, by + 120), 22, "#ffffff", color, 4)
            draw.text((bx + 28, by + 42), label, font=font(23, True), fill=INK)
        return
    if kind == "process-case":
        boxes = [(x1 + 30, y1 + 100, "자료 입력"), (x1 + 305, y1 + 100, "기본 검증"), (x2 - 250, y1 + 100, "승인·내보내기")]
        for bx, by, label in boxes:
            rr(draw, (bx, by, bx + 220, by + 105), 20, "#ffffff", LINE, 3)
            draw.text((bx + 48, by + 33), label, font=font(22, True), fill=INK)
        arrow(draw, (x1 + 250, y1 + 152), (x1 + 305, y1 + 152))
        arrow(draw, (x1 + 525, y1 + 152), (x2 - 250, y1 + 152))
        diamond = [(cx, y1 + 300), (cx + 95, y1 + 395), (cx, y1 + 490), (cx - 95, y1 + 395)]
        draw.polygon(diamond, fill="#fff7f0", outline=ORANGE)
        draw.text((cx - 38, y1 + 375), "오류?", font=font(23, True), fill=INK)
        arrow(draw, (cx, y1 + 205), (cx, y1 + 300), ORANGE)
        draw.line((cx - 95, y1 + 395, x1 + 140, y1 + 395, x1 + 140, y1 + 205), fill=ORANGE, width=4)
        draw.text((x1 + 165, y1 + 370), "원자료 확인으로 되돌림", font=font(19, True), fill=ORANGE)
        return
    if kind == "report":
        px1, py1, px2, py2 = x1 + 120, y1 + 30, x2 - 120, y2 - 30
        draw.rectangle((px1, py1, px2, py2), fill="#ffffff", outline="#d8dde3", width=2)
        text_block(draw, (px1 + 42, py1 + 35), "모바일 투자는 중년층까지 확산됐지만\n고령층 진입 장벽은 여전하다", font(25, True), INK, px2 - px1 - 84, 7)
        draw.line((px1 + 42, py1 + 130, px2 - 42, py1 + 130), fill=INK, width=3)
        vals = [42, 56, 66, 49, 29]
        for i, v in enumerate(vals):
            bx = px1 + 65 + i * 90
            draw.rectangle((bx, py2 - 205 - v * 3, bx + 56, py2 - 205), fill=BLUE if i == 2 else GRAY)
        for i, w in enumerate([420, 470, 330]):
            draw.rounded_rectangle((px1 + 45, py2 - 150 + i * 34, px1 + 45 + w, py2 - 138 + i * 34), radius=6, fill="#dfe3e9")
        draw.text((px1 + 45, py2 - 38), "주: 가중 비율, 무응답 제외 · 자료: 금융생활 가상조사", font=font(15), fill=MUTED)
        return
    if kind == "tool-map":
        px1, py1, px2, py2 = x1 + 95, y1 + 85, x2 - 65, y2 - 105
        draw.line((px1, py1, px1, py2, px2, py2), fill=GRAY, width=4)
        draw.text((px1 - 58, py1 - 12), "높은\n통제", font=font(18, True), fill=MUTED)
        draw.text((px1 - 42, py2 + 22), "낮은\n통제", font=font(18, True), fill=MUTED)
        draw.text((px1, py2 + 44), "빠른 단발 작업", font=font(18, True), fill=MUTED)
        draw.text((px2 - 130, py2 + 44), "반복·자동화", font=font(18, True), fill=MUTED)
        points = [
            ("Excel", .18, .28, ORANGE), ("SPSS·JASP", .30, .52, MINT),
            ("Tableau", .62, .48, BLUE), ("ggplot2", .77, .82, INK),
            ("Python", .88, .72, "#6d5bd0"), ("Web tools", .46, .24, RED),
            ("MCP", .72, .60, "#19706a"),
        ]
        for label, rx, ry, color in points:
            xx = px1 + int((px2 - px1) * rx)
            yy = py2 - int((py2 - py1) * ry)
            draw.ellipse((xx - 13, yy - 13, xx + 13, yy + 13), fill=color)
            draw.text((xx + 18, yy - 14), label, font=font(18, True), fill=INK)
        return
    if kind == "stats-packages":
        cards = [
            ("SPSS", "폭넓은 통계·설문\n데이터 관리·조직 표준", "비용 · 출판 마감 수작업", BLUE),
            ("JASP", "무료·쉬운 학습\n고전·베이지안 결과 연동", "자유 그래픽보다 분석 그림", MINT),
        ]
        for i, (name, good, limit, color) in enumerate(cards):
            bx = x1 + 30 + i * 415
            rr(draw, (bx, y1 + 55, bx + 380, y2 - 55), 28, "#ffffff", color, 4)
            draw.text((bx + 32, y1 + 92), name, font=font(38, True), fill=color)
            draw.text((bx + 32, y1 + 175), "강점", font=font(18, True), fill=MUTED)
            text_block(draw, (bx + 32, y1 + 215), good, font(23, True), INK, 310, 12)
            draw.line((bx + 32, y1 + 360, bx + 348, y1 + 360), fill=LINE, width=2)
            draw.text((bx + 32, y1 + 400), "한계", font=font(18, True), fill=MUTED)
            text_block(draw, (bx + 32, y1 + 440), limit, font(21), "#4b5768", 310, 11)
        return
    if kind == "excel-tool":
        stages = [("데이터", "표 안에서\n바로 확인"), ("추천 차트", "빠른 초안"), ("Office", "복사·연결")]
        for i, (title, note) in enumerate(stages):
            bx = x1 + 35 + i * 270
            rr(draw, (bx, y1 + 80, bx + 220, y1 + 270), 22, "#ffffff", MINT if i == 0 else LINE, 3)
            draw.text((bx + 24, y1 + 115), title, font=font(25, True), fill=INK)
            text_block(draw, (bx + 24, y1 + 165), note, font(19), MUTED, 170, 10)
            if i < 2:
                arrow(draw, (bx + 220, y1 + 175), (bx + 270, y1 + 175), GRAY, 4)
        warnings = ["수동 복사", "축·색 반복 조정", "변경 이력 추적", "대량 재생산"]
        draw.text((x1 + 40, y1 + 350), "작업이 커질 때 생기는 비용", font=font(23, True), fill=INK)
        for i, item in enumerate(warnings):
            bx = x1 + 40 + (i % 2) * 400
            by = y1 + 410 + (i // 2) * 105
            rr(draw, (bx, by, bx + 355, by + 75), 16, "#fff7f0", "#f2c3a8", 2)
            draw.text((bx + 22, by + 23), item, font=font(20, True), fill=ORANGE)
        return
    if kind == "tableau-tool":
        draw.text((x1 + 35, y1 + 45), "질문 → 즉시 반응 → 후속 질문", font=font(27, True), fill=INK)
        rr(draw, (x1 + 35, y1 + 110, x2 - 35, y2 - 70), 28, "#ffffff", LINE, 2)
        rr(draw, (x1 + 60, y1 + 140, x1 + 235, y2 - 100), 18, "#f0f3f7", LINE, 1)
        for i, label in enumerate(["기간", "지역", "고객층", "상품"]):
            draw.text((x1 + 82, y1 + 175 + i * 90), label, font=font(19, True), fill=INK)
            draw.rounded_rectangle((x1 + 82, y1 + 210 + i * 90, x1 + 205, y1 + 226 + i * 90), radius=7, fill=BLUE if i == 2 else GRAY)
        vals = [42, 68, 54, 73, 46]
        for i, v in enumerate(vals):
            bx = x1 + 310 + i * 85
            draw.rectangle((bx, y2 - 165 - v * 5, bx + 55, y2 - 165), fill=BLUE if i == 3 else GRAY)
        draw.line((x1 + 280, y2 - 165, x2 - 85, y2 - 165), fill=INK, width=3)
        draw.text((x1 + 305, y1 + 155), "필터를 바꾸면 분석 화면이 즉시 갱신", font=font(21, True), fill=BLUE)
        return
    if kind == "ggplot-tool":
        layers = [
            ("DATA", "정돈된 데이터", "#e9eefb"), ("AES", "위치·색·크기", "#dce7ff"),
            ("GEOM", "점·선·막대", "#cddcff"), ("SCALE", "축·범례", "#b9ceff"),
            ("THEME", "폰트·여백", "#9fb8ff"),
        ]
        for i, (tag, note, color) in enumerate(layers):
            bx = x1 + 70 + i * 135
            by = y1 + 95 + (4 - i) * 75
            rr(draw, (bx, by, bx + 420, by + 115), 18, color, "#9cb3e9", 2)
            draw.text((bx + 24, by + 18), tag, font=font(20, True), fill=BLUE)
            draw.text((bx + 24, by + 57), note, font=font(22, True), fill=INK)
        draw.text((x1 + 70, y2 - 85), "데이터가 바뀌어도 같은 문법으로 다시 생성", font=font(21, True), fill=INK)
        return
    if kind == "python-tools":
        cards = [
            ("Matplotlib", "세밀한 통제\n정적·출판 출력", BLUE),
            ("Seaborn", "통계 그래픽\n빠른 기본 미관", MINT),
            ("Plotly", "툴팁·확대\n인터랙티브 HTML", ORANGE),
            ("Altair", "선언형 문법\n간결한 탐색", "#6d5bd0"),
        ]
        for i, (name, note, color) in enumerate(cards):
            col, row = i % 2, i // 2
            bx, by = x1 + 35 + col * 405, y1 + 55 + row * 315
            rr(draw, (bx, by, bx + 365, by + 270), 25, "#ffffff", color, 3)
            draw.text((bx + 26, by + 35), name, font=font(27, True), fill=color)
            text_block(draw, (bx + 26, by + 105), note, font(21, True), INK, 300, 13)
            draw.text((bx + 26, by + 220), "코드 · 환경 · 내보내기 검증", font=font(16), fill=MUTED)
        return
    if kind == "web-tools":
        cards = [
            ("Datawrapper", "뉴스·보고서형\n차트·표·지도", BLUE),
            ("Flourish", "애니메이션·스토리\n샌키·네트워크", ORANGE),
            ("Observable", "코드와 문서가 만나는\n반응형 데이터 페이지", INK),
        ]
        for i, (name, note, color) in enumerate(cards):
            bx = x1 + 18 + i * 280
            rr(draw, (bx, y1 + 90, bx + 255, y2 - 100), 25, color, color, 1)
            draw.text((bx + 24, y1 + 130), name, font=font(25, True), fill="#ffffff")
            text_block(draw, (bx + 24, y1 + 220), note, font(20), "#ffffff", 205, 13)
            draw.text((bx + 24, y2 - 165), "빠른 공개", font=font(18, True), fill="#ffffff")
        draw.text((x1 + 35, y2 - 70), "확인: 외부 업로드 정책 · 템플릿 종속 · 무료/유료 기능", font=font(18, True), fill=MUTED)
        return
    if kind == "mcp-tool":
        stages = [
            ("대화", "독자·질문\n수정 의견", BLUE),
            ("명세", "데이터·메타\n표현 규칙", ORANGE),
            ("도구", "차트·도식\n한글 완결", MINT),
            ("출력", "SVG·PNG\nHTML·편집", INK),
        ]
        for i, (title, note, color) in enumerate(stages):
            bx = x1 + 15 + i * 205
            rr(draw, (bx, y1 + 130, bx + 175, y1 + 350), 22, "#ffffff", color, 4)
            draw.text((bx + 24, y1 + 170), title, font=font(25, True), fill=color)
            text_block(draw, (bx + 24, y1 + 235), note, font(18, True), INK, 130, 11)
            if i < 3:
                arrow(draw, (bx + 175, y1 + 240), (bx + 205, y1 + 240), GRAY, 4)
        rr(draw, (x1 + 70, y1 + 440, x2 - 70, y2 - 90), 22, "#f0f3f7", LINE, 2)
        draw.text((x1 + 100, y1 + 475), "강점", font=font(18, True), fill=BLUE)
        draw.text((x1 + 180, y1 + 475), "자연어 수정 · 반복 가능한 규칙 · 편집 가능한 결과", font=font(19, True), fill=INK)
        draw.text((x1 + 100, y1 + 535), "한계", font=font(18, True), fill=ORANGE)
        draw.text((x1 + 180, y1 + 535), "데이터 오류와 불명확한 질문은 별도 검증", font=font(19, True), fill=INK)
        return
    if kind == "tool-choice":
        rows = [
            ("오늘 한 장", "Excel", ORANGE), ("분석 진단", "SPSS · JASP", MINT),
            ("반복 출판", "ggplot2 · Python", BLUE), ("탐색 대시보드", "Tableau", "#6d5bd0"),
            ("웹 스토리", "Datawrapper · Flourish", RED), ("대화형 편집", "Visualization MCP", INK),
        ]
        for i, (task, tool, color) in enumerate(rows):
            yy = y1 + 45 + i * 103
            draw.text((x1 + 35, yy + 16), task, font=font(20, True), fill=INK)
            draw.rounded_rectangle((x1 + 250, yy, x2 - 35, yy + 68), radius=16, fill="#ffffff", outline=LINE, width=2)
            draw.rounded_rectangle((x1 + 250, yy, x1 + 268, yy + 68), radius=8, fill=color)
            draw.text((x1 + 295, yy + 18), tool, font=font(20, True), fill=color)
        return
    if kind == "ai-case":
        for i, (title, items, color, foot) in enumerate([("제작 중심", ["도구 학습", "코드 작성", "레이아웃 조정", "파일 변환"], "#eef1f5", "기술이 병목"), ("AI 협업", ["질문 설계", "메타 검토", "표현 비평", "반복 수정"], "#17283f", "판단이 차별점")]):
            bx = x1 + 25 + i * 425
            rr(draw, (bx, y1 + 60, bx + 365, y2 - 60), 26, color, color, 1)
            fg = "#ffffff" if i else INK
            draw.text((bx + 30, y1 + 95), title, font=font(31, True), fill=fg)
            for j, item in enumerate(items): draw.text((bx + 35, y1 + 200 + j * 70), f"• {item}", font=font(22), fill=fg)
            draw.text((bx + 30, y2 - 125), foot, font=font(24, True), fill=BLUE if not i else MINT)
        arrow(draw, (cx - 40, cy), (cx + 40, cy), BLUE, 7)
        return
    if kind == "prompt-case":
        for i, title in enumerate(["약한 요청", "좋은 요청"]):
            bx = x1 + 25 + i * 410
            rr(draw, (bx, y1 + 55, bx + 380, y2 - 55), 26, "#ffffff" if i else "#f0f2f5", "#b8c9ff" if i else LINE, 4 if i else 2)
            draw.text((bx + 28, y1 + 90), title, font=font(27, True), fill=INK)
            if not i:
                text_block(draw, (bx + 28, y1 + 175), "“이 데이터를 예쁘고\n전문적인 그래프로\n만들어 줘.”", font(27, True), "#4b5768", 320, 15)
                draw.text((bx + 28, y2 - 170), "독자 없음 · 질문 없음\n검증 기준 없음", font=font(19), fill=MUTED)
            else:
                for j, item in enumerate(["독자: 정책 담당자", "질문: 진입 장벽", "필수: 분모·출처", "금지: 3D·축 과장", "출력: 편집 SVG"]):
                    rr(draw, (bx + 26, y1 + 160 + j * 83, bx + 350, y1 + 220 + j * 83), 12, "#edf3ff", "#edf3ff", 1)
                    draw.text((bx + 42, y1 + 176 + j * 83), item, font=font(19, True), fill=INK)
        return
    if kind == "critique":
        cards = [("01", "사실 검증", "값·분모·단위·계산·출처"), ("02", "지각 검증", "핵심·색·라벨·가독성"), ("03", "맥락 검증", "과장·범위·해석의 한계")]
        for i, (num, title, note) in enumerate(cards):
            bx = x1 + 18 + i * 275
            color = [BLUE, MINT, ORANGE][i]
            rr(draw, (bx, y1 + 100, bx + 250, y2 - 100), 26, color, color, 1)
            draw.text((bx + 25, y1 + 135), num, font=font(52, True), fill="#ffffff")
            draw.text((bx + 25, y1 + 270), title, font=font(26, True), fill="#ffffff")
            text_block(draw, (bx + 25, y1 + 340), note, font(19), "#ffffff", 195, 12)
        return
    if kind == "workflow":
        labels = ["질문", "초안", "검토", "수정", "내보내기"]
        for i, label in enumerate(labels):
            bx = x1 + 15 + i * 165
            draw.ellipse((bx, cy - 78, bx + 145, cy + 67), fill="#ffffff", outline="#cfd6df", width=3)
            draw.text((bx + 42, cy - 15), label, font=font(22, True), fill=INK)
            draw.text((bx + 58, cy - 52), f"{i+1:02}", font=font(16, True), fill=BLUE)
            if i < 4: arrow(draw, (bx + 145, cy), (bx + 165, cy), GRAY, 4)
        return
    if kind == "checklist":
        items = ["질문이 분명한가", "한 문장 결론이 있는가", "형식이 질문에 맞는가", "축·단위·분모가 정확한가", "색의 역할이 일관적인가", "출처·불확실성이 보이는가", "색 없이도 의미가 전달되는가"]
        for i, item in enumerate(items):
            col, row = i % 2, i // 2
            bx, by = x1 + 25 + col * 400, y1 + 35 + row * 155
            rr(draw, (bx, by, bx + 365, by + 120), 20, "#ffffff", LINE, 2)
            draw.ellipse((bx + 22, by + 38, bx + 62, by + 78), fill="#e7efff", outline=BLUE, width=8)
            draw.text((bx + 82, by + 43), item, font=font(20, True), fill=INK)
        return
    # closing
    tools = [("Diagram", "관계와 흐름", BLUE), ("Chart", "비교와 추세", INK), ("Survey", "응답과 분포", ORANGE)]
    for i, (title, note, color) in enumerate(tools):
        bx = x1 + 25 + i * 270
        rr(draw, (bx, y1 + 150, bx + 245, y2 - 150), 26, color, color, 1)
        draw.text((bx + 25, y1 + 210), title, font=font(28, True), fill="#ffffff")
        draw.text((bx + 25, y2 - 225), note, font=font(20), fill="#ffffff")


def render(storyboard: Path, scene_id: str, output: Path):
    data = json.loads(storyboard.read_text(encoding="utf-8"))
    scene = next(item for item in data["scenes"] if item["id"] == scene_id)
    index = data["scenes"].index(scene)
    image = Image.new("RGB", (W, H), PAPER)
    draw = ImageDraw.Draw(image)
    draw.ellipse((1420, -270, 2160, 470), fill="#e8edf9")
    draw.ellipse((-350, 720, 480, 1550), fill="#f5e5d9")
    draw.text((112, 96), scene["eyebrow"], font=font(20, True), fill=BLUE)
    title_end = text_block(draw, (112, 180), scene["title"], font(64, True), INK, 700, 12)
    body_end = text_block(draw, (112, title_end + 35), scene["body"], font(28), "#435064", 670, 17)
    cap_lines = fit_lines(draw, scene["caption"], font(20, True), 610)
    cap_h = len(cap_lines) * 31 + 26
    cap_y = min(body_end + 38, 850 - cap_h)
    rr(draw, (112, cap_y, 112 + 650, cap_y + cap_h), 22, INK, INK, 1)
    yy = cap_y + 13
    for line in cap_lines:
        draw.text((132, yy), line, font=font(20, True), fill="#ffffff")
        yy += 31
    panel = (850, 150, 1810, 910)
    rr(draw, panel, 40, PANEL, "#e0ddd5", 2)
    draw_visual(draw, scene, (900, 190, 1760, 870))
    draw.text((112, 1018), "PR STUDIO × METHODIQ", font=font(16, True), fill="#7b8490")
    draw.text((1690, 1018), f"{index + 1:02} / {len(data['scenes']):02}", font=font(16), fill="#8b94a1")
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, optimize=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--storyboard", required=True, type=Path)
    parser.add_argument("--scene", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    render(args.storyboard, args.scene, args.output)


if __name__ == "__main__":
    main()
