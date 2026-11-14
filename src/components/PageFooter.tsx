import SiteFooter from "@/components/SiteFooter"
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n"
import { GradientBars } from "@/components/ui/gradient-bars-background"
import { HalftoneWordmark } from "@/components/ui/halftone-wordmark"

/*
 * The footer of the pages that are not home (a project, About). Home's footer waits inside the contact portal's
 * green; these pages are black, so the same footer rises over green bars instead. Its JAVIER is printed in white
 * halftone dots that part around the pointer and turn green as they move, last in the footer and cropped by its
 * bottom edge. The name keeps home's box (.footer-name, its text made transparent), so it is the same size.
 */
export default function PageFooter({ home = "/", locale = DEFAULT_LOCALE }: { home?: string; locale?: Locale }) {
  return (
    <div data-page-footer className="relative isolate bg-black">
      {/* The bars reach the top, faintly, so the buttons' liquid glass has their edges to bend. */}
      <GradientBars numBars={15} gradientTo="rgba(91, 255, 46, 0.06)" className="-z-10" />
      <SiteFooter
        background="transparent"
        home={home}
        locale={locale}
        nameAtFoot
        name={
          // Inline, because .footer-name's own colour and shadow (global.css, unlayered) outrank utility classes.
          <p data-footer-name aria-hidden="true" className="footer-name relative" style={{ color: "transparent", textShadow: "none" }}>
            Javier
            {/* White dots that turn green when pushed: lowercase, its i and j without dots, cropped by the footer's bottom edge. */}
            <HalftoneWordmark word="Javier" ink="#e9efe6" lift="#5bff2e" crop={0.22} lowercase dotless />
          </p>
        }
      />
    </div>
  )
}
