import * as React from "react"
import { motion, useReducedMotion } from "motion/react"

/*
 * Text hover effect (after Aceternity UI's): the text is drawn as a hairline outline, and under the pointer a soft
 * spotlight reveals the same outline in a gradient. Adapted to this site:
 * - the gradient is the site's greens, and the outline its ink at full strength: the pointer adds only the green,
 *   with no brighter outline flashing in;
 * - the ids are per instance (useId), so several on one page never borrow one another's gradient or mask;
 * - the outline draws in once it scrolls into view rather than on mount, and appears at once under reduced motion;
 * - the viewBox, font, stroke width and spotlight are props, so it can be sized to a short word such as a step number.
 */

const GREENS = ["#abff90", "#5bff2e", "#2fbf1a", "#5bff2e", "#abff90"]

export interface TextHoverEffectProps {
  text: string
  /** Seconds the spotlight takes to follow the pointer; 0 follows it exactly. */
  duration?: number
  viewBox?: string
  /** Font size in viewBox units. */
  fontSize?: number
  strokeWidth?: number
  /** Radius of the spotlight that reveals the gradient, relative to the viewBox. */
  spotlight?: string
  className?: string
}

export function TextHoverEffect({
  text,
  duration,
  viewBox = "0 0 300 100",
  fontSize = 72,
  strokeWidth = 0.3,
  spotlight = "20%",
  className,
}: TextHoverEffectProps) {
  const id = React.useId()
  const gradientId = `${id}-gradient`
  const revealId = `${id}-reveal`
  const maskId = `${id}-mask`
  const reduce = useReducedMotion()
  const svgRef = React.useRef<SVGSVGElement>(null)
  const [hovered, setHovered] = React.useState(false)
  const [maskPosition, setMaskPosition] = React.useState({ cx: "50%", cy: "50%" })

  const follow = (event: React.MouseEvent) => {
    const box = svgRef.current?.getBoundingClientRect()
    if (!box) return
    setMaskPosition({
      cx: `${((event.clientX - box.left) / box.width) * 100}%`,
      cy: `${((event.clientY - box.top) / box.height) * 100}%`,
    })
  }

  const textProps = {
    x: "50%",
    y: "50%",
    textAnchor: "middle",
    dominantBaseline: "middle",
    strokeWidth,
    fontSize,
    className: "font-poster fill-transparent",
  } as const

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={follow}
      className={["select-none", className].filter(Boolean).join(" ")}
    >
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse">
          {hovered && GREENS.map((color, index) => <stop key={index} offset={`${index * 25}%`} stopColor={color} />)}
        </linearGradient>
        <motion.radialGradient
          id={revealId}
          gradientUnits="userSpaceOnUse"
          r={spotlight}
          initial={{ cx: "50%", cy: "50%" }}
          animate={maskPosition}
          transition={{ duration: duration ?? 0, ease: "easeOut" }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>
        <mask id={maskId}>
          <rect x="0" y="0" width="100%" height="100%" fill={`url(#${revealId})`} />
        </mask>
      </defs>
      {/* The resting outline, drawn in the first time it comes into view. */}
      <motion.text
        {...textProps}
        className={`${textProps.className} stroke-ink`}
        initial={reduce ? false : { strokeDashoffset: 1000, strokeDasharray: 1000 }}
        whileInView={{ strokeDashoffset: 0, strokeDasharray: 1000 }}
        viewport={{ once: true }}
        transition={{ duration: 4, ease: "easeInOut" }}
      >
        {text}
      </motion.text>
      {/* The green outline, seen only through the spotlight that follows the pointer. */}
      <text {...textProps} stroke={`url(#${gradientId})`} mask={`url(#${maskId})`}>
        {text}
      </text>
    </svg>
  )
}
