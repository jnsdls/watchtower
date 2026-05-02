export type PlanIssue = {
  readonly id: string;
  readonly title: string;
  readonly branch: string;
};

export type Plan = {
  readonly issues: readonly PlanIssue[];
};

export type PlanParseResult =
  | { readonly ok: true; readonly plan: Plan }
  | { readonly ok: false; readonly error: string };

const planBlockPattern = /<plan>([\s\S]*?)<\/plan>/g;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseIssue = (value: unknown): PlanIssue | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.branch !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    title: value.title,
    branch: value.branch,
  };
};

const validatePlan = (value: unknown): Plan | null => {
  if (!isRecord(value) || !Array.isArray(value.issues)) {
    return null;
  }

  const issues = value.issues.map(parseIssue);
  if (issues.some((issue) => issue === null)) {
    return null;
  }

  return { issues: issues as PlanIssue[] };
};

export const extractPlan = (stdout: string): PlanParseResult => {
  const blocks = [...stdout.matchAll(planBlockPattern)];

  if (blocks.length === 0) {
    return {
      ok: false,
      error: "Planner output did not contain a <plan> block",
    };
  }

  if (blocks.length > 1) {
    return {
      ok: false,
      error: "Planner output contained multiple <plan> blocks",
    };
  }

  const block = blocks[0]?.[1];
  if (block === undefined || /<\/?plan>/.test(block)) {
    return { ok: false, error: "Planner output contained nested <plan> tags" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(block);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Planner JSON was invalid",
    };
  }

  const plan = validatePlan(parsed);
  if (!plan) {
    return {
      ok: false,
      error:
        "Planner JSON must match { issues: [{ id: string, title: string, branch: string }] }",
    };
  }

  return { ok: true, plan };
};
