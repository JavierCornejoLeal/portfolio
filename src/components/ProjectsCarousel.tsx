import * as React from "react"
import { motion } from "motion/react"
import { ArrowUpRight, XIcon } from "lucide-react"

import { projects, type Project } from "@/data/projects"
import { LensCarousel } from "@/components/projects/lens-carousel"
import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogImage,
  MorphingDialogTrigger
} from "@/components/ui/morphing-dialog"
import { RollingTitle } from "@/components/ui/rolling-title"
import { cn } from "@/lib/utils"

/*
 * Projects: an endless strip of covers seen through a liquid-glass lens (see lens-carousel.ts), over the page's
 * living backdrop. The covers are pixels on a canvas, so each project also has an invisible dialog trigger laid
 * exactly over its card in the calm middle of the lens: it gives keyboard and screen-reader access, and it is
 * the box the morphing dialog grows from and returns to.
 */

const DIALOG_TRANSITION = { duration: 0.3, ease: "easeInOut" } as const
/** The dialog's close morph, plus a margin, before the canvas card takes over from the trigger's image again. */
const CLOSE_SETTLE_MS = 450

const REVEAL_VARIANTS = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0 } }
}

function ProjectDialogBody({ project }: { project: Project }) {
  return (
    <MorphingDialogContainer>
      <MorphingDialogContent
        aria-label={project.name}
        className="relative overflow-hidden bg-ground-raised"
        style={{ width: "min(92vw, calc(86svh * 1.509))", borderRadius: 4 }}
      >
        <MorphingDialogImage
          src={project.cover}
          alt={`${project.name} website`}
          className="block aspect-[1.509] h-auto w-full object-cover"
          style={{ borderRadius: 4 }}
        />

        <motion.div
          className="absolute inset-x-0 bottom-0 flex justify-center gap-2 p-3 sm:gap-3 sm:p-6"
          variants={REVEAL_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-harlequin-400 px-4 font-display text-[0.7rem] font-semibold tracking-[0.12em] text-ground uppercase transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-harlequin-200 sm:h-12 sm:px-6 sm:text-xs motion-reduce:transition-none"
          >
            Visit site
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </motion.div>
      </MorphingDialogContent>
      <MorphingDialogClose
        className="fixed top-6 right-6 cursor-pointer rounded-full bg-ink p-2 text-ground"
        variants={{
          initial: { opacity: 0 },
          animate: { opacity: 1, transition: { delay: 0.3, duration: 0.1 } },
          exit: { opacity: 0, transition: { duration: 0 } }
        }}
      >
        <XIcon aria-hidden="true" className="size-5" />
      </MorphingDialogClose>
    </MorphingDialogContainer>
  )
}

function StaticStrip() {
  return (
    <div data-projects-static className="flex h-full snap-x snap-mandatory items-center gap-2.5 overflow-x-auto px-[10vw] sm:gap-3.5">
      {projects.map((project) => (
        <MorphingDialog key={project.url} transition={DIALOG_TRANSITION}>
          <MorphingDialogTrigger
            aria-label={`Open ${project.name}`}
            className="w-[90vw] shrink-0 snap-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-harlequin-300 sm:w-[min(45vw,1100px)]"
            style={{ borderRadius: 3 }}
          >
            <MorphingDialogImage
              src={project.cover}
              alt={`${project.name} website`}
              className="block aspect-[1.509] w-full object-cover"
              style={{ borderRadius: 3 }}
            />
          </MorphingDialogTrigger>
          <ProjectDialogBody project={project} />
        </MorphingDialog>
      ))}
    </div>
  )
}

export default function ProjectsCarousel() {
  const stageRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const engineRef = React.useRef<LensCarousel | null>(null)
  const anchorRefs = React.useRef<Array<HTMLDivElement | null>>([])
  /** The copy each trigger follows while its dialog is open; otherwise the copy nearest the centre. */
  const trackedInstance = React.useRef<Array<number | null>>(projects.map(() => null))
  const closeTimer = React.useRef<number | undefined>(undefined)
  const [fallback, setFallback] = React.useState(false)
  /** The project whose trigger image is showing: open, or still morphing back into the strip. */
  const [revealed, setRevealed] = React.useState<number | null>(null)

  const placeAnchors = React.useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    projects.forEach((_, project) => {
      const anchor = anchorRefs.current[project]
      if (!anchor) return
      const rect = engine.cardRect(trackedInstance.current[project] ?? engine.nearestInstance(project))
      anchor.style.left = `${rect.x}px`
      anchor.style.top = `${rect.y}px`
      anchor.style.width = `${rect.width}px`
      anchor.style.height = `${rect.height}px`
    })
  }, [])

  React.useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (!stage || !canvas) return
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    let engine: LensCarousel
    try {
      engine = new LensCarousel({
        canvas,
        stage,
        covers: projects.map((project) => project.cover),
        reducedMotion: motionQuery.matches,
        onOpen: (instance) => {
          const project = engine.projectOf(instance)
          trackedInstance.current[project] = instance
          placeAnchors()
          anchorRefs.current[project]?.querySelector("button")?.click()
        },
        onFrame: placeAnchors,
        onActiveChange: (project) => (stage.dataset.active = String(project)),
        onRunningChange: (running) => (stage.dataset.running = String(running))
      })
    } catch {
      setFallback(true)
      return
    }
    engineRef.current = engine
    placeAnchors()
    const onMotionChange = () => engine.setReducedMotion(motionQuery.matches)
    motionQuery.addEventListener("change", onMotionChange)
    return () => {
      motionQuery.removeEventListener("change", onMotionChange)
      window.clearTimeout(closeTimer.current)
      engine.destroy()
      engineRef.current = null
    }
  }, [placeAnchors])

  const onOpenChange = (project: number) => (open: boolean) => {
    const engine = engineRef.current
    window.clearTimeout(closeTimer.current)
    if (!engine) return
    if (open) {
      const instance = trackedInstance.current[project] ?? engine.nearestInstance(project)
      trackedInstance.current[project] = instance
      placeAnchors()
      engine.setPaused(true)
      engine.setHiddenInstance(instance)
      setRevealed(project)
      return
    }
    closeTimer.current = window.setTimeout(() => {
      engine.setHiddenInstance(null)
      engine.setPaused(false)
      trackedInstance.current[project] = null
      setRevealed(null)
    }, CLOSE_SETTLE_MS)
  }

  return (
    <section id="projects" data-projects aria-labelledby="projects-title" className="relative">
      <div
        ref={stageRef}
        data-projects-stage
        tabIndex={fallback ? -1 : 0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Projects"
        aria-describedby="projects-hint"
        className="relative h-svh w-full touch-pan-y outline-none select-none focus-visible:outline-2 focus-visible:-outline-offset-8 focus-visible:outline-harlequin-300/60"
      >
        {fallback ? (
          <StaticStrip />
        ) : (
          <>
            <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full cursor-grab active:cursor-grabbing" />
            {projects.map((project, index) => (
              <div
                key={project.url}
                ref={(element) => {
                  anchorRefs.current[index] = element
                }}
                data-project-anchor
                // Tabbing to a project brings its card to the middle, where it opens from.
                onFocus={() => {
                  const engine = engineRef.current
                  if (engine) engine.centerInstance(engine.nearestInstance(index))
                }}
                className="pointer-events-none absolute top-0 left-0 size-0"
              >
                <MorphingDialog transition={DIALOG_TRANSITION} onOpenChange={onOpenChange(index)}>
                  <MorphingDialogTrigger
                    aria-label={`Open ${project.name}`}
                    className="block size-full outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-harlequin-300"
                    style={{ borderRadius: 3 }}
                  >
                    {/* The veil, not the image, carries the visibility: Motion writes an inline opacity on
                        layoutId elements, which would override a class on the image and leave a flat copy
                        of the cover floating over the lens. */}
                    <span
                      data-trigger-veil
                      className={cn("block size-full", revealed === index ? "opacity-100" : "opacity-0")}
                    >
                      <MorphingDialogImage
                        src={project.cover}
                        alt=""
                        className="block size-full object-cover"
                        style={{ borderRadius: 3 }}
                      />
                    </span>
                  </MorphingDialogTrigger>
                  <ProjectDialogBody project={project} />
                </MorphingDialog>
              </div>
            ))}
          </>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-[13%] z-10 flex justify-center px-6 text-center sm:top-[11%]">
          <RollingTitle id="projects-title" text="Featured projects" className="pointer-events-auto" />
        </div>
        <p
          id="projects-hint"
          className="pointer-events-none absolute inset-x-0 bottom-[14%] text-center text-[0.7rem] font-medium tracking-[0.2em] text-ink/70 uppercase"
        >
          Drag or swipe to explore
        </p>
      </div>
    </section>
  )
}
