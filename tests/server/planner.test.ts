import { describe, it, expect } from "vitest";
import { getNextStep, type PlannerFacts } from "../../src/shared/planner.ts";

const NOW = "2026-10-07T00:00:00.000Z";
const RECENT_DRILL = "2026-09-30T00:00:00.000Z";

function green(overrides: Partial<PlannerFacts> = {}): PlannerFacts {
  return {
    d1Ok: true,
    turnstileConfigured: true,
    accessConfigured: true,
    siteUrlConfigured: true,
    lastBackupDrillAt: RECENT_DRILL,
    newIntakes: 0,
    overdueFollowUps: 0,
    outreachNeedingReply: 0,
    pendingProofNotes: 0,
    availabilityConfigured: true,
    nowIso: NOW,
    ...overrides,
  };
}

describe("guided home planner tier order", () => {
  it("ranks Tier 0 blockers D1, Turnstile, Access, URL in order", () => {
    expect(
      getNextStep(green({ d1Ok: false, turnstileConfigured: false })).key,
    ).toBe("fix-d1");
    expect(
      getNextStep(green({ turnstileConfigured: false, accessConfigured: false }))
        .key,
    ).toBe("configure-turnstile");
    expect(
      getNextStep(green({ accessConfigured: false, siteUrlConfigured: false }))
        .key,
    ).toBe("configure-access");
    expect(getNextStep(green({ siteUrlConfigured: false })).key).toBe(
      "configure-site-url",
    );
  });

  it("ranks backup drill above all Tier 2 pipeline work", () => {
    const facts = green({
      lastBackupDrillAt: null,
      newIntakes: 3,
      overdueFollowUps: 2,
      outreachNeedingReply: 2,
      pendingProofNotes: 1,
      availabilityConfigured: false,
    });
    expect(getNextStep(facts).key).toBe("log-backup-drill");
    expect(getNextStep(facts).tier).toBe(1);
  });

  it("treats a drill older than 30 days as due", () => {
    expect(
      getNextStep(green({ lastBackupDrillAt: "2026-08-01T00:00:00.000Z" })).key,
    ).toBe("log-backup-drill");
    expect(getNextStep(green()).key).toBe("idle");
  });

  it("ranks Tier 2 intakes, overdue follow ups, outreach, proof, availability in order", () => {
    expect(getNextStep(green({ newIntakes: 2, overdueFollowUps: 2 })).key).toBe(
      "read-intakes",
    );
    expect(
      getNextStep(green({ overdueFollowUps: 1, outreachNeedingReply: 1 })).key,
    ).toBe("clear-overdue-followups");
    expect(
      getNextStep(green({ outreachNeedingReply: 1, pendingProofNotes: 1 })).key,
    ).toBe("follow-up-outreach");
    expect(
      getNextStep(green({ pendingProofNotes: 1, availabilityConfigured: false }))
        .key,
    ).toBe("review-proof");
    expect(getNextStep(green({ availabilityConfigured: false })).key).toBe(
      "set-availability",
    );
  });

  it("returns idle when all green", () => {
    const step = getNextStep(green());
    expect(step.key).toBe("idle");
    expect(step.tier).toBe(3);
  });

  it("is anti flip flop: same facts always give the same step", () => {
    const facts = green({ newIntakes: 1, pendingProofNotes: 4 });
    const first = getNextStep(facts);
    const second = getNextStep({ ...facts });
    expect(second).toEqual(first);
    expect(first.key).toBe("read-intakes");
    // Adding more lower tier work does not flip the higher tier pick.
    const busier = getNextStep({
      ...facts,
      pendingProofNotes: 99,
      outreachNeedingReply: 99,
    });
    expect(busier.key).toBe("read-intakes");
  });

  it("blockers stay on top even when the pipeline is busy", () => {
    const facts = green({
      d1Ok: false,
      newIntakes: 5,
      overdueFollowUps: 5,
      lastBackupDrillAt: null,
    });
    expect(getNextStep(facts).key).toBe("fix-d1");
  });
});
