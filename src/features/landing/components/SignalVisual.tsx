import classes from "./SignalVisual.module.css";

/**
 * Abstract tech signal visual. Pure CSS and SVG, no photo,
 * no business imagery, no logo. Decorative only.
 */
export function SignalVisual() {
  return (
    <div className={classes.visual} aria-hidden="true">
      <div className={classes.readout}>
        <span className={classes.readoutName}>oasis.signal</span>
        <span className={classes.readoutState}>
          <span className={classes.stateDot} />
          steady
        </span>
      </div>

      <svg
        className={classes.canvas}
        viewBox="0 0 440 340"
        role="presentation"
        focusable="false"
      >
        <defs>
          <radialGradient id="oasis-node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: "var(--oasis-accent)" }} stopOpacity="0.35" />
            <stop offset="100%" style={{ stopColor: "var(--oasis-accent)" }} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="oasis-pipe" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: "var(--oasis-accent)" }} stopOpacity="0.25" />
            <stop offset="50%" style={{ stopColor: "var(--oasis-accent)" }} stopOpacity="0.9" />
            <stop offset="100%" style={{ stopColor: "var(--oasis-signal)" }} stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* Concentric signal arcs */}
        <g fill="none" style={{ stroke: "var(--oasis-accent)" }} strokeWidth="1.5">
          <circle cx="215" cy="128" r="52" opacity="0.85" />
          <circle cx="215" cy="128" r="88" opacity="0.45" strokeDasharray="3 6" />
          <circle cx="215" cy="128" r="124" opacity="0.25" strokeDasharray="2 8" />
        </g>

        {/* Core node */}
        <circle cx="215" cy="128" r="26" fill="url(#oasis-node-glow)" />
        <circle cx="215" cy="128" r="9" style={{ fill: "var(--oasis-accent)" }} />
        <circle cx="215" cy="128" r="9" fill="none" style={{ stroke: "var(--oasis-bg)" }} strokeWidth="2" opacity="0.6" />

        {/* Side ticks */}
        <g style={{ stroke: "var(--oasis-accent)" }} strokeWidth="2" opacity="0.5">
          <line x1="60" y1="60" x2="72" y2="60" />
          <line x1="66" y1="54" x2="66" y2="66" />
          <line x1="368" y1="88" x2="380" y2="88" />
          <line x1="374" y1="82" x2="374" y2="94" />
        </g>

        {/* Pipeline from intake to launch */}
        <line x1="50" y1="252" x2="380" y2="252" stroke="url(#oasis-pipe)" strokeWidth="2" />
        <g>
          <circle cx="50" cy="252" r="7" style={{ fill: "var(--oasis-bg)", stroke: "var(--oasis-accent)" }} strokeWidth="2" />
          <circle cx="160" cy="252" r="7" style={{ fill: "var(--oasis-accent)" }} />
          <circle cx="270" cy="252" r="7" style={{ fill: "var(--oasis-bg)", stroke: "var(--oasis-accent)" }} strokeWidth="2" />
          <circle cx="380" cy="252" r="7" style={{ fill: "var(--oasis-bg)", stroke: "var(--oasis-signal)" }} strokeWidth="2" />
        </g>
        <g
          style={{ fill: "var(--oasis-text-muted)" }}
          fontSize="12"
          fontFamily="var(--oasis-font-mono)"
          textAnchor="middle"
        >
          <text x="50" y="282">intake</text>
          <text x="160" y="282">scope</text>
          <text x="270" y="282">build</text>
          <text x="380" y="282">launch</text>
        </g>

        {/* Connector from core to pipeline */}
        <line x1="215" y1="150" x2="215" y2="238" style={{ stroke: "var(--oasis-accent)" }} strokeWidth="1.5" strokeDasharray="4 5" opacity="0.6" />
      </svg>

      <div className={classes.chips}>
        <span className={classes.chip}>clear scope</span>
        <span className={classes.chip}>one build</span>
        <span className={classes.chip}>plain handoff</span>
      </div>
    </div>
  );
}
