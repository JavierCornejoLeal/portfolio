import * as React from "react"
import { motion, useScroll, useTransform, type MotionValue } from "motion/react"

import { uiFor } from "@/data/ui"
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n"

/*
 * Statement: the section after the hero. It is several screens tall, but its content is pinned (sticky) to
 * the viewport over the page's living backdrop, so scrolling reveals the paragraphs word by word instead of
 * moving the page. Only once the last word is white does the section scroll away.
 */

/** Share of the section's scroll spent revealing words; the rest holds the finished text before leaving. */
const REVEAL_START = 0.04
const REVEAL_END = 0.82
/** Opacity of a word before its turn. */
const DIM = 0.16

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  // Function form on purpose: Motion hands the array form of a scroll-linked opacity to a native
  // ScrollTimeline, which ignores the section's start/end offsets and maps the whole document instead.
  const opacity = useTransform(progress, (v) => {
    const t = Math.min(1, Math.max(0, (v - range[0]) / (range[1] - range[0])))
    return DIM + (1 - DIM) * t
  })
  return <motion.span style={{ opacity }}>{children}</motion.span>
}

export default function Statement({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  // The lead sits flush left under the title; the rest is indented under it, at the same size.
  const { title, word, lead: LEAD, body: BODY } = uiFor(locale).statement
  const sectionRef = React.useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] })
  const step = (REVEAL_END - REVEAL_START) / [LEAD, ...BODY].join(" ").split(" ").length
  // Words reveal in reading order, across the lead and every paragraph after it.
  let index = 0

  const reveal = (text: string, className: string) => {
    const words = text.split(" ")
    return (
      <p className={className}>
        {words.map((word, i) => {
          const start = REVEAL_START + index++ * step
          return (
            <React.Fragment key={i}>
              <Word progress={scrollYProgress} range={[start, start + step * 2]}>
                {word}
              </Word>
              {i < words.length - 1 && " "}
            </React.Fragment>
          )
        })}
      </p>
    )
  }

  return (
    <section ref={sectionRef} data-statement aria-labelledby="statement-title" className="relative h-[200vh]">
      <div className="sticky top-0 h-dvh overflow-hidden">
        {/* Same side insets as the hero (its --inset-x), so the title lines up with the slogan above it. Sized by
            width and height, so everything always fits the pinned screen. On phones it keeps clear of the language
            switch and the menu pinned top right, whose row the title would otherwise run under. */}
        <div className="relative z-10 flex h-full flex-col justify-center gap-[clamp(1.75rem,6svh,4rem)] px-[clamp(2rem,7vw,10rem)] pt-24 pb-6 sm:py-0">
          <h2
            id="statement-title"
            className="flex flex-wrap items-center gap-x-[0.3em] gap-y-2 font-display text-[clamp(2.5rem,min(7vw,11svh),6.5rem)] leading-none font-semibold tracking-[-0.03em]"
          >
            {title}{" "}
            <span className="rounded-[0.22em] bg-ground/55 px-[0.25em] pt-[0.08em] pb-[0.14em] text-harlequin-200 ring-1 ring-white/10 backdrop-blur-md">
              {word}
            </span>
          </h2>
          <div className="flex flex-col gap-[1.3em] sm:gap-[1.6em] text-[clamp(1.125rem,min(2.3vw,3.7svh),2.5rem)] leading-[1.25] font-medium tracking-[-0.015em] text-ink">
            {reveal(LEAD, "text-pretty")}
            <div className="flex flex-col gap-[1.3em] sm:ml-[12%] sm:gap-[1.6em]">
              {BODY.map((text) => (
                <React.Fragment key={text}>{reveal(text, "text-pretty")}</React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
