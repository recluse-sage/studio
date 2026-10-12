/* Shared stage copy for the hero scene system. Six stages, fixed order, fixed count.
   Wording mirrors the process section so the hero and the page tell one story.
   Plain sentences, no decoration, no claims about results. */

export type StageCopy = {
  index: string;
  id: string;
  label: string;
  line: string;
  detail: string;
};

export const STAGE_COUNT = 6;

export const STAGES: StageCopy[] = [
  {
    index: "01",
    id: "problem",
    label: "Problem",
    line: "You bring a problem.",
    detail: "Tell us the work that repeats or the outcome you need. One short note is enough to start.",
  },
  {
    index: "02",
    id: "talk",
    label: "Talk",
    line: "We talk it through.",
    detail: "A short conversation so we understand the problem and the context around it.",
  },
  {
    index: "03",
    id: "solution",
    label: "Solution",
    line: "We find the fit.",
    detail: "We agree the smallest useful fix and put scope, timing, and cost in writing.",
  },
  {
    index: "04",
    id: "build",
    label: "Build",
    line: "We build it.",
    detail: "We build the fix and you review it on your phone as it takes shape.",
  },
  {
    index: "05",
    id: "ship",
    label: "Ship",
    line: "We ship it to you.",
    detail: "We deliver it ready to run and hand it over so you own the result.",
  },
  {
    index: "06",
    id: "use-share",
    label: "Use and share",
    line: "You use it and share it.",
    detail: "You run it in daily work. When it helps, you share it with people you trust.",
  },
];

export function clampStage(stage: number): number {
  if (Number.isNaN(stage)) return 0;
  return Math.max(0, Math.min(STAGE_COUNT - 1, Math.floor(stage)));
}
