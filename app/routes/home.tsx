import { useEffect, useState } from "react";
import { LandingPage } from "../../src/features/landing/LandingPage";
import { fetchPublicAvailability } from "../../src/features/landing/api";
import type { AvailabilitySummary } from "../../src/features/landing/types";
import type { LinksFunction, MetaFunction } from "react-router";
import { useLoaderData } from "react-router";

// Keep this import path in sync with the designer lane.
// Preferred: src/features/landing/LandingPage.tsx named export LandingPage.
// Designer follow-up allows availability to be null when no public row is configured.

export const meta: MetaFunction = () => {
  return [
    { title: "Oasis.dev: small websites, tools, and automations" },
    {
      name: "description",
      content:
        "Oasis is a solo studio building small websites, tools, and automations for local businesses. One build at a time. Start with a short intake.",
    },
  ];
};

export const links: LinksFunction = () => {
  const site = (import.meta.env.VITE_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
  if (!site) return [];
  return [{ rel: "canonical", href: `${site}/` }];
};

type LoaderData = {
  availability: AvailabilitySummary | null;
  services: [];
  steps: [];
  intakeEndpoint: string;
};

// Static loader for prerender. No DB, no fake portfolio, no invented capacity.
// Null availability means no status strip or badge until the client fetch resolves.
export async function loader(): Promise<LoaderData> {
  return {
    availability: null,
    services: [],
    steps: [],
    intakeEndpoint: "/api/intakes",
  };
}

export default function HomeRoute() {
  const data = useLoaderData<LoaderData>();
  const [availability, setAvailability] = useState<AvailabilitySummary | null>(data.availability);

  useEffect(() => {
    let active = true;
    fetchPublicAvailability().then((result) => {
      if (active) setAvailability(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "").trim() || undefined;

  return (
    <LandingPage
      availability={availability}
      services={data.services}
      steps={data.steps}
      intakeEndpoint={data.intakeEndpoint}
      turnstileSiteKey={turnstileSiteKey}
    />
  );
}
