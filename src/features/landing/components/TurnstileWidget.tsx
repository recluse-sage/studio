import { useEffect, useRef, useState } from "react";

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
 */
export function TurnstileWidget({ siteKey, onToken, onExpired, onError }: TurnstileWidgetProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onExpiredRef = useRef(onExpired);
  const onErrorRef = useRef(onError);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "failed">("loading");

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
    loadTurnstileScript()
      .then(() => {
        if (!alive) return;
        const el = boxRef.current;
        if (!el || !window.turnstile) {
          setLoadState("failed");
          return;
        }
        el.innerHTML = "";
        try {
          const id = window.turnstile.render(el, {
            sitekey: siteKey,
            theme: "auto",
            callback: (token: string) => onTokenRef.current(token),
            "expired-callback": () => onExpiredRef.current?.(),
            "error-callback": () => onErrorRef.current?.(),
          });
          widgetIdRef.current = id;
          setLoadState("ready");
        } catch {
          setLoadState("failed");
        }
      })
      .catch(() => {
        if (alive) setLoadState("failed");
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

  function handleReset() {
    try {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    } catch {
      /* ignore reset errors */
    }
  }

  if (!siteKey) {
    return (
      <div role="status" aria-live="polite">
        <p>Verification is not set up yet. Intake is paused until the owner adds a site key.</p>
      </div>
    );
  }

  return (
    <div>
      <div
        ref={boxRef}
        aria-label="Spam verification"
        aria-busy={loadState === "loading"}
      />
      {loadState === "loading" ? (
        <p role="status" aria-live="polite">
          Loading verification.
        </p>
      ) : null}
      {loadState === "failed" ? (
        <p role="alert">
          Verification could not load. Check your connection and reload the page.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => {
          onTokenRef.current("");
          handleReset();
        }}
        aria-label="Reset verification"
      >
        Reset verification
      </button>
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
