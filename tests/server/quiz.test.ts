import { describe, it, expect } from "vitest";
import {
  QUESTIONS,
  recommend,
  getNextQuestionId,
  quizToIntakePrefill,
  buildTaskDescriptionFromQuiz,
  detectBudgetCurrency,
  getBudgetOptions,
  getBudgetQuestion,
  getQuestionsForCountry,
  FREE_BUDGET_VALUE,
  USD_BUDGET_OPTIONS,
  NGN_BUDGET_OPTIONS,
} from "../../src/shared/quiz.ts";

describe("quiz model", () => {
  it("has five questions for goal, budget, timeline, comfort, assets", () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(ids).toEqual(["goal", "budget", "timeline", "comfort", "assets"]);
    for (const q of QUESTIONS) {
      expect(q.options.length).toBeGreaterThan(1);
    }
  });

  it("gives every question an explanation and one concrete example", () => {
    expect(QUESTIONS.length).toBe(5);
    for (const q of QUESTIONS) {
      expect(typeof q.explanation).toBe("string");
      expect(q.explanation.trim().length).toBeGreaterThan(10);
      expect(typeof q.example).toBe("string");
      expect(q.example.trim().length).toBeGreaterThan(10);
      expect(q.example).toContain("Example:");
    }
  });

  it("applies the currency rule: Nigeria gets naira, all others get dollars", () => {
    expect(detectBudgetCurrency("NG")).toBe("NGN");
    expect(detectBudgetCurrency("ng")).toBe("NGN");
    expect(detectBudgetCurrency(" ng ")).toBe("NGN");
    expect(detectBudgetCurrency("NGA")).toBe("NGN");
    expect(detectBudgetCurrency("Nigeria")).toBe("NGN");
    expect(detectBudgetCurrency("nigeria")).toBe("NGN");
    expect(detectBudgetCurrency("US")).toBe("USD");
    expect(detectBudgetCurrency("GB")).toBe("USD");
    expect(detectBudgetCurrency("GH")).toBe("USD");
    expect(detectBudgetCurrency("")).toBe("USD");
    expect(detectBudgetCurrency(null)).toBe("USD");
    expect(detectBudgetCurrency(undefined)).toBe("USD");
    expect(detectBudgetCurrency("XX")).toBe("USD");

    const ng = getBudgetOptions("NG");
    const ngLabels = ng.map((o) => o.label).join(" ");
    expect(ngLabels).toContain("₦");
    expect(ngLabels).not.toContain("$");

    const us = getBudgetOptions("US");
    const usLabels = us.map((o) => o.label).join(" ");
    expect(usLabels).toContain("$");
    expect(usLabels).not.toContain("₦");

    const fallback = getBudgetOptions(undefined);
    expect(fallback.map((o) => o.label).join(" ")).toContain("$");

    const ngQuestion = getBudgetQuestion("NG");
    expect(ngQuestion.id).toBe("budget");
    expect(ngQuestion.options.map((o) => o.value)).toContain("ng-under-150k");
    expect(ngQuestion.explanation.trim().length).toBeGreaterThan(10);
    expect(ngQuestion.example).toContain("Example:");

    const usQuestion = getBudgetQuestion("US");
    expect(usQuestion.options.map((o) => o.value)).toContain("under-500");

    const localized = getQuestionsForCountry("NG");
    expect(localized.map((q) => q.id)).toEqual([
      "goal",
      "budget",
      "timeline",
      "comfort",
      "assets",
    ]);
    const localizedBudget = localized.find((q) => q.id === "budget");
    expect(localizedBudget?.options.map((o) => o.label).join(" ")).toContain(
      "₦",
    );
  });

  it("includes a Free budget option in both currencies", () => {
    expect(FREE_BUDGET_VALUE).toBe("free");
    for (const set of [
      USD_BUDGET_OPTIONS,
      NGN_BUDGET_OPTIONS,
      getBudgetOptions("NG"),
      getBudgetOptions("US"),
    ]) {
      const free = set.find((o) => o.value === "free");
      expect(free).toBeDefined();
      expect(free?.label).toBe("Free");
    }
    const prefillFree = quizToIntakePrefill({
      goal: "get-found",
      budget: "free",
      timeline: "asap",
    });
    expect(prefillFree.budget).toBe("Free");
    const r = recommend({
      goal: "get-found",
      budget: "free",
      timeline: "asap",
      comfort: "prefer-human",
      assets: "have-photos-prices",
    });
    expect(r.why.join(" ").toLowerCase()).toContain("free");
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

  it("scores naira bands the same as dollar bands", () => {
    const dollar = recommend({
      goal: "cut-repeat-work",
      budget: "1500-plus",
      timeline: "one-to-three-months",
      comfort: "love-new",
      assets: "have-repeat-steps",
    });
    const naira = recommend({
      goal: "cut-repeat-work",
      budget: "ng-500k-plus",
      timeline: "one-to-three-months",
      comfort: "love-new",
      assets: "have-repeat-steps",
    });
    expect(naira.fit).toBe(dollar.fit);
    expect(naira.why.join(" ")).toContain("₦");

    const lowDollar = recommend({
      goal: "get-found",
      budget: "under-500",
      timeline: "asap",
      comfort: "prefer-human",
      assets: "have-photos-prices",
    });
    const lowNaira = recommend({
      goal: "get-found",
      budget: "ng-under-150k",
      timeline: "asap",
      comfort: "prefer-human",
      assets: "have-photos-prices",
    });
    expect(lowNaira.fit).toBe(lowDollar.fit);
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
    expect(prefill.budget).toBe("$500 to $1500");
    expect(prefill.timeline).toBe("Within 4 weeks");
    const text = buildTaskDescriptionFromQuiz(
      { goal: "cut-repeat-work" },
      "Quotes pile up in chat and need one form.",
    );
    expect(text.startsWith("Quiz goal:")).toBe(true);
    expect(text).toContain("Quotes pile up");
    expect(text.length).toBeLessThanOrEqual(1000);
  });

  it("maps naira and free budgets into intake prefill", () => {
    expect(
      quizToIntakePrefill({ goal: "get-found", budget: "ng-under-150k" }).budget,
    ).toBe("Under ₦150,000");
    expect(
      quizToIntakePrefill({ goal: "get-found", budget: "ng-150-500k" }).budget,
    ).toBe("₦150,000 to ₦500,000");
    expect(
      quizToIntakePrefill({ goal: "get-found", budget: "ng-500k-plus" }).budget,
    ).toBe("Above ₦500,000");
    expect(
      quizToIntakePrefill({ goal: "get-found", budget: "free" }).budget,
    ).toBe("Free");
  });

  it("leaves task description alone when goal is unsure", () => {
    const text = buildTaskDescriptionFromQuiz(
      { goal: "not-sure" },
      "Need help with bookings.",
    );
    expect(text).toBe("Need help with bookings.");
  });
});
