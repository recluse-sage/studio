import { ActionIcon, useMantineColorScheme } from "@mantine/core";
import classes from "./ColorSchemeToggle.module.css";

export type ColorSchemeToggleProps = {
  labelLight?: string;
  labelDark?: string;
};

/** Small light and dark switch. Labels keep it clear for keyboard and screen readers. */
export function ColorSchemeToggle({
  labelLight = "Switch to light theme",
  labelDark = "Switch to dark theme",
}: ColorSchemeToggleProps) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <ActionIcon
      variant="outline"
      size="lg"
      aria-label={isDark ? labelLight : labelDark}
      title={isDark ? labelLight : labelDark}
      onClick={() => setColorScheme(isDark ? "light" : "dark")}
      className={classes.toggle}
    >
      <span aria-hidden="true" className={classes.glyph}>
        {isDark ? "☾" : "☀"}
      </span>
    </ActionIcon>
  );
}
