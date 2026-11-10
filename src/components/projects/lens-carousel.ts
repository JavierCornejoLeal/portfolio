import * as THREE from "three"

/*
 * Liquid-glass lens carousel. A flat, endless row of covers is drawn into a padded render target, then a
 * fullscreen pass bends that picture through a large tilted elliptical lens: the middle stays crisp, the sides
 * fold into glossy ribbons with RGB dispersion at the rims. It is a postprocess over a flat strip, not 3D.
 *
 * Framework-free on purpose: the React section mounts it, feeds it state (paused, reduced motion) and destroys
 * it. Everything it allocates is released in destroy().
 */

const COVER_ASPECT = 1.509
/** The lens bends content from beyond the viewport, so the strip is drawn this much past each edge. */
const PAD = 0.44
/** GPU budget: the padded target is ~3.5× the viewport's area, so both the DPR and its total pixels are capped. */
const MAX_DPR = 1.75
const MAX_TARGET_PIXELS = 6_000_000
const MIN_COPIES = 3

const EASE = 0.09
const FRICTION = 0.865
const SNAP_IDLE_MS = 120
const SHRINK_MAX = 0.07
const SHRINK_SPEED = 60
const SHRINK_ATTACK = 0.25
const SHRINK_RELEASE = 0.06
const DRIFT_IDLE_MS = 1800
const DRIFT_SPEED = 0.48
const TAP_SLOP = 6
const TAP_MS = 350
/** A card opens on tap only while its centre sits in the lens's calm middle; elsewhere a tap brings it there. */
const OPENABLE_DISTANCE = 0.6

const LENS_ANGLE = (-65 * Math.PI) / 180
const LENS_HALF = [0.565, 1] as const
const LENS_REFERENCE_ASPECT = 1440 / 1028

/*
 * Dispersion weights: 12 taps along the bend, each split into red, green and blue by Gaussians centred at
 * 0, .5 and 1 (width .38), with alpha taking their mean. They never change, so they are computed once here,
 * already divided by each channel's total, instead of 36 exp() calls per pixel per frame.
 */
const TAPS = 12
const TAP_WEIGHTS = (() => {
  const gauss = (t: number, centre: number) => Math.exp(-0.5 * ((t - centre) / 0.38) ** 2)
  const raw = Array.from({ length: TAPS }, (_, i) => {
    const t = i / (TAPS - 1)
    const rgb = [gauss(t, 0), gauss(t, 0.5), gauss(t, 1)]
    return [...rgb, (rgb[0] + rgb[1] + rgb[2]) / 3]
  })
  const totals = [0, 1, 2, 3].map((channel) => raw.reduce((sum, weight) => sum + weight[channel], 0))
  const vectors = raw.map((weight) => `vec4(${weight.map((value, channel) => (value / totals[channel]).toFixed(8)).join(", ")})`)
  return `const vec4 TAP_WEIGHTS[${TAPS}] = vec4[${TAPS}](${vectors.join(", ")});`
})()

const STRIP_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/* Covers are drawn premultiplied into a transparent target, so the empty field stays see-through. */
const STRIP_FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform vec2 uSize;
  uniform float uRadius;
  uniform float uAlpha;
  uniform float uTexAspect;
  varying vec2 vUv;
  void main() {
    vec2 pos = (vUv - 0.5) * uSize;
    vec2 q = abs(pos) - (uSize * 0.5 - uRadius);
    float dist = length(max(q, 0.0)) - uRadius;
    float edge = 1.0 - smoothstep(-0.75, 0.75, dist);
    float cardAspect = uSize.x / uSize.y;
    vec2 scale = cardAspect > uTexAspect ? vec2(1.0, uTexAspect / cardAspect) : vec2(cardAspect / uTexAspect, 1.0);
    vec4 tex = texture2D(map, 0.5 + (vUv - 0.5) * scale);
    float a = edge * uAlpha;
    gl_FragColor = vec4(tex.rgb * a, a);
  }
`

const LENS_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const LENS_FRAGMENT = /* glsl */ `
  uniform sampler2D tStrip;
  uniform vec2 uRes;
  uniform vec2 uPad;
  uniform float uLens;
  varying vec2 vUv;

  vec2 toTarget(vec2 uv) {
    return (uv * uRes + uPad) / (uRes + 2.0 * uPad);
  }

  ${TAP_WEIGHTS}

  void main() {
    float aspect = uRes.x / uRes.y;
    vec2 p = vUv - 0.5;
    p.x *= aspect;

    float c = cos(${LENS_ANGLE.toFixed(10)});
    float s = sin(${LENS_ANGLE.toFixed(10)});
    vec2 q = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
    vec2 halfSize = vec2(${LENS_HALF[0]}, ${LENS_HALF[1].toFixed(1)}) * max(1.0, aspect / ${LENS_REFERENCE_ASPECT.toFixed(10)});
    vec2 n = q / halfSize;
    float d = length(n);

    float influence = (1.0 - smoothstep(0.93, 1.0, d)) * uLens;
    float rim = smoothstep(0.578, 1.0, d);
    float r = length(p);
    vec2 dir = r > 1e-5 ? p / r : vec2(1.0, 0.0);
    vec2 tangent = vec2(-dir.y, dir.x);
    float azimuth = atan(n.y, n.x);
    float weight = 0.55 * sin(2.0 * azimuth) + 0.25 * sin(azimuth);

    vec2 offset = tangent * weight * rim * 0.6 * min(r, 0.7825) * influence;
    offset.x /= aspect;
    vec2 uv = vUv + offset;

    vec2 tapStep = offset * 0.004 * smoothstep(0.55, 1.0, d);
    // Where the taps would spread less than a fifth of a pixel (the calm middle, and outside the lens) they
    // all land on the same texel: one sample gives the identical colour at a twelfth of the cost.
    if (length(tapStep * uRes) * ${(TAPS - 1).toFixed(1)} < 0.2) {
      gl_FragColor = texture2D(tStrip, toTarget(uv));
    } else {
      vec4 sum = vec4(0.0);
      for (int i = 0; i < ${TAPS}; i++) {
        vec4 texel = texture2D(tStrip, toTarget(uv + tapStep * float(i)));
        sum += texel * TAP_WEIGHTS[i];
      }
      gl_FragColor = sum;
    }

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export interface CardRect {
  x: number
  y: number
  width: number
  height: number
}

export interface LensCarouselOptions {
  canvas: HTMLCanvasElement
  /** The element the canvas fills; it receives input and its size drives the viewport. */
  stage: HTMLElement
  covers: string[]
  reducedMotion: boolean
  /** A tap on a card in the calm middle of the lens. */
  onOpen: (instance: number) => void
  /** Every rendered frame, after positions update. */
  onFrame?: () => void
  /** The card nearest the centre changed. */
  onActiveChange?: (project: number) => void
  onRunningChange?: (running: boolean) => void
}

interface Card {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  /** Current centre in CSS px from the viewport's centre, y up. */
  x: number
  y: number
  width: number
  height: number
  delay: number
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
/** Frame-rate independent version of "move this share of the way each 60 Hz frame". */
const frameEase = (share: number, frames: number) => 1 - Math.pow(1 - share, frames)

export function cardLayout(viewportWidth: number) {
  const phone = viewportWidth < 640
  // Large covers: the middle card and its neighbours still sit inside the lens's undistorted core.
  const width = phone ? viewportWidth * 0.8 : Math.min(viewportWidth * 0.3, 760)
  return { width, height: width / COVER_ASPECT, gap: phone ? 10 : 14 }
}

/** Normalized distance from the lens centre for a point in stage pixels (y down); < 0.578 is undistorted. */
export function lensDistance(x: number, y: number, width: number, height: number) {
  const aspect = width / height
  const px = (x / width - 0.5) * aspect
  const py = 1 - y / height - 0.5
  const c = Math.cos(LENS_ANGLE)
  const s = Math.sin(LENS_ANGLE)
  const wide = Math.max(1, aspect / LENS_REFERENCE_ASPECT)
  const nx = (c * px - s * py) / (LENS_HALF[0] * wide)
  const ny = (s * px + c * py) / (LENS_HALF[1] * wide)
  return Math.hypot(nx, ny)
}

export class LensCarousel {
  private readonly options: LensCarouselOptions
  private readonly renderer: THREE.WebGLRenderer
  private readonly stripScene = new THREE.Scene()
  private readonly stripCamera = new THREE.OrthographicCamera()
  private readonly lensScene = new THREE.Scene()
  private readonly lensCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly target: THREE.WebGLRenderTarget
  private readonly cardGeometry = new THREE.PlaneGeometry(1, 1)
  private readonly lensGeometry = new THREE.PlaneGeometry(2, 2)
  private readonly lensMaterial: THREE.ShaderMaterial
  private readonly textures: THREE.Texture[]
  private readonly loaded: boolean[]
  private cards: Card[] = []

  private width = 1
  private height = 1
  private stride = 1
  private span = 1
  private cardWidth = 1
  private cardHeight = 1

  private current = 0
  private targetX = 0
  private velocity = 0
  private shrink = 0
  private lens = 0
  private needsSnap = false
  private lastInput = 0
  private dragging = false
  private pointerId: number | null = null
  private dragStartX = 0
  private dragStartTime = 0
  private lastPointerX = 0
  private lastPointerTime = 0
  private dragDistance = 0

  private hovered = false
  private focused = false
  private paused = false
  private hiddenInstance: number | null = null
  private reducedMotion: boolean

  private visible = false
  private parentActive = true
  private running = false
  private raf = 0
  private lastFrame = 0
  private entryStart: number | null = null
  private entryDone = false
  private activeProject = -1
  /** What the last drawn frame showed; the loop skips drawing while nothing on screen would change. */
  private drawnState = ""
  private dirty = true

  private readonly resizeObserver: ResizeObserver
  private readonly intersectionObserver: IntersectionObserver
  private readonly listeners: Array<() => void> = []

  constructor(options: LensCarouselOptions) {
    this.options = options
    this.reducedMotion = options.reducedMotion
    if (this.reducedMotion) this.entryDone = true

    // Throws when WebGL is unavailable; the section catches it and shows the static strip instead.
    this.renderer = new THREE.WebGLRenderer({ canvas: options.canvas, alpha: true, antialias: false, premultipliedAlpha: true })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.target = new THREE.WebGLRenderTarget(1, 1, { colorSpace: THREE.SRGBColorSpace, depthBuffer: false })

    const loader = new THREE.TextureLoader()
    const anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy())
    this.loaded = options.covers.map(() => false)
    this.textures = options.covers.map((url, index) => {
      const texture = loader.load(url, () => {
        this.loaded[index] = true
      })
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = anisotropy
      return texture
    })

    this.lensMaterial = new THREE.ShaderMaterial({
      vertexShader: LENS_VERTEX,
      fragmentShader: LENS_FRAGMENT,
      uniforms: {
        tStrip: { value: this.target.texture },
        uRes: { value: new THREE.Vector2(1, 1) },
        uPad: { value: new THREE.Vector2(0, 0) },
        uLens: { value: 0 }
      },
      blending: THREE.NoBlending,
      depthTest: false,
      depthWrite: false
    })
    const lensQuad = new THREE.Mesh(this.lensGeometry, this.lensMaterial)
    lensQuad.frustumCulled = false
    this.lensScene.add(lensQuad)

    this.resize()
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(options.stage)
    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting
        this.updateRunning()
      },
      { rootMargin: "120px 0px" }
    )
    this.intersectionObserver.observe(options.stage)
    this.bindInput()
  }

  /* ------------------------------------------------------------ public */

  setPaused(paused: boolean) {
    this.paused = paused
    if (paused) {
      this.endDrag()
      this.velocity = 0
      this.targetX = this.current
      this.needsSnap = false
    } else {
      this.lastInput = performance.now()
    }
  }

  setReducedMotion(reduced: boolean) {
    this.reducedMotion = reduced
    if (reduced) {
      this.entryDone = true
      this.velocity = 0
      this.current = this.targetX = this.snapped(this.targetX)
    }
  }

  /** Hides one card while its dialog shows the enlarged copy. */
  setHiddenInstance(instance: number | null) {
    this.hiddenInstance = instance
    this.requestFrame()
  }

  step(direction: 1 | -1) {
    if (this.paused) return
    this.touch()
    this.velocity = 0
    this.targetX = this.snapped(this.targetX) + direction * this.stride
    this.settleIfReduced()
  }

  reset() {
    if (this.paused) return
    this.touch()
    this.velocity = 0
    // The first card, reached the short way round the loop.
    this.targetX = Math.round(this.targetX / this.span) * this.span
    this.settleIfReduced()
  }

  /** Brings a card to the centre. */
  centerInstance(instance: number) {
    if (this.paused) return
    this.touch()
    this.velocity = 0
    this.targetX += this.wrap(instance * this.stride - this.targetX)
    this.settleIfReduced()
  }

  /** The copy of a project nearest the centre. */
  nearestInstance(project: number) {
    const count = this.options.covers.length
    let best = project
    let bestDistance = Infinity
    this.cards.forEach((card, index) => {
      if (index % count !== project) return
      const distance = Math.abs(card.x)
      if (distance < bestDistance) {
        bestDistance = distance
        best = index
      }
    })
    return best
  }

  projectOf(instance: number) {
    return instance % this.options.covers.length
  }

  /** A card's box in stage pixels (top-left origin), as drawn now. */
  cardRect(instance: number): CardRect {
    const card = this.cards[instance]
    if (!card) return { x: 0, y: 0, width: 0, height: 0 }
    return {
      x: this.width / 2 + card.x - card.width / 2,
      y: this.height / 2 - card.y - card.height / 2,
      width: card.width,
      height: card.height
    }
  }

  destroy() {
    this.stop()
    this.listeners.forEach((remove) => remove())
    this.resizeObserver.disconnect()
    this.intersectionObserver.disconnect()
    this.clearCards()
    this.textures.forEach((texture) => texture.dispose())
    this.cardGeometry.dispose()
    this.lensGeometry.dispose()
    this.lensMaterial.dispose()
    this.target.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }

  /* ------------------------------------------------------------ layout */

  private resize() {
    const rect = this.options.stage.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width))
    const height = Math.max(1, Math.round(rect.height))
    const offsetCards = this.current / this.stride
    const targetCards = this.targetX / this.stride

    this.width = width
    this.height = height
    const layout = cardLayout(width)
    this.cardWidth = layout.width
    this.cardHeight = layout.height
    this.stride = layout.width + layout.gap

    const padX = width * PAD
    const padY = height * PAD
    const paddedWidth = width + padX * 2
    const paddedHeight = height + padY * 2
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    const targetScale = Math.min(dpr, Math.sqrt(MAX_TARGET_PIXELS / (paddedWidth * paddedHeight)))

    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(width, height, false)
    this.target.setSize(Math.round(paddedWidth * targetScale), Math.round(paddedHeight * targetScale))

    this.stripCamera.left = -paddedWidth / 2
    this.stripCamera.right = paddedWidth / 2
    this.stripCamera.top = paddedHeight / 2
    this.stripCamera.bottom = -paddedHeight / 2
    this.stripCamera.near = -10
    this.stripCamera.far = 10
    this.stripCamera.updateProjectionMatrix()

    this.lensMaterial.uniforms.uRes.value.set(width, height)
    this.lensMaterial.uniforms.uPad.value.set(padX, padY)

    // At least three copies of the list, and enough that the padded field never runs out of cards.
    const count = this.options.covers.length
    const copies = Math.max(MIN_COPIES, Math.ceil((paddedWidth + this.stride * 2) / (count * this.stride)))
    if (this.cards.length !== copies * count) this.buildCards(copies * count)
    this.span = this.cards.length * this.stride

    this.current = offsetCards * this.stride
    this.targetX = targetCards * this.stride
    this.drawnState = ""
    this.requestFrame()
  }

  private buildCards(total: number) {
    this.clearCards()
    const count = this.options.covers.length
    for (let index = 0; index < total; index++) {
      const material = new THREE.ShaderMaterial({
        vertexShader: STRIP_VERTEX,
        fragmentShader: STRIP_FRAGMENT,
        uniforms: {
          map: { value: this.textures[index % count] },
          uSize: { value: new THREE.Vector2(1, 1) },
          uRadius: { value: 3 },
          uAlpha: { value: 0 },
          uTexAspect: { value: COVER_ASPECT }
        },
        transparent: true,
        premultipliedAlpha: true,
        depthTest: false,
        depthWrite: false
      })
      const mesh = new THREE.Mesh(this.cardGeometry, material)
      this.stripScene.add(mesh)
      this.cards.push({ mesh, x: 0, y: 0, width: this.cardWidth, height: this.cardHeight, delay: 0 })
    }
  }

  private clearCards() {
    for (const card of this.cards) {
      this.stripScene.remove(card.mesh)
      card.mesh.material.dispose()
    }
    this.cards = []
  }

  /** Centred modular wrap: keeps a position within half a loop of the centre. */
  private wrap(x: number) {
    const half = this.span / 2
    return ((((x + half) % this.span) + this.span) % this.span) - half
  }

  private snapped(x: number) {
    return Math.round(x / this.stride) * this.stride
  }

  /* ------------------------------------------------------------ input */

  private bindInput() {
    const { stage } = this.options
    const on = <K extends keyof HTMLElementEventMap>(
      target: HTMLElement | Window | Document,
      type: K | string,
      handler: (event: never) => void,
      options?: AddEventListenerOptions
    ) => {
      target.addEventListener(type, handler as EventListener, options)
      this.listeners.push(() => target.removeEventListener(type, handler as EventListener, options))
    }

    on(stage, "pointerdown", (event: PointerEvent) => {
      if (this.paused || (event.pointerType === "mouse" && event.button !== 0)) return
      this.dragging = true
      this.pointerId = event.pointerId
      this.dragStartX = this.lastPointerX = event.clientX
      this.dragStartTime = this.lastPointerTime = performance.now()
      this.dragDistance = 0
      this.velocity = 0
      this.touch()
      stage.setPointerCapture(event.pointerId)
    })
    on(stage, "pointermove", (event: PointerEvent) => {
      if (!this.dragging || event.pointerId !== this.pointerId) return
      const now = performance.now()
      const dx = event.clientX - this.lastPointerX
      const frames = Math.max(1, (now - this.lastPointerTime) / (1000 / 60))
      this.velocity = this.velocity * 0.6 + (-dx / frames) * 0.4
      this.targetX -= dx
      this.dragDistance = Math.max(this.dragDistance, Math.abs(event.clientX - this.dragStartX))
      this.lastPointerX = event.clientX
      this.lastPointerTime = now
      this.touch()
    })
    on(stage, "pointerup", (event: PointerEvent) => {
      if (!this.dragging || event.pointerId !== this.pointerId) return
      const tap = this.dragDistance < TAP_SLOP && performance.now() - this.dragStartTime < TAP_MS
      // A pause after moving means the finger stopped: no throw.
      if (performance.now() - this.lastPointerTime > 80 || this.reducedMotion) this.velocity = 0
      this.endDrag()
      if (tap) this.tap(event.clientX, event.clientY)
      this.settleIfReduced()
    })
    const cancel = (event: PointerEvent) => {
      if (event.pointerId !== this.pointerId) return
      this.velocity = 0
      this.endDrag()
    }
    on(stage, "pointercancel", cancel)
    on(stage, "lostpointercapture", cancel)

    // Horizontal wheels and trackpads move the strip. A plain vertical wheel keeps scrolling the page: this is
    // a section of a scrolling page, so taking that over would trap the reader. Shift+wheel also moves it.
    on(
      stage,
      "wheel",
      (event: WheelEvent) => {
        if (this.paused) return
        const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY)
        const delta = horizontal ? event.deltaX : event.shiftKey ? event.deltaY : 0
        if (delta === 0) return
        event.preventDefault()
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.width : 1
        this.velocity = 0
        this.targetX += delta * unit
        this.touch()
        this.settleIfReduced()
      },
      { passive: false }
    )

    on(stage, "keydown", (event: KeyboardEvent) => {
      if (this.paused) return
      if (event.key === "ArrowRight") this.step(1)
      else if (event.key === "ArrowLeft") this.step(-1)
      else if (event.key === "Home") this.reset()
      else return
      event.preventDefault()
    })

    // Hover is read, not only waited for: a pointer resting where the section scrolls in was "entered" before
    // these listeners existed (the section hydrates on arrival), so pointerenter would never come.
    this.hovered = stage.matches(":hover")
    const hover = (event: PointerEvent) => {
      if (event.pointerType !== "touch") this.hovered = true
    }
    on(stage, "pointerenter", hover)
    on(stage, "pointermove", hover)
    on(stage, "pointerleave", () => (this.hovered = false))
    on(stage, "focusin", () => (this.focused = true))
    on(stage, "focusout", (event: FocusEvent) => {
      if (!stage.contains(event.relatedTarget as Node | null)) this.focused = false
    })

    on(document, "visibilitychange", () => this.updateRunning())
    // An embedding page (same origin) can park the carousel while it is not the active view.
    on(window, "message", (event: MessageEvent) => {
      if (event.origin !== window.location.origin || window.parent === window || event.source !== window.parent) return
      const data = event.data as { active?: unknown } | null
      if (data && typeof data.active === "boolean") {
        this.parentActive = data.active
        this.updateRunning()
      }
    })
  }

  private endDrag() {
    if (this.pointerId !== null && this.options.stage.hasPointerCapture(this.pointerId)) {
      this.options.stage.releasePointerCapture(this.pointerId)
    }
    this.dragging = false
    this.pointerId = null
  }

  private touch() {
    this.lastInput = performance.now()
    this.needsSnap = true
  }

  private settleIfReduced() {
    if (!this.reducedMotion) return
    this.velocity = 0
    this.current = this.targetX = this.snapped(this.targetX)
    this.needsSnap = false
    // Explicit navigation lands at once: positions and the active card update now, not on the next frame.
    if (this.running) this.update(0, performance.now())
    else this.requestFrame()
  }

  private tap(clientX: number, clientY: number) {
    const stageRect = this.options.stage.getBoundingClientRect()
    const x = clientX - stageRect.left
    const y = clientY - stageRect.top
    for (let index = 0; index < this.cards.length; index++) {
      const rect = this.cardRect(index)
      if (x < rect.x || x > rect.x + rect.width || y < rect.y || y > rect.y + rect.height) continue
      const centreDistance = lensDistance(rect.x + rect.width / 2, rect.y + rect.height / 2, this.width, this.height)
      if (centreDistance < OPENABLE_DISTANCE && this.entryDone) {
        // Settle exactly where the card is, so the dialog grows from what is on screen.
        this.targetX = this.current
        this.needsSnap = false
        this.options.onOpen(index)
      } else {
        this.centerInstance(index)
      }
      return
    }
  }

  /* ------------------------------------------------------------ loop */

  private updateRunning() {
    const shouldRun = this.visible && this.parentActive && document.visibilityState !== "hidden"
    if (shouldRun === this.running) return
    if (shouldRun) this.start()
    else this.stop()
  }

  private start() {
    this.running = true
    this.lastFrame = performance.now()
    if (this.entryStart === null && !this.entryDone) {
      this.entryStart = this.lastFrame
      // Covers rise in screen order, left to right.
      const paddedHalf = this.width / 2 + this.width * PAD
      this.cards.forEach((card, index) => {
        card.delay = clamp01((this.wrap(index * this.stride - this.current) + paddedHalf) / (paddedHalf * 2)) * 0.4
      })
    }
    if (this.lastInput === 0) this.lastInput = this.lastFrame
    this.raf = requestAnimationFrame(this.frame)
    this.options.onRunningChange?.(true)
  }

  private stop() {
    if (!this.running) return
    this.running = false
    cancelAnimationFrame(this.raf)
    this.options.onRunningChange?.(false)
  }

  /** Draws once even while the loop is stopped (resize, hidden card). */
  private requestFrame() {
    if (this.running) return
    this.update(0, performance.now())
    this.render()
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame)
    const dt = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000))
    this.lastFrame = now
    this.update(dt * 60, now)
    if (this.dirty) {
      this.render()
      this.dirty = false
    }
    this.options.onFrame?.()
  }

  private update(frames: number, now: number) {
    if (!this.paused) {
      if (!this.dragging && Math.abs(this.velocity) > 0.05 && !this.reducedMotion) {
        this.targetX += this.velocity * frames
        this.velocity *= Math.pow(FRICTION, frames)
      } else if (!this.dragging) {
        this.velocity = 0
      }

      const idle = now - this.lastInput
      if (this.needsSnap && !this.dragging && this.velocity === 0 && idle > SNAP_IDLE_MS) {
        this.targetX = this.snapped(this.targetX)
        this.needsSnap = false
      }

      const drifting = this.entryDone && !this.reducedMotion && !this.hovered && !this.focused && !this.dragging && !this.needsSnap
      if (drifting && idle > DRIFT_IDLE_MS) this.targetX += DRIFT_SPEED * frames
    }

    const previous = this.current
    this.current = this.reducedMotion ? this.targetX : this.current + (this.targetX - this.current) * frameEase(EASE, frames)
    if (Math.abs(this.targetX - this.current) < 0.01) this.current = this.targetX

    // Cards tighten slightly with speed: quick to react, slow to relax.
    const speed = frames > 0 ? Math.abs(this.current - previous) / frames : 0
    const wanted = this.reducedMotion ? 0 : Math.min(1, speed / SHRINK_SPEED) * SHRINK_MAX
    this.shrink += (wanted - this.shrink) * frameEase(wanted > this.shrink ? SHRINK_ATTACK : SHRINK_RELEASE, frames)
    // Settle the tail: below a ten-thousandth the cards are a fraction of a pixel smaller, which no one sees.
    if (Math.abs(this.shrink - wanted) < 1e-4) this.shrink = wanted

    // Entrance: covers rise from below in screen order, grow to full height, then the lens forms.
    let rise = 1
    let grow = 1
    let lens = 1
    const elapsed = this.entryStart === null ? 0 : (now - this.entryStart) / 1000
    if (!this.entryDone) {
      grow = easeInOutCubic(clamp01((elapsed - 0.75) / 0.55))
      lens = easeInOutCubic(clamp01((elapsed - 1.1) / 0.8))
      if (elapsed > 1.95) this.entryDone = true
    }
    this.lens = lens

    const scale = 1 - this.shrink
    this.cards.forEach((card, index) => {
      card.x = this.wrap(index * this.stride - this.current)
      rise = this.entryDone ? 1 : easeOutCubic(clamp01((elapsed - card.delay) / 0.7))
      card.width = this.cardWidth * scale
      card.height = this.cardHeight * scale * (0.42 + 0.58 * grow)
      card.y = -(1 - rise) * this.height * 0.4

      const { mesh } = card
      mesh.position.set(card.x, card.y, 0)
      mesh.scale.set(card.width, card.height, 1)
      const uniforms = mesh.material.uniforms
      uniforms.uSize.value.set(card.width, card.height)
      const ready = this.loaded[index % this.options.covers.length] ? 1 : 0
      uniforms.uAlpha.value = index === this.hiddenInstance ? 0 : rise * ready
    })

    const state = [
      this.current.toFixed(2),
      this.shrink.toFixed(4),
      lens.toFixed(4),
      this.entryDone ? "done" : now,
      this.hiddenInstance,
      this.loaded.filter(Boolean).length
    ].join("|")
    if (state !== this.drawnState) {
      this.drawnState = state
      this.dirty = true
    }

    const active = this.projectOf(this.nearestCard())
    if (active !== this.activeProject) {
      this.activeProject = active
      this.options.onActiveChange?.(active)
    }
  }

  private nearestCard() {
    let best = 0
    let bestDistance = Infinity
    this.cards.forEach((card, index) => {
      if (Math.abs(card.x) < bestDistance) {
        bestDistance = Math.abs(card.x)
        best = index
      }
    })
    return best
  }

  private render() {
    this.lensMaterial.uniforms.uLens.value = this.lens
    this.renderer.setRenderTarget(this.target)
    this.renderer.clear()
    this.renderer.render(this.stripScene, this.stripCamera)
    this.renderer.setRenderTarget(null)
    this.renderer.clear()
    this.renderer.render(this.lensScene, this.lensCamera)
  }
}
