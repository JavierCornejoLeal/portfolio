import * as React from "react"

import { projects } from "@/data/projects"
import { LensCarousel } from "@/components/projects/lens-carousel"
import { leaveTo } from "@/lib/curtain"
import { DEFAULT_LOCALE, localePath, type Locale } from "@/lib/i18n"
import { uiFor, type UI } from "@/data/ui"
import { RollingTitle } from "@/components/ui/rolling-title"

/*
 * Projects: an endless strip of covers seen through a liquid-glass lens (see lens-carousel.ts), over the page's
 * living backdrop. A click on the middle card opens the project's own page; a click on a neighbour brings it to the
 * middle. The covers are pixels on a canvas, so each project also has an invisible link laid exactly over its card:
 * it gives keyboard and screen-reader access, and Enter on it opens the page.
 */

function StaticStrip({ pageOf, ui }: { pageOf: (slug: string) => string; ui: UI }) {
  return (
    <div data-projects-static className="flex h-full snap-x snap-mandatory items-center gap-2.5 overflow-x-auto px-[10vw] sm:gap-3.5">
      {projects.map((project) => (
        <a
          key={project.slug}
          href={pageOf(project.slug)}
          aria-label={ui.projects.open(project.name)}
          className="w-[90vw] shrink-0 snap-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-harlequin-300 sm:w-[min(45vw,1100px)]"
          style={{ borderRadius: 3 }}
        >
          <img
            src={project.cover}
            alt={ui.projects.cover(project.name)}
            className="block aspect-[1.509] w-full object-cover"
            style={{ borderRadius: 3 }}
          />
        </a>
      ))}
    </div>
  )
}

export default function ProjectsCarousel({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const pageOf = (slug: string) => localePath(locale, `/projects/${slug}`)
  const ui = uiFor(locale)
  const stageRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const engineRef = React.useRef<LensCarousel | null>(null)
  const anchorRefs = React.useRef<Array<HTMLAnchorElement | null>>([])
  const [fallback, setFallback] = React.useState(false)

  const placeAnchors = React.useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    projects.forEach((_, project) => {
      const anchor = anchorRefs.current[project]
      if (!anchor) return
      const rect = engine.cardRect(engine.nearestInstance(project))
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
        // The middle card opens its project's page.
        onOpen: (instance) => leaveTo(pageOf(projects[engine.projectOf(instance)].slug)),
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
    // What the cursor label says here (CursorLabel reads data-cursor): the middle card opens, a neighbour comes to
    // the middle. Between the cards it says nothing and the arrow stays. The same hit test as a tap decides it.
    const describe = (event: PointerEvent) => {
      const hit = engine.cardAt(event.clientX, event.clientY)
      if (hit) stage.dataset.cursor = hit.openable ? ui.projects.cursorOpen : hit.side < 0 ? ui.projects.cursorPrevious : ui.projects.cursorNext
      else delete stage.dataset.cursor
    }
    stage.addEventListener("pointermove", describe)
    stage.addEventListener("pointerenter", describe)
    return () => {
      stage.removeEventListener("pointermove", describe)
      stage.removeEventListener("pointerenter", describe)
      motionQuery.removeEventListener("change", onMotionChange)
      engine.destroy()
      engineRef.current = null
    }
  }, [placeAnchors])

  return (
    <section id="projects" data-projects aria-labelledby="projects-title" className="relative">
      <div
        ref={stageRef}
        data-projects-stage
        tabIndex={fallback ? -1 : 0}
        role="group"
        aria-roledescription="carousel"
        aria-label={ui.projects.label}
        aria-describedby="projects-hint"
        className="relative h-svh w-full touch-pan-y outline-none select-none focus-visible:outline-2 focus-visible:-outline-offset-8 focus-visible:outline-harlequin-300/60"
      >
        {fallback ? (
          <StaticStrip pageOf={pageOf} ui={ui} />
        ) : (
          <>
            <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full cursor-grab active:cursor-grabbing" />
            {projects.map((project, index) => (
              <a
                key={project.slug}
                ref={(element) => {
                  anchorRefs.current[index] = element
                }}
                data-project-anchor
                href={pageOf(project.slug)}
                aria-label={ui.projects.open(project.name)}
                // Tabbing to a project brings its card to the middle; Enter opens its page.
                onFocus={() => {
                  const engine = engineRef.current
                  if (engine) engine.centerInstance(engine.nearestInstance(index))
                }}
                className="pointer-events-none absolute top-0 left-0 size-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-harlequin-300"
                style={{ borderRadius: 3 }}
              />
            ))}
          </>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-[13%] z-10 flex justify-center px-6 text-center sm:top-[11%]">
          <RollingTitle id="projects-title" text={ui.projects.title} className="pointer-events-auto" />
        </div>
        <p
          id="projects-hint"
          className="pointer-events-none absolute inset-x-0 bottom-[14%] text-center text-[0.7rem] font-medium tracking-[0.2em] text-ink/70 uppercase"
        >
          {ui.projects.hint}
        </p>
      </div>
    </section>
  )
}
