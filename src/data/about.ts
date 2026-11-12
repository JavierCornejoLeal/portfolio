/*
 * The About page's words, after its hero. Every fact comes from Javier (origin, character, what he is looking for)
 * or from his CV in data/portfolio.ts (experience, education, stack), which the page reads directly.
 */

export const who = {
  /** The opening line, set large. */
  lead: "I started out studying Public Works Engineering. Somewhere between the bridges and the concrete, I found I'd rather build the things people actually touch.",
  paragraphs: [
    "I'm curious in the hands-on way: I take things apart, poke at them and move them around to see what happens. That's where the creative side comes from. I rarely start from a blank page; I reshape components that already exist and build new ones out of others.",
    "At work I'm the one asking why. I take problems apart, dig until I understand them and explain what I find, because a team that understands its code moves faster. I like helping, I like teaching, and I'll do almost anything for a coffee.",
  ],
  facts: [
    { label: "Born", value: "Dénia" },
    { label: "Runs on", value: "Coffee" },
  ],
}

/** Off the clock: the person behind the code. */
export const life = [
  {
    label: "Sport",
    title: "Triathlon",
    text: "I've done sport since I was a kid, triathlon above all: swim, bike, run, and a coffee at the finish line.",
  },
  {
    label: "Music",
    title: "Clarinet",
    text: "I studied clarinet at the conservatory. Music has come with me ever since: at work, while training, and on the bad days too.",
  },
  {
    label: "Curiosity",
    title: "History & myth",
    text: "History, mythology and video games. Blame them for the statue at the top of this page.",
  },
  {
    label: "Character",
    title: "All in",
    text: "I'm always up for helping. I take a little while to open up, but give it a few days, or one coffee, and we're friends. When I'm in, I give it everything.",
  },
]

export const process = [
  { title: "Ask", text: "Before any code, questions: what it is for, who uses it, and what must never break." },
  { title: "Take it apart", text: "I look at what already exists, mine or not, and break it down to see what is worth keeping." },
  { title: "Design and build together", text: "The design and the code grow side by side, so what you approve is what ships." },
  { title: "Build every layer", text: "Interface, API, data and admin: one person across the stack, so nothing gets lost between handoffs." },
  { title: "Test, polish, explain", text: "End-to-end tests, lighter media, a last pass on the details, and a handover that explains how it all works." },
]

export const faqs = [
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
    answer: "By email or phone, both in the footer of the home page. Coffee optional, but appreciated.",
  },
]
