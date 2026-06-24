import { useCallback, useRef } from "react";

export interface KnobSliderProps {
  label: string;
  frac: number; // 0..1
  onFrac: (frac: number) => void;
}

export default function KnobSlider({ label, frac, onFrac }: KnobSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const fracFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    onFrac(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
  }, [onFrac]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    fracFromClientX(e.clientX);
  }, [fracFromClientX]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) fracFromClientX(e.clientX);
  }, [fracFromClientX]);

  const endDrag = useCallback(() => { draggingRef.current = false; }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { onFrac(Math.min(1, frac + 0.02)); e.preventDefault(); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { onFrac(Math.max(0, frac - 0.02)); e.preventDefault(); }
  }, [frac, onFrac]);

  const pct = Math.max(0, Math.min(1, frac)) * 100;

  return (
    <div className="mb-6">
      <p className="mb-2 font-cap text-xs text-fg-secondary">{label}</p>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className="relative flex h-9 cursor-pointer touch-none items-center"
      >
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-surface-sunken" />
        <div className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 rounded-full bg-gold" style={{ width: `${pct}%` }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-6 w-6 -ml-3 rounded-full border-2 border-fg-inverse bg-gold-deep"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}
