import SiteFooter from "@/components/SiteFooter"
import { GradientBars } from "@/components/ui/gradient-bars-background"

/*
 * The footer of the pages that are not home (a project, About). Home's footer waits inside the contact portal's
 * green; these pages are black, so the same footer, without the big name, rises over green bars instead.
 */
export default function PageFooter() {
  return (
    <div className="relative isolate bg-black">
      {/* The bars reach the top, faintly, so the buttons' liquid glass has their edges to bend. */}
      <GradientBars numBars={15} gradientTo="rgba(91, 255, 46, 0.06)" className="-z-10" />
      {/* A soft green glow behind the buttons, so both glass pills have light to bend, not only the one over a bar. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[18%] left-0 -z-10 h-[34%] w-[60%] bg-[radial-gradient(ellipse_at_35%_55%,rgba(91,255,46,0.2),transparent_70%)]"
      />
      <SiteFooter background="transparent" home="/" showName={false} />
    </div>
  )
}
