/** Projects shown in the home carousel. Covers are 1920×1272 screenshots of each project (aspect ≈ 1.509). */
export interface Project {
  name: string
  /** The project's page: /projects/<slug>. Also the project's key. */
  slug: string
  /** The live site; absent for private tools, such as a client's admin panel. */
  url?: string
  /** Bare domain, kept for the project pages to come. */
  domain?: string
  cover: string
  /** From each site's own description, in English; kept for the project pages to come. */
  description: string
}

export const projects: Project[] = [
  {
    name: "Eduardo Calabuig",
    slug: "eduardo-calabuig",
    url: "https://eduardocalabuig.com",
    domain: "eduardocalabuig.com",
    cover: "/projects/eduardocalabuig.webp",
    description:
      "Interior design studio in Dénia led by Eduardo Calabuig: Mediterranean interiors, renovations, natural materials and functional spaces across the Marina Alta."
  },
  {
    name: "ÒCAIVE",
    slug: "ocaive",
    url: "https://ocaive.com",
    domain: "ocaive.com",
    cover: "/projects/ocaive.webp",
    description:
      "Technology projects of high complexity that join advanced engineering with a multidisciplinary creative team: digital consulting and bespoke transmedia experiences for mid-size and large companies in Spain."
  },
  {
    name: "Hub Cultural Cabanyal",
    slug: "hub-cultural-cabanyal",
    url: "https://culturacabanyal.com",
    domain: "culturacabanyal.com",
    cover: "/projects/culturacabanyal.webp",
    description: "A living network that connects cultural professionals, venues and activities across the Poblats Marítims of València."
  },
  {
    // Private: the studio's own admin panel, behind a login, so no public address.
    name: "CRM Eduardo",
    slug: "crm-eduardo",
    cover: "/projects/crm-eduardo.webp",
    description:
      "The private admin panel behind eduardocalabuig.com: visits, clicks, countries and devices at a glance, plus the projects, news and users that feed the public site."
  },
  {
    name: "Portfolio",
    slug: "portfolio",
    url: "https://javiercornejo.vercel.app",
    domain: "javiercornejo.vercel.app",
    cover: "/projects/portfolio.webp",
    description:
      "This site: a full stack portfolio built with Astro and React, with WebGL glass, a projects carousel and a letter that opens onto the footer."
  }
]
