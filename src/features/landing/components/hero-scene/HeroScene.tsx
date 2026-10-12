/* Hero scene parent. The single owner of state per docs/hero-architecture.md §3.2.
   One useReducer holds stage, mode, and viewport pause. One effect owns the
   autoplay timer. Scene modules receive stage and render it; they own no timer,
   no observer, and no autoplay logic, so every variant is driven identically.
   Stage copy is a tablist per §8: each tab reveals its own panel. Autoplay
   walks once, then rests on stage 6. The first hover or focus ends autoplay
   permanently and never resumes it. Reduced motion shows stage 6 with instant
   stepping and no autoplay. On narrow or coarse pointer viewports the scene is
   scroll driven (monotonic, never replays on scroll back) instead of hover
   driven. Concept and material come from the popup and sync to the page
   address so a combination can be shared as a link. */

import { Suspense, lazy, useCallback, useEffect, useId, useMemo, useReducer, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { STAGES, clampStage } from "./stages";
import { registryEntry } from "./registry";
import { isMaterialId, isVariantId } from "./types";
import type { MaterialId, VariantId } from "./types";
import { SceneFirstPaint } from "./SceneFirstPaint";
/* TEMP-SCAFFOLD-IMPORT (§13.3): delete with ScenePopup.* on removal. */
import { ScenePopup } from "./ScenePopup";
import classes from "./HeroScene.module.css";

const AUTOPLAY_MS = 1500;
const ARIA_DEBOUNCE_MS = 100;
const DEFAULT_VARIANT: VariantId = "cairn";
const DEFAULT_MATERIAL: MaterialId = "matte";
const SCENE_KEY = "oasis.hero.scene";
const MATERIAL_KEY = "oasis.hero.material";

type Mode = "auto" | "scroll" | "rest" | "user";

type SceneState = {
  stage: number;
  mode: Mode;
  paused: boolean;
};

type SceneAction =
  | { type: "mount"; stage: number; mode: Mode }
  | { type: "tick" }
  | { type: "select"; stage: number }
  | { type: "scrollTo"; stage: number }
  | { type: "reset"; stage: number; mode: Mode }
  | { type: "setMode"; mode: Mode }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "control" };

const LAST = STAGES.length - 1;

function reducer(state: SceneState, action: SceneAction): SceneState {
  switch (action.type) {
    case "mount":
      return { stage: clampStage(action.stage), mode: action.mode, paused: false };
    case "tick":
      if (state.mode !== "auto" || state.paused) return state;
      if (state.stage >= LAST) return { ...state, mode: "rest" };
      return { ...state, stage: state.stage + 1 };
    case "select":
      return { stage: clampStage(action.stage), mode: "user", paused: false };
    case "scrollTo":
      if (state.mode !== "scroll" || state.paused) return state;
      if (action.stage <= state.stage) return state;
      return { ...state, stage: clampStage(action.stage) };
    case "reset":
      return { stage: clampStage(action.stage), mode: action.mode, paused: false };
    case "setMode":
      if (state.mode === "user" || state.mode === "rest") return state;
      return { ...state, mode: action.mode };
    case "pause":
      return state.paused ? state : { ...state, paused: true };
    case "resume":
      return state.paused ? { ...state, paused: false } : state;
    case "control":
      if (state.mode === "user" || state.mode === "rest") return state;
      return { ...state, mode: "user" };
    default:
      return state;
  }
}

function readStored(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Storage unavailable. The URL still carries the choice. */
  }
}

export function HeroScene() {
  const [state, dispatch] = useReducer(reducer, { stage: 0, mode: "auto" as Mode, paused: false });
  const [variant, setVariant] = useState<VariantId>(DEFAULT_VARIANT);
  const [material, setMaterial] = useState<MaterialId>(DEFAULT_MATERIAL);
  const [reduced, setReduced] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [announced, setAnnounced] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const stageRef = useRef(0);
  stageRef.current = state.stage;
  const uid = useId();

  /* Mount: read environment, address bar, and saved choices. Render output
     stays deterministic for prerender; every browser read lands here. */
  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    const params = new URLSearchParams(window.location.search);
    const urlScene = params.get("scene") ?? "";
    const urlMaterial = params.get("material") ?? "";
    const nextScene = isVariantId(urlScene)
      ? urlScene
      : isVariantId(readStored(SCENE_KEY))
        ? (readStored(SCENE_KEY) as VariantId)
        : DEFAULT_VARIANT;
    const nextMaterial = isMaterialId(urlMaterial)
      ? urlMaterial
      : isMaterialId(readStored(MATERIAL_KEY))
        ? (readStored(MATERIAL_KEY) as MaterialId)
        : DEFAULT_MATERIAL;
    const isReduced = motionQuery.matches;
    const isMobile = mobileQuery.matches;
    setVariant(nextScene);
    setMaterial(nextMaterial);
    setReduced(isReduced);
    setMobile(isMobile);
    setAnnounced(isReduced ? LAST : 0);
    dispatch({
      type: "mount",
      stage: isReduced ? LAST : 0,
      mode: isReduced ? "rest" : isMobile ? "scroll" : "auto",
    });

    const onMotion = (event: MediaQueryListEvent) => {
      setReduced(event.matches);
      /* A changed motion preference resets the walk rather than leaving a
         half walked timeline in the wrong mode. */
      if (event.matches) {
        setAnnounced(LAST);
        dispatch({ type: "reset", stage: LAST, mode: "rest" });
      } else {
        setAnnounced(0);
        dispatch({
          type: "reset",
          stage: 0,
          mode: window.matchMedia("(max-width: 767px), (pointer: coarse)").matches ? "scroll" : "auto",
        });
      }
    };
    const onMobile = (event: MediaQueryListEvent) => {
      setMobile(event.matches);
      dispatch({ type: "setMode", mode: event.matches ? "scroll" : "auto" });
    };
    motionQuery.addEventListener("change", onMotion);
    mobileQuery.addEventListener("change", onMobile);
    return () => {
      motionQuery.removeEventListener("change", onMotion);
      mobileQuery.removeEventListener("change", onMobile);
    };
  }, []);

  /* Autoplay timer. Single owner: one timeout per stage, cleared on every
     change. Walks once to stage 6, then the reducer parks in rest. */
  useEffect(() => {
    if (state.mode !== "auto" || state.paused || reduced) return;
    const timer = window.setTimeout(() => dispatch({ type: "tick" }), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [state.mode, state.stage, state.paused, reduced]);

  /* Viewport pause. Threshold 0.3: never 1, since a hero taller than the
     viewport would never reach ratio 1 and the callback would never fire.
     Pause clears the timer; the short settle tween (under 500ms) is allowed
     to land so state stays truthful on return. */
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        dispatch({ type: entry.isIntersecting ? "resume" : "pause" });
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* Mobile scroll drive. A distinct branch from hover: ScrollTrigger advances
     the shared stage only forward, so scrolling back stays where it is instead
     of replaying. ScrollTrigger loads only here, never on desktop. The trigger
     is dropped and rebuilt on variant switch with the effect cleanup. */
  useEffect(() => {
    if (!mobile || reduced || state.mode !== "scroll") return;
    const el = cardRef.current;
    if (!el) return;
    let alive = true;
    let trigger: { kill: () => void } | null = null;
    void (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (!alive) return;
      gsap.registerPlugin(ScrollTrigger);
      trigger = ScrollTrigger.create({
        trigger: el,
        start: "top 78%",
        end: "bottom 32%",
        onUpdate: (self) => {
          const target = Math.min(LAST, Math.floor(self.progress * STAGES.length));
          if (target > stageRef.current) dispatch({ type: "scrollTo", stage: target });
        },
      });
    })();
    return () => {
      alive = false;
      trigger?.kill();
    };
  }, [mobile, reduced, state.mode, variant]);

  /* Screen reader announcements trail the visual seek by a short delay so fast
     scrubbing does not queue stale stage names. The scene itself seeks
     immediately; only this commit is debounced. */
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnounced(state.stage), ARIA_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [state.stage]);

  /* Address bar and saved choices. Concept and material stay shareable as a
     link and survive navigation. Replace, never push: stepping stages must
     not fill history. */
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("scene", variant);
      url.searchParams.set("material", material);
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* Non http contexts. Storage below still applies. */
    }
    writeStored(SCENE_KEY, variant);
    writeStored(MATERIAL_KEY, material);
  }, [variant, material]);

  const handleSettled = useCallback(() => {
    setAnnounced(stageRef.current);
  }, []);

  const takeControl = useCallback(() => {
    dispatch({ type: "control" });
  }, []);

  const selectStage = useCallback((index: number) => {
    dispatch({ type: "select", stage: index });
  }, []);

  /* Variant switch: reset to stage 0 and walk fresh, cut to rest when motion
     is reduced. Unmounting the old scene kills its tweens; the scroll effect
     above rebuilds for the new one. Leaked state would read as a broken
     concept, so the reset is explicit. */
  const handleVariant = useCallback(
    (next: VariantId) => {
      setVariant(next);
      setAnnounced(reduced ? LAST : 0);
      dispatch({
        type: "reset",
        stage: reduced ? LAST : 0,
        mode: reduced ? "rest" : mobile ? "scroll" : "auto",
      });
    },
    [mobile, reduced],
  );

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }
    event.preventDefault();
    let next = state.stage;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (state.stage + 1) % STAGES.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (state.stage - 1 + STAGES.length) % STAGES.length;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = LAST;
    dispatch({ type: "select", stage: next });
    tabRefs.current[next]?.focus();
  };

  const entry = registryEntry(variant);
  const ActiveScene = useMemo(() => lazy(entry.load), [entry]);
  const current = STAGES[state.stage] ?? STAGES[0];
  const resting = state.mode === "rest" || state.mode === "user";
  const motionWord = reduced
    ? "motion off"
    : state.paused
      ? "paused"
      : state.mode === "auto"
        ? "walking"
        : state.mode === "scroll"
          ? "scroll"
          : "resting";

  return (
    <div
      ref={cardRef}
      className={classes.heroScene}
      data-hero-material={material}
      onMouseEnter={takeControl}
      onFocusCapture={takeControl}
    >
      <div className={classes.sceneCard}>
        <div className={classes.sceneBox} data-stage={state.stage} data-motion={reduced ? "off" : "on"}>
          <Suspense fallback={<SceneFirstPaint />}>
            <ActiveScene stage={state.stage} reducedMotion={reduced} onSettled={handleSettled} />
          </Suspense>
        </div>
        <p className={classes.readout} aria-hidden="true">
          <span>
            Stage {current?.index} of 06
          </span>
          <span>{current?.label}</span>
          <span>{motionWord}</span>
        </p>
      </div>

      <div className={classes.tabsBlock}>
        <div
          role="tablist"
          aria-label="How we work, six stages"
          className={classes.tablist}
          onKeyDown={onTabKeyDown}
        >
          {STAGES.map((item, index) => (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${index}`}
              aria-selected={index === state.stage}
              aria-controls={`${uid}-panel-${index}`}
              tabIndex={index === state.stage ? 0 : -1}
              data-active={index === state.stage}
              className={classes.tab}
              onClick={() => selectStage(index)}
              onMouseEnter={() => selectStage(index)}
              onFocus={() => selectStage(index)}
            >
              <span className={classes.tabIndex} aria-hidden="true">
                {item.index}
              </span>
              <span className={classes.tabLabel}>{item.label}</span>
            </button>
          ))}
        </div>

        {STAGES.map((item, index) => (
          <div
            key={item.id}
            role="tabpanel"
            id={`${uid}-panel-${index}`}
            aria-labelledby={`${uid}-tab-${index}`}
            hidden={index !== state.stage}
            className={classes.panel}
          >
            <p className={classes.panelKicker}>Stage {item.index} of 06</p>
            <h3 className={classes.panelTitle}>{item.label}</h3>
            <p className={classes.panelLine}>{item.line}</p>
            <p className={classes.panelDetail}>{item.detail}</p>
            <div className={classes.panelNav}>
              <button
                type="button"
                className={classes.stepButton}
                onClick={() => selectStage(index - 1)}
                disabled={index === 0}
              >
                Previous stage
              </button>
              <button
                type="button"
                className={classes.stepButton}
                onClick={() => selectStage(index + 1)}
                disabled={index === LAST}
              >
                Next stage
              </button>
            </div>
          </div>
        ))}

        <p className="oasis-sr-only" aria-live={resting && !state.paused ? "polite" : "off"}>
          Stage {(STAGES[announced] ?? STAGES[0])?.index} of 6: {(STAGES[announced] ?? STAGES[0])?.label}.{" "}
          {(STAGES[announced] ?? STAGES[0])?.line} {motionWord}.
        </p>
      </div>

      {/* TEMP-SCAFFOLD-START (§13.3): delete this block with ScenePopup.* on removal. */}
      <ScenePopup
        variant={variant}
        material={material}
        onVariantChange={handleVariant}
        onMaterialChange={setMaterial}
      />
      {/* TEMP-SCAFFOLD-END */}
    </div>
  );
}
