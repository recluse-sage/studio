import { LandingHeader } from "./components/LandingHeader";
import { HeroSection } from "./components/HeroSection";
import { ServicesSection } from "./components/ServicesSection";
import { ToolsSection } from "./components/ToolsSection";
import { ProofCarousel } from "./components/ProofCarousel";
import { ProcessSection } from "./components/ProcessSection";
import { FaqSection } from "./components/FaqSection";
import { AvailabilityStrip } from "./components/AvailabilityStrip";
import { IntakeForm } from "./components/IntakeForm";
import { LandingFooter } from "./components/LandingFooter";
import type { LandingPageProps } from "./types";
import classes from "./LandingPage.module.css";

/**
 * Public landing composition.
 * Order: Hero, Services, guided Tools flow, Intake, Process, FAQ, Proof last.
 * Proof stays hidden until the owner enables it in Settings.
 */
export function LandingPage({
  availability,
  services,
  steps,
  intakeEndpoint,
  turnstileSiteKey,
}: LandingPageProps) {
  const showAvailability = availability != null;
  return (
    <div id="top" className={classes.page}>
      <a href="#main" className={classes.skip}>
        Skip to content
      </a>
      <LandingHeader showAvailability={showAvailability} />
      <main id="main" className={classes.main}>
        <HeroSection availability={availability} />
        <ServicesSection services={services} />
        <ToolsSection />
        {availability ? <AvailabilityStrip availability={availability} /> : null}
        <IntakeForm endpoint={intakeEndpoint} turnstileSiteKey={turnstileSiteKey} />
        <ProcessSection steps={steps} />
        <FaqSection />
        <ProofCarousel />
      </main>
      <LandingFooter showAvailability={showAvailability} availability={availability} />
    </div>
  );
}
