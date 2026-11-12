import { LiquidGlass } from "@/components/ui/liquid-glass"
import type { GlassCut } from "@/components/ui/glass-shape"
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
export function GlassLayer({
  radius,
  className,
  smoked = false,
  cut,
  wash,
}: {
  radius: number
  className?: string
  smoked?: boolean
  /** Lean one side: the glass draws its own rim along the slanted outline instead of the box rim. */
  cut?: GlassCut
  /** A colour washed over the glass. It sits on top of the body, so the frosted fallback keeps its dark body. */
  wash?: string
}) {
  return (
    <LiquidGlass
      aria-hidden="true"
      radius={radius}
      scale={40}
      aberration={6}
      bevelDepth={18}
      frost={0.4}
      tint={0.06}
      cut={cut}
      className={cn("absolute inset-0", className)}
      style={smoked ? { backgroundColor: "rgb(7 9 7 / 0.55)" } : undefined}
    >
      {wash ? <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundColor: wash }} /> : null}
      {cut ? null : <GlassRim />}
    </LiquidGlass>
  )
}
