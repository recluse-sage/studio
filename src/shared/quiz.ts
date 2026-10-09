// Shared quiz model for the guided staged flow.
// Pure functions only. No fetch, no DOM, no secrets.
// UI and server share these field names. Designer builds against this contract.
//
// Five questions: goal, budget band, timeline, comfort, existing assets.
// Branching: goal decides whether assets or comfort comes first.
// recommend() scores answers to one fit plus a runner up with plain reasons.
// Low fit is honest: it still returns a fit but says to talk first.

export type QuizFit = "website" | "tool" | "automation";

export type QuizQuestionId = "goal" | "budget" | "timeline" | "comfort" | "assets";

export interface QuizOption {
  value: string;
  label: string;
  hint?: string;
}

export interface QuizQuestion {
  id: QuizQuestionId;
  title: string;
  help?: string;
  options: QuizOption[];
}

export type QuizAnswers = Partial<Record<QuizQuestionId, string>>;

export interface QuizRecommendation {
  fit: QuizFit;
  runnerUp: QuizFit | null;
  why: string[];
}

export const QUESTIONS: readonly QuizQuestion[] = [
  {
    id: "goal",
    title: "What do you want this to do for your shop or service?",
    help: "Pick the closest one. You can explain more in the intake.",
    options: [
      {
        value: "get-found",
        label: "Get found and win trust",
        hint: "A clear site that explains what you do and how to reach you.",
      },
      {
        value: "take-orders",
        label: "Take orders or bookings with less back and forth",
        hint: "A simple tool for quotes, orders, or bookings.",
      },
      {
        value: "cut-repeat-work",
        label: "Cut repeat manual work",
        hint: "A helper that removes retyping, chasing, or repeat steps.",
      },
      {
        value: "show-work",
        label: "Show my work so people share it",
        hint: "A page that shows finished work, with permission.",
      },
      {
        value: "not-sure",
        label: "Not sure yet",
        hint: "We can talk through it first.",
      },
    ],
  },
  {
    id: "budget",
    title: "What budget band fits this first build?",
    help: "A small first step keeps cost and risk low.",
    options: [
      {
        value: "under-500",
        label: "Under 500",
        hint: "Best for a small starter site.",
      },
      {
        value: "500-1500",
        label: "500 to 1500",
        hint: "Fits a focused tool or a stronger site.",
      },
      {
        value: "1500-plus",
        label: "Above 1500",
        hint: "Fits a helper with several steps.",
      },
      {
        value: "not-sure",
        label: "Not sure yet",
        hint: "We will scope to a small first step.",
      },
    ],
  },
  {
    id: "timeline",
    title: "When do you need the first version in use?",
    help: "Small and focused ships fastest.",
    options: [
      {
        value: "asap",
        label: "Within 4 weeks",
        hint: "Keep the first build small.",
      },
      {
        value: "one-to-three-months",
        label: "In 1 to 3 months",
        hint: "Time to shape one helper well.",
      },
      {
        value: "exploring",
        label: "Just exploring",
        hint: "No date pressure yet.",
      },
    ],
  },
  {
    id: "comfort",
    title: "How do you feel about new tools?",
    help: "We keep the human step where it matters.",
    options: [
      {
        value: "love-new",
        label: "I like trying new tools",
        hint: "Happy to learn one new helper.",
      },
      {
        value: "okay-if-simple",
        label: "Okay if it stays simple",
        hint: "One screen, clear steps, no clutter.",
      },
      {
        value: "prefer-human",
        label: "I prefer a human touch",
        hint: "We keep calls and personal replies front and center.",
      },
    ],
  },
  {
    id: "assets",
    title: "What do you already have ready?",
    help: "Ready material shortens the build.",
    options: [
      {
        value: "have-photos-prices",
        label: "Photos and a price or service list",
        hint: "Enough to show the offer clearly.",
      },
      {
        value: "have-repeat-steps",
        label: "A list of repeat steps",
        hint: "You can name the steps in order.",
      },
      {
        value: "have-chat-orders",
        label: "Orders stuck in chat or calls",
        hint: "Details live in messages today.",
      },
      {
        value: "starting-fresh",
        label: "Starting fresh",
        hint: "We will list the first details together.",
      },
    ],
  },
];

export function getQuestionById(id: QuizQuestionId): QuizQuestion | null {
  for (const q of QUESTIONS) {
    if (q.id === id) return q;
  }
  return null;
}

export function quizGoalLabel(goalValue: string | undefined | null): string | null {
  if (!goalValue) return null;
  for (const q of QUESTIONS) {
    if (q.id !== "goal") continue;
    for (const o of q.options) {
      if (o.value === goalValue) return o.label;
    }
  }
  return null;
}

// Branching order. Goal first, then budget and timeline.
// When the goal is cutting repeat work, assets come before comfort
// because the repeat steps shape the helper. Otherwise comfort first.
export function getNextQuestionId(answers: QuizAnswers): QuizQuestionId | null {
  if (!answers.goal) return "goal";
  if (!answers.budget) return "budget";
  if (!answers.timeline) return "timeline";
  if (answers.goal === "cut-repeat-work") {
    if (!answers.assets) return "assets";
    if (!answers.comfort) return "comfort";
    return null;
  }
  if (!answers.comfort) return "comfort";
  if (!answers.assets) return "assets";
  return null;
}

export function isQuizComplete(answers: QuizAnswers): boolean {
  return getNextQuestionId(answers) === null;
}

type ScoreMap = Record<QuizFit, number>;

function emptyScores(): ScoreMap {
  return { website: 0, tool: 0, automation: 0 };
}

function addScores(scores: ScoreMap, delta: Partial<ScoreMap>): void {
  if (delta.website) scores.website += delta.website;
  if (delta.tool) scores.tool += delta.tool;
  if (delta.automation) scores.automation += delta.automation;
}

function optionLabel(questionId: QuizQuestionId, value: string | undefined): string | null {
  if (!value) return null;
  const q = getQuestionById(questionId);
  if (!q) return null;
  for (const o of q.options) {
    if (o.value === value) return o.label;
  }
  return null;
}

function sortedFits(scores: ScoreMap): QuizFit[] {
  const order: QuizFit[] = ["website", "tool", "automation"];
  return [...order].sort((a, b) => {
    if (scores[b] !== scores[a]) return scores[b] - scores[a];
    return order.indexOf(a) - order.indexOf(b);
  });
}

const FIT_LABEL: Record<QuizFit, string> = {
  website: "a clear website",
  tool: "a focused ordering or booking tool",
  automation: "a small work helper",
};

function isLowFit(answers: QuizAnswers, scores: ScoreMap): boolean {
  const answered = (["goal", "budget", "timeline", "comfort", "assets"] as const).filter(
    (k) => typeof answers[k] === "string" && answers[k].length > 0,
  ).length;
  if (answered <= 1) return true;
  const top = Math.max(scores.website, scores.tool, scores.automation);
  if (top <= 1) return true;
  if (
    (answers.goal === "not-sure" || !answers.goal) &&
    (answers.timeline === "exploring" || !answers.timeline)
  ) {
    return true;
  }
  return false;
}

// Transparent scoring. Each answer adds plain points, and every point
// gets one plain reason line. No hidden model, no exaggeration.
export function recommend(answers: QuizAnswers): QuizRecommendation {
  const safe: QuizAnswers = {
    goal: typeof answers.goal === "string" ? answers.goal : undefined,
    budget: typeof answers.budget === "string" ? answers.budget : undefined,
    timeline: typeof answers.timeline === "string" ? answers.timeline : undefined,
    comfort: typeof answers.comfort === "string" ? answers.comfort : undefined,
    assets: typeof answers.assets === "string" ? answers.assets : undefined,
  };

  const scores = emptyScores();
  const why: string[] = [];

  const goalLabel = optionLabel("goal", safe.goal);
  if (safe.goal === "get-found") {
    addScores(scores, { website: 3 });
    why.push(
      "Goal points to " +
        FIT_LABEL.website +
        (goalLabel ? " because you picked: " + goalLabel + "." : "."),
    );
  } else if (safe.goal === "take-orders") {
    addScores(scores, { tool: 3 });
    why.push(
      "Goal points to " +
        FIT_LABEL.tool +
        (goalLabel ? " because you picked: " + goalLabel + "." : "."),
    );
  } else if (safe.goal === "cut-repeat-work") {
    addScores(scores, { automation: 3 });
    why.push(
      "Goal points to " +
        FIT_LABEL.automation +
        (goalLabel ? " because you picked: " + goalLabel + "." : "."),
    );
  } else if (safe.goal === "show-work") {
    addScores(scores, { website: 2, tool: 1 });
    why.push(
      "Goal leans to " +
        FIT_LABEL.website +
        " first, with a shareable page people can pass on.",
    );
  } else if (safe.goal === "not-sure") {
    why.push("Goal is still open, so no fit gets points from the goal.");
  }

  const budgetLabel = optionLabel("budget", safe.budget);
  if (safe.budget === "under-500") {
    addScores(scores, { website: 1 });
    why.push(
      "Budget band" +
        (budgetLabel ? " (" + budgetLabel + ")" : "") +
        " fits a small starter site best.",
    );
  } else if (safe.budget === "500-1500") {
    addScores(scores, { website: 1, tool: 1 });
    why.push(
      "Budget band" +
        (budgetLabel ? " (" + budgetLabel + ")" : "") +
        " fits a focused tool or a stronger site.",
    );
  } else if (safe.budget === "1500-plus") {
    addScores(scores, { tool: 1, automation: 1 });
    why.push(
      "Budget band" +
        (budgetLabel ? " (" + budgetLabel + ")" : "") +
        " can cover a helper with several steps.",
    );
  } else if (safe.budget === "not-sure") {
    why.push("Budget is still open, so we scope to a small first step.");
  }

  const timelineLabel = optionLabel("timeline", safe.timeline);
  if (safe.timeline === "asap") {
    addScores(scores, { website: 1 });
    why.push(
      "Timeline" +
        (timelineLabel ? " (" + timelineLabel + ")" : "") +
        " favors a small build that can ship fast.",
    );
  } else if (safe.timeline === "one-to-three-months") {
    addScores(scores, { tool: 1, automation: 1 });
    why.push(
      "Timeline" +
        (timelineLabel ? " (" + timelineLabel + ")" : "") +
        " leaves room to shape one helper well.",
    );
  } else if (safe.timeline === "exploring") {
    why.push("Timeline is open, so there is no rush to pick a build.");
  }

  const comfortLabel = optionLabel("comfort", safe.comfort);
  if (safe.comfort === "love-new") {
    addScores(scores, { tool: 1, automation: 1 });
    why.push(
      "Comfort with new tools" +
        (comfortLabel ? " (" + comfortLabel + ")" : "") +
        " supports a helper you will open each week.",
    );
  } else if (safe.comfort === "okay-if-simple") {
    addScores(scores, { website: 1, tool: 1 });
    why.push("Simple steps keep the build usable week after week.");
  } else if (safe.comfort === "prefer-human") {
    addScores(scores, { website: 1 });
    why.push("A human touch stays front and center, with the build behind it.");
  }

  const assetsLabel = optionLabel("assets", safe.assets);
  if (safe.assets === "have-photos-prices") {
    addScores(scores, { website: 1 });
    why.push(
      "Ready photos and prices" +
        (assetsLabel ? " (" + assetsLabel + ")" : "") +
        " shorten a site build.",
    );
  } else if (safe.assets === "have-repeat-steps") {
    addScores(scores, { automation: 1 });
    why.push("Listed repeat steps give the helper a clear scope.");
  } else if (safe.assets === "have-chat-orders") {
    addScores(scores, { tool: 1 });
    why.push("Orders in chat today point to one intake that collects them.");
  } else if (safe.assets === "starting-fresh") {
    why.push("Starting fresh means we list the first details together.");
  }

  const ranked = sortedFits(scores);
  const low = isLowFit(safe, scores);

  if (low) {
    why.push(
      "This looks like a low fit for a build right now. Start with a talk, keep the problem to one repeat task, then revisit.",
    );
  } else {
    why.push(
      "Next step: name the single problem in the intake, then we talk, find the solution, and build it.",
    );
  }

  if (why.length === 0) {
    why.push("No answers yet. Answer the goal first, then we score the fit.");
  }

  return {
    fit: ranked[0],
    runnerUp: ranked[1] ?? null,
    why,
  };
}

// Intake unification. The quiz has no separate endpoint. The goal answer
// folds into the intake task description as a plain prefix, so the inbox
// keeps one flow: problem in, talk, solution, build, ship, use, share.
export interface QuizIntakePrefill {
  taskDescriptionPrefix: string;
  timeline: string | null;
  budget: string | null;
}

const BUDGET_PREFILL: Record<string, string | null> = {
  "under-500": "Under 500",
  "500-1500": "500 to 1500",
  "1500-plus": "Above 1500",
  "not-sure": null,
};

const TIMELINE_PREFILL: Record<string, string | null> = {
  asap: "Within 4 weeks",
  "one-to-three-months": "In 1 to 3 months",
  exploring: null,
};

export function quizToIntakePrefill(answers: QuizAnswers): QuizIntakePrefill {
  const goalLabel = quizGoalLabel(
    typeof answers.goal === "string" ? answers.goal : null,
  );
  const prefix =
    goalLabel && answers.goal !== "not-sure" ? "Quiz goal: " + goalLabel + ". " : "";
  const budget =
    typeof answers.budget === "string" && answers.budget in BUDGET_PREFILL
      ? BUDGET_PREFILL[answers.budget]
      : null;
  const timeline =
    typeof answers.timeline === "string" && answers.timeline in TIMELINE_PREFILL
      ? TIMELINE_PREFILL[answers.timeline]
      : null;
  return { taskDescriptionPrefix: prefix, timeline, budget };
}

// Client helper for the unified flow. Keeps intake taskDescription within
// the 1000 char server limit. Trims and prefixes the quiz goal.
export function buildTaskDescriptionFromQuiz(
  answers: QuizAnswers,
  details: string,
): string {
  const prefill = quizToIntakePrefill(answers);
  const clean = (details || "").trim().replace(/\s+/g, " ");
  const combined = (prefill.taskDescriptionPrefix + clean).trim().slice(0, 1000);
  return combined;
}
