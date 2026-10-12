import { useMantineColorScheme } from "@mantine/core";
import { Moon, Sun } from "@phosphor-icons/react";
import classes from "./ColorSchemeToggle.module.css";

export type ColorSchemeToggleProps = {
  labelLight?: string;
  labelDark?: string;
};

/**
 * Minimal sun and moon morph. One icon button, no pill track.
 * Icons crossfade with a short rotate. Transform and opacity only.
 * Frozen under reduced motion.
 */
export function ColorSchemeToggle({
  labelLight = "Switch to light theme",
  labelDark = "Switch to dark theme",
}: ColorSchemeToggleProps) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? labelLight : labelDark}
      title={isDark ? labelLight : labelDark}
      aria-pressed={isDark}
      data-state={isDark ? "dark" : "light"}
      onClick={() => setColorScheme(isDark ? "light" : "dark")}
      className={classes.toggle}
    >
      <span aria-hidden="true" className={classes.icons}>
        <Sun weight="thin" className={`${classes.icon} ${classes.sun}`} focusable="false" />
        <Moon weight="thin" className={`${classes.icon} ${classes.moon}`} focusable="false" />
      </span>
    </button>
  );
}
