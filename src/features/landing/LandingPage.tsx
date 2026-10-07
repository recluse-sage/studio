import { LandingHeader } from "./components/LandingHeader";
import { HeroSection } from "./components/HeroSection";
import { ServicesSection } from "./components/ServicesSection";
import { ToolsSection } from "./components/ToolsSection";
import { ProofCarousel } from "./components/ProofCarousel";
import { ProcessSection } from "./components/ProcessSection";
import { AvailabilityStrip } from "./components/AvailabilityStrip";
import { IntakeForm } from "./components/IntakeForm";
import { LandingFooter } from "./components/LandingFooter";
import type { LandingPageProps } from "./types";
import classes from "./LandingPage.module.css";

/**
 * Public landing composition. Service plus intake only.
 * No portfolio grid until real work with permission exists.
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
        <ProcessSection steps={steps} />
        <ProofCarousel />
        {availability ? <AvailabilityStrip availability={availability} /> : null}
        <IntakeForm endpoint={intakeEndpoint} turnstileSiteKey={turnstileSiteKey} />
      </main>
      <LandingFooter showAvailability={showAvailability} availability={availability} />
    </div>
  );
}
