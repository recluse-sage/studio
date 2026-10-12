/* Comparison popup. Temporary scaffolding for a design decision, not a debug
   tool. It ships visible so concepts and materials can be reviewed on the live
   page. Concept and material are independent axes: concept swaps the lazy
   scene module, material writes presentation tokens only, with no remount.
   Removal (§13.3): delete this file, its stylesheet, the variant files, and
   the registry entries. Nothing else imports any of them. On narrow screens
   this collapses to a single trigger that opens a small sheet, so the picker
   never competes with the hero copy. */

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { SCENE_REGISTRY } from "./registry";
import { MATERIAL_OPTIONS } from "./types";
import type { MaterialId, VariantId } from "./types";
import classes from "./ScenePopup.module.css";

export type ScenePopupProps = {
  variant: VariantId;
  material: MaterialId;
  onVariantChange: (next: VariantId) => void;
  onMaterialChange: (next: MaterialId) => void;
};

export function ScenePopup({ variant, material, onVariantChange, onMaterialChange }: ScenePopupProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const onSheetKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div className={classes.popup} data-open={open ? "true" : "false"} onKeyDown={onSheetKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className={classes.trigger}
        aria-expanded={open}
        aria-controls="hero-scene-options"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Hide scene options" : "Compare scenes"}
      </button>

      <div id="hero-scene-options" className={classes.sheet}>
        <p className={classes.note}>
          Temporary review control. One scene will ship, then this panel is removed. Concept and
          material switch independently, and the choice is saved in the page address.
        </p>
        <div className={classes.groups}>
          <fieldset className={classes.group}>
            <legend className={classes.legend}>Scene concept</legend>
            {SCENE_REGISTRY.map((entry) => (
              <label key={entry.id} className={classes.option} data-checked={variant === entry.id}>
                <input
                  type="radio"
                  name="hero-scene-concept"
                  value={entry.id}
                  checked={variant === entry.id}
                  onChange={() => onVariantChange(entry.id)}
                  className={classes.radio}
                />
                <span className={classes.optionText}>
                  <span className={classes.optionLabel}>{entry.label}</span>
                  <span className={classes.optionBlurb}>{entry.blurb}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset className={classes.group}>
            <legend className={classes.legend}>Material</legend>
            {MATERIAL_OPTIONS.map((option) => (
              <label key={option.id} className={classes.option} data-checked={material === option.id}>
                <input
                  type="radio"
                  name="hero-scene-material"
                  value={option.id}
                  checked={material === option.id}
                  onChange={() => onMaterialChange(option.id)}
                  className={classes.radio}
                />
                <span className={classes.optionText}>
                  <span className={classes.optionLabel}>{option.label}</span>
                  <span className={classes.optionBlurb}>{option.blurb}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </div>
      </div>
    </div>
  );
}
