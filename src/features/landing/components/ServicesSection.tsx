import { ArrowRight, Globe, Lightning, Wrench } from "@phosphor-icons/react";
import { SectionHeading } from "../../../components/SectionHeading/SectionHeading";
import type { ServiceItem } from "../types";
import classes from "./ServicesSection.module.css";

export type ServicesSectionProps = {
  services: ServiceItem[];
};

const FALLBACK: ServiceItem[] = [
  {
    id: "websites",
    title: "Websites",
    description: "A clear small site that explains the offer and turns visits into calls or bookings.",
    points: ["One page or a few pages", "Call, map, and hours easy to find", "Clear titles and descriptions for search"],
    linkHref: "/#intake",
    linkLabel: "Ask about a website",
    nextStep: "What happens next: send the intake and we reply with scope, timing, and cost in writing.",
    timeCost: "Time cost: the intake takes about 3 minutes.",
  },
  {
    id: "tools",
    title: "Tools",
    description: "A small helper that does one job well, like a quote builder or booking helper.",
    points: ["One task, done simply", "Works well on phones", "Easy for staff to use"],
    linkHref: "/#intake",
    linkLabel: "Ask about a tool",
    nextStep: "What happens next: send the intake and we reply with the smallest useful build.",
    timeCost: "Time cost: the intake takes about 3 minutes.",
  },
  {
    id: "automations",
    title: "Automations",
    description: "Link steps like intake, booking, and follow-up so they need less manual work.",
    points: ["Intake to reply in fewer steps", "Reminders without manual chasing", "A clear log of what ran"],
    linkHref: "/#intake",
    linkLabel: "Ask about automation",
    nextStep: "What happens next: send the intake and we map the steps that can run without manual work.",
    timeCost: "Time cost: the intake takes about 3 minutes.",
  },
];

const SERVICE_ICONS: Record<string, typeof Globe> = {
  websites: Globe,
  tools: Wrench,
  automations: Lightning,
};

export function ServicesSection({ services }: ServicesSectionProps) {
  const list = services.length > 0 ? services : FALLBACK;
  return (
    <section id="services" className={classes.section} aria-labelledby="services-title">
      <div className={classes.inner}>
        <SectionHeading
          id="services"
          eyebrow="Services"
          title="Tools, websites, and automations"
          description="We solve problems for small, medium, and enterprise business. Every build starts with the same short intake."
        />
        <div className={classes.grid}>
          {list.map((service, position) => {
            const Icon = SERVICE_ICONS[service.id] ?? Globe;
            return (
              <a
                key={service.id}
                href={service.linkHref}
                className={classes.card}
              >
                <span className={classes.cardTop} aria-hidden="true">
                  <span className={classes.cardIndex}>
                    {String(position + 1).padStart(2, "0")}
                  </span>
                  <span className={classes.cardIcon}>
                    <Icon weight="thin" focusable="false" />
                  </span>
                </span>
                <h3 className={classes.cardTitle}>{service.title}</h3>
                <p className={classes.cardText}>{service.description}</p>
                <ul className={classes.points}>
                  {service.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                {service.nextStep || service.timeCost ? (
                  <div className={classes.guidance} aria-label={`Guidance for ${service.title}`}>
                    {service.nextStep ? <p className={classes.guideNext}>{service.nextStep}</p> : null}
                    {service.timeCost ? <p className={classes.guideTime}>{service.timeCost}</p> : null}
                  </div>
                ) : null}
                <span className={classes.cardLink}>
                  <span>{service.linkLabel}</span>
                  <ArrowRight weight="thin" focusable="false" className={classes.arrow} aria-hidden="true" />
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
