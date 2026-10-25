export type ProductionFailurePolicy = "retry-job" | "retry-review" | "fail-final";

export function productionFailurePolicy(title: string, exitCode?: number | null): ProductionFailurePolicy {
  if (title !== "프레임 검토") return "retry-job";
  if (exitCode === 3) return "retry-review";
  return "fail-final";
}
