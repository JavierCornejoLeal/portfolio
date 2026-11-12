import * as React from "react"
import { ArrowUpRight } from "lucide-react"

import { GlassLayer } from "@/components/ui/glass-layer"

/* A glass pill that links somewhere, with an arrow that nudges toward the corner on hover. */
export function GlassCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="group relative isolate inline-flex h-14 items-center gap-3 rounded-full px-8 text-base font-medium text-ink transition-transform duration-300 hover:scale-105 focus-visible:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
    >
      <GlassLayer radius={28} className="-z-10" />
      <span>{children}</span>
      <ArrowUpRight aria-hidden="true" className="size-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" />
    </a>
  )
}
