import type { CollectionCapabilityId, CollectionOrder, CollectionReport } from "./video-planning";

export const PLANNING_EVIDENCE_LIMITS = {
  maxReports: 12,
  maxValueChars: 6_000,
  compactValueChars: 1_000,
  maxDetailChars: 1_200,
  maxTotalChars: 40_000,
} as const;

const TRUNCATED = "\n[모델 입력 문자 예산으로 잘림]";

function clip(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - TRUNCATED.length))}${TRUNCATED}`;
}

function reportIdentity(report: CollectionReport) {
  const provenance = report.provenance;
  if (!provenance?.scenarioVersion) {
    return [report.capabilityId, "legacy", report.order, report.detail].join("|");
  }
  return [
    report.capabilityId,
    provenance.track ?? "",
    provenance.scenarioVersion,
    provenance.inputIdentity ?? "",
  ].join("|");
}

function boundedReport(report: CollectionReport, valueChars: number, withEvidence = true): CollectionReport {
  return {
    ...report,
    order: clip(report.order, 500),
    detail: clip(report.detail, PLANNING_EVIDENCE_LIMITS.maxDetailChars),
    evidence: withEvidence
      ? report.evidence?.slice(0, 4).map((item) => ({ ...item, value: clip(item.value, valueChars) }))
      : undefined,
  };
}

export function normalizeCollectionReportsForPlanning(reports: CollectionReport[]): CollectionReport[] {
  const byIdentity = new Map<string, CollectionReport>();
  for (const report of reports) {
    const key = reportIdentity(report);
    const current = byIdentity.get(key);
    if (!current || report.status === "있음" || current.status !== "있음") byIdentity.set(key, report);
  }

  const candidates = [...byIdentity.values()]
    .sort((left, right) => Number(right.status === "있음") - Number(left.status === "있음"))
    .slice(0, PLANNING_EVIDENCE_LIMITS.maxReports);
  const selected: CollectionReport[] = [];

  for (const report of candidates) {
    const variants = [
      boundedReport(report, PLANNING_EVIDENCE_LIMITS.maxValueChars),
      boundedReport(report, PLANNING_EVIDENCE_LIMITS.compactValueChars),
      boundedReport(report, 0, false),
    ];
    const fitting = variants.find((candidate) =>
      JSON.stringify([...selected, candidate]).length <= PLANNING_EVIDENCE_LIMITS.maxTotalChars);
    if (!fitting) break;
    selected.push(fitting);
  }

  if (selected.length < byIdentity.size && selected.length > 0) {
    const last = selected[selected.length - 1];
    const marker = "[일부 누적 보고는 모델 입력 예산 때문에 생략됨]";
    const marked = {
      ...last,
      detail: `${clip(last.detail, PLANNING_EVIDENCE_LIMITS.maxDetailChars - marker.length - 1)} ${marker}`,
    };
    selected[selected.length - 1] = JSON.stringify([...selected.slice(0, -1), marked]).length <= PLANNING_EVIDENCE_LIMITS.maxTotalChars
      ? marked
      : { ...last, detail: marker, evidence: undefined };
    if (JSON.stringify(selected).length > PLANNING_EVIDENCE_LIMITS.maxTotalChars) selected.pop();
  }

  return selected;
}

export function pendingCollectionOrders(
  orders: CollectionOrder[],
  reports: CollectionReport[],
): CollectionOrder[] {
  const satisfied = new Set<CollectionCapabilityId>(
    reports
      .filter((report) => report.status === "있음" && Boolean(report.provenance?.scenarioVersion))
      .map((report) => report.capabilityId),
  );
  const scheduled = new Set<CollectionCapabilityId>();
  return orders.filter((order) => {
    if (satisfied.has(order.capabilityId) || scheduled.has(order.capabilityId)) return false;
    scheduled.add(order.capabilityId);
    return true;
  });
}
