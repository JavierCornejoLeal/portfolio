/*
 * The site's languages. English lives at the root (/, /about, /projects/<slug>); every other language lives under
 * its own prefix (/es/, /es/about, /es/projects/<slug>). Pages get their language from a rest parameter
 * (src/pages/[...locale]/), which is undefined for English, so one page file serves every language.
 */

export const LOCALES = ["en", "es"] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "en"

/** Each language's own name, as its speakers write it. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", es: "Español" }

/** The Open Graph locale of each language. */
export const OG_LOCALES: Record<Locale, string> = { en: "en_US", es: "es_ES" }

const isLocale = (value: string | undefined): value is Locale => LOCALES.includes(value as Locale)

/** The `[...locale]` parameter of each language, for getStaticPaths: English has none. */
export const localeParams = (): { locale: string | undefined }[] =>
  LOCALES.map((locale) => ({ locale: locale === DEFAULT_LOCALE ? undefined : locale }))

/** The language a `[...locale]` parameter names. */
export function toLocale(param: string | undefined): Locale {
  return isLocale(param) ? param : DEFAULT_LOCALE
}

/** The address of a page of the site (written as its English path, "/" or "/about") in a language. */
export function localePath(locale: Locale, path: string): string {
  if (locale === DEFAULT_LOCALE) return path
  return path === "/" ? `/${locale}/` : `/${locale}${path}`
}

/** A page's English path, whatever language its address is in: "/es/about" → "/about", "/es" → "/". */
export function basePath(pathname: string): string {
  const [, first, ...rest] = pathname.split("/")
  if (first === DEFAULT_LOCALE || !isLocale(first)) return pathname
  return `/${rest.join("/")}`
}
