import { useEffect, useState } from "react";
import { Button } from "@mantine/core";
import { ArrowRight, Plus } from "@phosphor-icons/react";
import { SectionHeading } from "../../../components/SectionHeading/SectionHeading";
import classes from "./FaqSection.module.css";

export type FaqEntry = {
  slug: string;
  question: string;
  answer: string;
};

export const FAQS: FaqEntry[] = [
  {
    slug: "faq-what-do-you-build",
    question: "What do you build?",
    answer:
      "Tools, websites, and automations that solve a clear problem for small, medium, and enterprise business. One useful build at a time.",
  },
  {
    slug: "faq-how-do-we-start",
    question: "How do we start?",
    answer:
      "Send the short intake. We read every note and reply with plain next steps. No long calls to start.",
  },
  {
    slug: "faq-how-do-scope-and-cost-work",
    question: "How do scope and cost work?",
    answer:
      "We agree scope, timing, and cost in writing before we build. Small first builds stay small on purpose.",
  },
  {
    slug: "faq-who-owns-the-finished-work",
    question: "Who owns the finished work?",
    answer:
      "You do. We hand it over with a practical walkthrough so you can run it without us.",
  },
  {
    slug: "faq-do-you-show-past-work",
    question: "Do you show past work?",
    answer:
      "We show proof only with client permission. Until then, this page stays focused on services and the intake.",
  },
];

export function buildFaqJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

function slugFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  return FAQS.some((item) => item.slug === hash) ? hash : null;
}

export function FaqSection() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  useEffect(() => {
    setOpenSlug(slugFromHash());
    function onHashChange() {
      setOpenSlug(slugFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function handleToggle(slug: string, isOpen: boolean) {
    if (isOpen) {
      setOpenSlug(slug);
      try {
        history.replaceState(null, "", `#${slug}`);
      } catch {
        /* keep hash as is */
      }
    } else if (openSlug === slug) {
      setOpenSlug(null);
    }
  }

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
          {FAQS.map((item) => {
            const isOpen = openSlug === item.slug;
            return (
              <details
                key={item.slug}
                id={item.slug}
                className={classes.item}
                open={isOpen}
                onToggle={(event) => handleToggle(item.slug, event.currentTarget.open)}
              >
                <summary className={classes.summary}>
                  <span className={classes.icon} aria-hidden="true">
                    <Plus weight="thin" focusable="false" />
                  </span>
                  <span className={classes.question}>{item.question}</span>
                  <a
                    href={`#${item.slug}`}
                    className={classes.permalink}
                    aria-label={`Link to: ${item.question}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setOpenSlug(item.slug);
                      try {
                        history.replaceState(null, "", `#${item.slug}`);
                        document.getElementById(item.slug)?.scrollIntoView({ block: "start" });
                      } catch {
                        /* keep position as is */
                      }
                    }}
                  >
                    #
                  </a>
                </summary>
                <p className={classes.answer}>{item.answer}</p>
              </details>
            );
          })}
        </div>
        <div className={classes.cta}>
          <p className={classes.ctaText}>
            Still unsure? Send one line about the repeating task. We reply with plain next steps.
          </p>
          <Button component="a" href="/#intake" size="md" className={classes.ctaButton}>
            <span>Send the intake</span>
            <ArrowRight weight="thin" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
