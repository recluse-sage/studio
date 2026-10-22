import type { MetaFunction } from "react-router";
import { Button } from "@mantine/core";
import { ArrowRight } from "@phosphor-icons/react";
import { PublicPage } from "../../src/features/landing/components/PublicPage";
import { ProofCarousel } from "../../src/features/landing/components/ProofCarousel";
import { SectionHeading } from "../../src/components/SectionHeading/SectionHeading";
import { EmptyState } from "../../src/components/EmptyState/EmptyState";

export const meta: MetaFunction = () => {
  return [
    { title: "Work: Oasis.dev" },
    {
      name: "description",
      content: "No completed client work to show yet. We publish only real builds with permission.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

export default function WorkRoute() {
  return (
    <PublicPage eyebrow="Selected work">
      <SectionHeading
        eyebrow="Selected work"
        title="Real proof first, samples labeled"
        description="Approved client work appears here with permission. Everything else is a labeled sample."
      />
      <EmptyState
        title="No approved client work to show yet."
        description="This space stays empty until a real build ships with permission. What happens next: send the intake and we reply with scope, timing, and cost in writing. Time cost: the intake takes about 3 minutes."
        action={
          <Button component="a" href="/#intake" size="md">
            <span>Start the intake</span>
            <ArrowRight weight="thin" aria-hidden="true" />
          </Button>
        }
      />
      <ProofCarousel />
    </PublicPage>
  );
}
