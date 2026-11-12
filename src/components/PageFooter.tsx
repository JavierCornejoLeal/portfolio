import SiteFooter from "@/components/SiteFooter"
import { GradientBars } from "@/components/ui/gradient-bars-background"
import { HalftoneWordmark } from "@/components/ui/halftone-wordmark"

/*
 * The footer of the pages that are not home (a project, About). Home's footer waits inside the contact portal's
 * green; these pages are black, so the same footer rises over green bars instead, and its JAVIER is printed in green
 * halftone dots that part around the pointer. The name keeps home's box (.footer-name, its text made transparent),
 * so the dots take exactly the room the solid name takes there.
 */
export default function PageFooter() {
  return (
    <div data-page-footer className="relative isolate bg-black">
      {/* The bars reach the top, faintly, so the buttons' liquid glass has their edges to bend. */}
      <GradientBars numBars={15} gradientTo="rgba(91, 255, 46, 0.06)" className="-z-10" />
      <SiteFooter
        background="transparent"
        home="/"
        name={
          <p data-footer-name aria-hidden="true" className="footer-name relative text-transparent [text-shadow:none]">
            Javier
            <HalftoneWordmark word="Javier" />
          </p>
        }
      />
    </div>
  )
}
