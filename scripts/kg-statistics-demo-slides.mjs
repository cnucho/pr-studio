import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ensureDirs, outDir, workDir } from "./kg-statistics-demo-common.mjs";

await ensureDirs();
const runtime = process.env.ARTIFACT_TOOL_ROOT ??
  path.join(process.env.USERPROFILE ?? "", ".cache", "codex-runtimes", "codex-primary-runtime",
    "dependencies", "node", "node_modules", "@oai", "artifact-tool");
const api = await import(pathToFileURL(path.join(path.resolve(runtime), "dist", "artifact_tool.mjs")));
const { Presentation, PresentationFile } = api;

const slides = [
  ["From survey design to verified official release", "Household Living Conditions Survey 2026",
    ["Authenticated work", "Evidence-bound decisions", "Immutable multi-format release"], "01"],
  ["The system advances on evidence—not navigation", "A durable transition ledger joins every accepted action to an exact artifact.",
    ["Identity + version + SHA-256", "Prior and resulting revision", "Actor and audit references"], "02"],
  ["The questionnaire becomes a governed artifact", "Design is validated, submitted, and frozen before approval.",
    ["Versioned contract", "Deterministic validation", "Exact-hash approval subject"], "03"],
  ["Separation of duties is part of the workflow", "Design, review, verification, approval, and release are distinct authorities.",
    ["No self-approval", "Role-aware next actions", "Server-side project access"], "04"],
  ["Collection is prepared, captured, and synchronized", "Offline work returns through a controlled accepted-batch boundary.",
    ["Prepared package", "Queued field capture", "Server reconciliation receipt"], "05"],
  ["Lineage survives cleaning and analysis", "Downstream outputs keep upstream identities and are superseded—not rewritten.",
    ["Cleaning review", "Analysis package", "Deterministic invalidation"], "06"],
  ["Verification is independent and reproducible", "The verifier examines methods, tables, cells, and hashes before publication can continue.",
    ["PASSED / FAILED / INCOMPLETE", "Exact report binding", "Distinct verifier identity"], "07"],
  ["Publication approval is not verification", "A separate approver accepts publication intent only after valid verification.",
    ["Independent decisions", "Hash-bound approval", "No publisher-manufactured evidence"], "08"],
  ["One atomic release, four official formats", "HTML, PDF, CSV, and XLSX are generated from the same normalized publication model.",
    ["All-or-nothing commit", "Shared release identity", "Per-file SHA-256 manifest"], "09"],
  ["Integrity continues after release", "Downloads are checked, tampering is rejected, and restore reconciles persisted evidence.",
    ["Authorized download", "Hash verification", "Recovery without history loss"], "10"],
  ["An evidence-backed production MVP", "The internal workflow and immutable official release path are complete.",
    ["Authenticated operator application", "Verified HTML / PDF / CSV / XLSX", "Public catalog capability at the verified baseline"], "11"],
];

const deck = Presentation.create({ slideSize: { width: 1920, height: 1080 } });
const colors = { bg: "#F5F7F6", ink: "#102A2A", teal: "#0E625F", navy: "#19324D", accent: "#D89B3C", pale: "#E5EFEC" };
function box(slide, geometry, position, fill, radius = undefined) {
  return slide.shapes.add({ geometry, position, fill, borderRadius: radius, line: { fill: "none", width: 0 } });
}
function text(slide, value, position, style) {
  const shape = box(slide, "textbox", position, "none");
  shape.text = value;
  shape.text.style = { fontFamily: "Aptos", color: colors.ink, ...style };
  return shape;
}
for (const [index, [title, subtitle, points, number]] of slides.entries()) {
  const slide = deck.slides.add();
  slide.background.fill = colors.bg;
  box(slide, "rect", { left: 0, top: 0, width: 34, height: 1080 }, colors.teal);
  text(slide, "KG STATISTICS PRODUCTION SYSTEM", { left: 110, top: 72, width: 900, height: 36 },
    { fontSize: 22, bold: true, color: colors.teal, letterSpacing: 1.5 });
  text(slide, title, { left: 110, top: 158, width: 1120, height: 210 },
    { fontSize: index === 0 ? 66 : 58, bold: true, color: colors.ink });
  text(slide, subtitle, { left: 110, top: 390, width: 1060, height: 104 },
    { fontSize: 28, color: colors.navy });
  const x = 110, y = 610, gap = 30, w = 500;
  points.forEach((point, i) => {
    box(slide, "roundRect", { left: x + i * (w + gap), top: y, width: w, height: 210 }, i === 1 ? colors.pale : "#FFFFFF", 18);
    box(slide, "ellipse", { left: x + 30 + i * (w + gap), top: y + 34, width: 42, height: 42 }, i === 1 ? colors.accent : colors.teal);
    text(slide, String(i + 1), { left: x + 30 + i * (w + gap), top: y + 39, width: 42, height: 30 },
      { fontSize: 18, bold: true, color: "#FFFFFF", textAlign: "center" });
    text(slide, point, { left: x + 30 + i * (w + gap), top: y + 96, width: w - 60, height: 82 },
      { fontSize: 25, bold: true, color: colors.ink });
  });
  text(slide, number, { left: 1680, top: 70, width: 130, height: 70 },
    { fontSize: 42, bold: true, color: colors.accent, textAlign: "right" });
  text(slide, "Verified baseline • fictional aggregate scenario", { left: 110, top: 974, width: 900, height: 34 },
    { fontSize: 18, color: "#60706E" });
}

const slideOut = path.join(workDir, "slides");
await mkdir(slideOut, { recursive: true });
for (const [i, slide] of deck.slides.items.entries()) {
  const png = await deck.export({ slide, format: "png", scale: 1 });
  await writeFile(path.join(slideOut, `slide-${String(i + 1).padStart(2, "0")}.png`),
    new Uint8Array(await png.arrayBuffer()));
  await writeFile(path.join(slideOut, `slide-${String(i + 1).padStart(2, "0")}.layout.json`),
    await (await slide.export({ format: "layout" })).text());
}
const montage = await deck.export({ format: "png", montage: true, scale: 0.25 });
await writeFile(path.join(outDir, "slides-montage.png"), new Uint8Array(await montage.arrayBuffer()));
const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(path.join(outDir, "kg-statistics-mvp-demo-slides.pptx"));
console.log(`Rendered ${slides.length} editable slides.`);
