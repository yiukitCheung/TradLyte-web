import { ArrowRight, Compass, FlaskConical, LineChart } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";

const steps = [
  {
    icon: Compass,
    title: "Know your why",
    body: "Set a purpose and goals so every trade connects to your life — not to a headline.",
  },
  {
    icon: FlaskConical,
    title: "Test your idea",
    body: "Build a strategy in plain language and replay it on real market history before you risk a dollar.",
  },
  {
    icon: LineChart,
    title: "Track with calm",
    body: "Follow growth from your entry price, journal your thinking, and pause when emotions run hot.",
  },
];

const HowItWorks = () => (
  <section id="how-it-works" className="bg-surface-primary">
    <div className="mx-auto w-full max-w-[1100px] px-6 py-28 md:px-12 md:py-36">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="font-cap text-sm uppercase tracking-[0.18em] text-gold-deep">How it works</p>
        <h2 className="mt-5 font-serif text-[34px] font-medium leading-tight text-fg-primary md:text-[44px]">
          Learn the platform in three quiet steps
        </h2>
        <p className="mt-5 text-[17px] leading-relaxed text-fg-secondary">
          No jargon wall. Start with intention, prove your idea with data, then invest with a clearer head.
        </p>
      </Reveal>

      <div className="mt-20 flex flex-col gap-16 md:gap-24">
        {steps.map((step, i) => (
          <Reveal key={step.title} delay={i * 120} className="flex flex-col gap-8 md:flex-row md:items-start md:gap-16">
            <div className="flex shrink-0 items-center gap-5 md:w-48 md:flex-col md:items-start">
              <div className="landing-step-icon flex h-14 w-14 items-center justify-center rounded-2xl border border-border-subtle bg-card">
                <step.icon className="h-6 w-6 text-gold-deep" />
              </div>
              <span className="font-cap text-xs font-semibold uppercase tracking-[0.2em] text-fg-muted">
                Step {i + 1}
              </span>
            </div>
            <div className="max-w-xl flex-1">
              <h3 className="font-serif text-2xl font-medium text-fg-primary md:text-3xl">{step.title}</h3>
              <p className="mt-4 text-[17px] leading-relaxed text-fg-secondary">{step.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={200} className="mt-24 flex flex-col items-center gap-5 text-center">
        <Link
          to="/auth"
          className="group inline-flex items-center gap-2.5 rounded-full bg-ink px-9 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90"
        >
          Create your free account
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
        <p className="font-cap text-sm text-fg-muted">Free to start · No credit card</p>
      </Reveal>
    </div>
  </section>
);

export default HowItWorks;
