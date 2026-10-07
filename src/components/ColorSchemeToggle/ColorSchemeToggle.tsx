import { useMantineColorScheme } from "@mantine/core";
import classes from "./ColorSchemeToggle.module.css";

export type ColorSchemeToggleProps = {
  labelLight?: string;
  labelDark?: string;
};

/**
 * Custom light and dark switch. A native button keeps keyboard,
 * focus, and screen reader behavior. Motion is a short thumb slide
 * with an opacity crossfade, disabled under reduced motion.
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
      <span aria-hidden="true" className={classes.track}>
        <span className={classes.sun}>{"\u2600"}</span>
        <span className={classes.moon}>{"\u263E"}</span>
        <span className={classes.thumb} />
      </span>
    </button>
  );
}
