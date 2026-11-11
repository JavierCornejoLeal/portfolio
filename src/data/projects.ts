/** Projects shown in the home carousel. Covers are 1920×1272 screenshots of each live site (aspect ≈ 1.509). */
export interface Project {
  name: string
  url: string
  /** Bare domain, kept for the project pages to come. */
  domain: string
  cover: string
  /** From each site's own description, in English; kept for the project pages to come. */
  description: string
}

export const projects: Project[] = [
  {
    name: "Eduardo Calabuig",
    url: "https://eduardocalabuig.com",
    domain: "eduardocalabuig.com",
    cover: "/projects/eduardocalabuig.webp",
    description:
      "Interior design studio in Dénia led by Eduardo Calabuig: Mediterranean interiors, renovations, natural materials and functional spaces across the Marina Alta."
  },
  {
    name: "ÒCAIVE",
    url: "https://ocaive.com",
    domain: "ocaive.com",
    cover: "/projects/ocaive.webp",
    description:
      "Technology projects of high complexity that join advanced engineering with a multidisciplinary creative team: digital consulting and bespoke transmedia experiences for mid-size and large companies in Spain."
  },
  {
    name: "Hub Cultural Cabanyal",
    url: "https://culturacabanyal.com",
    domain: "culturacabanyal.com",
    cover: "/projects/culturacabanyal.webp",
    description: "A living network that connects cultural professionals, venues and activities across the Poblats Marítims of València."
  }
]
