import * as React from "react"
import { motion, useInView, useReducedMotion } from "motion/react"
import { Activity, Database, LayoutTemplate, PencilRuler, Rocket, Search, Server, ShieldCheck, type LucideIcon } from "lucide-react"

import { GlassLayer } from "@/components/ui/glass-layer"
import { RollingTitle } from "@/components/ui/rolling-title"
import { cn } from "@/lib/utils"

/*
 * Process: how a full project moves, drawn as a production line. Stations are glass boxes joined by hairlines,
 * and a short stroke travels each link toward the next station; build splits into three parallel lanes, and a
 * feedback link returns from operation to discovery. Horizontal on wide screens, vertical on phones.
 */

type StepId = "discover" | "design" | "interface" | "api" | "data" | "test" | "ship" | "operate"

interface Step {
  id: StepId
  number: string
  title: string
  detail: string
  Icon: LucideIcon
  /** Order of arrival on the line, for the entrance stagger. */
  stage: number
}

const STEPS: Step[] = [
  { id: "discover", number: "01", title: "Discover", detail: "Goals, users and scope", Icon: Search, stage: 0 },
  { id: "design", number: "02", title: "Design", detail: "Stack, architecture and UI", Icon: PencilRuler, stage: 1 },
  { id: "interface", number: "03", title: "Interface", detail: "Responsive, accessible UI", Icon: LayoutTemplate, stage: 2 },
  { id: "api", number: "03", title: "API", detail: "Business logic and auth", Icon: Server, stage: 2 },
  { id: "data", number: "03", title: "Data", detail: "Schema and migrations", Icon: Database, stage: 2 },
  { id: "test", number: "04", title: "Test", detail: "Automated tests and CI", Icon: ShieldCheck, stage: 3 },
  { id: "ship", number: "05", title: "Ship", detail: "Deploy, review, hand over", Icon: Rocket, stage: 4 },
  { id: "operate", number: "06", title: "Operate", detail: "Monitor and improve", Icon: Activity, stage: 5 }
]

interface Belt {
  d: string
  stage: number
}

interface Layout {
  width: number
  height: number
  nodes: Record<StepId, [number, number]>
  belts: Belt[]
  loop: Belt
  loopLabel: [number, number]
}

const WIDE: Layout = {
  width: 1320,
  height: 620,
  nodes: {
    discover: [90, 270],
    design: [300, 270],
    interface: [560, 100],
    api: [560, 270],
    data: [560, 440],
    test: [820, 270],
    ship: [1020, 270],
    operate: [1230, 270]
  },
  belts: [
    { d: "M90 270 H300", stage: 0 },
    { d: "M300 270 H410 Q430 270 430 250 V120 Q430 100 450 100 H560", stage: 1 },
    { d: "M300 270 H560", stage: 1 },
    { d: "M300 270 H410 Q430 270 430 290 V420 Q430 440 450 440 H560", stage: 1 },
    { d: "M560 100 H670 Q690 100 690 120 V250 Q690 270 710 270 H820", stage: 2 },
    { d: "M560 270 H820", stage: 2 },
    { d: "M560 440 H670 Q690 440 690 420 V290 Q690 270 710 270 H820", stage: 2 },
    { d: "M820 270 H1020", stage: 3 },
    { d: "M1020 270 H1230", stage: 4 }
  ],
  loop: { d: "M1230 270 V560 Q1230 580 1210 580 H110 Q90 580 90 560 V270", stage: 5 },
  loopLabel: [660, 580]
}

const TALL: Layout = {
  width: 360,
  height: 1180,
  nodes: {
    discover: [180, 70],
    design: [180, 240],
    interface: [72, 440],
    api: [180, 440],
    data: [288, 440],
    test: [180, 660],
    ship: [180, 830],
    operate: [180, 1000]
  },
  belts: [
    { d: "M180 70 V240", stage: 0 },
    { d: "M180 240 V320 Q180 340 160 340 H92 Q72 340 72 360 V440", stage: 1 },
    { d: "M180 240 V440", stage: 1 },
    { d: "M180 240 V320 Q180 340 200 340 H268 Q288 340 288 360 V440", stage: 1 },
    { d: "M72 440 V560 Q72 580 92 580 H160 Q180 580 180 600 V660", stage: 2 },
    { d: "M180 440 V660", stage: 2 },
    { d: "M288 440 V560 Q288 580 268 580 H200 Q180 580 180 600 V660", stage: 2 },
    { d: "M180 660 V830", stage: 3 },
    { d: "M180 830 V1000", stage: 4 }
  ],
  loop: { d: "M180 1000 V1120 Q180 1140 160 1140 H36 Q16 1140 16 1120 V90 Q16 70 36 70 H180", stage: 5 },
  loopLabel: [100, 1140]
}

const STAGE_DELAY = 0.18

function Station({ step, layout, show, index }: { step: Step; layout: Layout; show: boolean; index: number }) {
  const [x, y] = layout.nodes[step.id]
  const reduced = useReducedMotion()
  // The three build lanes sit side by side on phones: there they show their title only.
  const lane = step.stage === 2
  return (
    <motion.div
      data-step={step.id}
      className={cn("absolute z-10 flex -translate-x-1/2 flex-col items-center gap-3 md:w-40", lane ? "w-24" : "w-32")}
      style={{ left: `${(x / layout.width) * 100}%`, top: `${(y / layout.height) * 100}%`, translateY: "calc(var(--station) / -2)" }}
      initial={reduced ? false : { opacity: 0, scale: 0.85 }}
      animate={show ? { opacity: 1, scale: 1 } : undefined}
      transition={{ delay: step.stage * STAGE_DELAY + index * 0.04, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative isolate flex size-(--station) items-center justify-center rounded-[18px] text-ink">
        {/* Smoked, so a stroke reaching the station slips under it instead of showing through. */}
        <GlassLayer radius={18} smoked className="-z-10" />
        <step.Icon aria-hidden="true" className="size-[42%]" strokeWidth={1.6} />
      </div>
      <div className="rounded-md bg-ground/55 px-2 py-1 text-center backdrop-blur-sm">
        <p className="font-display text-xs font-semibold tracking-[-0.01em] text-ink sm:text-sm">
          <span className="mr-1.5 text-harlequin-300">{step.number}</span>
          {step.title}
        </p>
        <p className={cn("mt-0.5 text-[0.7rem] leading-snug text-ink-muted sm:text-xs", lane && "hidden md:block")}>{step.detail}</p>
      </div>
    </motion.div>
  )
}

/** Travelling stroke: viewBox units per second, its length, and the pause before it sets off again. */
const PULSE_SPEED = 260
const PULSE_LENGTH = 34
const PULSE_REST = 0.9

/**
 * One short stroke riding a link from end to end. The link's length is measured, so every stroke is the same
 * size and speed whatever the link's shape; the dash gap is longer than the link, so only one stroke shows.
 */
function Pulse({ d, delay, loop, running }: { d: string; delay: number; loop: boolean; running: boolean }) {
  const ref = React.useRef<SVGPathElement>(null)
  const [length, setLength] = React.useState(0)

  React.useLayoutEffect(() => {
    setLength(ref.current?.getTotalLength() ?? 0)
  }, [d])

  const rest = PULSE_REST * PULSE_SPEED
  const style = length
    ? ({
        strokeDasharray: `${PULSE_LENGTH} ${length + PULSE_LENGTH + rest}`,
        strokeDashoffset: PULSE_LENGTH,
        "--pulse-from": `${PULSE_LENGTH}`,
        "--pulse-to": `${-(length + rest)}`,
        animationDuration: `${(length + PULSE_LENGTH + rest) / PULSE_SPEED}s`,
        animationDelay: `${delay}s`
      } as React.CSSProperties)
    : { strokeDasharray: `0 1` }

  return (
    <path
      ref={ref}
      data-pulse
      d={d}
      stroke="currentColor"
      strokeWidth={loop ? 1.5 : 2}
      strokeLinecap="round"
      style={style}
      className={cn(
        loop ? "text-harlequin-200/50" : "text-harlequin-300",
        running && length > 0 ? "animate-[process-pulse_linear_infinite] opacity-100" : "opacity-0"
      )}
    />
  )
}

function Line({ layout, className }: { layout: Layout; className: string }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const show = useInView(ref, { once: true, amount: 0.25 })
  const visible = useInView(ref, { amount: 0 })
  const reduced = useReducedMotion()
  // Strokes travel only once the line has drawn in, while it is on screen, and never under reduced motion.
  const moving = show && visible && !reduced

  const links = [...layout.belts, layout.loop]

  return (
    <div
      ref={ref}
      data-process-line
      data-moving={moving ? "true" : "false"}
      aria-hidden="true"
      className={cn("relative w-full", className)}
      style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
    >
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} fill="none" className="absolute inset-0 size-full overflow-visible">
        {links.map((link, i) => {
          const loop = link === layout.loop
          return (
            <g key={i}>
              <motion.path
                data-link
                d={link.d}
                stroke="currentColor"
                strokeWidth={1}
                className={loop ? "text-ink/12" : "text-ink/20"}
                initial={reduced ? false : { pathLength: 0 }}
                animate={show ? { pathLength: 1 } : undefined}
                transition={{ delay: link.stage * STAGE_DELAY + 0.1, duration: 0.6, ease: "easeInOut" }}
              />
              {/* One start per stage: links that share a first stretch carry one stroke that splits at the fork. */}
              <Pulse d={link.d} loop={loop} running={moving} delay={1.2 + link.stage * 0.45} />
            </g>
          )
        })}
        <text
          x={layout.loopLabel[0]}
          y={layout.loopLabel[1] - 10}
          textAnchor="middle"
          className="fill-ink-muted font-sans text-[13px] tracking-[0.18em] uppercase"
        >
          Feedback loop
        </text>
      </svg>
      {STEPS.map((step, index) => (
        <Station key={step.id} step={step} layout={layout} show={show || Boolean(reduced)} index={index} />
      ))}
    </div>
  )
}

export default function Process() {
  return (
    <section data-process aria-labelledby="process-title" className="relative flex min-h-svh flex-col px-6 pt-24 pb-32 sm:px-10 sm:pt-28 lg:px-16">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
        <RollingTitle id="process-title" text="Process" />
        <p data-process-lede className="max-w-md text-lg leading-snug text-ink/80 sm:text-xl lg:pb-2 lg:text-right">
          Like a production line: tools chosen to work well together, and every stage hands over something you can test before the next one starts.
        </p>
      </div>

      {/* The same stations as a list, for screen readers; the line itself is decorative. */}
      <ol className="sr-only">
        {STEPS.map((step) => (
          <li key={step.id}>
            {step.number} {step.title}: {step.detail}
          </li>
        ))}
        <li>Then a feedback loop from operation back to discovery.</li>
      </ol>

      <div className="mx-auto mt-14 flex w-full max-w-[1400px] flex-1 items-center sm:mt-20 [--station:52px] md:[--station:clamp(56px,5vw,80px)]">
        <Line layout={WIDE} className="hidden md:block" />
        <Line layout={TALL} className="mx-auto max-w-[420px] md:hidden" />
      </div>
    </section>
  )
}
