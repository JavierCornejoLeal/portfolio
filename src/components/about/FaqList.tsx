import * as React from "react"

import { HoverRollLabel, useHoverRoll } from "@/components/ui/hover-roll"

/*
 * The About page's questions. Each is a <details>: it works before this hydrates and reads as a disclosure to
 * assistive technology. Once live, an answer grows open and folds shut with an eased height instead of jumping, and a
 * question's letters roll on hover or focus like the footer's links. Under reduced motion it opens and closes at once.
 */

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

function Question({ question, answer }: { question: string; answer: string }) {
  const { roll, play } = useHoverRoll()
  const details = React.useRef<HTMLDetailsElement>(null)
  const body = React.useRef<HTMLDivElement>(null)
  const running = React.useRef<Animation | null>(null)
  const [open, setOpen] = React.useState(false)

  const toggle = (event: React.MouseEvent) => {
    event.preventDefault()
    const element = details.current!
    const panel = body.current!
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    // Start from wherever a running animation has got to.
    const from = panel.getBoundingClientRect().height
    running.current?.cancel()

    if (!open) {
      setOpen(true)
      element.open = true
      if (still) return
      const to = panel.scrollHeight
      running.current = panel.animate(
        [
          { height: `${from}px`, opacity: 0 },
          { height: `${to}px`, opacity: 1 },
        ],
        { duration: 550, easing: EASE },
      )
    } else {
      setOpen(false)
      if (still) {
        element.open = false
        return
      }
      const animation = panel.animate(
        [
          { height: `${from}px`, opacity: 1 },
          { height: "0px", opacity: 0 },
        ],
        { duration: 420, easing: EASE },
      )
      running.current = animation
      animation.onfinish = () => {
        element.open = false
      }
    }
  }

  return (
    <details ref={details} data-reveal className="faq">
      <summary
        onClick={toggle}
        onPointerEnter={play}
        onFocus={play}
        className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[clamp(1.25rem,2vw,1.75rem)] leading-snug tracking-[-0.01em] [&::-webkit-details-marker]:hidden"
      >
        <span>
          <HoverRollLabel label={question} roll={roll} />
        </span>
        <span aria-hidden="true" className="relative size-5 shrink-0">
          <span className="absolute top-1/2 left-0 h-px w-full bg-current" />
          <span
            className={`absolute top-1/2 left-0 h-px w-full bg-current transition-transform duration-500 motion-reduce:transition-none ${open ? "rotate-0" : "rotate-90"}`}
          />
        </span>
      </summary>
      <div ref={body} data-faq-body className="overflow-hidden">
        <p className="max-w-2xl pb-8 text-lg leading-relaxed text-pretty text-ink/70">{answer}</p>
      </div>
    </details>
  )
}

export default function FaqList({ faqs }: { faqs: { question: string; answer: string }[] }) {
  return (
    <div className="flex flex-col">
      {faqs.map((faq) => (
        <Question key={faq.question} {...faq} />
      ))}
    </div>
  )
}
