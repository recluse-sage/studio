import { useEffect, useState } from "react";
import {
  ChatCircle,
  CheckCircle,
  Crosshair,
  PaperPlaneTilt,
  ShareNetwork,
  Wrench,
} from "@phosphor-icons/react";
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
    Icon: Crosshair,
  },
  {
    id: "talk",
    index: "02",
    label: "Talk",
    text: "We talk it through.",
    Icon: ChatCircle,
  },
  {
    id: "solution",
    index: "03",
    label: "Solution",
    text: "We find the fit.",
    Icon: CheckCircle,
  },
  {
    id: "build",
    index: "04",
    label: "Build",
    text: "We build it.",
    Icon: Wrench,
  },
  {
    id: "ship",
    index: "05",
    label: "Ship",
    text: "We ship it to you.",
    Icon: PaperPlaneTilt,
  },
  {
    id: "use-share",
    index: "06",
    label: "Use and share",
    text: "You use it and share it.",
    Icon: ShareNetwork,
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
                <span className={classes.blobIcon}>
                  <stage.Icon weight="thin" focusable="false" />
                </span>
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
