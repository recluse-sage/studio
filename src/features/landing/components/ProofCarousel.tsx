import { useEffect, useId, useState } from "react";
import type { KeyboardEvent } from "react";
import { SectionHeading } from "../../../components/SectionHeading/SectionHeading";
import { fetchPublicWorkItems, DEFAULT_PUBLIC_WORK_ITEMS_ENDPOINT } from "../api";
import type { WorkItem } from "../types";
import classes from "./ProofCarousel.module.css";

/**
 * One honest public proof carousel. Fed only by GET /api/public/work-items.
 * Approved real proof renders with an Approved badge. Sample concepts render
 * with a visible Sample badge on every slide. When no approved rows exist,
 * an honest empty state shows and the labeled samples follow. Never a
 * fictional client or testimonial. No placeholder names presented as real.
 */

export type ProofCarouselProps = {
  endpoint?: string;
};

type SampleSlide = {
  key: string;
  title: string;
  body: string;
  source: "api" | "concept";
};

/* Built in layout concepts. Clearly concepts, never client work. */
const CONCEPT_SAMPLES: SampleSlide[] = [
  {
    key: "concept-booking",
    title: "Sample concept: booking helper",
    body: "Concept layout for a one task booking helper with confirmations by text. Shows the shape only. Not client work.",
    source: "concept",
  },
  {
    key: "concept-followup",
    title: "Sample concept: quote follow up",
    body: "Concept flow for a simple quote list with one reminder pass each week. Shows the shape only. Not client work.",
    source: "concept",
  },
  {
    key: "concept-hours",
    title: "Sample concept: hours and contact block",
    body: "Concept block with hours, tap to call, and directions in one place. Shows the shape only. Not client work.",
    source: "concept",
  },
];

function useCarousel(count: number) {
  const [index, setIndex] = useState(0);
  const safe = count <= 0 ? 0 : Math.min(index, count - 1);
  function go(next: number) {
    if (count <= 0) return;
    setIndex(((next % count) + count) % count);
  }
  useEffect(() => {
    setIndex(0);
  }, [count]);
  return { index: safe, go };
}

function CarouselFrame({
  label,
  count,
  index,
  onGo,
  children,
}: {
  label: string;
  count: number;
  index: number;
  onGo: (next: number) => void;
  children: React.ReactNode;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onGo(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      onGo(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      onGo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      onGo(count - 1);
    }
  }

  return (
    <div
      className={classes.carousel}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      <div className={classes.viewport}>
        <div
          className={classes.track}
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {children}
        </div>
      </div>
      {count > 1 ? (
        <div className={classes.controls}>
          <button
            type="button"
            className={classes.nav}
            onClick={() => onGo(index - 1)}
            aria-label="Previous slide"
          >
            <span aria-hidden="true">←</span>
          </button>
          <p className={classes.status} role="status" aria-live="polite">
            Slide {index + 1} of {count}
          </p>
          <div className={classes.dots} role="tablist" aria-label="Choose slide">
            {Array.from({ length: count }, (_, dot) => (
              <button
                key={dot}
                type="button"
                role="tab"
                aria-selected={dot === index}
                aria-label={`Go to slide ${dot + 1}`}
                tabIndex={dot === index ? 0 : -1}
                className={classes.dot}
                data-active={dot === index}
                onClick={() => onGo(dot)}
              />
            ))}
          </div>
          <button
            type="button"
            className={classes.nav}
            onClick={() => onGo(index + 1)}
            aria-label="Next slide"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : (
        <p className={classes.status} role="status" aria-live="polite">
          Slide 1 of 1
        </p>
      )}
    </div>
  );
}

function ProofSlide({ item }: { item: WorkItem }) {
  return (
    <article
      className={classes.slide}
      role="group"
      aria-roledescription="slide"
      aria-label={item.title}
    >
      <p className={classes.badges}>
        <span className={classes.badgeProof}>Approved proof</span>
      </p>
      <h3 className={classes.slideTitle}>{item.title}</h3>
      {item.body ? <p className={classes.slideBody}>{item.body}</p> : null}
      <p className={classes.caption}>Shared with client permission.</p>
    </article>
  );
}

function SampleSlideCard({ slide }: { slide: SampleSlide }) {
  return (
    <article
      className={classes.slide}
      role="group"
      aria-roledescription="slide"
      aria-label={slide.title}
    >
      <p className={classes.badges}>
        <span className={classes.badgeSample}>Sample</span>
      </p>
      <h3 className={classes.slideTitle}>{slide.title}</h3>
      <p className={classes.slideBody}>{slide.body}</p>
      <p className={classes.caption}>Concept only. Not client work.</p>
    </article>
  );
}

export function ProofCarousel({ endpoint = DEFAULT_PUBLIC_WORK_ITEMS_ENDPOINT }: ProofCarouselProps) {
  const headingId = useId();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetchPublicWorkItems(endpoint, controller.signal).then((result) => {
      if (!active) return;
      setItems(result.items);
      setLoadError(false);
      setLoaded(true);
    }).catch(() => {
      if (!active) return;
      setItems([]);
      setLoadError(true);
      setLoaded(true);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [endpoint]);

  const approved = items.filter((item) => item.kind === "proof");
  const apiSamples: SampleSlide[] = items
    .filter((item) => item.kind === "sample-concept")
    .map((item) => ({
      key: item.id,
      title: item.title,
      body: item.body ?? "Labeled sample concept. Not client work.",
      source: "api" as const,
    }));
  const samples: SampleSlide[] = [...apiSamples, ...CONCEPT_SAMPLES];

  const proofCarousel = useCarousel(approved.length);
  const sampleCarousel = useCarousel(samples.length);

  return (
    <section id="work" className={classes.section} aria-labelledby={headingId}>
      <div className={classes.inner}>
        <SectionHeading
          id="work"
          eyebrow="Selected work"
          title="Real proof first, samples labeled"
          description="Approved client work appears here with permission. Everything else is a labeled sample concept."
        />

        {approved.length > 0 ? (
          <CarouselFrame
            label="Approved client work"
            count={approved.length}
            index={proofCarousel.index}
            onGo={proofCarousel.go}
          >
            {approved.map((item) => (
              <div key={item.id} className={classes.slideWrap}>
                <ProofSlide item={item} />
              </div>
            ))}
          </CarouselFrame>
        ) : (
          <div className={classes.empty} role="status" aria-live="polite">
            <h3 className={classes.emptyTitle}>
              {loaded ? "No approved client work to show yet." : "Loading work items."}
            </h3>
            {loaded ? (
              <p className={classes.emptyText}>
                This space stays empty until a real build ships with permission. The
                samples below show layout shapes only and are never client proof.
                {loadError ? " Work items could not load just now, so only samples show." : null}
              </p>
            ) : null}
          </div>
        )}

        <div className={classes.samplesHead}>
          <h3 className={classes.samplesTitle}>Sample concepts</h3>
          <p className={classes.samplesNote}>
            Every card here carries a Sample badge. Concepts for layout and planning
            only. Never presented as client work.
          </p>
        </div>
        <CarouselFrame
          label="Sample concepts"
          count={samples.length}
          index={sampleCarousel.index}
          onGo={sampleCarousel.go}
        >
          {samples.map((slide) => (
            <div key={slide.key} className={classes.slideWrap}>
              <SampleSlideCard slide={slide} />
            </div>
          ))}
        </CarouselFrame>
      </div>
    </section>
  );
}
