import SiteFooter from "@/components/SiteFooter"
import { GradientBars } from "@/components/ui/gradient-bars-background"

/*
 * The footer of the pages that are not home (a project, About). Home's footer waits inside the contact portal's
 * green; these pages are black, so the same footer rises over green bars instead.
 */
export default function PageFooter() {
  return (
    <div className="relative isolate bg-black">
      <GradientBars numBars={15} className="-z-10" />
      <SiteFooter background="transparent" home="/" />
    </div>
  )
}
