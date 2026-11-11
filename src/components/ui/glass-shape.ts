/*
 * Geometry for glass that is not a plain rounded box: a rounded trapezoid with one side leaning. The same shape
 * drives the refraction map (as a signed distance), the clip and the rim, so the glass bends light along the
 * slanted edge exactly as it does along the straight ones.
 */

/** One leaning side. `end` leans the right edge (top further out), `start` the left edge (bottom further out). */
export type GlassCut = { side: "start" | "end"; slant: number }

type Point = { x: number; y: number }

/** Corners in screen order (top left, top right, bottom right, bottom left), so the outline runs clockwise. */
function trapezoid(width: number, height: number, cut: GlassCut): Point[] {
  const s = Math.min(cut.slant, width / 2)
  return cut.side === "end"
    ? [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width - s, y: height }, { x: 0, y: height }]
    : [{ x: s, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }]
}

/** Outward unit normal of the edge a → b on a clockwise (y down) outline. */
function normal(a: Point, b: Point): Point {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { x: dy / len, y: -dx / len }
}

/**
 * A rounded convex polygon is the polygon shrunk by `radius`, grown back by `radius`. Each corner's arc is centred
 * on the shrunk corner, which is where the two edges, moved inwards by the radius, cross.
 */
function shrink(points: Point[], radius: number) {
  const n = points.length
  const normals = points.map((p, i) => normal(p, points[(i + 1) % n]))
  const centres = points.map((p, i) => {
    const n0 = normals[(i - 1 + n) % n]
    const n1 = normals[i]
    // Solve dot(n0, c - p) = -r and dot(n1, c - p) = -r.
    const det = n0.x * n1.y - n0.y * n1.x
    if (Math.abs(det) < 1e-9) return { x: p.x - n1.x * radius, y: p.y - n1.y * radius }
    return { x: p.x + (-radius * n1.y + radius * n0.y) / det, y: p.y + (-radius * n0.x + radius * n1.x) / det }
  })
  return { centres, normals }
}

export function roundedCutPath(width: number, height: number, radius: number, cut: GlassCut) {
  const r = Math.min(radius, width / 2, height / 2)
  const points = trapezoid(width, height, cut)
  const { centres, normals } = shrink(points, r)
  const n = points.length
  const f = (v: number) => +v.toFixed(2)
  let d = ""
  centres.forEach((c, i) => {
    const into = normals[(i - 1 + n) % n]
    const out = normals[i]
    const a = { x: c.x + into.x * r, y: c.y + into.y * r }
    const b = { x: c.x + out.x * r, y: c.y + out.y * r }
    d += `${i === 0 ? "M" : "L"}${f(a.x)} ${f(a.y)} A${f(r)} ${f(r)} 0 0 1 ${f(b.x)} ${f(b.y)} `
  })
  return `${d}Z`
}

/** Signed distance to the rounded trapezoid, negative inside. Coordinates are from the top left corner. */
export function roundedCutDistance(width: number, height: number, radius: number, cut: GlassCut) {
  const r = Math.min(radius, width / 2, height / 2)
  const { centres: v } = shrink(trapezoid(width, height, cut), r)
  return (px: number, py: number) => {
    // Distance to a polygon with the even-odd sign (Inigo Quilez, sdPolygon), then grown by the radius.
    let d = (px - v[0].x) ** 2 + (py - v[0].y) ** 2
    let s = 1
    for (let i = 0, j = v.length - 1; i < v.length; j = i, i++) {
      const ex = v[j].x - v[i].x
      const ey = v[j].y - v[i].y
      const wx = px - v[i].x
      const wy = py - v[i].y
      const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)))
      const bx = wx - ex * t
      const by = wy - ey * t
      d = Math.min(d, bx * bx + by * by)
      const c1 = py >= v[i].y
      const c2 = py < v[j].y
      const c3 = ex * wy > ey * wx
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s
    }
    return s * Math.sqrt(d) - r
  }
}
