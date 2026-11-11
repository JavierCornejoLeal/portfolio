import * as React from "react"
import { ArrowRight, ArrowUpRight } from "lucide-react"

import { SOCIALS } from "@/components/SiteMenu"
import { GlassLayer } from "@/components/ui/glass-layer"

/*
 * Footer: it waits in the near-black green the contact portal opens onto. A big line and liquid-glass pills top
 * left, the social profiles top right, and JAVIER set into the green below, over a small bottom line. It fits one
 * laptop screen: the name takes whatever height the rest leaves (see .footer-name in global.css).
 */

interface Pill {
  label: string
  href: string
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
}

const PILLS: Pill[] = [
  { label: "Drop me an email", href: "mailto:cornejolealjavier@gmail.com", Icon: ArrowRight },
  { label: "See this code", href: "https://github.com/JavierCornejoLeal/portfolio", Icon: ArrowRight },
]

/** Top right: the social profiles (shared with the menu), then the phone, set just like them. */
const ELSEWHERE = [
  ...SOCIALS.map((social) => ({ label: social.label, href: social.href })),
  { label: "+34 634 44 36 02", href: "tel:+34634443602" },
]

function FooterPill({ pill }: { pill: Pill }) {
  const external = pill.href.startsWith("https://")
  return (
    <a
      data-footer-pill
      href={pill.href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group relative isolate inline-flex h-14 items-center gap-4 rounded-full px-7 text-sm font-medium tracking-[0.06em] uppercase transition-transform duration-300 hover:scale-105 focus-visible:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
    >
      <GlassLayer radius={28} className="-z-10" />
      {pill.label}
      {external && <span className="sr-only"> (opens in a new tab)</span>}
      <pill.Icon aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none" />
    </a>
  )
}

/**
 * `background` is the contact portal's flat green: the footer is as tall as the screen and outlasts the portal's
 * pinned view, so it paints that same green itself.
 */
export default function SiteFooter({ background }: { background: string }) {
  // The footer only ever renders in the browser (the portal mounts once Anton has loaded), so this is the
  // visitor's current year, never the year the site was built.
  const year = new Date().getFullYear()

  return (
    <footer
      id="contact-inside"
      role="contentinfo"
      // Links that glide here show all of it: aligned by its end, the page's end.
      data-scroll-align="end"
      style={{ backgroundColor: background }}
      className="flex min-h-svh flex-col justify-between gap-12 px-6 pt-[clamp(5.5rem,14svh,9rem)] pb-5 text-ink sm:px-10 max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
    >
      <div className="flex flex-col gap-14 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-10">
          <h2 className="text-[clamp(2.75rem,5.5vw,5.25rem)] leading-[0.95] font-medium tracking-[-0.035em] text-balance">
            Let's build
            <br />
            something clear.
          </h2>
          <ul className="flex flex-wrap gap-3">
            {PILLS.map((pill) => (
              <li key={pill.href}>
                <FooterPill pill={pill} />
              </li>
            ))}
          </ul>
        </div>

        <ul aria-label="Elsewhere" className="flex flex-col gap-2 text-[clamp(1.5rem,2.2vw,2.125rem)] leading-tight font-medium tracking-[-0.02em] sm:pr-6">
          {ELSEWHERE.map((link) => {
            // Profiles open in a new tab; the phone stays on the page and hands over to the dialler.
            const external = link.href.startsWith("https://")
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group inline-flex items-center gap-2 whitespace-nowrap transition-opacity duration-200 hover:opacity-70 motion-reduce:transition-none"
                >
                  {link.label}
                  {external && <span className="sr-only"> (opens in a new tab)</span>}
                  <ArrowUpRight aria-hidden="true" className="size-5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" />
                </a>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-4">
        {/* Decorative: the name is read once, in the bottom line. */}
        <p data-footer-name aria-hidden="true" className="footer-name">
          Javier
        </p>
        <div className="flex flex-col gap-3 text-sm text-ink/75 sm:flex-row sm:items-center sm:justify-between">
          <p>©{year} — Javier Cornejo, full stack developer</p>
          <nav aria-label="Footer">
            <ul className="legend flex gap-6 text-ink/75">
              <li>
                <a href="#projects" className="transition-colors hover:text-ink">
                  Projects
                </a>
              </li>
              <li>
                <a href="#top" className="transition-colors hover:text-ink">
                  Back to top
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
