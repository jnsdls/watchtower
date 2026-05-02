import { extractPlan } from "../../../cli/src/plan-parser";
import type { HubQueryDatabase } from "../db/client";
import { createTask, findTaskForJobByExternalId, getRun } from "../db/queries";

export type PlannerExtractionLogger = {
  readonly error: (message: string) => void;
};

export type PlannerExtractionOptions = {
  readonly runId: string;
  readonly stdout: string;
  readonly logger?: PlannerExtractionLogger;
};

export const extractTasksFromPlannerOutput = async (
  db: HubQueryDatabase,
  { logger = console, runId, stdout }: PlannerExtractionOptions,
) => {
  const run = await getRun(db, runId);

  if (!run || run.name !== "planner") {
    return;
  }

  const result = extractPlan(stdout);
  if (!result.ok) {
    logger.error(
      `Failed to extract Tasks from planner Run ${runId}: ${result.error}`,
    );
    return;
  }

  for (const issue of result.plan.issues) {
    const existingTask = await findTaskForJobByExternalId(
      db,
      run.jobId,
      issue.id,
    );

    if (!existingTask) {
      await createTask(db, {
        jobId: run.jobId,
        externalId: issue.id,
        title: issue.title,
        branch: issue.branch,
        status: "pending",
      });
    }
  }
};
