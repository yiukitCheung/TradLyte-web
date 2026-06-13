import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Chip — pill label matching Component/Chip in the design system.
 * Default: surface-card fill, strong hairline border, Inter 14/500.
 */
const chipVariants = {
  default: "bg-card text-fg-secondary border border-border-strong",
  sunken: "bg-surface-sunken text-fg-secondary border border-border-subtle",
  ink: "bg-ink text-white border border-transparent",
  gold: "bg-gold/20 text-gold-deep border border-gold/40",
  positive: "bg-positive-soft text-positive border border-transparent",
  negative: "bg-negative-soft text-negative border border-transparent",
} as const;

export type ChipVariant = keyof typeof chipVariants;

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  icon?: React.ReactNode;
}

export const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, variant = "default", icon, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-[15px] py-[9px] text-sm font-medium leading-none whitespace-nowrap",
        chipVariants[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  ),
);
Chip.displayName = "Chip";
