import * as React from "react"
import { ArrowRight } from "lucide-react"

import { GlassLayer } from "@/components/ui/glass-layer"
import { cn } from "@/lib/utils"

/* How far the shared slant leans over the link's height, and the gap the two pieces keep across it, in px. */
const SLANT = 12
const GAP = 8

/* Each piece answers the pointer on its own; keyboard focus lifts both, since they are one link. */
const PIECE =
  "relative isolate transition-transform duration-300 ease-out hover:scale-105 group-focus-visible:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:group-focus-visible:scale-100"

/**
 * A link made of two glass pieces that lean into each other along one shared slant: a smoked body carrying the
 * label and a green-washed key carrying the arrow. Each piece is a rounded trapezoid of real glass, so it bends
 * whatever sits behind it all the way round, along the slanted side too.
 */
export function GlassSplitLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="group inline-flex h-14 items-stretch rounded-2xl text-ink"
    >
      <span data-glass-piece className={cn(PIECE, "flex items-center pr-9 pl-7")}>
        <GlassLayer radius={16} smoked cut={{ side: "end", slant: SLANT }} className="-z-10" />
        <span className="legend text-sm tracking-[0.12em] whitespace-nowrap">{children}</span>
      </span>
      {/* Pulled back by the slant so the two leaning sides run parallel, GAP apart. */}
      <span
        data-glass-piece
        aria-hidden="true"
        className={cn(PIECE, "grid w-16 place-items-center pl-1")}
        style={{ marginLeft: GAP - SLANT }}
      >
        <GlassLayer radius={16} cut={{ side: "start", slant: SLANT }} wash="rgb(120 255 80 / 0.2)" className="-z-10" />
        <ArrowRight className="size-5 transition-transform duration-300 group-focus-visible:translate-x-1 [span:hover>&]:translate-x-1 motion-reduce:transition-none" />
      </span>
    </a>
  )
}
