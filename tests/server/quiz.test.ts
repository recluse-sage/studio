import { describe, it, expect } from "vitest";
import {
  QUESTIONS,
  recommend,
  getNextQuestionId,
  quizToIntakePrefill,
  buildTaskDescriptionFromQuiz,
} from "../../src/shared/quiz.ts";

describe("quiz model", () => {
  it("has five questions for goal, budget, timeline, comfort, assets", () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(ids).toEqual(["goal", "budget", "timeline", "comfort", "assets"]);
    for (const q of QUESTIONS) {
      expect(q.options.length).toBeGreaterThan(1);
    }
  });

  it("branches assets before comfort for repeat work goal", () => {
    const base = { goal: "cut-repeat-work", budget: "500-1500", timeline: "one-to-three-months" };
    expect(getNextQuestionId(base)).toBe("assets");
    expect(
      getNextQuestionId({ ...base, assets: "have-repeat-steps" }),
    ).toBe("comfort");
  });

  it("asks comfort before assets for other goals", () => {
    const base = { goal: "get-found", budget: "under-500", timeline: "asap" };
    expect(getNextQuestionId(base)).toBe("comfort");
    expect(getNextQuestionId({ ...base, comfort: "okay-if-simple" })).toBe(
      "assets",
    );
  });

  it("recommends website for get found with reasons", () => {
    const r = recommend({
      goal: "get-found",
      budget: "under-500",
      timeline: "asap",
      comfort: "prefer-human",
      assets: "have-photos-prices",
    });
    expect(r.fit).toBe("website");
    expect(r.runnerUp).not.toBeNull();
    expect(r.why.length).toBeGreaterThan(1);
    expect(r.why.join(" ")).not.toContain("low fit");
  });

  it("recommends tool for order taking", () => {
    const r = recommend({
      goal: "take-orders",
      budget: "500-1500",
      timeline: "one-to-three-months",
      comfort: "okay-if-simple",
      assets: "have-chat-orders",
    });
    expect(r.fit).toBe("tool");
    expect(r.why.length).toBeGreaterThan(1);
  });

  it("recommends automation for repeat work", () => {
    const r = recommend({
      goal: "cut-repeat-work",
      budget: "1500-plus",
      timeline: "one-to-three-months",
      comfort: "love-new",
      assets: "have-repeat-steps",
    });
    expect(r.fit).toBe("automation");
    expect(r.why.length).toBeGreaterThan(1);
  });

  it("returns an honest low fit path", () => {
    const r = recommend({ goal: "not-sure", timeline: "exploring" });
    expect(["website", "tool", "automation"]).toContain(r.fit);
    expect(r.why.join(" ").toLowerCase()).toContain("low fit");
    expect(r.why.join(" ").toLowerCase()).toContain("talk");
  });

  it("returns low fit for empty answers", () => {
    const r = recommend({});
    expect(["website", "tool", "automation"]).toContain(r.fit);
    expect(r.why.join(" ").toLowerCase()).toContain("low fit");
  });

  it("maps quiz goal into task description prefill", () => {
    const prefill = quizToIntakePrefill({
      goal: "cut-repeat-work",
      budget: "500-1500",
      timeline: "asap",
    });
    expect(prefill.taskDescriptionPrefix).toContain("Quiz goal:");
    expect(prefill.taskDescriptionPrefix).toContain("Cut repeat manual work");
    expect(prefill.budget).toBe("500 to 1500");
    expect(prefill.timeline).toBe("Within 4 weeks");
    const text = buildTaskDescriptionFromQuiz(
      { goal: "cut-repeat-work" },
      "Quotes pile up in chat and need one form.",
    );
    expect(text.startsWith("Quiz goal:")).toBe(true);
    expect(text).toContain("Quotes pile up");
    expect(text.length).toBeLessThanOrEqual(1000);
  });

  it("leaves task description alone when goal is unsure", () => {
    const text = buildTaskDescriptionFromQuiz(
      { goal: "not-sure" },
      "Need help with bookings.",
    );
    expect(text).toBe("Need help with bookings.");
  });
});
