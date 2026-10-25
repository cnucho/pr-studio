import type { RenderState } from "./renderer";

export type ProductionRenderState = RenderState | "awaiting_approval" | "approved" | "rejected";
export type FailureCategory =
  | "transient_provider"
  | "provider_auth"
  | "invalid_project"
  | "missing_template"
  | "asset_license"
  | "output_validation"
  | "uncertain_completion"
  | "local_failure";

const transitions: Record<ProductionRenderState, ProductionRenderState[]> = {
  queued: ["preparing", "failed", "cancelled"],
  preparing: ["rendering", "failed", "cancelled"],
  rendering: ["validating", "failed", "cancelled"],
  validating: ["awaiting_approval", "failed"],
  awaiting_approval: ["approved", "rejected"],
  approved: [],
  rejected: [],
  completed: ["validating"],
  failed: [],
  cancelled: [],
};

export function canTransition(from: ProductionRenderState, to: ProductionRenderState) {
  return transitions[from].includes(to);
}

export function assertTransition(from: ProductionRenderState, to: ProductionRenderState) {
  if (!canTransition(from, to)) throw new Error(`Invalid render transition: ${from} -> ${to}`);
}

export function retryDelaySeconds(attempt: number) {
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error("Attempt must be a positive integer");
  return Math.min(300, 15 * 2 ** (attempt - 1));
}

export function isRetryable(category: FailureCategory) {
  return category === "transient_provider";
}

export function shouldFallbackToLocal(category: FailureCategory, cloudAttemptsExhausted: boolean) {
  return category === "transient_provider" && cloudAttemptsExhausted;
}

export function validateApproval(
  state: ProductionRenderState,
  decision: "approved" | "rejected",
  reason?: string,
) {
  if (state !== "awaiting_approval") throw new Error("Only awaiting_approval renders may be reviewed");
  if (decision === "rejected" && !reason?.trim()) throw new Error("A rejection reason is required");
  return { decision, reason: reason?.trim() || null };
}
