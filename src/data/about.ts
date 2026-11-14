/*
 * The About page's words, after its hero. Every fact comes from Javier (origin, character, what he is looking for)
 * or from his CV in data/portfolio.ts (experience, education, stack), which the page reads directly.
 */

import type { Locale } from "@/lib/i18n"

export interface Who {
  /** The opening line, set large. */
  lead: string
  /** The phrase of the lead it turns on, filled with drifting green lines (AboutWho). */
  turn: string
  paragraphs: string[]
}

const who: Who = {
  lead: "I started out studying Public Works Engineering. Somewhere between the bridges and the concrete, I found I'd rather build the things people actually touch.",
  turn: "the things people actually touch",
  paragraphs: [
    "I'm curious in the hands-on way: I take things apart, poke at them and move them around to see what happens. That's where the creative side comes from. I rarely start from a blank page; I reshape components that already exist and build new ones out of others.",
    "At work I'm the one asking why. I take problems apart, dig until I understand them and explain what I find, because a team that understands its code moves faster. I like helping, and I like teaching.",
  ],
}

/** A photo shown beside the pointer over one side of him (LifePreview). All share one upright 3:4 frame. */
export interface LifePhoto {
  src: string
  width: number
  height: number
}

const photo = (file: string): LifePhoto => ({ src: `/about/life/${file}.webp`, width: 480, height: 640 })

/** Off the clock: the person behind the code. */
export interface LifeSide {
  label: string
  title: string
  text: string
  photo?: LifePhoto
}

const life: LifeSide[] = [
  {
    label: "Sport",
    title: "Triathlon",
    text: "I've done sport since I was a kid, triathlon above all: swim, bike, run, and then do it all again.",
    photo: photo("triathlon"),
  },
  {
    label: "Music",
    title: "Clarinet",
    text: "I studied clarinet at the conservatory. Music has come with me ever since: at work, while training, and on the bad days too.",
    photo: photo("clarinet"),
  },
  {
    label: "Likes",
    title: "Hobbies",
    text: "I read a lot of books on history, the older the better; that's where the statue at the top of this page comes from. Then video games, sport of any kind, and travelling whenever I get the chance.",
    photo: photo("hobbies"),
  },
  {
    label: "Character",
    title: "All in",
    text: "I'll admit I take a while to open up at first. But I build trust quickly, and once I have it I'm all in: I'm the first to help, I say what I think, and I give whatever I'm part of everything I've got.",
    photo: photo("allin"),
  },
]

export interface Step {
  title: string
  text: string
}

const process: Step[] = [
  { title: "Ask", text: "Before any code, questions: what it is for, who uses it, and what must never break." },
  { title: "Take it apart", text: "I look at what already exists, mine or not, and break it down to see what is worth keeping." },
  { title: "Design and build together", text: "The design and the code grow side by side, so what you approve is what ships." },
  { title: "Build every layer", text: "Interface, API, data and admin: one person across the stack, so nothing gets lost between handoffs." },
  { title: "Test, polish, explain", text: "End-to-end tests, lighter media, a last pass on the details, and a handover that explains how it all works." },
]

export interface Faq {
  question: string
  answer: string
}

const faqs: Faq[] = [
  {
    question: "Are you open to new roles?",
    answer:
      "Yes. I'm looking for a team where creativity counts as much as code, where I can keep growing as a developer who also designs. Remote, hybrid, or on site around Dénia and the Marina Alta.",
  },
  {
    question: "Do you take freelance projects?",
    answer: "Yes, and I enjoy them. Tell me what you have in mind and I'll tell you honestly whether I'm the right fit.",
  },
  {
    question: "Are you a designer or a developer?",
    answer:
      "Both, on purpose. I designed and built ÒCAIVE's website and this one. Designing with the code in mind saves a lot of back and forth.",
  },
  {
    question: "Can you join an existing codebase?",
    answer:
      "Yes. At Baleària I worked on internal applications already in production, following the team's architecture and its in-house component libraries.",
  },
  {
    question: "Can my team update the content without a developer?",
    answer:
      "That's usually the goal. For Eduardo Calabuig I built an admin panel with a Notion-style editor, exact previews and translations, so the studio publishes on its own.",
  },
  {
    question: "How do I get in touch?",
    answer: "By email or phone, both in the footer of every page.",
  },
]

export interface About {
  who: Who
  life: LifeSide[]
  process: Step[]
  faqs: Faq[]
}

const es: About = {
  who: {
    lead: "Empecé estudiando Ingeniería de Obras Públicas. Entre puentes y hormigón descubrí que prefería construir las cosas que la gente toca de verdad.",
    turn: "las cosas que la gente toca de verdad",
    paragraphs: [
      "Soy curioso de los que tocan: desmonto las cosas, las pruebo y las cambio de sitio para ver qué pasa. De ahí sale mi lado creativo. Casi nunca parto de una página en blanco; transformo componentes que ya existen y construyo otros nuevos a partir de ellos.",
      "En el trabajo soy el que pregunta por qué. Desmonto los problemas, investigo hasta entenderlos y explico lo que encuentro, porque un equipo que entiende su código avanza más rápido. Me gusta ayudar, y me gusta enseñar.",
    ],
  },
  life: [
    {
      label: "Deporte",
      title: "Triatlón",
      text: "Hago deporte desde pequeño, sobre todo triatlón: nadar, pedalear, correr, y vuelta a empezar.",
      photo: photo("triathlon"),
    },
    {
      label: "Música",
      title: "Clarinete",
      text: "Estudié clarinete en el conservatorio. Desde entonces la música me acompaña: trabajando, entrenando y también en los días malos.",
      photo: photo("clarinet"),
    },
    {
      label: "Gustos",
      title: "Aficiones",
      text: "Leo muchos libros de historia, cuanto más antigua mejor; de ahí viene la estatua de arriba de esta página. Y luego videojuegos, deporte de cualquier tipo y viajar siempre que puedo.",
      photo: photo("hobbies"),
    },
    {
      label: "Carácter",
      title: "A fondo",
      text: "Reconozco que al principio me cuesta abrirme. Pero cojo confianza rápido, y cuando la tengo voy a fondo: soy el primero en ayudar, digo lo que pienso y doy todo lo que tengo en aquello de lo que formo parte.",
      photo: photo("allin"),
    },
  ],
  process: [
    { title: "Preguntar", text: "Antes de escribir código, preguntas: para qué sirve, quién lo usa y qué no puede romperse nunca." },
    { title: "Desmontar", text: "Miro lo que ya existe, mío o no, y lo desmonto para ver qué merece la pena conservar." },
    { title: "Diseñar y construir a la vez", text: "El diseño y el código crecen juntos, así que lo que apruebas es lo que se publica." },
    { title: "Construir cada capa", text: "Interfaz, API, datos y panel de administración: una sola persona en todo el stack, para que nada se pierda entre traspasos." },
    { title: "Probar, pulir, explicar", text: "Tests end-to-end, recursos más ligeros, una última pasada a los detalles y una entrega que explica cómo funciona todo." },
  ],
  faqs: [
    {
      question: "¿Estás abierto a nuevos puestos?",
      answer:
        "Sí. Busco un equipo donde la creatividad cuente tanto como el código, donde pueda seguir creciendo como desarrollador que también diseña. En remoto, híbrido o presencial por Dénia y la Marina Alta.",
    },
    {
      question: "¿Aceptas proyectos freelance?",
      answer: "Sí, y los disfruto. Cuéntame qué tienes en mente y te diré con sinceridad si soy la persona adecuada.",
    },
    {
      question: "¿Eres diseñador o desarrollador?",
      answer:
        "Las dos cosas, a propósito. Diseñé y desarrollé la web de ÒCAIVE y esta. Diseñar pensando en el código ahorra muchas idas y venidas.",
    },
    {
      question: "¿Puedes incorporarte a un código que ya existe?",
      answer:
        "Sí. En Baleària trabajé en aplicaciones internas que ya estaban en producción, siguiendo la arquitectura del equipo y sus propias librerías de componentes.",
    },
    {
      question: "¿Puede mi equipo actualizar el contenido sin un desarrollador?",
      answer:
        "Normalmente ese es el objetivo. Para Eduardo Calabuig construí un panel de administración con un editor al estilo Notion, vistas previas exactas y traducciones, para que el estudio publique por su cuenta.",
    },
    {
      question: "¿Cómo contacto contigo?",
      answer: "Por email o por teléfono; los dos están en el pie de cada página.",
    },
  ],
}

const ABOUT_BY_LOCALE: Record<Locale, About> = { en: { who, life, process, faqs }, es }

/** The About page's words in a language. */
export const aboutFor = (locale: Locale): About => ABOUT_BY_LOCALE[locale]
