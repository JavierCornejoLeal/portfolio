import * as React from "react"

import { MenuGlass } from "@/components/SiteMenu"
import { LOCALE_NAMES, LOCALES, type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/*
 * EN / ES, beside the menu button and in the same glass: the language being read sits filled in, the other is a link
 * to this same page in that language. Following it leaves through the page curtain like any page of the site
 * (Layout.astro). The links are plain anchors, so the switch works before (and without) JavaScript.
 */
export default function LanguageSwitch({ locale, paths }: { locale: Locale; paths: Record<Locale, string> }) {
  const item = "grid size-10 place-items-center rounded-full font-display text-xs font-semibold tracking-[0.08em] sm:size-12"

  return (
    // The menu's smoke (global.css sets it on .site-menu only): the resting button's, at every width.
    <nav aria-label="Language" className="relative isolate" style={{ "--menu-smoke": 0.65 } as React.CSSProperties}>
      <MenuGlass radius={32} />
      <ul className="flex h-14 items-center gap-0.5 px-2 sm:h-16">
        {LOCALES.map((option) => (
          <li key={option}>
            {option === locale ? (
              <span aria-current="true" className={cn(item, "bg-ink text-black")}>
                <span aria-hidden="true">{option.toUpperCase()}</span>
                <span className="sr-only">{LOCALE_NAMES[option]}</span>
              </span>
            ) : (
              <a
                href={paths[option]}
                hrefLang={option}
                lang={option}
                className={cn(item, "text-ink/70 transition-colors hover:text-ink focus-visible:text-ink")}
              >
                <span aria-hidden="true">{option.toUpperCase()}</span>
                <span className="sr-only">{LOCALE_NAMES[option]}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
