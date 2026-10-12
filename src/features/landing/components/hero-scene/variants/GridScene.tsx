/* Variant C, Grid. A flat nine cell grid wearing a cube costume, honestly.
   The cube metaphor breaks from a fixed camera (only three faces visible, and
   a solve completes too early), so this is a progress grid: the centre cell
   lights for the problem, then one sticker lights per stage until six are lit
   and three stay neutral. Built face on, because a 3 by 3 in perspective needs
   hand authored occlusion per turn and this does not. Fill and flip only.
   Matte kills the recognition, so this variant is natively glossy: tight
   highlights, edge light, diagonal gloss wash. The accent discipline holds by
   construction: lit cells take a soft wash, and exactly one travelling core
   carries full accent to the current stage. The three neutral cells take the
   tertiary tone at stage 6 only. No literal colours: every fill and stop
   resolves to a hero token. */

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { clampStage } from "../stages";
import type { SceneProps } from "../types";
import classes from "./GridScene.module.css";

const CELL = 76;
const GAP = 10;
const X0 = 116;
const Y0 = 56;

type Cell = { index: number; x: number; y: number; cx: number; cy: number };

const CELLS: Cell[] = Array.from({ length: 9 }, (_, index) => {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const x = X0 + col * (CELL + GAP);
  const y = Y0 + row * (CELL + GAP);
  return { index, x, y, cx: x + CELL / 2, cy: y + CELL / 2 };
});

/* Light order: centre first (the problem, named), then a spiral to top middle
   (use and share, facing outward). Cells 3, 5, 7 stay neutral. */
const LIGHT_ORDER = [4, 0, 2, 8, 6, 1];
const NEUTRAL = [3, 5, 7];

function flipSegment(tl: gsap.core.Timeline, cell: number, at: number): void {
  tl.to(`.g-cell${cell}`, { scaleY: 0, duration: 0.18, ease: "power2.in" }, at);
  tl.to(`.g-wash${cell}`, { opacity: 0.9, duration: 0.2 }, at + 0.14);
  tl.to(`.g-cell${cell}`, { scaleY: 1, duration: 0.22, ease: "power2.out" }, at + 0.18);
}

export default function GridScene({ stage, reducedMotion, onSettled }: SceneProps) {
  const rootRef = useRef<SVGSVGElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { duration: 0.6, ease: "expo.out" } });
      const core = (cell: number) => {
        const found = CELLS[cell] ?? CELLS[4];
        return { x: (found as Cell).cx, y: (found as Cell).cy };
      };
      tl.addLabel("0", 0);
      /* Stage 0 already shows the centre cell lit with the core on it. */
      /* 01 Problem to 02 Talk: first corner flips, core travels. */
      flipSegment(tl, 0, 0.1);
      tl.to(".g-core", { ...core(0) }, 0.1);
      tl.addLabel("1", 1.0);
      /* 02 Talk to 03 Solution. */
      flipSegment(tl, 2, 1.1);
      tl.to(".g-core", { ...core(2) }, 1.1);
      tl.addLabel("2", 2.0);
      /* 03 Solution to 04 Build. */
      flipSegment(tl, 8, 2.1);
      tl.to(".g-core", { ...core(8) }, 2.1);
      tl.addLabel("3", 3.0);
      /* 04 Build to 05 Ship. */
      flipSegment(tl, 6, 3.1);
      tl.to(".g-core", { ...core(6) }, 3.1);
      tl.addLabel("4", 4.0);
      /* 05 Ship to 06 Use and share: last cell flips, the three neutral
         cells take the tertiary tone, the ground shadow tightens. */
      flipSegment(tl, 1, 4.1);
      tl.to(".g-core", { ...core(1) }, 4.1);
      tl.to(".g-tert", { opacity: 0.85, duration: 0.5 }, 4.6);
      tl.to(".g-ground", { scaleX: 0.94, duration: 0.5 }, 4.7);
      tl.addLabel("5", 5.6);

      timelineRef.current = tl;
      tl.seek(String(clampStage(stageRef.current)));
    }, root);
    return () => {
      ctx.revert();
      timelineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const tl = timelineRef.current;
    const finish = () => {
      root?.removeAttribute("data-tweening");
      settledRef.current?.();
    };
    if (!tl) return;
    if (reducedMotion) {
      tl.seek(String(clampStage(stage)));
      finish();
      return;
    }
    root?.setAttribute("data-tweening", "1");
    const tween = tl.tweenTo(String(clampStage(stage)), {
      duration: 0.5,
      ease: "power2.inOut",
      overwrite: true,
      onComplete: finish,
      onInterrupt: () => root?.removeAttribute("data-tweening"),
    });
    return () => {
      tween.kill();
    };
  }, [stage, reducedMotion]);

  const centre = CELLS[4] as Cell;

  return (
    <svg
      ref={rootRef}
      viewBox="0 0 480 360"
      className={classes.scene}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="grid-frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--hero-body-2)" }} />
          <stop offset="100%" style={{ stopColor: "var(--hero-body-deep)" }} />
        </linearGradient>
        <linearGradient id="grid-cell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--hero-body-hi)" }} />
          <stop offset="100%" style={{ stopColor: "var(--hero-body)" }} />
        </linearGradient>
        <linearGradient id="grid-lit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--hero-accent-soft)" }} />
          <stop offset="100%" style={{ stopColor: "var(--hero-accent)" }} />
        </linearGradient>
        <linearGradient id="grid-tert" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--hero-tertiary)" }} />
          <stop offset="100%" style={{ stopColor: "var(--hero-tertiary-deep)" }} />
        </linearGradient>
        <linearGradient id="grid-gloss" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--hero-gloss-hi)" }} stopOpacity={0.55} />
          <stop offset="45%" style={{ stopColor: "var(--hero-gloss-hi)" }} stopOpacity={0.12} />
          <stop offset="70%" style={{ stopColor: "var(--hero-gloss-hi)" }} stopOpacity={0} />
        </linearGradient>
        <radialGradient id="grid-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: "var(--hero-shadow)" }} stopOpacity={0.55} />
          <stop offset="70%" style={{ stopColor: "var(--hero-shadow)" }} stopOpacity={0.22} />
          <stop offset="100%" style={{ stopColor: "var(--hero-shadow)" }} stopOpacity={0} />
        </radialGradient>
      </defs>

      <g className={classes.drift}>
        <g className="g-ground">
          <ellipse cx="240" cy="330" rx="150" ry="13" style={{ fill: "url(#grid-shadow)", opacity: "var(--hero-shadow-a)" }} />
        </g>

        <rect x="102" y="42" width="276" height="276" rx="22" style={{ fill: "url(#grid-frame)", fillOpacity: "var(--hero-fill-alpha)" }} />
        <rect x="112" y="50" width="256" height="6" rx="3" style={{ fill: "var(--hero-gloss-hi)", opacity: "var(--hero-edge)" }} />

        {CELLS.map((cell) => (
          <g key={cell.index} className={`g-cell${cell.index} mv`}>
            <rect x={cell.x} y={cell.y} width={CELL} height={CELL} rx="16" style={{ fill: "url(#grid-cell)", fillOpacity: "var(--hero-fill-alpha)" }} />
            {LIGHT_ORDER.includes(cell.index) ? (
              <rect
                x={cell.x}
                y={cell.y}
                width={CELL}
                height={CELL}
                rx="16"
                className={`g-wash${cell.index}`}
                opacity={cell.index === 4 ? 0.9 : 0}
                style={{ fill: "url(#grid-lit)" }}
              />
            ) : null}
            {NEUTRAL.includes(cell.index) ? (
              <rect x={cell.x} y={cell.y} width={CELL} height={CELL} rx="16" className="g-tert" opacity={0} style={{ fill: "url(#grid-tert)" }} />
            ) : null}
          </g>
        ))}

        <g className="g-core mv" transform={`translate(${centre.cx} ${centre.cy})`}>
          <g className={classes.idleBob}>
            <rect x="-15" y="-15" width="30" height="30" rx="9" style={{ fill: "var(--hero-accent)" }} />
            <rect x="-9" y="-11" width="12" height="5" rx="2.5" style={{ fill: "var(--hero-gloss-hi)", opacity: "var(--hero-hi-tight)" }} />
          </g>
        </g>

        <polygon points="102,42 250,42 150,318 102,318" style={{ fill: "url(#grid-gloss)", opacity: "var(--hero-gloss)", pointerEvents: "none" }} />
      </g>
    </svg>
  );
}
