import { useMemo, useState } from "react";
import { SectionHeading } from "../../../components/SectionHeading/SectionHeading";
import {
  QUESTIONS,
  recommend,
  getNextQuestionId,
  quizToIntakePrefill,
  buildTaskDescriptionFromQuiz,
} from "../../../shared/quiz";
import classes from "./ToolsSection.module.css";

/**
 * One guided wizard built on the shared quiz model.
 * QUESTIONS, branching, and the recommend function come from src/shared/quiz.
 * This file renders flow only. It never duplicates the rules.
 */

type QuizOption = { value: string; label: string };
type QuizQuestion = {
  id: string;
  label: string;
  hint?: string;
  options: QuizOption[];
};

function toOptions(raw: unknown): QuizOption[] {
  if (!Array.isArray(raw)) return [];
  const out: QuizOption[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim().length > 0) {
      out.push({ value: item, label: item });
      continue;
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const valueRaw = o.value ?? o.id ?? o.key;
      const labelRaw = o.label ?? o.title ?? o.text ?? o.name;
      const value = typeof valueRaw === "string" && valueRaw.trim().length > 0 ? valueRaw : null;
      const label = typeof labelRaw === "string" && labelRaw.trim().length > 0 ? labelRaw : value;
      if (value && label) out.push({ value, label });
    }
  }
  return out;
}

function normalizeQuestions(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw)) return [];
  const list: QuizQuestion[] = [];
  raw.forEach((entry, position) => {
    if (!entry || typeof entry !== "object") return;
    const q = entry as Record<string, unknown>;
    const idRaw = q.id ?? q.key ?? `q${position + 1}`;
    const labelRaw = q.label ?? q.question ?? q.title ?? q.text;
    const id = typeof idRaw === "string" && idRaw.trim().length > 0 ? idRaw : `q${position + 1}`;
    const label =
      typeof labelRaw === "string" && labelRaw.trim().length > 0 ? labelRaw : `Question ${position + 1}`;
    const hintRaw = q.hint ?? q.help ?? q.description;
    const hint = typeof hintRaw === "string" && hintRaw.trim().length > 0 ? hintRaw : undefined;
    const parsed = toOptions(q.options ?? q.choices ?? q.answers);
    const options = parsed.length > 0 ? parsed : [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];
    list.push({ id, label, hint, options });
  });
  return list;
}

function fitLabel(fit: unknown): string {
  if (fit === "website") return "A small website";
  if (fit === "tool") return "A small tool";
  if (fit === "automation") return "A simple automation";
  return "A useful next step";
}

export const QUIZ_PREFILL_EVENT = "oasis:quiz-prefill";

type RecommendResult = {
  fit?: unknown;
  runnerUp?: unknown;
  why?: unknown;
};

export function ToolsSection() {
  const questions = useMemo(() => normalizeQuestions(QUESTIONS as unknown), []);
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<string[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current: QuizQuestion | null = currentId ? (byId.get(currentId) ?? null) : null;

  const orderedIds = useMemo(() => questions.map((q) => q.id), [questions]);
  const stepIndex = currentId ? history.length : 0;
  const totalSteps = orderedIds.length + 2;

  function nextIdFor(nextAnswers: Record<string, string>): string | null {
    try {
      const next = (getNextQuestionId as (a: Record<string, string>) => unknown)(nextAnswers);
      if (typeof next === "string" && next.trim().length > 0) return next;
      return null;
    } catch {
      return null;
    }
  }

  function begin() {
    setError(null);
    setStarted(true);
    setFinished(false);
    const first = nextIdFor(answers) ?? orderedIds[0] ?? null;
    if (first) {
      setHistory([]);
      setCurrentId(first);
    } else {
      setFinished(true);
    }
  }

  function goNext() {
    if (!started) {
      begin();
      return;
    }
    if (finished) return;
    if (!current) return;
    const value = answers[current.id];
    if (!value) {
      setError("Choose one option, then select Next.");
      return;
    }
    setError(null);
    const next = nextIdFor(answers);
    if (next && byId.has(next) && !history.includes(next)) {
      setHistory((prev) => [...prev, current.id]);
      setCurrentId(next);
    } else {
      // No further question. Show the result.
      setHistory((prev) => [...prev, current.id]);
      setFinished(true);
      setCurrentId(null);
    }
  }

  function goBack() {
    setError(null);
    if (finished) {
      const prev = history[history.length - 1] ?? null;
      setHistory((h) => h.slice(0, -1));
      setFinished(false);
      setStarted(true);
      setCurrentId(prev);
      return;
    }
    if (history.length === 0) {
      setStarted(false);
      setCurrentId(null);
      return;
    }
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setCurrentId(prev);
  }

  function reset() {
    setAnswers({});
    setHistory([]);
    setCurrentId(null);
    setStarted(false);
    setFinished(false);
    setError(null);
  }

  let recommendation: RecommendResult | null = null;
  if (finished) {
    try {
      recommendation = (recommend as (a: Record<string, string>) => RecommendResult)(answers);
    } catch {
      recommendation = null;
    }
  }

  const why: string[] = Array.isArray((recommendation as { why?: unknown } | null)?.why)
    ? ((recommendation as { why: unknown[] }).why.filter((w): w is string => typeof w === "string" && w.trim().length > 0))
    : [];

  function prefillText(): string {
    try {
      const shaped = (quizToIntakePrefill as (a: Record<string, string>) => { taskDescriptionPrefix?: unknown })(answers);
      if (shaped && typeof shaped.taskDescriptionPrefix === "string" && shaped.taskDescriptionPrefix.trim()) {
        return shaped.taskDescriptionPrefix;
      }
    } catch {
      /* fall through */
    }
    try {
      const built = (buildTaskDescriptionFromQuiz as (a: Record<string, string>, b: string) => unknown)(answers, "");
      if (typeof built === "string" && built.trim()) return built;
    } catch {
      /* fall through */
    }
    return "Guided check from oasis.dev tools.";
  }

  function useInIntake() {
    const text = prefillText().trim();
    try {
      window.dispatchEvent(new CustomEvent(QUIZ_PREFILL_EVENT, { detail: { text } }));
    } catch {
      /* ignore dispatch errors */
    }
    window.location.hash = "#intake";
    window.setTimeout(() => {
      document.getElementById("intake-taskDescription")?.focus({ preventScroll: true });
    }, 60);
  }

  const stepLabels = useMemo(() => {
    const items: Array<{ key: string; label: string }> = [{ key: "intro", label: "Intro" }];
    questions.forEach((q, i) => {
      const short = q.id.length <= 12 ? q.id : `Step ${i + 1}`;
      items.push({ key: q.id, label: short });
    });
    items.push({ key: "result", label: "Result" });
    return items;
  }, [questions]);

  function stepState(key: string, position: number): { current: boolean; done: boolean } {
    if (position === 0) return { current: !started && !finished, done: started || finished };
    if (key === "result") return { current: finished, done: false };
    if (finished) return { current: false, done: Boolean(answers[key]) };
    if (key === currentId) return { current: true, done: false };
    return { current: false, done: history.includes(key) };
  }

  return (
    <section id="tools" className={classes.section} aria-labelledby="tools-title">
      <div className={classes.inner}>
        <SectionHeading
          id="tools"
          eyebrow="Tools"
          title="Find the right next step"
          description="Answer a few quick questions and we will suggest a useful next step."
        />

        {questions.length === 0 ? (
          <p className={classes.empty} role="status">
            The guided check is being prepared. Send the intake with a line about the task that repeats.
          </p>
        ) : (
          <div className={classes.shell}>
            <ol className={classes.steps} aria-label="Wizard steps">
              {stepLabels.map((item, i) => {
                const s = stepState(item.key, i);
                return (
                  <li key={item.key} className={classes.stepItem} data-current={s.current} data-done={s.done}>
                    <span className={classes.stepDot} aria-hidden="true">
                      {s.done ? (
                        <svg viewBox="0 0 12 12" focusable="false">
                          <path
                            d="m2.5 6.2 2.2 2.2 4.8-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <span className={classes.stepNumber} aria-hidden="true">
                          {i === 0 ? "•" : i === stepLabels.length - 1 ? "✓" : String(i)}
                        </span>
                      )}
                    </span>
                    <span className={classes.stepLabel} aria-current={s.current ? "step" : undefined}>
                      {item.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            <p className={classes.progress} role="status" aria-live="polite">
              {!started && !finished
                ? `Intro of ${totalSteps} steps`
                : finished
                  ? `Result, step ${totalSteps} of ${totalSteps}`
                  : `Step ${stepIndex + 2} of ${totalSteps}${current ? `: ${current.label}` : ""}`}
            </p>

            <div className={classes.panel} key={currentId ?? (finished ? "result" : "intro")}>
              {!started && !finished ? (
                <div className={classes.intro}>
                  <span className={classes.stageIcon} aria-hidden="true">
                    <svg viewBox="0 0 20 20" focusable="false">
                      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M10 6.5v3.5l2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                  <p className={classes.introText}>
                    Three short questions about the work that repeats. Your answers stay on this page.
                  </p>
                </div>
              ) : null}

              {current && !finished ? (
                <fieldset className={classes.group}>
                  <legend className={classes.question}>{current.label}</legend>
                  {current.hint ? <p className={classes.hint}>{current.hint}</p> : null}
                  <div className={classes.options}>
                    {current.options.map((option) => (
                      <label key={option.value} className={classes.option}>
                        <input
                          type="radio"
                          name={`quiz-${current.id}`}
                          value={option.value}
                          checked={answers[current.id] === option.value}
                          onChange={() => setAnswers((prev) => ({ ...prev, [current.id]: option.value }))}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {finished && recommendation ? (
                <div className={classes.result} role="status" aria-live="polite">
                  <span className={classes.stageIcon} aria-hidden="true">
                    <svg viewBox="0 0 20 20" focusable="false">
                      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
                      <path
                        d="m7.5 10.2 1.8 1.8 3.4-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <h3 className={classes.resultTitle}>{fitLabel(recommendation.fit)}.</h3>
                  {why.length > 0 ? (
                    <ul className={classes.why}>
                      {why.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                  <p className={classes.prefill}>
                    <span className={classes.prefillLabel}>Intake draft</span>
                    {prefillText()}
                  </p>
                  <div className={classes.resultActions}>
                    <button type="button" className={classes.primary} onClick={useInIntake}>
                      Use this in the intake
                    </button>
                    <button type="button" className={classes.ghost} onClick={reset}>
                      Start over
                    </button>
                  </div>
                </div>
              ) : null}

              {error && !finished ? (
                <p role="alert" className={classes.fieldError}>
                  {error}
                </p>
              ) : null}

              {!finished ? (
                <div className={classes.nav}>
                  {started ? (
                    <button type="button" className={classes.ghost} onClick={goBack}>
                      Back
                    </button>
                  ) : null}
                  <button type="button" className={classes.primary} onClick={goNext}>
                    Next
                  </button>
                </div>
              ) : (
                <div className={classes.nav}>
                  <button type="button" className={classes.ghost} onClick={goBack}>
                    Back
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
