import { Children, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/useInView";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** When set, direct children cascade in line-by-line, `stagger` ms apart. */
  stagger?: number;
  as?: "div" | "section";
};

const BASE = "transition-all duration-700 ease-out";
const HIDDEN = "translate-y-10 opacity-0";
const SHOWN = "translate-y-0 opacity-100";

export function Reveal({ children, className, delay = 0, stagger, as: Tag = "div" }: RevealProps) {
  const reduced = usePrefersReducedMotion();
  const { ref, visible } = useInView();
  const shown = reduced || visible;

  // Single block: the element itself fades/slides up.
  if (stagger == null) {
    return (
      <Tag
        ref={ref as React.RefObject<HTMLDivElement>}
        className={cn(BASE, shown ? SHOWN : HIDDEN, className)}
        style={{ transitionDelay: `${reduced ? 0 : delay}ms` }}
      >
        {children}
      </Tag>
    );
  }

  // Cascade: each direct child reveals in turn (hero-style line-by-line).
  const items = Children.toArray(children).filter(Boolean);
  return (
    <Tag ref={ref as React.RefObject<HTMLDivElement>} className={className}>
      {items.map((child, i) => (
        <div
          key={i}
          className={cn(BASE, shown ? SHOWN : HIDDEN)}
          style={{ transitionDelay: `${reduced ? 0 : delay + i * stagger}ms` }}
        >
          {child}
        </div>
      ))}
    </Tag>
  );
}
