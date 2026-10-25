import type { VideoAgentPlan } from "./video-agent";
import type { CollectionOrder, CollectionReport } from "./video-planning";

export type PlanningLoopResult =
  | { outcome: "produce"; plan: VideoAgentPlan }
  | { outcome: "plan_exhausted"; plan: VideoAgentPlan };

export type PlanningLoopDependencies = {
  createPlan: (input: {
    round: 1 | 2 | 3;
    previousPlans: VideoAgentPlan[];
    collectionReports: CollectionReport[];
  }) => Promise<VideoAgentPlan>;
  collect: (orders: CollectionOrder[], round: 1 | 2 | 3) => Promise<CollectionReport[]>;
  saveRound: (plan: VideoAgentPlan, reports: CollectionReport[]) => Promise<void>;
};

export async function runPlanningLoop({
  previousPlans = [],
  collectionReports = [],
  dependencies,
}: {
  previousPlans?: VideoAgentPlan[];
  collectionReports?: CollectionReport[];
  dependencies: PlanningLoopDependencies;
}): Promise<PlanningLoopResult> {
  const plans = [...previousPlans];
  let reports = collectionReports;
  let lastPlan = plans.at(-1);

  for (let round = plans.length + 1; round <= 3; round += 1) {
    const typedRound = round as 1 | 2 | 3;
    const plan = await dependencies.createPlan({
      round: typedRound,
      previousPlans: [...plans],
      collectionReports: reports,
    });
    lastPlan = plan;

    if (plan.productionReady && plan.decision === "produce" && plan.manifest?.beats?.length) {
      await dependencies.saveRound(plan, []);
      return { outcome: "produce", plan };
    }

    reports = await dependencies.collect(plan.collectionOrders, typedRound);
    await dependencies.saveRound(plan, reports);
    plans.push(plan);
  }

  if (!lastPlan) throw new Error("기획 회차를 생성하지 못했습니다.");
  return { outcome: "plan_exhausted", plan: lastPlan };
}
