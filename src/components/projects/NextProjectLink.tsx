import { HoverRollLabel, useHoverRoll } from "@/components/ui/hover-roll"

/*
 * The way on at the end of a project's story: "View <next project>", in light type, its letters rolling on hover or
 * focus like the footer's and the menu's links. Leaving for the next page draws the page curtain (Layout.astro).
 */
export default function NextProjectLink({ name, href }: { name: string; href: string }) {
  const { roll, play } = useHoverRoll()
  return (
    <a
      data-next-project
      href={href}
      onPointerEnter={play}
      onFocus={play}
      className="inline-block text-[clamp(1.75rem,3.2vw,3rem)] leading-tight font-light tracking-[-0.02em] whitespace-nowrap"
    >
      <HoverRollLabel label={`View ${name}`} roll={roll} />
    </a>
  )
}
