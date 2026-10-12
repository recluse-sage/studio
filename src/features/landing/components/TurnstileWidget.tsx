import { useEffect, useRef, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import classes from "./TurnstileWidget.module.css";

export type TurnstileWidgetHandle = {
  reset: () => void;
};

export type TurnstileWidgetProps = {
  siteKey?: string;
  onToken: (token: string) => void;
  onExpired?: () => void;
  onError?: () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId?: string) => void;
    };
  }
}

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstileScript(): Promise<void> {
  if (typeof document === "undefined") return Promise.reject(new Error("No document"));
  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-oasis-turnstile="true"]',
  );
  if (existing) {
    if (window.turnstile) return Promise.resolve();
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("load failed")), {
        once: true,
      });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-oasis-turnstile", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("load failed"));
    document.head.appendChild(script);
  });
}

/**
 * Minimal accessible explicit Turnstile widget.
 * No key is hardcoded. Parent passes turnstileSiteKey from public config.
 * Centered and unlabeled by design. Retry appears only on error or expiry.
 */
export function TurnstileWidget({ siteKey, onToken, onExpired, onError }: TurnstileWidgetProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onExpiredRef = useRef(onExpired);
  const onErrorRef = useRef(onError);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "failed">("loading");
  const [needsRetry, setNeedsRetry] = useState(false);

  onTokenRef.current = onToken;
  onExpiredRef.current = onExpired;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!siteKey) {
      setLoadState("loading");
      return;
    }
    let alive = true;
    setLoadState("loading");
    setNeedsRetry(false);
    loadTurnstileScript()
      .then(() => {
        if (!alive) return;
        const el = boxRef.current;
        if (!el || !window.turnstile) {
          setLoadState("failed");
          setNeedsRetry(true);
          return;
        }
        el.innerHTML = "";
        try {
          const id = window.turnstile.render(el, {
            sitekey: siteKey,
            theme: "auto",
            callback: (token: string) => {
              setNeedsRetry(false);
              onTokenRef.current(token);
            },
            "expired-callback": () => {
              setNeedsRetry(true);
              onExpiredRef.current?.();
            },
            "error-callback": () => {
              setNeedsRetry(true);
              onErrorRef.current?.();
            },
          });
          widgetIdRef.current = id;
          setLoadState("ready");
        } catch {
          setLoadState("failed");
          setNeedsRetry(true);
        }
      })
      .catch(() => {
        if (alive) {
          setLoadState("failed");
          setNeedsRetry(true);
        }
      });
    return () => {
      alive = false;
      const id = widgetIdRef.current;
      widgetIdRef.current = null;
      try {
        if (id && window.turnstile?.remove) window.turnstile.remove(id);
      } catch {
        /* ignore cleanup errors */
      }
    };
  }, [siteKey]);

  function handleRetry() {
    setNeedsRetry(false);
    setLoadState("loading");
    onTokenRef.current("");
    try {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
        setLoadState("ready");
      } else if (boxRef.current && window.turnstile && siteKey) {
        boxRef.current.innerHTML = "";
        const id = window.turnstile.render(boxRef.current, {
          sitekey: siteKey,
          theme: "auto",
          callback: (token: string) => {
            setNeedsRetry(false);
            onTokenRef.current(token);
          },
          "expired-callback": () => {
            setNeedsRetry(true);
            onExpiredRef.current?.();
          },
          "error-callback": () => {
            setNeedsRetry(true);
            onErrorRef.current?.();
          },
        });
        widgetIdRef.current = id;
        setLoadState("ready");
      }
    } catch {
      setLoadState("failed");
      setNeedsRetry(true);
    }
  }

  if (!siteKey) {
    return (
      <div role="status" aria-live="polite" className={classes.wrap}>
        <p className={classes.note}>Verification is not set up yet. Intake is paused until the owner adds a site key.</p>
      </div>
    );
  }

  return (
    <div className={classes.wrap}>
      <span className="oasis-sr-only" id="turnstile-label">
        Spam verification
      </span>
      <div
        ref={boxRef}
        className={classes.box}
        role="group"
        aria-labelledby="turnstile-label"
        aria-busy={loadState === "loading"}
      />
      {loadState === "loading" ? (
        <p role="status" aria-live="polite" className={classes.note}>
          Loading verification.
        </p>
      ) : null}
      {loadState === "failed" ? (
        <p role="alert" className={classes.note}>
          Verification could not load. Check your connection and try again.
        </p>
      ) : null}
      {needsRetry ? (
        <button
          type="button"
          className={classes.retry}
          onClick={handleRetry}
          aria-label="Retry verification"
        >
          <ArrowClockwise weight="thin" aria-hidden="true" className={classes.retryIcon} />
          <span>Retry verification</span>
        </button>
      ) : null}
    </div>
  );
}

export function resetTurnstileWidget() {
  try {
    window.turnstile?.reset();
  } catch {
    /* ignore */
  }
}
