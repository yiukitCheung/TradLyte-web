import { Link } from "react-router-dom";
import { Twitter, Linkedin, Instagram } from "lucide-react";

const columns = [
  {
    heading: "Platform",
    links: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Strategy Lab", to: "/strategy-builder" },
      { label: "Goals", to: "/goals" },
      { label: "Journal", to: "/journal" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "About", to: "/about" },
      { label: "Learn", to: "/support" },
      { label: "Community", to: "/support" },
      { label: "Blog", to: "/support" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About us", to: "/about" },
      { label: "Contact", to: "/support" },
      { label: "Privacy", to: "#" },
      { label: "Terms", to: "#" },
    ],
  },
];

const Footer = () => (
  <footer className="border-t border-border-subtle bg-surface-primary">
    <div className="mx-auto w-full max-w-[1440px] px-6 pb-8 pt-14 md:px-12">
      <div className="flex flex-col justify-between gap-12 md:flex-row">
        <div className="flex max-w-[300px] flex-col gap-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="h-[22px] w-[22px] rounded-full bg-ink" aria-hidden />
            <span className="font-serif text-[22px] font-semibold leading-none text-fg-primary">
              TradLyte
            </span>
          </Link>
          <p className="text-sm leading-relaxed text-fg-muted">
            Purpose-driven investing. Discover, build, track and reflect — calmly.
          </p>
        </div>

        <div className="flex flex-wrap gap-12 md:gap-[72px]">
          {columns.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3.5">
              <span className="font-cap text-sm font-medium text-fg-primary">
                {col.heading}
              </span>
              {col.links.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="text-sm text-fg-secondary transition-colors hover:text-fg-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-border-subtle pt-6">
        <span className="text-[13px] text-fg-muted">
          © 2026 TradLyte. All rights reserved.
        </span>
        <div className="flex items-center gap-[18px] text-fg-muted">
          <a href="#" aria-label="Twitter" className="transition-colors hover:text-fg-primary">
            <Twitter className="h-[18px] w-[18px]" />
          </a>
          <a href="#" aria-label="LinkedIn" className="transition-colors hover:text-fg-primary">
            <Linkedin className="h-[18px] w-[18px]" />
          </a>
          <a href="#" aria-label="Instagram" className="transition-colors hover:text-fg-primary">
            <Instagram className="h-[18px] w-[18px]" />
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
