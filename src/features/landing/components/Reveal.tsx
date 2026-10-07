import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import classes from "./Reveal.module.css";

export type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/**
 * Scroll reveal for process rows. Content renders visible for SSR
 * and no-JS readers. When JS runs, rows arm hidden and slide in
 * with transform and opacity only. Reduced motion stays visible.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") return;
    el.classList.add(classes.armed);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add(classes.shown);
            io.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className ? `${classes.reveal} ${className}` : classes.reveal}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
