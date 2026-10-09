import { useMantineColorScheme } from "@mantine/core";
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
        <svg className={`${classes.icon} ${classes.sun}`} viewBox="0 0 20 20" focusable="false">
          <circle cx="10" cy="10" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <svg className={`${classes.icon} ${classes.moon}`} viewBox="0 0 20 20" focusable="false">
          <path
            d="M15.5 12.5A6.5 6.5 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
