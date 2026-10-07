import { useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { SectionHeading } from "../../../components/SectionHeading/SectionHeading";
import classes from "./ToolsSection.module.css";

/**
 * Five small honest homepage tools. All client side, no fake data.
 * Each tool takes simple inputs and returns a plain next step plus
 * an intake link. Empty state first, result state after checking.
 */

const TABS = [
  { id: "price", label: "Price shape" },
  { id: "booking", label: "Booking check" },
  { id: "followup", label: "Follow up math" },
  { id: "hours", label: "Hours and contact" },
  { id: "automation", label: "Automation fit" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function IntakeLink({ text }: { text: string }) {
  return (
    <a href="#intake" className={classes.intakeLink}>
      {text}
      <span aria-hidden="true">→</span>
    </a>
  );
}

function ToolActions({
  onCheck,
  onReset,
  hasResult,
  checkLabel,
}: {
  onCheck: () => void;
  onReset: () => void;
  hasResult: boolean;
  checkLabel: string;
}) {
  return (
    <div className={classes.actions}>
      <button type="button" className={classes.check} onClick={onCheck}>
        {checkLabel}
      </button>
      {hasResult ? (
        <button type="button" className={classes.reset} onClick={onReset}>
          Start over
        </button>
      ) : null}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <p className={classes.empty}>
      {text} Nothing is sent. Results stay on this page.
    </p>
  );
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className={classes.fieldError}>
      {message}
    </p>
  );
}

/* 1. Price shape estimator. Shape words only, never a price. */

function PriceShapeTool() {
  const [need, setNeed] = useState("");
  const [size, setSize] = useState("");
  const [wantsBooking, setWantsBooking] = useState(false);
  const [wantsReminders, setWantsReminders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ shape: string; lines: string[] } | null>(null);

  function check() {
    if (!need || !size) {
      setError("Choose what you need and the size, then check the shape.");
      setResult(null);
      return;
    }
    setError(null);
    const base =
      need === "website" && size === "one"
        ? "a one page website"
        : need === "website" && size === "few"
          ? "a small website of a few pages"
          : need === "website"
            ? "a website built in stages, starting with one clear page"
            : need === "tool" && size === "one"
              ? "a small tool that does one job"
              : need === "tool" && size === "few"
                ? "a small tool with one main job plus one helper"
                : need === "tool"
                  ? "a tool built in stages, starting with the most repeated job"
                  : size === "one"
                    ? "one simple link between two steps you already do"
                    : size === "few"
                      ? "a short chain that links intake, reply, and booking"
                      : "an automation built in stages, starting with reminders";
    const lines: string[] = [];
    if (wantsBooking) lines.push("Include a booking or quote step people can finish on a phone.");
    if (wantsReminders) lines.push("Include simple reminders so fewer bookings slip.");
    lines.push("Mention timing and budget in one line so the scope can stay fixed.");
    setResult({ shape: base, lines });
  }

  function reset() {
    setNeed("");
    setSize("");
    setWantsBooking(false);
    setWantsReminders(false);
    setError(null);
    setResult(null);
  }

  return (
    <div className={classes.tool}>
      <p className={classes.toolIntro}>
        Answer three questions. You get a likely build shape and what to include in
        your intake. This is a starting shape, not a quote or a promise.
      </p>
      <div className={classes.field}>
        <label className={classes.label} htmlFor="price-need">
          What do you need
        </label>
        <select
          id="price-need"
          className={classes.input}
          value={need}
          onChange={(e) => setNeed(e.currentTarget.value)}
        >
          <option value="">Choose one</option>
          <option value="website">A simple website</option>
          <option value="tool">A small tool</option>
          <option value="automation">Link steps with automation</option>
        </select>
      </div>
      <div className={classes.field}>
        <label className={classes.label} htmlFor="price-size">
          How big does it feel
        </label>
        <select
          id="price-size"
          className={classes.input}
          value={size}
          onChange={(e) => setSize(e.currentTarget.value)}
        >
          <option value="">Choose one</option>
          <option value="one">One page or one task</option>
          <option value="few">A few pages or two tasks</option>
          <option value="several">Several pages or connected steps</option>
        </select>
      </div>
      <fieldset className={classes.checkGroup}>
        <legend className={classes.label}>Extras, optional</legend>
        <label className={classes.checkRow}>
          <input
            type="checkbox"
            checked={wantsBooking}
            onChange={(e) => setWantsBooking(e.currentTarget.checked)}
          />
          Take bookings or quotes
        </label>
        <label className={classes.checkRow}>
          <input
            type="checkbox"
            checked={wantsReminders}
            onChange={(e) => setWantsReminders(e.currentTarget.checked)}
          />
          Send reminders or follow ups
        </label>
      </fieldset>
      <FieldError message={error} />
      <ToolActions onCheck={check} onReset={reset} hasResult={result !== null} checkLabel="Check shape" />
      {result ? (
        <div role="status" aria-live="polite" className={classes.result}>
          <h4 className={classes.resultTitle}>Likely shape: {result.shape}.</h4>
          <ul className={classes.resultList}>
            {result.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className={classes.next}>
            Next step: send the intake and paste these answers in one line.
          </p>
          <IntakeLink text="Send this in the intake" />
        </div>
      ) : (
        <EmptyNote text="Choose the options above, then select Check shape." />
      )}
    </div>
  );
}

/* 2. Booking readiness checker. */

function BookingReadinessTool() {
  const [channel, setChannel] = useState("");
  const [misses, setMisses] = useState("");
  const [chasing, setChasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; lines: string[] } | null>(null);

  function check() {
    const missed = misses.trim() === "" ? null : Number(misses);
    if (!channel) {
      setError("Choose how people book now, then check readiness.");
      setResult(null);
      return;
    }
    if (missed !== null && (!Number.isFinite(missed) || missed < 0 || missed > 500)) {
      setError("Missed bookings must be a number from 0 to 500, or leave it blank.");
      setResult(null);
      return;
    }
    setError(null);
    const lines: string[] = [];
    if (channel === "no-clear-way") {
      lines.push("Name one booking path first, such as text or a simple form.");
    } else {
      lines.push("Keep the current path. New tools should link to it, not replace it yet.");
    }
    if (missed !== null && missed >= 3) {
      lines.push("At this miss rate, confirmations are the first fix worth scoping.");
    } else if (missed !== null && missed > 0) {
      lines.push("A short confirmation step should cover the gaps you typed.");
    } else {
      lines.push("Low misses means a light helper is enough. Keep the change small.");
    }
    if (chasing) lines.push("Manual chasing is the clearest sign a reminder helper would help.");
    const title =
      channel === "no-clear-way"
        ? "Start with one clear booking path."
        : missed !== null && missed >= 3
          ? "Worth fixing soon. Start with confirmations."
          : "Mostly ready. Keep the fix small.";
    setResult({ title, lines });
  }

  function reset() {
    setChannel("");
    setMisses("");
    setChasing(false);
    setError(null);
    setResult(null);
  }

  return (
    <div className={classes.tool}>
      <p className={classes.toolIntro}>
        Three quick answers about how bookings work today. You get a plain readout
        and the smallest useful next step.
      </p>
      <div className={classes.field}>
        <label className={classes.label} htmlFor="booking-channel">
          How do people book now
        </label>
        <select
          id="booking-channel"
          className={classes.input}
          value={channel}
          onChange={(e) => setChannel(e.currentTarget.value)}
        >
          <option value="">Choose one</option>
          <option value="phone-text">By phone call or text</option>
          <option value="dm-social">By DM or social message</option>
          <option value="walk-in">In person or walk in</option>
          <option value="no-clear-way">No clear way yet</option>
        </select>
      </div>
      <div className={classes.field}>
        <label className={classes.label} htmlFor="booking-misses">
          Messy or missed bookings per week, optional
        </label>
        <input
          id="booking-misses"
          className={classes.input}
          type="number"
          min={0}
          max={500}
          inputMode="numeric"
          placeholder="Example: 2"
          value={misses}
          onChange={(e) => setMisses(e.currentTarget.value)}
        />
      </div>
      <label className={classes.checkRow}>
        <input
          type="checkbox"
          checked={chasing}
          onChange={(e) => setChasing(e.currentTarget.checked)}
        />
        Confirmations take manual chasing
      </label>
      <FieldError message={error} />
      <ToolActions onCheck={check} onReset={reset} hasResult={result !== null} checkLabel="Check readiness" />
      {result ? (
        <div role="status" aria-live="polite" className={classes.result}>
          <h4 className={classes.resultTitle}>{result.title}</h4>
          <ul className={classes.resultList}>
            {result.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className={classes.next}>
            Next step: send the intake and describe the booking path in two lines.
          </p>
          <IntakeLink text="Send this in the intake" />
        </div>
      ) : (
        <EmptyNote text="Choose how bookings work today, then select Check readiness." />
      )}
    </div>
  );
}

/* 3. Quote follow up calculator. Math from typed numbers only. */

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function FollowUpTool() {
  const [quotes, setQuotes] = useState("");
  const [value, setValue] = useState("");
  const [habit, setHabit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ pipeline: string; extra: string; note: string } | null>(null);

  function check() {
    const q = Number(quotes);
    const v = Number(value);
    if (quotes.trim() === "" || !Number.isFinite(q) || q < 0 || q > 100000) {
      setError("Add quotes per month as a number from 0 to 100000.");
      setResult(null);
      return;
    }
    if (value.trim() === "" || !Number.isFinite(v) || v < 0 || v > 100000000) {
      setError("Add an average job value as a number. Use your own currency.");
      setResult(null);
      return;
    }
    if (!habit) {
      setError("Choose how often you follow up, then do the math.");
      setResult(null);
      return;
    }
    setError(null);
    const pipeline = q * v;
    const extra = pipeline / 10;
    const note =
      habit === "every"
        ? "You already follow up, so the win is speed. A simple log plus one reminder keeps it steady."
        : habit === "sometimes"
          ? "Some follow up slips through. One shared list plus one reminder usually covers it."
          : "Most quotes get no follow up, so even one reminder pass each week can matter.";
    setResult({
      pipeline: numberFormat.format(pipeline),
      extra: numberFormat.format(extra),
      note,
    });
  }

  function reset() {
    setQuotes("");
    setValue("");
    setHabit("");
    setError(null);
    setResult(null);
  }

  return (
    <div className={classes.tool}>
      <p className={classes.toolIntro}>
        Type your own numbers. The math below uses only what you typed, in your own
        currency. No averages from other businesses.
      </p>
      <div className={classes.row}>
        <div className={classes.field}>
          <label className={classes.label} htmlFor="follow-quotes">
            Quotes per month
          </label>
          <input
            id="follow-quotes"
            className={classes.input}
            type="number"
            min={0}
            max={100000}
            inputMode="numeric"
            placeholder="Example: 20"
            value={quotes}
            onChange={(e) => setQuotes(e.currentTarget.value)}
          />
        </div>
        <div className={classes.field}>
          <label className={classes.label} htmlFor="follow-value">
            Average job value
          </label>
          <input
            id="follow-value"
            className={classes.input}
            type="number"
            min={0}
            max={100000000}
            inputMode="decimal"
            placeholder="Example: 150"
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
          />
        </div>
      </div>
      <div className={classes.field}>
        <label className={classes.label} htmlFor="follow-habit">
          Do you follow up every quote
        </label>
        <select
          id="follow-habit"
          className={classes.input}
          value={habit}
          onChange={(e) => setHabit(e.currentTarget.value)}
        >
          <option value="">Choose one</option>
          <option value="every">Yes, every quote</option>
          <option value="sometimes">Sometimes</option>
          <option value="rarely">Rarely or never</option>
        </select>
      </div>
      <FieldError message={error} />
      <ToolActions onCheck={check} onReset={reset} hasResult={result !== null} checkLabel="Do the math" />
      {result ? (
        <div role="status" aria-live="polite" className={classes.result}>
          <h4 className={classes.resultTitle}>
            Your typed pipeline is about {result.pipeline}. One extra win in ten would be about {result.extra}.
          </h4>
          <p className={classes.next}>{result.note}</p>
          <p className={classes.next}>
            Next step: send the intake with your two numbers and we will suggest one
            follow up step.
          </p>
          <IntakeLink text="Send this in the intake" />
        </div>
      ) : (
        <EmptyNote text="Add your two numbers and habit, then select Do the math." />
      )}
    </div>
  );
}

/* 4. Hours and contact completeness checker. */

const HOURS_ITEMS = [
  { id: "google-hours", label: "Hours are current on your map listing" },
  { id: "social-hours", label: "Hours appear on your site or social profile" },
  { id: "phone-tap", label: "Phone number is easy to tap on a phone" },
  { id: "map-link", label: "Map or directions link is easy to find" },
  { id: "reply-channel", label: "You name the fastest way to reach you" },
] as const;

function HoursContactTool() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<{ score: number; missing: string[] } | null>(null);

  function toggle(id: string, value: boolean) {
    setChecked((prev) => ({ ...prev, [id]: value }));
  }

  function check() {
    const missing = HOURS_ITEMS.filter((item) => !checked[item.id]).map((item) => item.label);
    setResult({ score: HOURS_ITEMS.length - missing.length, missing });
  }

  function reset() {
    setChecked({});
    setResult(null);
  }

  return (
    <div className={classes.tool}>
      <p className={classes.toolIntro}>
        Tick what a new customer can already find in under a minute. You get a
        score out of five plus the exact gaps to close.
      </p>
      <fieldset className={classes.checkGroup}>
        <legend className={classes.label}>What can a customer find fast</legend>
        {HOURS_ITEMS.map((item) => (
          <label key={item.id} className={classes.checkRow}>
            <input
              type="checkbox"
              checked={Boolean(checked[item.id])}
              onChange={(e) => toggle(item.id, e.currentTarget.checked)}
            />
            {item.label}
          </label>
        ))}
      </fieldset>
      <ToolActions onCheck={check} onReset={reset} hasResult={result !== null} checkLabel="Check completeness" />
      {result ? (
        <div role="status" aria-live="polite" className={classes.result}>
          <h4 className={classes.resultTitle}>
            Score: {result.score} of {HOURS_ITEMS.length}.
            {result.missing.length === 0
              ? " Everything on this list is covered."
              : " Start with the first gap below."}
          </h4>
          {result.missing.length > 0 ? (
            <ul className={classes.resultList}>
              {result.missing.map((label) => (
                <li key={label}>Missing: {label.toLowerCase()}.</li>
              ))}
            </ul>
          ) : null}
          <p className={classes.next}>
            Next step: send the intake and list the gaps. A hours and contact pass is
            a small first build.
          </p>
          <IntakeLink text="Send this in the intake" />
        </div>
      ) : (
        <EmptyNote text="Tick the boxes that are true today, then select Check completeness." />
      )}
    </div>
  );
}

/* 5. Automation fit quiz. */

const QUIZ = [
  { id: "q1", question: "Does one task repeat every week" },
  { id: "q2", question: "Are the steps mostly the same each time" },
  { id: "q3", question: "Do reminders or follow ups need manual chasing" },
  { id: "q4", question: "Is the same info typed in more than one place" },
] as const;

function AutomationFitTool() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; title: string; detail: string } | null>(null);

  function check() {
    const unanswered = QUIZ.filter((q) => answers[q.id] !== "yes" && answers[q.id] !== "no");
    if (unanswered.length > 0) {
      setError("Answer all four questions, then check the fit.");
      setResult(null);
      return;
    }
    setError(null);
    const score = QUIZ.filter((q) => answers[q.id] === "yes").length;
    const title =
      score <= 1
        ? "Low fit. Keep it manual for now."
        : score === 2
          ? "Fair fit. One small helper could help."
          : score === 3
            ? "Good fit. Worth scoping one helper."
            : "Strong fit. A helper is worth scoping.";
    const detail =
      score <= 1
        ? "Few repeated steps means a build would add cost without clear return. Revisit when the task repeats more."
        : score <= 3
          ? "Name the single most repeated step in your intake. That becomes the first helper."
          : "Name the repeated steps in order in your intake. That list becomes the scope.";
    setResult({ score, title, detail });
  }

  function reset() {
    setAnswers({});
    setError(null);
    setResult(null);
  }

  return (
    <div className={classes.tool}>
      <p className={classes.toolIntro}>
        Four yes or no questions about the task that repeats. You get an honest fit
        readout, including when not to build.
      </p>
      {QUIZ.map((q, index) => (
        <fieldset key={q.id} className={classes.quizGroup}>
          <legend className={classes.label}>
            {index + 1}. {q.question}
          </legend>
          <div className={classes.quizRow}>
            <label className={classes.quizOption}>
              <input
                type="radio"
                name={`automation-${q.id}`}
                value="yes"
                checked={answers[q.id] === "yes"}
                onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: "yes" }))}
              />
              Yes
            </label>
            <label className={classes.quizOption}>
              <input
                type="radio"
                name={`automation-${q.id}`}
                value="no"
                checked={answers[q.id] === "no"}
                onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: "no" }))}
              />
              No
            </label>
          </div>
        </fieldset>
      ))}
      <FieldError message={error} />
      <ToolActions onCheck={check} onReset={reset} hasResult={result !== null} checkLabel="Check fit" />
      {result ? (
        <div role="status" aria-live="polite" className={classes.result}>
          <h4 className={classes.resultTitle}>
            {result.score} of 4 yes. {result.title}
          </h4>
          <p className={classes.next}>{result.detail}</p>
          <p className={classes.next}>
            Next step: send the intake and describe the repeating task in two lines.
          </p>
          <IntakeLink text="Send this in the intake" />
        </div>
      ) : (
        <EmptyNote text="Answer all four questions, then select Check fit." />
      )}
    </div>
  );
}

/* Section shell with keyboard safe tabs. */

export function ToolsSection() {
  const headingId = useId();
  const [active, setActive] = useState<number>(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function select(index: number) {
    setActive((index + TABS.length) % TABS.length);
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = (index + 1) % TABS.length;
      select(next);
      tabRefs.current[next]?.focus();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prev = (index - 1 + TABS.length) % TABS.length;
      select(prev);
      tabRefs.current[prev]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      select(0);
      tabRefs.current[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      select(TABS.length - 1);
      tabRefs.current[TABS.length - 1]?.focus();
    }
  }

  const activeId: TabId = TABS[active].id;

  return (
    <section id="tools" className={classes.section} aria-labelledby={headingId}>
      <div className={classes.inner}>
        <SectionHeading
          id="tools"
          eyebrow="Quick checks"
          title="Five checks that help you decide"
          description="Small honest helpers. Answer a few questions, get a plain next step. All on this page, no account needed."
        />
        <div
          role="tablist"
          aria-label="Homepage helper tools"
          className={classes.tabs}
        >
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              role="tab"
              id={`tool-tab-${tab.id}`}
              aria-selected={index === active}
              aria-controls={`tool-panel-${tab.id}`}
              tabIndex={index === active ? 0 : -1}
              className={classes.tab}
              data-active={index === active}
              onClick={() => select(index)}
              onKeyDown={(event) => onTabKey(event, index)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id={`tool-panel-${activeId}`}
          aria-labelledby={`tool-tab-${activeId}`}
          className={classes.panel}
          key={activeId}
        >
          {activeId === "price" ? <PriceShapeTool /> : null}
          {activeId === "booking" ? <BookingReadinessTool /> : null}
          {activeId === "followup" ? <FollowUpTool /> : null}
          {activeId === "hours" ? <HoursContactTool /> : null}
          {activeId === "automation" ? <AutomationFitTool /> : null}
        </div>
      </div>
    </section>
  );
}
