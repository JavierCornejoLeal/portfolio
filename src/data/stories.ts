/*
 * Project stories: what a project's page shows once you scroll past its title screen. Short on purpose: a line of
 * context, the pictures and videos, why each piece of the stack was chosen, and a few curiosities.
 * Media live in public/projects/<slug>/: stills are webp (1600 wide on desktop, phones at 780 wide), videos are
 * short webm scrolls recorded from the live site.
 */

export interface StoryMedia {
  kind: "image" | "video"
  src: string
  /** Images: the alt text. Videos: what the clip shows, for its label. */
  alt: string
  /** Shown under the frame. */
  caption?: string
  /** "wide" spans the whole column; "half" sits beside another; "phone" is a tall phone shot, framed in a half. */
  size: "wide" | "half" | "phone"
  /** Videos: the still shown before the clip plays. */
  poster?: string
  /** Videos: where the clip's content starts, in seconds. Recordings open on a blank page while the site loads; the
   * clip starts and loops from here instead. */
  start?: number
  /** Images: keep the picture's own proportions instead of the 16:10 frame (wide strips, tall pages). */
  natural?: boolean
}

export interface StackChoice {
  name: string
  why: string
}

export interface Story {
  role: string
  /** One or two sentences: what the project is. */
  intro: string
  /** Opens the story, right after the intro. */
  lead: StoryMedia
  stack: StackChoice[]
  /** Between the stack and the curiosities. */
  gallery: StoryMedia[]
  curiosities: string[]
}

const media = (slug: string, file: string) => `/projects/${slug}/${file}`

export const stories: Record<string, Story> = {
  "eduardo-calabuig": {
    role: "Design & development",
    intro:
      "The website of an interior design studio in Dénia: projects, journal and contact, in Spanish and English, with a private panel behind it to keep everything up to date.",
    lead: {
      kind: "video",
      src: media("eduardo-calabuig", "scroll.webm"),
      poster: media("eduardo-calabuig", "home.webp"),
      start: 0.6,
      alt: "Scrolling down the home page of eduardocalabuig.com",
      size: "wide",
    },
    stack: [
      { name: "React + Vite", why: "A quick single-page site with CSS route transitions, built to plain static files for the studio's own hosting." },
      { name: "React Bootstrap, trimmed", why: "Familiar components, and a custom Vite plugin that strips every Bootstrap rule the site never uses." },
      { name: "GSAP", why: "Drives the storytelling: scroll-led scenes, downloaded only as the visitor nears them, so the first screen stays light." },
      { name: "i18next", why: "Spanish and English from the same components, with the visitor's language picked up on arrival." },
    ],
    gallery: [
      { kind: "image", src: media("eduardo-calabuig", "home.webp"), alt: "Home page: Gestionamos tu reforma, cuidamos cada detalle", size: "half" },
      { kind: "image", src: media("eduardo-calabuig", "mobile.webp"), alt: "The home page on a phone", size: "phone" },
      {
        kind: "image",
        src: media("eduardo-calabuig", "online.webp"),
        alt: "The Interiorismo Online page",
        caption: "Interiorismo Online: responsive AVIF and CSS scroll animations, no GSAP on this route.",
        size: "wide",
      },
      { kind: "image", src: media("eduardo-calabuig", "about-intro.webp"), alt: "Eduardo, introduced on the home page", size: "half" },
      { kind: "image", src: media("eduardo-calabuig", "about.webp"), alt: "The about page", size: "half" },
    ],
    curiosities: [
      "I produced every image and video of the storytelling myself with AI, then optimised each one for the web.",
      "Visits are queued until ten seconds after load and an idle moment, so analytics never compete with the page.",
      "It publishes llms.txt and an AI catalog, so AI agents can read the studio the way people do.",
    ],
  },

  ocaive: {
    role: "Design & development",
    intro:
      "The home of a studio that joins technology development, audiovisual production and a 360 music agency: one long, cinematic page that tells all three stories.",
    lead: {
      kind: "video",
      src: media("ocaive", "scroll.webm"),
      poster: media("ocaive", "home.webp"),
      start: 0.6,
      alt: "Scrolling down the home page of ocaive.com",
      size: "wide",
    },
    stack: [
      { name: "Next.js", why: "Server-rendered pages for a long, media-heavy home that still has to load fast and be found." },
      { name: "Tailwind CSS", why: "One set of utilities across very different scenes, so the whole page keeps the same spacing and type." },
    ],
    gallery: [
      { kind: "image", src: media("ocaive", "systems.webp"), alt: "Sistemas que hacen crecer tu negocio", size: "half" },
      { kind: "image", src: media("ocaive", "mobile.webp"), alt: "The home page on a phone", size: "phone" },
      { kind: "image", src: media("ocaive", "services.webp"), alt: "The three areas: technology, audiovisual production and music agency", size: "wide" },
      { kind: "image", src: media("ocaive", "work.webp"), alt: "Hub Cultural Cabanyal among the studio's work", size: "wide" },
    ],
    curiosities: [
      "Three businesses, one page: technology development, an audiovisual production company and a 360 music agency.",
      "The home is told as a story: full-screen scenes, one after another, as you scroll.",
      "Every image and video was optimised to stay light and play without a stutter down a very long page.",
      "Design and build are mine; the studio later changed a couple of things, such as the opening video.",
    ],
  },

  "hub-cultural-cabanyal": {
    role: "Development",
    intro:
      "A living network for culture in the Poblats Marítims of València: spaces, an agenda and the professionals behind them, in Valencian.",
    lead: {
      kind: "video",
      src: media("hub-cultural-cabanyal", "scroll.webm"),
      poster: media("hub-cultural-cabanyal", "home.webp"),
      start: 0.6,
      alt: "Scrolling down the home page of culturacabanyal.com",
      size: "wide",
    },
    stack: [
      { name: "WordPress (PHP)", why: "The team and the cultural agents publish spaces, events and profiles themselves, from an editor they already know." },
    ],
    gallery: [
      { kind: "image", src: media("hub-cultural-cabanyal", "about.webp"), alt: "Sobre el Hub", size: "half" },
      { kind: "image", src: media("hub-cultural-cabanyal", "mobile.webp"), alt: "The home page on a phone", size: "phone" },
      { kind: "image", src: media("hub-cultural-cabanyal", "how.webp"), alt: "Com funciona", size: "wide" },
      { kind: "image", src: media("hub-cultural-cabanyal", "join.webp"), alt: "The call to cultural agents to join", size: "wide" },
    ],
    curiosities: [
      "Three doors on the home page: Espais, Agenda and Professionals.",
      "Cultural agents sign up to show their projects, connect with each other and publish their own activities.",
      "Written in Valencian, the language of the neighbourhood it serves.",
      "I built many of its pages and features, inside the platform itself.",
    ],
  },

  "crm-eduardo": {
    role: "Design & development",
    intro:
      "The private side of eduardocalabuig.com: where the studio publishes projects and news, manages users and sees how the website is doing, without touching code.",
    lead: {
      kind: "image",
      src: media("crm-eduardo", "overview.webp"),
      alt: "The panel's dashboard: visits, activity, top pages and clicks",
      size: "wide",
    },
    stack: [
      { name: "Next.js", why: "Its API routes handle login, uploads, analytics and translations, so one app is both the panel and its backend." },
      { name: "Supabase", why: "Postgres, storage and row-level policies: the content and the images the public site reads, in one place." },
      { name: "Resend", why: "The public site's contact forms send the studio a notice and the visitor a reply." },
    ],
    gallery: [
      {
        kind: "image",
        src: media("crm-eduardo", "editor.webp"),
        alt: "Editing the Casa Umbral project: text and image blocks side by side",
        caption: "A Notion-style editor: type / for titles, images, tables, videos or Instagram mentions.",
        size: "wide",
        natural: true,
      },
      {
        kind: "image",
        src: media("crm-eduardo", "projects.webp"),
        alt: "The projects list with category, status, EN and VA translations and actions",
        caption: "Every project with its status and translations; the eye opens an exact preview of its public page.",
        size: "wide",
        natural: true,
      },
      { kind: "image", src: media("crm-eduardo", "activity.webp"), alt: "Visit and click totals over a bar chart of the last 14 days", caption: "The last two weeks at a glance.", size: "wide", natural: true },
      { kind: "image", src: media("crm-eduardo", "breakdown.webp"), alt: "Top pages, top clicks, countries and devices", size: "wide", natural: true },
    ],
    curiosities: [
      "Projects and news preview exactly as they will look on the public site, before anything goes live.",
      "Writing is block by block, like Notion: type / and pick a heading, an image, a table, a video or an Instagram mention.",
      "Each project keeps its English and Valencian translations in the same record.",
      "A daily cron reads real published projects, so Supabase's free plan never pauses the database.",
    ],
  },

  portfolio: {
    role: "Design & development",
    intro: "This site: a portfolio that shows the work the way I build it, from the type to the WebGL to the tests.",
    lead: {
      kind: "video",
      src: media("portfolio", "portal.webm"),
      poster: media("portfolio", "hello.webp"),
      start: 1,
      alt: "Scrolling into the O of HELLO, which opens onto the footer",
      size: "wide",
    },
    stack: [
      { name: "Astro", why: "Static pages by default; only the interactive pieces load as React islands." },
      { name: "Three.js", why: "The fluted glass behind the hero, the bending projects carousel and the HELLO portal." },
      { name: "Motion", why: "Scroll-linked reveals, letters that roll on hover and the rising project titles." },
      { name: "Playwright", why: "Every behaviour on the page is pinned by an end-to-end test, run on CI in a Linux image." },
    ],
    gallery: [
      { kind: "image", src: media("portfolio", "statement.webp"), alt: "The I build worlds statement", size: "half" },
      { kind: "image", src: media("portfolio", "mobile.webp"), alt: "The hero on a phone", size: "phone" },
      { kind: "image", src: media("portfolio", "carousel.webp"), alt: "The projects carousel", size: "wide" },
      { kind: "image", src: media("portfolio", "footer.webp"), alt: "The footer, inside the letter", size: "wide" },
      { kind: "image", src: media("portfolio", "about-statue.webp"), alt: "The About page: a marble statue lit by the pointer", size: "half" },
      { kind: "image", src: media("portfolio", "about-footer.webp"), alt: "The footer of the inner pages: JAVIER in halftone dots over green bars", size: "half" },
    ],
    curiosities: [
      "The contact section is a letter: scrolling flies into the O of HELLO until its green fills the screen, and the footer waits inside.",
      "The portal waits for its font before it mounts: a late swap would move the letter out from under the camera.",
      "The footer hides an easter egg. Hover the last words.",
    ],
  },
}
