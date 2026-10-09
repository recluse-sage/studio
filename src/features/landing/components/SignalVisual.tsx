import { useEffect, useState } from "react";
import classes from "./SignalVisual.module.css";

/**
 * Clay journey through the true six stages.
 * Pure CSS and SVG, no photos, no logos. Decorative plus honest labels.
 * Auto walks once on load, then rests. Hover or focus steps stage to stage.
 * Frozen under reduced motion.
 */

const STAGES = [
  {
    id: "problem",
    index: "01",
    label: "Problem",
    text: "You bring a problem.",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="10" cy="10" r="2.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "talk",
    index: "02",
    label: "Talk",
    text: "We talk it through.",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path
          d="M3 5.5h14v8H9.5L6 16.5v-3H3v-8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="7.5" cy="9.5" r="1" fill="currentColor" />
        <circle cx="10.5" cy="9.5" r="1" fill="currentColor" />
        <circle cx="13.5" cy="9.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "solution",
    index: "03",
    label: "Solution",
    text: "We find the fit.",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
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
    ),
  },
  {
    id: "build",
    index: "04",
    label: "Build",
    text: "We build it.",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <rect x="3.5" y="10" width="6" height="6" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <rect x="10.5" y="4" width="6" height="6" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: "ship",
    index: "05",
    label: "Ship",
    text: "We ship it to you.",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path
          d="M3 10.5 17 4l-4.5 13-2.8-5.2L3 10.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "use-share",
    index: "06",
    label: "Use and share",
    text: "You use it and share it.",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <circle cx="5.5" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="14.5" cy="5.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="14.5" cy="14.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="m7.8 9 4.2-2.2M7.8 11l4.2 2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

export function SignalVisual() {
  const [active, setActive] = useState(0);
  const [walked, setWalked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setWalked(true);
      return;
    }
    let step = 0;
    let alive = true;
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    for (let i = 1; i < STAGES.length; i += 1) {
      timers.push(
        setTimeout(() => {
          if (!alive) return;
          step = i;
          setActive(step);
          if (i === STAGES.length - 1) setWalked(true);
        }, i * 550),
      );
    }
    if (STAGES.length <= 1) setWalked(true);
    else {
      timers.push(
        setTimeout(() => {
          if (alive) setWalked(true);
        }, STAGES.length * 550),
      );
    }
    return () => {
      alive = false;
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <div className={classes.visual} data-walked={walked}>
      <p className={classes.readout}>
        <span className={classes.readoutName}>oasis.dev journey</span>
        <span className={classes.readoutState}>
          <span className={classes.stateDot} aria-hidden="true" />
          {walked ? "resting" : "walking"}
        </span>
      </p>

      <ol className={classes.stages} aria-label="How we work, six stages">
        {STAGES.map((stage, i) => (
          <li key={stage.id} className={classes.stageItem}>
            <button
              type="button"
              className={classes.stage}
              data-active={i === active}
              aria-current={i === active ? "step" : undefined}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-label={`Stage ${stage.index}: ${stage.label}. ${stage.text}`}
            >
              <span className={classes.blob} aria-hidden="true">
                <span className={classes.blobIcon}>{stage.icon}</span>
              </span>
              <span className={classes.stageText}>
                <span className={classes.stageIndex} aria-hidden="true">
                  {stage.index}
                </span>
                <span className={classes.stageLabel}>{stage.label}</span>
                <span className={classes.stageLine}>{stage.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <p className={classes.hint} aria-hidden="true">
        Hover or tap a stage to step through.
      </p>
    </div>
  );
}
