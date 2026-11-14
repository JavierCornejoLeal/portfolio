import * as React from "react"
import { ArrowRight } from "lucide-react"
import { useReducedMotion } from "motion/react"

import { SOCIALS } from "@/components/SiteMenu"
import { GlassLayer } from "@/components/ui/glass-layer"
import { HoverRollLabel, useHoverRoll } from "@/components/ui/hover-roll"
import { TextSwapRoll } from "@/components/ui/text-swap-roll"
import { cn } from "@/lib/utils"
import { uiFor, type UI } from "@/data/ui"
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n"

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

const pillsOf = (ui: UI): Pill[] => [
  { label: ui.footer.email, href: "mailto:cornejolealjavier@gmail.com", Icon: ArrowRight },
  { label: ui.footer.code, href: "https://github.com/JavierCornejoLeal/portfolio", Icon: ArrowRight },
]

/** Top right: the social profiles (shared with the menu), then the phone, set just like them. */
const ELSEWHERE = [
  ...SOCIALS.map((social) => ({ label: social.label, href: social.href })),
  { label: "+34 634 44 36 02", href: "tel:+34634443602" },
]

function FooterPill({ pill, newTab }: { pill: Pill; newTab: string }) {
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
      {external && <span className="sr-only">{newTab}</span>}
      <pill.Icon aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none" />
    </a>
  )
}

/** A profile or the phone: its letters roll on hover, as in the menu. Profiles open a new tab; the phone dials. */
function ElsewhereLink({ link, newTab }: { link: { label: string; href: string }; newTab: string }) {
  const { roll, play } = useHoverRoll()
  const external = link.href.startsWith("https://")
  return (
    <li>
      <a
        href={link.href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        onPointerEnter={play}
        onFocus={play}
        className="inline-block whitespace-nowrap"
      >
        <HoverRollLabel label={link.label} roll={roll} />
        {external && <span className="sr-only">{newTab}</span>}
      </a>
    </li>
  )
}

/**
 * Easter egg in the bottom line: hovering "full creative developer" rolls its letters into "full stack developer",
 * and leaving rolls them back. Under reduced motion the words just swap.
 */
function RoleSwap({ role: ROLE, revealed: ROLE_REVEALED }: { role: string; revealed: string }) {
  const reduce = useReducedMotion()
  const [label, setLabel] = React.useState(ROLE)
  const [swap, setSwap] = React.useState<{ from: string; to: string; id: number } | null>(null)

  const box = React.useRef<HTMLSpanElement>(null)
  const pointer = React.useRef("")

  const go = (to: string) => {
    if (to === label) return
    setLabel(to)
    // A roll still playing starts the next one from where it was heading.
    setSwap(reduce ? null : (current) => ({ from: current?.to ?? label, to, id: (current?.id ?? 0) + 1 }))
  }

  // When a roll ends, its letters give way to plain text right under the pointer, and the browser can drop a
  // pointerleave in that swap. So a mouse's actual hover decides where the role settles.
  const settle = () => {
    setSwap(null)
    if (pointer.current !== "mouse") return
    go(box.current?.matches(":hover") ? ROLE_REVEALED : ROLE)
  }

  return (
    // A fixed box, as wide as the longer role: the shorter one never slips out from under the pointer, and the
    // roll, laid over it, never reflows the line (on a phone a wider line would wrap and shrink JAVIER above).
    <span
      ref={box}
      data-footer-role
      onPointerEnter={(event) => {
        pointer.current = event.pointerType
        go(ROLE_REVEALED)
      }}
      onPointerLeave={() => go(ROLE)}
      className="relative inline-block whitespace-nowrap"
    >
      {/* Sizer: drawn by a pseudo-element, so it adds nothing to the line's text. */}
      <span aria-hidden="true" data-size={ROLE} className="invisible before:content-[attr(data-size)]" />
      <span className="absolute top-0 left-0">
        {swap ? (
          <>
            <span className="sr-only">{label}</span>
            <span aria-hidden="true">
              <TextSwapRoll key={swap.id} from={swap.from} to={swap.to} onAnimationComplete={settle} />
            </span>
          </>
        ) : (
          label
        )}
      </span>
    </span>
  )
}

/**
 * `home` is where the page's sections live: "" on home itself, "/" elsewhere, so Projects leads back home (Back to top
 * stays on the page, which carries its own #top).
 * `background` is the contact portal's flat green: the footer is as tall as the screen and outlasts the portal's
 * pinned view, so it paints that same green itself.
 */
export default function SiteFooter({
  background,
  home = "",
  name,
  nameAtFoot = false,
  locale = DEFAULT_LOCALE,
}: {
  background: string
  home?: string
  locale?: Locale
  /** Puts the name last, under the bottom line, its foot on the footer's bottom edge (to be cropped by it). */
  nameAtFoot?: boolean
  /** Replaces the big JAVIER set into the footer (the pages away from home print it in halftone dots). */
  name?: React.ReactNode
}) {
  // The footer only ever renders in the browser (the portal mounts once Anton has loaded), so this is the
  // visitor's current year, never the year the site was built.
  const year = new Date().getFullYear()
  const ui = uiFor(locale)

  return (
    <footer
      id="contact-inside"
      role="contentinfo"
      // Links that glide here show all of it: aligned by its end, the page's end.
      data-scroll-align="end"
      style={{ backgroundColor: background }}
      className={cn(
        "flex min-h-svh flex-col justify-between gap-12 px-6 pt-[clamp(5.5rem,14svh,9rem)] text-ink sm:px-10",
        // A name at the foot runs into the bottom edge; otherwise the bottom line keeps clear of it.
        nameAtFoot ? "pb-0" : "pb-5 max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]",
      )}
    >
      <div className="flex flex-col gap-14 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-10">
          <h2 className="text-[clamp(2.75rem,5.5vw,5.25rem)] leading-[0.95] font-medium tracking-[-0.035em] text-balance">
            {ui.footer.heading[0]}
            <br />
            {ui.footer.heading[1]}
          </h2>
          <ul className="flex flex-wrap gap-3">
            {pillsOf(ui).map((pill) => (
              <li key={pill.href}>
                <FooterPill pill={pill} newTab={ui.site.newTab} />
              </li>
            ))}
          </ul>
        </div>

        <ul aria-label={ui.footer.elsewhere} className="flex flex-col gap-2 text-[clamp(1.5rem,2.2vw,2.125rem)] leading-tight font-medium tracking-[-0.02em] sm:pr-6">
          {ELSEWHERE.map((link) => (
            <ElsewhereLink key={link.href} link={link} newTab={ui.site.newTab} />
          ))}
        </ul>
      </div>

      <div className={cn("flex flex-col gap-4", nameAtFoot && "flex-col-reverse")}>
        {/* Decorative: the name is read once, in the bottom line. */}
        {name ?? (
          <p data-footer-name aria-hidden="true" className="footer-name">
            Javier
          </p>
        )}
        <div className="flex flex-col gap-3 text-sm text-ink/75 sm:flex-row sm:items-center sm:justify-between">
          <p>
            ©{year} — Javier Cornejo, <RoleSwap role={ui.footer.role} revealed={ui.footer.roleRevealed} />
          </p>
          <nav aria-label={ui.footer.nav}>
            <ul className="legend flex gap-6 text-ink/75">
              <li>
                <a href={`${home}#projects`} className="transition-colors hover:text-ink">
                  {ui.footer.projects}
                </a>
              </li>
              <li>
                <a href="#top" className="transition-colors hover:text-ink">
                  {ui.footer.top}
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
