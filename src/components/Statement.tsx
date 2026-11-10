import * as React from "react"
import { motion, useScroll, useTransform, type MotionValue } from "motion/react"

import { LayoutTextFlip } from "@/components/ui/layout-text-flip"

/*
 * Statement: the section after the hero. It is several screens tall, but its content is pinned (sticky) to
 * the viewport over the page's living backdrop, so scrolling reveals the paragraph word by word instead of
 * moving the page. Only once the last word is white does the section scroll away.
 */

/** One word each, from the CV: corporate websites, platforms, admin dashboards, REST APIs. */
const WORDS = ["websites", "platforms", "dashboards", "APIs"]

const COPY =
  "From the first sketch to production, I design and build the whole product: interfaces people enjoy using, the backend and data that keep them running, and the tools your team needs to manage it on its own. Clear code, honest timelines, and software you can actually see through."

/** Share of the section's scroll spent revealing words; the rest holds the finished paragraph before leaving. */
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

export default function Statement() {
  const sectionRef = React.useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] })
  const words = COPY.split(" ")
  const step = (REVEAL_END - REVEAL_START) / words.length

  return (
    <section ref={sectionRef} data-statement aria-labelledby="statement-title" className="relative h-[320vh]">
      <div className="sticky top-0 h-dvh overflow-hidden">
        <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center gap-10 px-8 pb-24 text-center sm:gap-14 sm:px-16 sm:pb-0">
          <h2 id="statement-title">
            <span className="sr-only">I build {WORDS.slice(0, -1).join(", ")} and {WORDS.at(-1)}</span>
            <span aria-hidden="true" className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
              <LayoutTextFlip
                text="I build"
                words={WORDS}
                className="font-display text-3xl font-semibold tracking-[-0.02em] drop-shadow-none md:text-5xl"
                wordClassName="rounded-xl bg-ground/55 font-display text-3xl font-semibold tracking-[-0.02em] text-harlequin-200 backdrop-blur-md drop-shadow-none md:text-5xl"
              />
            </span>
          </h2>
          <p className="max-w-4xl text-2xl leading-snug font-medium tracking-[-0.01em] text-balance text-ink sm:text-3xl sm:leading-snug md:text-[2.5rem] md:leading-[1.2]">
            {words.map((word, i) => {
              const start = REVEAL_START + i * step
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
        </div>
      </div>
    </section>
  )
}
