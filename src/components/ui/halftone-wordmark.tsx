import * as React from "react"

/*
 * Halftone wordmark, after the Halftone Wordmark Footer the author supplied: a word printed as a field of dots, each
 * sized by how much of the letter covers its cell, so the type keeps its edges at any scale. Moving across it parts
 * the dots around the pointer on springs, lightening them as they leave their place; a click sends a ring through
 * the word. Only the wordmark is taken (the footer around it is the site's own), and it adapts: it fills its parent's
 * box and sets the word in the parent's own font and size, centred on the ink (or cropped by the bottom edge), over
 * a clear canvas so whatever is
 * behind shows between the dots; it draws only while on screen and moving; under reduced motion it holds still.
 */

/** Hex → [r, g, b] in 0–255, or null for anything that isn't #rgb / #rrggbb. */
function hex(value: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())
  if (!m) return null
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1]
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** Dot radius for a cell coverage in [0, 1]: area-true, so the tone stays even. */
function dotRadius(coverage: number, gap: number) {
  return Math.sqrt(Math.min(1, Math.max(0, coverage))) * gap * 0.56
}

export function HalftoneWordmark({
  word,
  ink = "#5bff2e",
  lift = "#e9efe6",
  dotGap = 6,
  radius = 80,
  crop = 0,
  lowercase = false,
  dotlessJ = false,
}: {
  word: string
  /** The dots at rest. */
  ink?: string
  /** The colour a dot shifts toward as it is pushed off its place. */
  lift?: string
  /** Distance between dot centres, in CSS px. */
  dotGap?: number
  /** How far the pointer pushes, in CSS px. */
  radius?: number
  /** How much of the word's cap height hangs below the box's bottom edge, 0–0.6: cropped, like a print run off. */
  crop?: number
  /** Set the word in lowercase, scaled to the width the box's own setting of it takes. */
  lowercase?: boolean
  /** Leave the dot off every j. */
  dotlessJ?: boolean
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    const box = canvas?.parentElement
    if (!canvas || !box) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const from = hex(ink) ?? [91, 255, 46]
    const to = hex(lift) ?? [233, 239, 230]
    let w = 0
    let h = 0
    let dpr = 1
    let px = -1e5
    let py = -1e5
    let raf = 0
    let visible = false
    let awake = true
    let ring = { x: 0, y: 0, t: -1 }
    // Per dot: x, y, vx, vy, home x, home y, radius.
    let dots = new Float32Array(0)
    let count = 0

    const layout = () => {
      const rect = box.getBoundingClientRect()
      w = Math.max(1, Math.round(rect.width))
      h = Math.max(1, Math.round(rect.height))
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)

      // Set the word on a 1x mask in the box's own face and size, centred on its ink.
      const style = getComputedStyle(box)
      const mask = document.createElement("canvas")
      mask.width = w
      mask.height = h
      const m = mask.getContext("2d", { willReadFrequently: true })
      if (!m) return
      const size = parseFloat(style.fontSize)
      const face = (px: number) => `${style.fontWeight} ${px}px ${style.fontFamily}`
      m.font = face(size)
      const boxText = style.textTransform === "uppercase" ? word.toUpperCase() : word
      let text = boxText
      if (lowercase) {
        // As wide as the box's own setting of the word, so the lowercase word takes the same room.
        text = word.toLowerCase()
        m.font = face((size * m.measureText(boxText).width) / m.measureText(text).width)
      }
      const metrics = m.measureText(text)
      const ascent = metrics.actualBoundingBoxAscent
      const descent = metrics.actualBoundingBoxDescent
      // Lowercase crops against the body of its letters (x-height), not the dots above them.
      const xHeight = m.measureText("x").actualBoundingBoxAscent
      const body = lowercase ? xHeight : ascent
      m.textBaseline = "alphabetic"
      // Centred on its ink; a crop lowers it so its foot runs off the bottom edge.
      const hang = Math.min(0.6, Math.max(0, crop))
      const baseline = hang > 0 ? h + body * hang : (h + ascent - descent) / 2
      const left = (w - metrics.width) / 2
      m.fillText(text, left, baseline)
      if (dotlessJ) {
        // Wipe the tittle off every j: whatever sits above the body of the letters, across the j's own advance.
        const jWidth = m.measureText("j").width
        for (let i = text.indexOf("j"); i >= 0; i = text.indexOf("j", i + 1)) {
          const x = left + m.measureText(text.slice(0, i)).width
          m.clearRect(x - 2, 0, jWidth + 4, baseline - xHeight * 1.04)
        }
      }
      const img = m.getImageData(0, 0, w, h).data

      const gap = Math.max(3, dotGap)
      const cols = Math.ceil(w / gap)
      const rows = Math.ceil(h / gap)
      const found: number[] = []
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          // Coverage: the average alpha over a 3×3 sample of the cell.
          let sum = 0
          for (let sy = 0; sy < 3; sy++) {
            for (let sx = 0; sx < 3; sx++) {
              const x = Math.min(w - 1, Math.floor(gx * gap + ((sx + 0.5) * gap) / 3))
              const y = Math.min(h - 1, Math.floor(gy * gap + ((sy + 0.5) * gap) / 3))
              sum += img[(y * w + x) * 4 + 3]
            }
          }
          const coverage = sum / (9 * 255)
          if (coverage < 0.06) continue
          const hx = gx * gap + gap / 2
          const hy = gy * gap + gap / 2
          found.push(hx, hy, 0, 0, hx, hy, dotRadius(coverage, gap))
        }
      }
      dots = new Float32Array(found)
      count = found.length / 7
      awake = true
    }

    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const push = reduced ? 0 : radius
      const age = ring.t < 0 ? 1e9 : now - ring.t
      const ringRadius = age * 0.9
      let moving = false
      for (let i = 0; i < count; i++) {
        const j = i * 7
        let x = dots[j]
        let y = dots[j + 1]
        let vx = dots[j + 2]
        let vy = dots[j + 3]
        const hx = dots[j + 4]
        const hy = dots[j + 5]
        if (!reduced) {
          // The click's ring.
          if (age < 900) {
            const dx = hx - ring.x
            const dy = hy - ring.y
            const d = Math.sqrt(dx * dx + dy * dy) + 0.001
            const band = 1 - Math.min(1, Math.abs(d - ringRadius) / 26)
            if (band > 0) {
              const f = band * 3.2 * (1 - age / 900)
              vx += (dx / d) * f
              vy += (dy / d) * f
            }
          }
          // The pointer's push, then a spring home.
          const dx = x - px
          const dy = y - py
          const d2 = dx * dx + dy * dy
          if (push > 0 && d2 < push * push) {
            const d = Math.sqrt(d2) + 0.001
            const f = (1 - d / push) * 2.6
            vx += (dx / d) * f
            vy += (dy / d) * f
          }
          vx = (vx + (hx - x) * 0.05) * 0.84
          vy = (vy + (hy - y) * 0.05) * 0.84
          x += vx
          y += vy
          if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(x - hx) + Math.abs(y - hy) > 0.05) moving = true
          else {
            x = hx
            y = hy
            vx = 0
            vy = 0
          }
          dots[j] = x
          dots[j + 1] = y
          dots[j + 2] = vx
          dots[j + 3] = vy
        }
        // Pushed dots lighten toward `lift`.
        const k = Math.min(1, Math.hypot(x - hx, y - hy) / 28)
        ctx.fillStyle =
          k > 0.02
            ? `rgb(${Math.round(from[0] + (to[0] - from[0]) * k)},${Math.round(from[1] + (to[1] - from[1]) * k)},${Math.round(from[2] + (to[2] - from[2]) * k)})`
            : ink
        ctx.beginPath()
        ctx.arc(x, y, dots[j + 6], 0, Math.PI * 2)
        ctx.fill()
      }
      // Sleep once every dot is home and nothing is pushing.
      awake = moving || age < 900 || px > -1e4
      canvas.dataset.ready = "true"
    }

    const loop = (now: number) => {
      raf = 0
      if (!visible) return
      draw(now)
      if (awake) raf = requestAnimationFrame(loop)
    }
    const wake = () => {
      awake = true
      if (!raf && visible) raf = requestAnimationFrame(loop)
    }
    const local = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect()
      return [e.clientX - b.left, e.clientY - b.top]
    }
    const onMove = (e: PointerEvent) => {
      if (reduced) return
      ;[px, py] = local(e)
      wake()
    }
    const onLeave = () => {
      px = -1e5
      py = -1e5
      wake()
    }
    const onDown = (e: PointerEvent) => {
      if (reduced) return
      const [x, y] = local(e)
      ring = { x, y, t: performance.now() }
      wake()
    }

    layout()
    draw(performance.now())
    canvas.addEventListener("pointermove", onMove)
    canvas.addEventListener("pointerleave", onLeave)
    canvas.addEventListener("pointerdown", onDown)
    const ro = new ResizeObserver(() => {
      layout()
      draw(performance.now())
      wake()
    })
    ro.observe(box)
    const io = new IntersectionObserver(([entry]) => {
      visible = entry ? entry.isIntersecting : true
      if (visible) wake()
    })
    io.observe(canvas)
    // A face that lands late resets the word in its real shape.
    let alive = true
    document.fonts?.ready.then(() => {
      if (!alive) return
      layout()
      draw(performance.now())
      wake()
    })

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      canvas.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("pointerleave", onLeave)
      canvas.removeEventListener("pointerdown", onDown)
    }
  }, [word, ink, lift, dotGap, radius, crop, lowercase, dotlessJ])

  return <canvas ref={canvasRef} data-halftone data-word={lowercase ? word.toLowerCase() : word} data-lift={lift} aria-hidden="true" className="absolute inset-0 size-full" />
}
