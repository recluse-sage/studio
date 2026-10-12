/* Scene contract types per docs/hero-architecture.md §3.1.
   The parent owns stage index, autoplay, viewport pause, and accessibility.
   Scene modules receive stage and render it. They own no timers and no observers. */

import type { ComponentType } from "react";

export type SceneProps = {
  stage: number;
  reducedMotion: boolean;
  onSettled?: () => void;
};

export type VariantId = "cairn" | "solid-state" | "grid";

export type SceneLoader = () => Promise<{ default: ComponentType<SceneProps> }>;

export type RegistryEntry = {
  id: VariantId;
  label: string;
  blurb: string;
  load: SceneLoader;
};

export type MaterialId = "matte" | "satin" | "glass";

export type MaterialOption = {
  id: MaterialId;
  label: string;
  blurb: string;
};

export const MATERIAL_OPTIONS: MaterialOption[] = [
  { id: "matte", label: "Matte", blurb: "Soft wide highlights, opaque fill, gentle shadow." },
  { id: "satin", label: "Satin", blurb: "Balanced sheen with a light edge highlight." },
  { id: "glass", label: "Glass", blurb: "Tight highlights, edge light, lighter fill." },
];

export function isVariantId(value: string): value is VariantId {
  return value === "cairn" || value === "solid-state" || value === "grid";
}

export function isMaterialId(value: string): value is MaterialId {
  return value === "matte" || value === "satin" || value === "glass";
}
