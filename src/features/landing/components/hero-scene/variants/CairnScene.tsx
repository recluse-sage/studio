/* Variant A, Cairn. Six river stones, a round plinth, a coiled cord. Matte.
   Stacking is the progress language: six stones for six stages, nothing left
   over. Ledger: 6 stones plus plinth plus cord throughout. Positions and
   rotations only, plus the same cord restraightened around the waist at ship.
   Nothing appears, nothing vanishes. Shadows tighten on contact, and the
   capstone lands with a short overshoot so nothing floats.
   Static node count sits near 20 simple ellipses (gloss dots included so the
   independent material switch reads on this variant too). Only 2 to 3 nodes
   move per transition, which is what keeps paint cost flat. Matte is native
   here; gloss dots rest at zero opacity unless the material switch calls them.
   The single accent job is the binding cord. No literal colours: every fill,
   stroke, and stop resolves to a hero token. */

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { clampStage } from "../stages";
import type { SceneProps } from "../types";
import classes from "./CairnScene.module.css";

type Stone = {
  key: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotation: number;
  shadow: boolean;
};

const STONES: Stone[] = [
  { key: "s1", x: 148, y: 286, rx: 34, ry: 19, rotation: -12, shadow: false },
  { key: "s2", x: 204, y: 294, rx: 30, ry: 17, rotation: 8, shadow: false },
  { key: "s3", x: 262, y: 292, rx: 32, ry: 18, rotation: -6, shadow: false },
  { key: "s4", x: 318, y: 286, rx: 29, ry: 17, rotation: 14, shadow: true },
  { key: "s5", x: 178, y: 268, rx: 25, ry: 15, rotation: 22, shadow: true },
  { key: "s6", x: 298, y: 266, rx: 23, ry: 14, rotation: -16, shadow: true },
];

export default function CairnScene({ stage, reducedMotion, onSettled }: SceneProps) {
  const rootRef = useRef<SVGSVGElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;

  /* One paused timeline with labels 0 to 5. The parent seeks by label, so
     autoplay and hover scrubbing share this playhead. Server markup already
     shows stage 0, so after building we land on the live stage directly. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { duration: 0.75, ease: "expo.out" } });
      tl.addLabel("0", 0);
      /* 01 Problem to 02 Talk: two stones nudge together. Nothing else moves. */
      tl.to(".c-s1", { x: 158, y: 284, rotation: -16, duration: 0.6 }, 0.05);
      tl.to(".c-s2", { x: 196, y: 290, rotation: 12, duration: 0.6 }, 0.1);
      tl.addLabel("1", 0.9);
      /* 02 Talk to 03 Solution: three stones lock into a tripod base on the
         plinth. The cord uncoils slightly, a delayed settle after the hero. */
      tl.to(".c-s1", { x: 198, y: 248, rotation: -8 }, 1.0);
      tl.to(".c-s2", { x: 240, y: 244, rotation: 4 }, 1.05);
      tl.to(".c-s3", { x: 282, y: 248, rotation: -5 }, 1.1);
      tl.to(".c-cord", { x: 150, y: 296, rotation: 18, duration: 0.6 }, 1.15);
      tl.addLabel("2", 2.0);
      /* 03 Solution to 04 Build: stones 4 and 5 placed in sequence, lean
         corrected on placement, shadows tightening just behind each seat. */
      tl.to(".c-s4", { x: 219, y: 214, rotation: 10 }, 2.1);
      tl.to(".c-s4sh", { opacity: 0.32, scaleX: 0.82, duration: 0.5 }, 2.25);
      tl.to(".c-s5", { x: 261, y: 214, rotation: -10 }, 2.3);
      tl.to(".c-s5sh", { opacity: 0.32, scaleX: 0.82, duration: 0.5 }, 2.45);
      tl.addLabel("3", 3.2);
      /* 04 Build to 05 Ship: the same cord travels to the waist and flattens
         into a binding loop, the plinth seats, the base settles with it. */
      tl.to(".c-cord", { x: 240, y: 230, rotation: 0, duration: 0.7 }, 3.3);
      tl.to(".c-cordScale", { scaleX: 1.9, scaleY: 0.55, duration: 0.7 }, 3.3);
      tl.to(".c-plinth", { y: 3, duration: 0.4 }, 3.4);
      tl.to(".c-s1", { x: 198, y: 251, duration: 0.4 }, 3.4);
      tl.to(".c-s2", { x: 240, y: 247, duration: 0.4 }, 3.4);
      tl.to(".c-s3", { x: 282, y: 251, duration: 0.4 }, 3.4);
      tl.addLabel("4", 4.2);
      /* 05 Ship to 06 Use and share: the capstone lifts over the tower and
         drops with a short overshoot while the ground shadow tightens. */
      tl.to(".c-s6", { x: 240, y: 150, rotation: 2, duration: 0.5 }, 4.3);
      tl.to(".c-s6", { y: 184, rotation: 6, duration: 0.55, ease: "back.out(1.6)" }, 4.8);
      tl.to(".c-s6sh", { opacity: 0.34, scaleX: 0.8, duration: 0.4 }, 4.9);
      tl.to(".c-ground", { scaleX: 0.94, duration: 0.5 }, 4.9);
      tl.addLabel("5", 5.6);

      timelineRef.current = tl;
      tl.seek(String(clampStage(stageRef.current)));
    }, root);
    return () => {
      ctx.revert();
      timelineRef.current = null;
    };
  }, []);

  /* Stage drive. Latest wins with overwrite, so fast scrubbing never queues.
     Reduced motion cuts instantly with no tween. */
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

  return (
    <svg
      ref={rootRef}
      viewBox="0 0 480 360"
      className={classes.scene}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="cairn-stone" cx="35%" cy="30%" r="70%">
          <stop offset="0%" style={{ stopColor: "var(--hero-body-hi)" }} />
          <stop offset="45%" style={{ stopColor: "var(--hero-body)" }} />
          <stop offset="100%" style={{ stopColor: "var(--hero-body-deep)" }} />
        </radialGradient>
        <radialGradient id="cairn-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: "var(--hero-shadow)" }} stopOpacity={0.55} />
          <stop offset="70%" style={{ stopColor: "var(--hero-shadow)" }} stopOpacity={0.22} />
          <stop offset="100%" style={{ stopColor: "var(--hero-shadow)" }} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="cairn-plinth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--hero-body-2)" }} />
          <stop offset="100%" style={{ stopColor: "var(--hero-body-deep)" }} />
        </linearGradient>
      </defs>

      <g className={classes.drift}>
        <g className="c-ground">
          <ellipse cx="240" cy="308" rx="132" ry="15" style={{ fill: "url(#cairn-shadow)", opacity: "var(--hero-shadow-a)" }} />
        </g>

        <g className="c-plinth mv">
          <rect x="152" y="264" width="176" height="24" rx="8" style={{ fill: "url(#cairn-plinth)", fillOpacity: "var(--hero-fill-alpha)" }} />
          <ellipse cx="240" cy="264" rx="88" ry="19" style={{ fill: "var(--hero-body)", fillOpacity: "var(--hero-fill-alpha)" }} />
          <ellipse cx="240" cy="261" rx="70" ry="12" style={{ fill: "var(--hero-top)", opacity: "var(--hero-hi-broad)" }} />
        </g>

        {STONES.map((stone) =>
          stone.key === "s6" ? (
            <g key={stone.key} className="c-s6 mv" transform={`translate(${stone.x} ${stone.y}) rotate(${stone.rotation})`}>
              <ellipse className="c-s6sh" cx="0" cy={stone.ry + 5} rx={stone.rx * 0.9} ry="6" opacity={0.18} style={{ fill: "var(--hero-shadow)" }} />
              <g className={classes.idleBob}>
                <ellipse cx="0" cy="0" rx={stone.rx} ry={stone.ry} style={{ fill: "url(#cairn-stone)", fillOpacity: "var(--hero-fill-alpha)" }} />
                <ellipse cx={-stone.rx * 0.22} cy={-stone.ry * 0.35} rx={stone.rx * 0.28} ry={stone.ry * 0.3} style={{ fill: "var(--hero-gloss-hi)", opacity: "var(--hero-hi-tight)" }} />
              </g>
            </g>
          ) : (
            <g key={stone.key} className={`c-${stone.key} mv`} transform={`translate(${stone.x} ${stone.y}) rotate(${stone.rotation})`}>
              {stone.shadow ? (
                <ellipse className={`c-${stone.key}sh`} cx="0" cy={stone.ry + 5} rx={stone.rx * 0.9} ry="6" opacity={0.18} style={{ fill: "var(--hero-shadow)" }} />
              ) : null}
              <ellipse cx="0" cy="0" rx={stone.rx} ry={stone.ry} style={{ fill: "url(#cairn-stone)", fillOpacity: "var(--hero-fill-alpha)" }} />
              <ellipse cx={-stone.rx * 0.22} cy={-stone.ry * 0.35} rx={stone.rx * 0.28} ry={stone.ry * 0.3} style={{ fill: "var(--hero-gloss-hi)", opacity: "var(--hero-hi-tight)" }} />
            </g>
          ),
        )}

        <g className="c-cord mv" transform="translate(120 304)">
          <g className="c-cordScale">
            <ellipse cx="0" cy="0" rx="24" ry="9" vectorEffect="non-scaling-stroke" style={{ fill: "none", stroke: "var(--hero-accent)", strokeWidth: 3 }} />
            <ellipse cx="0" cy="0" rx="13" ry="5" vectorEffect="non-scaling-stroke" style={{ fill: "none", stroke: "var(--hero-accent)", strokeWidth: 3 }} />
          </g>
        </g>
      </g>
    </svg>
  );
}
