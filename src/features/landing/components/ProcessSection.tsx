import {
  ChatCircle,
  CheckCircle,
  Crosshair,
  PaperPlaneTilt,
  ShareNetwork,
  Target,
  Wrench,
} from "@phosphor-icons/react";
import { SectionHeading } from "../../../components/SectionHeading/SectionHeading";
import { Reveal } from "./Reveal";
import type { ProcessStep } from "../types";
import classes from "./ProcessSection.module.css";

export type ProcessSectionProps = {
  steps: ProcessStep[];
};

const FALLBACK: ProcessStep[] = [
  {
    id: "problem",
    index: "01",
    title: "You bring a problem",
    description: "Tell us the work that repeats or the outcome you need.",
  },
  {
    id: "talk",
    index: "02",
    title: "We talk it through",
    description: "A short conversation so we understand the problem and the context.",
  },
  {
    id: "solution",
    index: "03",
    title: "We find the solution",
    description: "We agree the smallest useful fix and put scope, timing, and cost in writing.",
  },
  {
    id: "build-ship",
    index: "04",
    title: "We build and ship",
    description: "We build it, you review it on your phone, then we ship it to you.",
  },
  {
    id: "use",
    index: "05",
    title: "You use it",
    description: "You run it in daily work with a practical handoff. You own the result.",
  },
  {
    id: "share",
    index: "06",
    title: "You share it",
    description: "When it helps, you share it with people. With permission, it can become proof.",
  },
];

const ICONS = [Crosshair, ChatCircle, Target, Wrench, CheckCircle, ShareNetwork] as const;
const ID_ICONS: Record<string, (typeof ICONS)[number]> = {
  problem: Crosshair,
  talk: ChatCircle,
  solution: Target,
  build: Wrench,
  "build-ship": PaperPlaneTilt,
  use: CheckCircle,
  share: ShareNetwork,
};

function iconFor(id: string, position: number) {
  return ID_ICONS[id] ?? ICONS[position % ICONS.length] ?? Crosshair;
}

export function ProcessSection({ steps }: ProcessSectionProps) {
  const list = steps.length > 0 ? steps : FALLBACK;
  return (
    <section id="process" className={classes.section} aria-labelledby="process-title">
      <div className={classes.inner}>
        <SectionHeading
          id="process"
          eyebrow="Process"
          title="From problem to shared result"
          description="Six clear stages. You stay in control at each one."
        />
        <ol className={classes.list}>
          {list.map((step, position) => {
            const Icon = iconFor(step.id, position);
            return (
              <li key={step.id} className={classes.row}>
                <Reveal delay={Math.min(position, 3) * 70}>
                  <div className={classes.rowInner}>
                    <span className={classes.iconWrap} aria-hidden="true">
                      <Icon weight="thin" focusable="false" />
                    </span>
                    <div className={classes.text}>
                      <p className={classes.index} aria-hidden="true">
                        {step.index}
                      </p>
                      <h3 className={classes.itemTitle}>{step.title}</h3>
                      <p className={classes.itemText}>{step.description}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>
        <p className={classes.closer}>
          Questions before you write? <a href="#intake" className={classes.closerLink}>Send the intake</a> and ask in one line.
        </p>
      </div>
    </section>
  );
}
