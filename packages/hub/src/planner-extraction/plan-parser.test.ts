import { describe, expect, it } from "vitest";
import { extractPlan } from "./plan-parser";

describe("plan-parser", () => {
  it("extracts issues from a well-formed plan block with surrounding prose", () => {
    expect(
      extractPlan(`before
<plan>{"issues":[{"id":"10","title":"Planner extraction","branch":"sandcastle/issue-10-planner-extraction"}]}</plan>
after`),
    ).toEqual({
      ok: true,
      plan: {
        issues: [
          {
            id: "10",
            title: "Planner extraction",
            branch: "sandcastle/issue-10-planner-extraction",
          },
        ],
      },
    });
  });

  it.each([
    ["missing tags", `{"issues":[]}`],
    ["malformed JSON", `<plan>{"issues":[}</plan>`],
    [
      "schema mismatch",
      `<plan>{"issues":[{"id":10,"title":"Bad","branch":"feature"}]}</plan>`,
    ],
    [
      "nested tags",
      `<plan>{"issues":[{"id":"10","title":"Outer","branch":"feature"}]}<plan>{"issues":[]}</plan></plan>`,
    ],
    [
      "multiple plan blocks",
      `<plan>{"issues":[]}</plan><plan>{"issues":[]}</plan>`,
    ],
  ])("fails gracefully for %s", (_name, stdout) => {
    expect(extractPlan(stdout)).toMatchObject({ ok: false });
  });

  it("accepts an empty issues array", () => {
    expect(extractPlan(`<plan>{"issues":[]}</plan>`)).toEqual({
      ok: true,
      plan: { issues: [] },
    });
  });
});
