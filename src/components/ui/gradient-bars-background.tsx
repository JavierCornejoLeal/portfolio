import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * Gradient bars, after the GradientBars component the author supplied: a row of vertical bars rising from the
 * bottom, short in the middle and tall at the edges, each a gradient fading upwards and breathing in turn. Changes,
 * all deliberate: the keyframes live in global.css (.gradient-bar) instead of a <style> per instance, so reduced
 * motion can hold them still; the layer ignores the pointer; and the default colour is the site's green.
 */

/** Height of a bar as a share of the whole, from its place in the row: 30% in the middle up to 100% at the edges. */
function barHeight(index: number, total: number) {
  const position = total > 1 ? index / (total - 1) : 0.5
  const fromCentre = Math.abs(position - 0.5) * 2
  return 0.3 + 0.7 * Math.pow(fromCentre, 1.2)
}

export function GradientBars({
  numBars = 15,
  gradientFrom = "rgba(91, 255, 46, 0.55)",
  gradientTo = "transparent",
  animationDuration = 2,
  className,
}: {
  numBars?: number
  gradientFrom?: string
  gradientTo?: string
  animationDuration?: number
  className?: string
}) {
  return (
    <div data-gradient-bars aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="flex h-full w-full">
        {Array.from({ length: numBars }, (_, index) => (
          <div
            key={index}
            data-bar
            className="gradient-bar h-full flex-1 origin-bottom"
            style={
              {
                backgroundImage: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})`,
                "--initial-scale": barHeight(index, numBars),
                animationDuration: `${animationDuration}s`,
                animationDelay: `${index * 0.1}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  )
}
