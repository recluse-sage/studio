import { SectionHeading } from "../../../components/SectionHeading/SectionHeading";
import type { ProcessStep } from "../types";
import classes from "./ProcessSection.module.css";

export type ProcessSectionProps = {
  steps: ProcessStep[];
};

const FALLBACK: ProcessStep[] = [
  {
    id: "note",
    index: "01",
    title: "Short note",
    description: "Send the intake. We read every word and reply with plain next steps.",
  },
  {
    id: "scope",
    index: "02",
    title: "Fixed scope",
    description: "You get a clear scope that lists what is included, timing, and cost.",
  },
  {
    id: "build",
    index: "03",
    title: "Build and launch",
    description: "We build, you review on your phone, then we launch and hand it over.",
  },
  {
    id: "proof",
    index: "04",
    title: "Permission first",
    description: "If you approve, selected details can become public proof of the work.",
  },
];

export function ProcessSection({ steps }: ProcessSectionProps) {
  const list = steps.length > 0 ? steps : FALLBACK;
  return (
    <section id="process" className={classes.section} aria-labelledby="process-title">
      <div className={classes.inner}>
        <SectionHeading
          id="process"
          eyebrow="Process"
          title="Simple from first note to launch"
          description="No long calls to start. No jargon. You stay in control at each step."
        />
        <ol className={classes.list}>
          {list.map((step) => (
            <li key={step.id} className={classes.item}>
              <span className={classes.index} aria-hidden="true">
                {step.index}
              </span>
              <div>
                <h3 className={classes.itemTitle}>{step.title}</h3>
                <p className={classes.itemText}>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
