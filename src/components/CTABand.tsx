import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "@/components/landing/Reveal";

const CTABand = () => (
  <section className="bg-surface-inverse">
    <div className="mx-auto flex w-full max-w-[900px] flex-col items-center px-6 py-32 text-center md:px-12 md:py-40">
      <Reveal stagger={90} className="w-full">
        <p className="font-cap text-sm uppercase tracking-[0.18em] text-gold">Ready when you are</p>
        <h2 className="mt-6 font-serif text-[36px] font-medium leading-[1.08] text-white md:text-[48px]">
          Make money a tool, not the goal.
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-[18px] leading-relaxed text-white/75">
          Join investors who use TradLyte to learn, test, and grow with intention. Free to start — no credit card.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2.5 rounded-full bg-gold px-8 py-4 text-base font-semibold text-fg-primary transition-opacity hover:opacity-90"
          >
            Create free account
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/about"
            className="inline-flex items-center rounded-full border border-white/25 px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
          >
            Learn about us
          </Link>
        </div>
      </Reveal>
    </div>
  </section>
);

export default CTABand;
