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
    linkHref: "#intake",
    linkLabel: "Ask about a website",
  },
  {
    id: "tools",
    title: "Tools",
    description: "A small helper that does one job well, like a quote builder or booking helper.",
    points: ["One task, done simply", "Works well on phones", "Easy for staff to use"],
    linkHref: "#intake",
    linkLabel: "Ask about a tool",
  },
  {
    id: "automations",
    title: "Automations",
    description: "Link steps like intake, booking, and follow-up so they need less manual work.",
    points: ["Intake to reply in fewer steps", "Reminders without manual chasing", "A clear log of what ran"],
    linkHref: "#intake",
    linkLabel: "Ask about automation",
  },
];

export function ServicesSection({ services }: ServicesSectionProps) {
  const list = services.length > 0 ? services : FALLBACK;
  return (
    <section id="services" className={classes.section} aria-labelledby="services-title">
      <div className={classes.inner}>
        <SectionHeading
          id="services"
          eyebrow="Services"
          title="Three ways to get help"
          description="Pick the shape that fits. Every build starts with the same short intake."
        />
        <div className={classes.grid}>
          {list.map((service, position) => (
            <a
              key={service.id}
              href={service.linkHref}
              className={classes.card}
            >
              <span className={classes.cardIndex} aria-hidden="true">
                {String(position + 1).padStart(2, "0")}
              </span>
              <h3 className={classes.cardTitle}>{service.title}</h3>
              <p className={classes.cardText}>{service.description}</p>
              <ul className={classes.points}>
                {service.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <span className={classes.cardLink}>
                {service.linkLabel}
                <span className={classes.arrow} aria-hidden="true">→</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
