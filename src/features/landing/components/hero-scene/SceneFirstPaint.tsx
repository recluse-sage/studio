/* Static first paint for the hero scene. This inline SVG ships in the server
   HTML so the scene is the first paint: no poster image, no canvas mount, no
   reveal animation. Geometry mirrors stage 0 of the default Cairn variant, and
   the viewBox matches every variant, so the lazy scene upgrades in place with
   no layout shift. Flat token fills keep this snapshot small. Decorative:
   the tab list and panels carry the accessible copy. */

export function SceneFirstPaint() {
  return (
    <svg
      viewBox="0 0 480 360"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <ellipse cx="240" cy="308" rx="132" ry="15" style={{ fill: "var(--hero-shadow)", opacity: "var(--hero-shadow-a)" }} />
      <rect x="152" y="264" width="176" height="24" rx="8" style={{ fill: "var(--hero-body-2)" }} />
      <ellipse cx="240" cy="264" rx="88" ry="19" style={{ fill: "var(--hero-body)" }} />
      <ellipse cx="240" cy="261" rx="72" ry="13" style={{ fill: "var(--hero-top)", opacity: 0.55 }} />
      <g style={{ fill: "var(--hero-body)" }}>
        <ellipse cx="148" cy="286" rx="34" ry="19" transform="rotate(-12 148 286)" />
        <ellipse cx="204" cy="294" rx="30" ry="17" transform="rotate(8 204 294)" />
        <ellipse cx="262" cy="292" rx="32" ry="18" transform="rotate(-6 262 292)" />
        <ellipse cx="318" cy="286" rx="29" ry="17" transform="rotate(14 318 286)" />
        <ellipse cx="178" cy="268" rx="25" ry="15" transform="rotate(22 178 268)" />
        <ellipse cx="298" cy="266" rx="23" ry="14" transform="rotate(-16 298 266)" />
      </g>
      <g style={{ fill: "none", stroke: "var(--hero-accent)", strokeWidth: 3 }}>
        <ellipse cx="120" cy="304" rx="24" ry="9" />
        <ellipse cx="120" cy="304" rx="13" ry="5" />
      </g>
    </svg>
  );
}
