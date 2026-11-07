from pathlib import Path

from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out" / "kg-statistics-mvp-demo"
SLIDES = OUT / "work" / "briefing-slides"
TARGET = OUT / "kg-statistics-nsc-briefing-en.pdf"

images = sorted(SLIDES.glob("briefing-slide-*.png"))
if len(images) != 34:
    raise RuntimeError(f"Expected 34 briefing slides, found {len(images)}")

page_width, page_height = 1920, 1080
pdf = canvas.Canvas(str(TARGET), pagesize=(page_width, page_height))
pdf.setTitle("KG Statistics Production System - NSC Briefing")
pdf.setAuthor("KG Statistics Production System")

for image_path in images:
    pdf.drawImage(
        ImageReader(str(image_path)),
        0,
        0,
        width=page_width,
        height=page_height,
        preserveAspectRatio=True,
        anchor="c",
    )
    pdf.showPage()

pdf.save()
print(f"Created {TARGET}")
