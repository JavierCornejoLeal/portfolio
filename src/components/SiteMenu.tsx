import * as React from "react"

import { LiquidGlass } from "@/components/ui/liquid-glass"
import { HoverRollLabel, useHoverRoll } from "@/components/ui/hover-roll"
import { cn } from "@/lib/utils"
import { DEFAULT_LOCALE, localePath, type Locale } from "@/lib/i18n"

/*
 * Site menu: a "=" pinned top right that turns into a cross. Opening it stretches the button's own circle into a
 * liquid-glass panel, like a drop of water spreading into a puddle: the panel is laid out at its final size from the
 * start (its refraction map is built once) and an inset() clip with round corners grows from exactly the button's
 * box to the whole panel (see #site-menu in global.css). The clip sits on the glass and the links themselves, never
 * on the nav: a clipped ancestor would cut the glass off from the page it bends. The links stand in a column, in
 * words only, and roll their letters on hover. On phones the panel takes the whole screen and the page holds still.
 */

export interface MenuLink {
  label: string
  href: string
}

/** Sections of the page. Contact glides to the footer, where every way to get in touch is in view. */
export const SECTIONS: MenuLink[] = [
  { label: "About", href: "/about" },
  { label: "Projects", href: "#projects" },
  // The footer mounts with the contact portal on approach; the page's link handling finds its way (lib/glide.ts).
  { label: "Contact", href: "#contact-inside" },
]

/** Social profiles, shared with the footer. */
export const SOCIALS: MenuLink[] = [
  { label: "GitHub", href: "https://github.com/JavierCornejoLeal" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/cornejolealjavier/" },
  { label: "Instagram", href: "https://www.instagram.com/javiiicornejo/" },
]

const PHONE = "(width < 40rem)"

/**
 * The menu's one glass material, shared by the resting circle and the panel it stretches into: a strong lens with
 * chromatic aberration at the rim over a dark body (--menu-smoke, set on .site-menu), lit along its top edge.
 * Being the same material is what lets the circle hand over to the panel without a visible change.
 */
export function MenuGlass({ radius, className }: { radius: number; className?: string }) {
  return (
    <LiquidGlass
      aria-hidden="true"
      radius={radius}
      scale={48}
      aberration={14}
      bevelDepth={37}
      frost={0.4}
      className={cn("absolute inset-0 -z-10 shadow-[0_12px_40px_rgb(0_0_0/0.25),inset_0_1px_0_rgb(255_255_255/0.5)]", className)}
      style={{ backgroundColor: "rgb(7 9 7 / var(--menu-smoke))" }}
    />
  )
}

/** A menu link whose letters roll on hover or keyboard focus, every time; the plain word is what screen readers get. */
function RollLink({ link, index, onNavigate }: { link: MenuLink; index: number; onNavigate: () => void }) {
  const { roll, play } = useHoverRoll()
  const external = link.href.startsWith("https://")

  return (
    <li style={{ "--menu-index": index } as React.CSSProperties}>
      <a
        href={link.href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        onClick={onNavigate}
        onPointerEnter={play}
        onFocus={play}
        className="menu-item block w-fit"
      >
        <HoverRollLabel label={link.label} roll={roll} />
        {external && <span className="sr-only"> (opens in a new tab)</span>}
      </a>
    </li>
  )
}

/**
 * `home` is where the page's sections live. On the home page it is "" and the links glide in place; elsewhere (a
 * project's page) it is "/", so Projects and Contact lead back home, which glides on to them (lib/glide.ts).
 */
export default function SiteMenu({ home = "", locale = DEFAULT_LOCALE }: { home?: string; locale?: Locale }) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  const close = React.useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) buttonRef.current?.focus()
  }, [])

  React.useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true)
    }
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointer)
    // On phones the panel covers the screen: hold the page still underneath it.
    const html = document.documentElement
    const lock = window.matchMedia(PHONE).matches
    if (lock) html.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointer)
      if (lock) html.style.overflow = ""
    }
  }, [open, close])

  // Away from home, Home leads the list: visitors who land straight on a page have no home in their history to go
  // back to. Like any link to another page of the site, it leaves through the page curtain (Layout.astro).
  // Pages of the site (About) stay in the language being read.
  const pages = SECTIONS.map((link) => (link.href.startsWith("/") ? { ...link, href: localePath(locale, link.href) } : link))
  const sections = home ? [{ label: "Home", href: home }, ...pages] : pages

  const line = "absolute left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-ink transition-transform duration-300 ease-out motion-reduce:transition-none"

  return (
    <div ref={rootRef} className="site-menu relative">
      {/* The entrance runs on the button alone: an animated ancestor would become the phone panel's containing
          block and unpin it from the screen. */}
      <div className="place-in relative z-10" style={{ "--place-delay": "0.1s" } as React.CSSProperties}>
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
          className="relative isolate block size-14 rounded-full transition-transform duration-300 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 sm:size-16"
        >
          {/* Gives way to the panel while it is open: see .menu-button-glass in global.css. */}
          <MenuGlass radius={32} className="menu-button-glass" />
          <span aria-hidden="true" className={cn(line, "top-[calc(50%-5px)]", open && "translate-y-[4px] rotate-45")} />
          <span aria-hidden="true" className={cn(line, "top-[calc(50%+3px)]", open && "-translate-y-[4px] -rotate-45")} />
        </button>
      </div>

      <nav id="site-menu" aria-label="Main" data-open={open ? "" : undefined} inert={!open}>
        <MenuGlass radius={28} className="menu-reveal" />
        <div className="menu-reveal relative flex h-full flex-col justify-between gap-10 px-8 pt-28 pb-12 sm:justify-start sm:gap-12 sm:px-10 sm:pt-28 sm:pb-10">
          <ul className="flex flex-col gap-2 text-6xl leading-[1.05] font-medium tracking-[-0.03em] sm:text-[3.25rem]">
            {sections.map((link, index) => (
              <RollLink
                key={link.href}
                link={link.href.startsWith("#") ? { ...link, href: home + link.href } : link}
                index={index}
                onNavigate={() => close(false)}
              />
            ))}
          </ul>
          <ul className="flex flex-col gap-1.5 text-3xl leading-snug font-medium tracking-[-0.01em] text-ink/80 sm:text-2xl">
            {SOCIALS.map((link, index) => (
              <RollLink key={link.href} link={link} index={sections.length + index} onNavigate={() => close(false)} />
            ))}
          </ul>
        </div>
      </nav>
    </div>
  )
}
