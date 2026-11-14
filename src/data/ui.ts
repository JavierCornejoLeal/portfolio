import type { Locale } from "@/lib/i18n"

/*
 * The words of the site's interface, in every language: labels, headings, buttons and the short copy that lives in
 * components. Longer content (About, the projects' stories, the CV) lives in its own data files, one per language.
 */

const en = {
  site: {
    description:
      "Javier Cornejo, full stack developer. Code you can see through: clear, honest software from database to pixel.",
    imageAlt: "Javier Cornejo, full stack developer",
    loading: "Loading",
    newTab: " (opens in a new tab)",
  },
  language: { label: "Language" },
  menu: {
    label: "Main",
    open: "Open menu",
    close: "Close menu",
    home: "Home",
    about: "About",
    projects: "Projects",
    contact: "Contact",
  },
  hero: {
    slogan: "Code you can see through: sharp on the surface, solid all the way down.",
    cta: "Discover works",
  },
  statement: {
    title: "I build",
    word: "worlds",
    lead: "Most software looks fine on the surface and falls apart underneath. I design and develop the whole thing, from the database and the API to the interface you actually touch, so every layer is built to the same standard.",
    body: [
      "No handoffs between teams, no details lost on the way to production. One person who knows how it all fits together, writing clear code you can read, change and trust long after launch.",
      "If you have something worth building, let's build it properly.",
    ],
  },
  projects: {
    label: "Projects",
    title: "Featured projects",
    hint: "Drag or swipe to explore",
    open: (name: string) => `Open ${name}`,
    cover: (name: string) => `${name} website`,
    cursorOpen: "View project",
    cursorPrevious: "Previous",
    cursorNext: "Next",
  },
  contact: {
    word: "HELLO",
    eyebrow: "Got something worth building?",
    cta: "Let's talk",
  },
  footer: {
    heading: ["Let's build", "something clear."],
    email: "Drop me an email",
    code: "See this code",
    elsewhere: "Elsewhere",
    role: "full creative developer",
    roleRevealed: "full stack developer",
    nav: "Footer",
    projects: "Projects",
    top: "Back to top",
  },
  about: {
    title: "About · Javier Cornejo",
    heading: "About",
    statueAlt: "A marble statue in the dark, looking up past its raised arm",
    sections: {
      who: "Who I am",
      life: "Off the clock",
      process: "How I work",
      experience: "Experience",
      stack: "Stack",
      faq: "Questions",
    },
    education: "Before and alongside",
    stackNote: "What I reach for most. The right tool for the job beats a favourite one.",
  },
  project: {
    about: (name: string) => `About ${name}`,
    role: "Role",
    stack: "Stack",
    site: "Site",
    private: "Private tool",
    whyStack: "Why this stack",
    curiosities: "Curiosities",
    next: (name: string) => `View ${name}`,
  },
}

export type UI = typeof en

const es: UI = {
  site: {
    description:
      "Javier Cornejo, desarrollador full stack. Código que se ve por dentro: software claro y honesto, de la base de datos al último píxel.",
    imageAlt: "Javier Cornejo, desarrollador full stack",
    loading: "Cargando",
    newTab: " (se abre en una pestaña nueva)",
  },
  language: { label: "Idioma" },
  menu: {
    label: "Principal",
    open: "Abrir menú",
    close: "Cerrar menú",
    home: "Inicio",
    about: "Sobre mí",
    projects: "Proyectos",
    contact: "Contacto",
  },
  hero: {
    slogan: "Código que se ve por dentro: cuidado en la superficie, sólido hasta el fondo.",
    cta: "Ver proyectos",
  },
  statement: {
    title: "Construyo",
    word: "mundos",
    lead: "Mucho software se ve bien por fuera y se cae a pedazos por dentro. Yo diseño y desarrollo el conjunto entero, de la base de datos y la API a la interfaz que tocas, para que cada capa esté hecha con el mismo cuidado.",
    body: [
      "Sin traspasos entre equipos ni detalles perdidos de camino a producción. Una sola persona que sabe cómo encaja todo, con un código claro que puedes leer, cambiar y en el que puedes confiar mucho después del lanzamiento.",
      "Si tienes algo que merece la pena construir, construyámoslo bien.",
    ],
  },
  projects: {
    label: "Proyectos",
    title: "Proyectos destacados",
    hint: "Arrastra o desliza para explorar",
    open: (name) => `Abrir ${name}`,
    cover: (name) => `Web de ${name}`,
    cursorOpen: "Ver proyecto",
    cursorPrevious: "Anterior",
    cursorNext: "Siguiente",
  },
  contact: {
    word: "HOLA",
    eyebrow: "¿Tienes algo que merezca la pena construir?",
    cta: "Hablemos",
  },
  footer: {
    heading: ["Construyamos", "algo claro."],
    email: "Escríbeme un email",
    code: "Mira este código",
    elsewhere: "En otros sitios",
    role: "desarrollador full creative",
    roleRevealed: "desarrollador full stack",
    nav: "Pie de página",
    projects: "Proyectos",
    top: "Volver arriba",
  },
  about: {
    title: "Sobre mí · Javier Cornejo",
    heading: "Sobre mí",
    statueAlt: "Una estatua de mármol en la oscuridad, mirando más allá de su brazo alzado",
    sections: {
      who: "Quién soy",
      life: "Fuera del trabajo",
      process: "Cómo trabajo",
      experience: "Experiencia",
      stack: "Stack",
      faq: "Preguntas",
    },
    education: "Antes y en paralelo",
    stackNote: "Lo que más uso. La herramienta adecuada para cada trabajo gana a la favorita.",
  },
  project: {
    about: (name) => `Sobre ${name}`,
    role: "Rol",
    stack: "Stack",
    site: "Web",
    private: "Herramienta privada",
    whyStack: "Por qué este stack",
    curiosities: "Curiosidades",
    next: (name) => `Ver ${name}`,
  },
}

const UI_BY_LOCALE: Record<Locale, UI> = { en, es }

/** The interface's words in a language. */
export const uiFor = (locale: Locale): UI => UI_BY_LOCALE[locale]
