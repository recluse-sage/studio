/* Variant B, Solid State. Six solid pucks in a shallow chip tray. Satin.
   One puck per stage, one to one. Reads as memory cells or Go stones:
   technical without sci-fi. Ledger: 6 pucks plus tray (floor, rim, front)
   throughout. Upright flips, glaze marks, and one nested rim reveal that
   slides up from behind the front wall. It was nested, not new.
   Tech read held with engineering proportions (puck width to height about
   2.6 to 1), tight registration, restrained palette, dry etched marks.
   Never icons, never glow. The etched mark doubles as the glaze of colour:
   the current puck carries the single accent job, thin strokes only.
   No literal colours: every fill, stroke, and stop resolves to a hero token. */

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { clampStage } from "../stages";
import type { SceneProps } from "../types";
import classes from "./SolidStateScene.module.css";

type Puck = {
  key: string;
  x: number;
  y: number;
  rotation: number;
  squash: number;
  mark: string;
};

const PUCKS: Puck[] = [
  { key: "p1", x: 170, y: 286, rotation: -14, squash: 0.55, mark: "M -7 -26 m -7 0 a 7 7 0 1 0 14 0 a 7 7 0 1 0 -14 0" },
  { key: "p2", x: 225, y: 292, rotation: 9, squash: 0.55, mark: "M -6 -32 h 12 v 12 h -12 Z" },
  { key: "p3", x: 280, y: 290, rotation: -7, squash: 0.55, mark: "M 0 -34 L 7 -20 L -7 -20 Z" },
  { key: "p4", x: 200, y: 272, rotation: 18, squash: 0.55, mark: "M -6 -26 h 12 M 0 -32 v 12" },
  { key: "p5", x: 262, y: 270, rotation: -20, squash: 0.55, mark: "M -9 -26 h 18 M 0 -26 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0" },
  { key: "p6", x: 315, y: 276, rotation: 68, squash: 1, mark: "M -7 -23 A 8 8 0 0 1 7 -23" },
];

/* Back row draws first so the front row overlaps it at rest. */
const BACK = ["p4", "p5", "p6"];
const FRONT = ["p1", "p2", "p3"];

const BY_KEY: Record<string, Puck> = {
  p1: PUCKS[0] as Puck,
  p2: PUCKS[1] as Puck,
  p3: PUCKS[2] as Puck,
  p4: PUCKS[3] as Puck,
  p5: PUCKS[4] as Puck,
  p6: PUCKS[5] as Puck,
};

export default function SolidStateScene({ stage, reducedMotion, onSettled }: SceneProps) {
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
      const tl = gsap.timeline({ paused: true, defaults: { duration: 0.75, ease: "expo.out" } });
      tl.addLabel("0", 0);
      /* 01 Problem to 02 Talk: pucks 1 and 2 rise slightly and tilt toward
         each other. Still grey, still low. */
      tl.to(".s-p1", { y: 274, rotation: -6, duration: 0.6 }, 0.05);
      tl.to(".s-p2", { y: 280, rotation: 4, duration: 0.6 }, 0.1);
      tl.addLabel("1", 0.9);
      /* 02 Talk to 03 Solution: puck 3 flips upright with the first glaze of
         colour, seating with a tightening shadow. */
      tl.to(".s-p3", { y: 272, rotation: 0, scaleY: 1, duration: 0.75 }, 1.0);
      tl.to(".s-m3", { opacity: 1, duration: 0.5 }, 1.35);
      tl.addLabel("2", 2.0);
      /* 03 Solution to 04 Build: pucks 4 and 5 stand in sequence, heights
         staggered into a short bar rhythm, marks etched as each stands. */
      tl.to(".s-p4", { x: 196, y: 258, rotation: 0, scaleY: 1, duration: 0.75 }, 2.1);
      tl.to(".s-m4", { opacity: 1, duration: 0.5 }, 2.45);
      tl.to(".s-p5", { x: 264, y: 266, rotation: 0, scaleY: 1, duration: 0.75 }, 2.3);
      tl.to(".s-m5", { opacity: 1, duration: 0.5 }, 2.65);
      tl.addLabel("3", 3.2);
      /* 04 Build to 05 Ship: the tray rim seats up from its nested position,
         every puck glides to its slot and settles even, fully glazed. */
      tl.to(".s-rim", { y: 0, duration: 0.7 }, 3.3);
      tl.to(".s-p1", { x: 176, y: 292, rotation: 0, scaleY: 1, duration: 0.7 }, 3.35);
      tl.to(".s-p2", { x: 240, y: 296, rotation: 0, scaleY: 1, duration: 0.7 }, 3.4);
      tl.to(".s-p4", { x: 200, y: 264, duration: 0.6 }, 3.45);
      tl.to(".s-p5", { x: 262, y: 266, duration: 0.6 }, 3.45);
      tl.to(".s-p6", { x: 316, y: 264, rotation: 0, duration: 0.7 }, 3.5);
      tl.to(".s-m1", { opacity: 1, duration: 0.4 }, 3.8);
      tl.to(".s-m2", { opacity: 1, duration: 0.4 }, 3.85);
      tl.addLabel("4", 4.4);
      /* 05 Ship to 06 Use and share: puck 3 takes its front slot, the last
         mark etches in, six upright, even, glazed. */
      tl.to(".s-p3", { x: 304, y: 292, duration: 0.7 }, 4.5);
      tl.to(".s-m6", { opacity: 1, duration: 0.5 }, 4.75);
      tl.to(".s-ground", { scaleX: 0.95, duration: 0.5 }, 4.8);
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

  const puck = (item: Puck) => (
    <g
      key={item.key}
      className={`s-${item.key} mv`}
      transform={`translate(${item.x} ${item.y}) rotate(${item.rotation}) scale(1 ${item.squash})`}
    >
      <rect x="-34" y="-26" width="68" height="26" rx="9" style={{ fill: "url(#solid-body)", fillOpacity: "var(--hero-fill-alpha)" }} />
      <ellipse cx="0" cy="-26" rx="34" ry="10" style={{ fill: "url(#solid-top)", fillOpacity: "var(--hero-fill-alpha)" }} />
      <ellipse cx="-12" cy="-29" rx="10" ry="3" style={{ fill: "var(--hero-gloss-hi)", opacity: "var(--hero-hi-tight)" }} />
      <path d={item.mark} opacity={0} className={`s-m${item.key.slice(1)}`} style={{ fill: "none", stroke: "var(--hero-accent)", strokeWidth: 2.5 }} />
    </g>
  );

  return (
    <svg
      ref={rootRef}
      viewBox="0 0 480 360"
      className={classes.scene}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="solid-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--hero-body-hi)" }} />
          <stop offset="55%" style={{ stopColor: "var(--hero-body)" }} />
          <stop offset="100%" style={{ stopColor: "var(--hero-body-deep)" }} />
        </linearGradient>
        <radialGradient id="solid-top" cx="38%" cy="32%" r="75%">
          <stop offset="0%" style={{ stopColor: "var(--hero-top)" }} />
          <stop offset="55%" style={{ stopColor: "var(--hero-body)" }} />
          <stop offset="100%" style={{ stopColor: "var(--hero-body-2)" }} />
        </radialGradient>
        <linearGradient id="solid-tray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--hero-body-2)" }} />
          <stop offset="100%" style={{ stopColor: "var(--hero-body-deep)" }} />
        </linearGradient>
        <radialGradient id="solid-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: "var(--hero-shadow)" }} stopOpacity={0.55} />
          <stop offset="70%" style={{ stopColor: "var(--hero-shadow)" }} stopOpacity={0.22} />
          <stop offset="100%" style={{ stopColor: "var(--hero-shadow)" }} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="solid-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" style={{ stopColor: "var(--hero-gloss-hi)" }} stopOpacity={0} />
          <stop offset="50%" style={{ stopColor: "var(--hero-gloss-hi)" }} stopOpacity={0.8} />
          <stop offset="100%" style={{ stopColor: "var(--hero-gloss-hi)" }} stopOpacity={0} />
        </linearGradient>
        <clipPath id="solid-clip">
          <rect x="124" y="284" width="232" height="30" rx="10" />
        </clipPath>
      </defs>

      <g className={classes.drift}>
        <g className="s-ground">
          <ellipse cx="240" cy="322" rx="140" ry="13" style={{ fill: "url(#solid-shadow)", opacity: "var(--hero-shadow-a)" }} />
        </g>

        <polygon points="104,238 376,238 340,290 140,290" style={{ fill: "var(--hero-body)", fillOpacity: "var(--hero-fill-alpha)" }} />
        <polygon points="120,244 360,244 332,282 148,282" style={{ fill: "var(--hero-body-2)", fillOpacity: "var(--hero-fill-alpha)", opacity: 0.6 }} />

        <g className="s-rim mv" transform="translate(0 30)">
          <polygon points="132,258 348,258 328,282 152,282" style={{ fill: "var(--hero-top)", fillOpacity: "var(--hero-fill-alpha)" }} />
        </g>

        {BACK.map((key) => puck(BY_KEY[key] as Puck))}
        {FRONT.map((key) => puck(BY_KEY[key] as Puck))}

        <g clipPath="url(#solid-clip)">
          <rect x="124" y="284" width="232" height="30" rx="10" style={{ fill: "url(#solid-tray)", fillOpacity: "var(--hero-fill-alpha)" }} />
          <g className={classes.idleSweep} style={{ opacity: "var(--hero-sheen)" }}>
            <rect x="-90" y="282" width="90" height="34" style={{ fill: "url(#solid-sheen)" }} />
          </g>
          <rect x="132" y="287" width="216" height="4" rx="2" style={{ fill: "var(--hero-gloss-hi)", opacity: "var(--hero-edge)" }} />
        </g>
      </g>
    </svg>
  );
}
