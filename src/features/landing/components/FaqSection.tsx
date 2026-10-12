import { Plus } from "@phosphor-icons/react";
import { SectionHeading } from "../../../components/SectionHeading/SectionHeading";
import classes from "./FaqSection.module.css";

const FAQS = [
  {
    question: "What do you build",
    answer:
      "Tools, websites, and automations that solve a clear problem for small, medium, and enterprise business. One useful build at a time.",
  },
  {
    question: "How do we start",
    answer:
      "Send the short intake. We read every note and reply with plain next steps. No long calls to start.",
  },
  {
    question: "How do scope and cost work",
    answer:
      "We agree scope, timing, and cost in writing before we build. Small first builds stay small on purpose.",
  },
  {
    question: "Who owns the finished work",
    answer:
      "You do. We hand it over with a practical walkthrough so you can run it without us.",
  },
  {
    question: "Do you show past work",
    answer:
      "We show proof only with client permission. Until then, this page stays focused on services and the intake.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className={classes.section} aria-labelledby="faq-title">
      <div className={classes.inner}>
        <SectionHeading
          id="faq"
          align="center"
          eyebrow="Questions"
          title="Plain answers"
          description="Short answers to the questions we hear most."
        />
        <div className={classes.list}>
          {FAQS.map((item) => (
            <details key={item.question} className={classes.item}>
              <summary className={classes.summary}>
                <span className={classes.icon} aria-hidden="true">
                  <Plus weight="thin" focusable="false" />
                </span>
                <span>{item.question}</span>
              </summary>
              <p className={classes.answer}>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
