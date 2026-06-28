import { useEffect, useState } from "react";

/**
 * Connective "signal thread" — a thin gold line down the left edge that fills
 * as you scroll the page, with a glowing head dot. Visually carries the hero's
 * gold signal through the rest of the landing page (continuity device).
 *
 * Fixed, decorative, pointer-events-none. Hidden entirely under reduced-motion.
 */
const ScrollSignal = () => {
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShow(false);
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (!show) return null;
  const pct = `${progress * 100}%`;

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-40 hidden h-screen w-[3px] sm:block"
      aria-hidden
    >
      <div className="absolute inset-0 bg-border-subtle/50" />
      <div
        className="absolute left-0 top-0 w-full rounded-b-full bg-gradient-to-b from-gold to-gold-deep"
        style={{ height: pct }}
      />
      <div
        className="absolute left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_10px_hsl(var(--accent))]"
        style={{ top: pct }}
      />
    </div>
  );
};

export default ScrollSignal;
