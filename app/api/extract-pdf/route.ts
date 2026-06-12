import { NextResponse } from "next/server";

export const runtime = "nodejs";

type TextItem = {
  str?: string;
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "PDF 파일이 필요합니다." },
      { status: 400 },
    );
  }

  const buffer = await file.arrayBuffer();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    isEvalSupported: false,
    useWorkerFetch: false,
  });
  const pdf = await task.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? (item as TextItem).str : ""))
      .filter(Boolean)
      .join(" ");

    pages.push(text);
  }

  return NextResponse.json({
    ok: true,
    filename: file.name,
    pages: pdf.numPages,
    text: pages.join("\n\n"),
  });
}
