/* Variant registry. The single list the parent addresses variants through.
   The parent and the contract never import a variant directly. Variants are
   addressed only through this list, keyed by id from the URL param or popup
   selection.
   DEVIATION from architecture §3.3, recorded deliberately: the registry was
   specified as dynamic imports (one variant chunk per concept), but lazy
   dynamic imports trip a deterministic React Router v7 manifest bug
   (`Server build file not found in manifest` at writeBundle), so the lazy
   variants are unshippable. Correctness over code splitting: all three
   variant modules are imported statically here until the router bug is fixed,
   at which point these entries revert to dynamic imports with no other file
   changing. The rest of the contract holds: the parent still addresses
   variants only through this registry, no variant imports another variant,
   variant switch still resets stage and unmounting still kills tweens.
   Removal protocol (§13.3) still holds: delete a variant file and its entry
   here, plus the popup, and the bundle loses all trace of the deleted one.
   Variants must not import from each other. Shared copy and types are fine. */

import CairnScene from "./variants/CairnScene";
import SolidStateScene from "./variants/SolidStateScene";
import GridScene from "./variants/GridScene";
import type { RegistryEntry, VariantId } from "./types";

export const SCENE_REGISTRY: RegistryEntry[] = [
  {
    id: "cairn",
    label: "Cairn",
    blurb: "Six river stones stacked on a plinth and bound with cord. Matte.",
    load: () => Promise.resolve({ default: CairnScene }),
  },
  {
    id: "solid-state",
    label: "Solid state",
    blurb: "Six solid pucks standing in a shallow chip tray. Satin.",
    load: () => Promise.resolve({ default: SolidStateScene }),
  },
  {
    id: "grid",
    label: "Grid",
    blurb: "A flat nine cell grid. Six cells light in sequence. Gloss.",
    load: () => Promise.resolve({ default: GridScene }),
  },
];

export function registryEntry(id: VariantId): RegistryEntry {
  const fallback = SCENE_REGISTRY[0];
  if (!fallback) throw new Error("Scene registry has no entries.");
  return SCENE_REGISTRY.find((entry) => entry.id === id) ?? fallback;
}
