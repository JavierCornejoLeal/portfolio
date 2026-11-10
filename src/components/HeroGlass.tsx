import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowUpRight, FolderGit2, Layers, Mail, User, type LucideIcon } from "lucide-react"

import { LiquidGlass } from "@/components/ui/liquid-glass"
import { cn } from "@/lib/utils"

/**
 * The rim of a glass pill: the layered inset highlights of the dark Liquid Button, laid over a refracting
 * LiquidGlass so the edge catches light while the body bends whatever sits behind it.
 */
function GlassRim({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-10 rounded-[inherit]",
        "shadow-[0_0_8px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.09),inset_-3px_-3px_0.5px_-3.5px_rgba(255,255,255,0.85),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.6),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.6),inset_0_0_6px_6px_rgba(255,255,255,0.12),inset_0_0_2px_2px_rgba(255,255,255,0.06),0_0_12px_rgba(0,0,0,0.15)]",
        className,
      )}
    />
  )
}

/**
 * A refracting glass layer that fills its positioned parent. `smoked` tints the body dark instead of white,
 * so white icons stay legible even when the glass passes over white type.
 */
function GlassLayer({ radius, className, smoked = false }: { radius: number; className?: string; smoked?: boolean }) {
  return (
    <LiquidGlass
      aria-hidden="true"
      radius={radius}
      scale={40}
      aberration={6}
      bevelDepth={18}
      frost={0.4}
      tint={0.06}
      className={cn("absolute inset-0", className)}
      style={smoked ? { backgroundColor: "rgb(7 9 7 / 0.55)" } : undefined}
    >
      <GlassRim />
    </LiquidGlass>
  )
}

/* ------------------------------------------------------------------ *
 * Call to action
 * ------------------------------------------------------------------ */
export function GlassCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="group relative isolate inline-flex h-14 items-center gap-3 rounded-full px-8 text-base font-medium text-ink transition-transform duration-300 hover:scale-105 focus-visible:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
    >
      <GlassLayer radius={28} className="-z-10" />
      <span>{children}</span>
      <ArrowUpRight aria-hidden="true" className="size-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" />
    </a>
  )
}

/* ------------------------------------------------------------------ *
 * Menu: a "=" that turns into a cross and opens a glass dock to its left
 * ------------------------------------------------------------------ */
interface DockLink {
  label: string
  href: string
  Icon: LucideIcon | ((props: React.SVGProps<SVGSVGElement>) => React.ReactElement)
  external?: boolean
}

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

function LinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  )
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

const SECTIONS: DockLink[] = [
  { label: "About", href: "#about", Icon: User },
  { label: "Projects", href: "#projects", Icon: FolderGit2 },
  { label: "Stack", href: "#stack", Icon: Layers },
  { label: "Contact", href: "#contact", Icon: Mail },
]

const SOCIALS: DockLink[] = [
  { label: "GitHub", href: "https://github.com/JavierCornejoLeal", Icon: GitHubIcon, external: true },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/cornejolealjavier/", Icon: LinkedInIcon, external: true },
  { label: "Instagram", href: "https://www.instagram.com/javiiicornejo/", Icon: InstagramIcon, external: true },
]

function DockItem({ link, index, onNavigate }: { link: DockLink; index: number; onNavigate: () => void }) {
  const reduce = useReducedMotion()
  const { Icon } = link
  return (
    <motion.li
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 16, scale: 0.6 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 12, scale: 0.6 }}
      transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 420, damping: 28, delay: index * 0.035 }}
    >
      <a
        href={link.href}
        onClick={onNavigate}
        {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="group/item relative grid size-9 place-items-center rounded-2xl text-ink transition-transform duration-200 ease-out hover:-translate-y-1 hover:scale-115 focus-visible:-translate-y-1 focus-visible:scale-115 motion-reduce:transition-none motion-reduce:hover:transform-none motion-reduce:focus-visible:transform-none min-[380px]:size-10 sm:size-12"
      >
        <Icon aria-hidden="true" className="size-5 sm:size-6" />
        <span className="legend pointer-events-none absolute top-full mt-3 rounded-full bg-ground-raised/80 px-2.5 py-1 whitespace-nowrap text-ink opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover/item:opacity-100 group-focus-visible/item:opacity-100">
          {link.label}
          {link.external && <span className="sr-only"> (opens in a new tab)</span>}
        </span>
      </a>
    </motion.li>
  )
}

export function DockMenu() {
  const [open, setOpen] = React.useState(false)
  const reduce = useReducedMotion()
  const rootRef = React.useRef<HTMLDivElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  const close = React.useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) buttonRef.current?.focus()
  }, [])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true)
    }
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointer)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointer)
    }
  }, [open, close])

  const line = "absolute left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-ink transition-transform duration-300 ease-out motion-reduce:transition-none"

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="dock-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="relative isolate block size-14 rounded-full transition-transform duration-300 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 sm:size-16"
      >
        <GlassLayer radius={32} className="-z-10" />
        <span aria-hidden="true" className={cn(line, "top-[calc(50%-5px)]", open && "translate-y-[4px] rotate-45")} />
        <span aria-hidden="true" className={cn(line, "top-[calc(50%+3px)]", open && "-translate-y-[4px] -rotate-45")} />
      </button>

      <AnimatePresence>
        {open && (
          // Below the button on narrow screens, to its left from sm up.
          <div className="absolute top-full right-0 mt-3 sm:top-1/2 sm:right-full sm:mt-0 sm:mr-3 sm:-translate-y-1/2">
            <motion.nav
              id="dock-menu"
              aria-label="Main"
              style={{ transformOrigin: "right center" }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scaleX: 0.4, x: 24 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scaleX: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scaleX: 0.4, x: 24 }}
              transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 380, damping: 32 }}
              className="relative isolate w-[min(calc(100vw-3rem),22rem)] rounded-3xl sm:w-auto"
            >
              <GlassLayer radius={24} smoked className="-z-10" />
              {/* On phones the dock spans the room available and spreads its icons; from sm up it hugs them. */}
              <ul className="flex h-14 items-center justify-between px-1 sm:h-16 sm:justify-start sm:gap-1.5 sm:px-3">
                {SECTIONS.map((link, i) => (
                  <DockItem key={link.href} link={link} index={SECTIONS.length + SOCIALS.length - i} onNavigate={() => close(false)} />
                ))}
                <li aria-hidden="true" className="mx-1 h-8 w-px bg-white/20" />
                {SOCIALS.map((link, i) => (
                  <DockItem key={link.href} link={link} index={SOCIALS.length - i} onNavigate={() => close(false)} />
                ))}
              </ul>
            </motion.nav>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
