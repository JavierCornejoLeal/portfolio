import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * Depth image: a photo relit by a light that follows the cursor. Its depth is estimated from the photo itself (a mix
 * of brightness and height in the frame, smoothed into a small height field); the surface's tilt comes from that
 * depth plus the photo's own fine detail; the light is a point above the picture, casting soft shadows across the
 * relief. A faint smoke drifts through the dark and catches the light near it. While the cursor is away the light
 * circles slowly on its own; under reduced motion it holds still. Without WebGL the photo shows as it is.
 *
 * Hand-written WebGL (like FlutedGlass), drawn only while on screen. The root reports the light's position in
 * data-light ("x,y", 0..1 from the left and from the bottom) and data-ready once the first lit frame is drawn.
 */

interface Settings {
  /** 0 reads depth from height in the frame only (lower is nearer), 1 from brightness only. */
  depthFromLight: number
  /** Blur on the height field, in texels of a 512 wide map. */
  depthSmoothing: number
  depthContrast: number
  invertDepth: boolean
  /** Height of the relief, which deepens the shadows. */
  displacement: number
  /** Large scale tilt from depth. */
  normalStrength: number
  /** Fine tilt from the photo's own texture. */
  detail: number
  shadowIntensity: number
  shadowSoftness: number
  lightColor: string
  lightIntensity: number
  /** How quickly the light fades with distance: 0 even, 4 a tight pool. */
  falloff: number
  /** Height of the light above the picture. */
  elevation: number
  ambient: number
  /** How much of the photo's own tone survives where the light does not reach, 0 to 1. */
  colorPreserve: number
  /** How bright the photo reads once lit: it is usually darker than the surface it shows. */
  albedo: number
  /** How quickly the light follows the pointer, 0 to 1 per frame at 60 fps. */
  follow: number
  autoOrbit: boolean
  orbitRadius: number
  orbitDuration: number
  /** Strength of the drifting smoke, 0 hides it. */
  smoke: number
  backgroundColor: string
  /** Render scale cap. */
  dpr: number
}

const DEFAULTS: Settings = {
  depthFromLight: 0.5,
  depthSmoothing: 7,
  depthContrast: 1.2,
  invertDepth: false,
  displacement: 1.5,
  normalStrength: 1.5,
  detail: 0.8,
  shadowIntensity: 0.7,
  shadowSoftness: 0.1,
  lightColor: "#ffffff",
  lightIntensity: 6,
  falloff: 2.5,
  elevation: 1.2,
  ambient: 0.02,
  colorPreserve: 0,
  albedo: 2.4,
  follow: 0.12,
  autoOrbit: true,
  orbitRadius: 0.6,
  orbitDuration: 10,
  smoke: 1,
  backgroundColor: "#000000",
  dpr: 1.5,
}

/** Where the light rests under reduced motion: high and to the left, raking across the face. */
const STILL_LIGHT: [number, number] = [0.3, 0.78]
/** Width of the height field. */
const FIELD = 512

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

// Height from the photo: brightness lifted out of the dark, mixed with height in the frame.
const HEIGHT_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPhoto;
uniform float uFromLight, uContrast, uInvert;
void main() {
  vec3 c = texture2D(uPhoto, vec2(vUv.x, 1.0 - vUv.y)).rgb;
  float lum = pow(dot(c, vec3(0.299, 0.587, 0.114)), 0.6);
  float h = mix(1.0 - vUv.y, lum, uFromLight);
  h = clamp((h - 0.5) * uContrast + 0.5, 0.0, 1.0);
  if (uInvert > 0.5) h = 1.0 - h;
  gl_FragColor = vec4(h, h, h, 1.0);
}`

// One direction of a nine-tap gaussian.
const BLUR_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uStep;
void main() {
  float h = texture2D(uSrc, vUv).r * 0.2270270270;
  h += (texture2D(uSrc, vUv + uStep * 1.3846153846).r + texture2D(uSrc, vUv - uStep * 1.3846153846).r) * 0.3162162162;
  h += (texture2D(uSrc, vUv + uStep * 3.2307692308).r + texture2D(uSrc, vUv - uStep * 3.2307692308).r) * 0.0702702703;
  gl_FragColor = vec4(h, h, h, 1.0);
}`

const LIGHT_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPhoto, uHeight;
uniform vec2 uRes, uImg, uFieldTexel, uPhotoTexel;
uniform vec3 uLight, uLightColor, uBackground;
uniform float uTime, uDisplacement, uNormal, uDetail, uShadow, uSoftness, uIntensity, uFalloff, uAmbient,
  uPreserve, uAlbedo, uSmoke;

// Screen uv to photo uv, covering the screen.
vec2 photoUv(vec2 uv) {
  float ra = uRes.x / uRes.y, ia = uImg.x / uImg.y;
  vec2 s = ra > ia ? vec2(1.0, ia / ra) : vec2(ra / ia, 1.0);
  return (uv - 0.5) * s + 0.5;
}
float height(vec2 uv) { return texture2D(uHeight, uv).r; }
float luma(vec2 uv) { return dot(texture2D(uPhoto, vec2(uv.x, 1.0 - uv.y)).rgb, vec3(0.299, 0.587, 0.114)); }

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 uv = photoUv(vUv);
  vec2 q = vec2(vUv.x * aspect, vUv.y);
  float relief = uDisplacement * 0.12;

  // Surface tilt: the smoothed depth for its large shape, the photo's texture for fine detail.
  vec2 fx = vec2(uFieldTexel.x, 0.0), fy = vec2(0.0, uFieldTexel.y);
  vec2 g = vec2(height(uv + fx) - height(uv - fx), height(uv + fy) - height(uv - fy)) * 0.5 / uFieldTexel * 0.035;
  vec2 px = vec2(uPhotoTexel.x, 0.0), py = vec2(0.0, uPhotoTexel.y);
  vec2 d = vec2(luma(uv + px) - luma(uv - px), luma(uv + py) - luma(uv - py)) * 2.0;
  vec3 n = normalize(vec3(-(g * uNormal + d * uDetail), 1.0));

  vec3 p = vec3(q, height(uv) * relief);
  vec3 lp = vec3(uLight.x * aspect, uLight.y, uLight.z * 0.35);
  vec3 toLight = lp - p;
  float dist = length(toLight);
  vec3 l = toLight / dist;
  float atten = uIntensity * 0.16 / (1.0 + uFalloff * dist * dist * 3.0);
  float diffuse = max(dot(n, l), 0.0);

  // Soft shadows: walk from the surface towards the light over the relief.
  float occ = 0.0;
  vec2 dir = toLight.xy;
  float span = min(1.0, 0.45 / max(length(dir), 1e-3));
  for (int i = 1; i <= 20; i++) {
    float t = float(i) / 20.0 * span;
    vec3 r = p + toLight * t;
    vec2 rq = r.xy;
    float hz = height(photoUv(vec2(rq.x / aspect, rq.y))) * relief;
    occ = max(occ, (hz - r.z) / (uSoftness * t * length(dir) + 1e-3));
  }
  float shadow = 1.0 - uShadow * clamp(occ, 0.0, 1.0);

  vec3 photo = texture2D(uPhoto, vec2(uv.x, 1.0 - uv.y)).rgb;
  vec3 albedo = clamp(photo * uAlbedo, 0.0, 1.0);
  float spec = pow(max(dot(n, normalize(l + vec3(0.0, 0.0, 1.0))), 0.0), 28.0) * 0.18;
  vec3 color = uBackground + albedo * (uAmbient + uLightColor * diffuse * atten * shadow) + uLightColor * spec * atten * shadow;
  color = max(color, photo * uPreserve);

  // Smoke drifting through the dark, catching the light where it is near.
  float t = uTime;
  vec2 sq = q * 1.6;
  float s = fbm(sq + vec2(t * 0.015, -t * 0.01) + 0.6 * fbm(sq * 1.4 - vec2(t * 0.02, t * 0.012)));
  float smoke = smoothstep(0.42, 0.95, s);
  color += uLightColor * smoke * (0.022 + atten * 0.16) * uSmoke;

  // A grain of noise keeps the dark gradients from banding.
  color += (hash(gl_FragCoord.xy + fract(t)) - 0.5) / 255.0 * 2.0;
  gl_FragColor = vec4(color, 1.0);
}`

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "")
  const full = value.length === 3 ? [...value].map((c) => c + c).join("") : value
  const n = parseInt(full, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function startEngine(root: HTMLDivElement, photo: HTMLImageElement, live: React.RefObject<Settings>) {
  const canvas = document.createElement("canvas")
  canvas.className = "absolute inset-0 size-full opacity-0 transition-opacity duration-700"
  root.appendChild(canvas)
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, alpha: false })
  if (!gl) {
    canvas.remove()
    throw new Error("WebGL unavailable")
  }

  type Program = { program: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }
  type Target = { fb: WebGLFramebuffer; tex: WebGLTexture }
  let quad: WebGLBuffer
  let programs: { height: Program; blur: Program; light: Program }
  let photoTex: WebGLTexture
  let field: [Target, Target]
  let fieldSize = { w: FIELD, h: FIELD }
  let builtFor = ""

  function compile(type: number, source: string) {
    const shader = gl!.createShader(type)!
    gl!.shaderSource(shader, source)
    gl!.compileShader(shader)
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(shader) ?? "shader")
    return shader
  }
  function program(frag: string, uniforms: string[]): Program {
    const p = gl!.createProgram()!
    gl!.attachShader(p, compile(gl!.VERTEX_SHADER, VERT))
    gl!.attachShader(p, compile(gl!.FRAGMENT_SHADER, frag))
    gl!.bindAttribLocation(p, 0, "aPos")
    gl!.linkProgram(p)
    if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) throw new Error(gl!.getProgramInfoLog(p) ?? "link")
    return { program: p, u: Object.fromEntries(uniforms.map((name) => [name, gl!.getUniformLocation(p, name)])) }
  }
  function texture(width: number, height: number, source?: TexImageSource) {
    const tex = gl!.createTexture()!
    gl!.bindTexture(gl!.TEXTURE_2D, tex)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE)
    if (source) gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, source)
    else gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, width, height, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null)
    return tex
  }
  function target(width: number, height: number): Target {
    const tex = texture(width, height)
    const fb = gl!.createFramebuffer()!
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fb)
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, tex, 0)
    return { fb, tex }
  }
  function draw(p: Program, into: Target | null, width: number, height: number) {
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, into ? into.fb : null)
    gl!.viewport(0, 0, width, height)
    gl!.useProgram(p.program)
    gl!.bindBuffer(gl!.ARRAY_BUFFER, quad)
    gl!.enableVertexAttribArray(0)
    gl!.vertexAttribPointer(0, 2, gl!.FLOAT, false, 0, 0)
    gl!.drawArrays(gl!.TRIANGLES, 0, 3)
  }
  function bind(unit: number, tex: WebGLTexture, location: WebGLUniformLocation | null) {
    gl!.activeTexture(gl!.TEXTURE0 + unit)
    gl!.bindTexture(gl!.TEXTURE_2D, tex)
    gl!.uniform1i(location, unit)
  }

  function build() {
    quad = gl!.createBuffer()!
    gl!.bindBuffer(gl!.ARRAY_BUFFER, quad)
    // One triangle that covers the screen.
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl!.STATIC_DRAW)
    programs = {
      height: program(HEIGHT_FRAG, ["uPhoto", "uFromLight", "uContrast", "uInvert"]),
      blur: program(BLUR_FRAG, ["uSrc", "uStep"]),
      light: program(LIGHT_FRAG, [
        "uPhoto", "uHeight", "uRes", "uImg", "uFieldTexel", "uPhotoTexel", "uLight", "uLightColor", "uBackground",
        "uTime", "uDisplacement", "uNormal", "uDetail", "uShadow", "uSoftness", "uIntensity", "uFalloff", "uAmbient",
        "uPreserve", "uAlbedo", "uSmoke",
      ]),
    }
    photoTex = texture(photo.naturalWidth, photo.naturalHeight, photo)
    fieldSize = { w: FIELD, h: Math.max(1, Math.round((FIELD * photo.naturalHeight) / photo.naturalWidth)) }
    field = [target(fieldSize.w, fieldSize.h), target(fieldSize.w, fieldSize.h)]
    builtFor = ""
  }

  /** The height field, rebuilt only when the depth settings change. */
  function buildField() {
    const S = live.current!
    const key = [S.depthFromLight, S.depthSmoothing, S.depthContrast, S.invertDepth].join()
    if (key === builtFor) return
    builtFor = key
    const { height, blur } = programs
    gl!.useProgram(height.program)
    bind(0, photoTex, height.u.uPhoto)
    gl!.uniform1f(height.u.uFromLight, S.depthFromLight)
    gl!.uniform1f(height.u.uContrast, S.depthContrast)
    gl!.uniform1f(height.u.uInvert, S.invertDepth ? 1 : 0)
    draw(height, field[0], fieldSize.w, fieldSize.h)
    const spread = Math.max(0, S.depthSmoothing) * 0.7
    for (let pass = 0; pass < 3 && spread > 0; pass++) {
      gl!.useProgram(blur.program)
      bind(0, field[0].tex, blur.u.uSrc)
      gl!.uniform2f(blur.u.uStep, spread / fieldSize.w, 0)
      draw(blur, field[1], fieldSize.w, fieldSize.h)
      bind(0, field[1].tex, blur.u.uSrc)
      gl!.uniform2f(blur.u.uStep, 0, spread / fieldSize.h)
      draw(blur, field[0], fieldSize.w, fieldSize.h)
    }
  }

  function resize() {
    const S = live.current!
    const ratio = Math.min(window.devicePixelRatio || 1, S.dpr)
    const w = Math.max(1, Math.round(root.clientWidth * ratio))
    const h = Math.max(1, Math.round(root.clientHeight * ratio))
    if (canvas.width === w && canvas.height === h) return false
    canvas.width = w
    canvas.height = h
    return true
  }

  /* ---------------- the light ---------------- */
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
  let reduced = motionQuery.matches
  let visible = false
  let lost = false
  let raf = 0
  let last = 0
  let time = 0
  let pointer: [number, number] | null = null
  const orbitAt = (t: number): [number, number] => {
    const S = live.current!
    const a = (t / Math.max(0.1, S.orbitDuration)) * Math.PI * 2
    return [0.5 + Math.cos(a) * S.orbitRadius * 0.4, 0.55 + Math.sin(a) * S.orbitRadius * 0.35]
  }
  let light: [number, number] = reduced ? [...STILL_LIGHT] : orbitAt(0)
  let reported = ""

  function report() {
    const value = `${light[0].toFixed(3)},${light[1].toFixed(3)}`
    if (value !== reported) {
      reported = value
      root.dataset.light = value
    }
  }

  function render() {
    if (lost) return
    const S = live.current!
    buildField()
    const { light: L } = programs
    gl!.useProgram(L.program)
    bind(0, photoTex, L.u.uPhoto)
    bind(1, field[0].tex, L.u.uHeight)
    gl!.uniform2f(L.u.uRes, canvas.width, canvas.height)
    gl!.uniform2f(L.u.uImg, photo.naturalWidth, photo.naturalHeight)
    gl!.uniform2f(L.u.uFieldTexel, 1 / fieldSize.w, 1 / fieldSize.h)
    gl!.uniform2f(L.u.uPhotoTexel, 1 / photo.naturalWidth, 1 / photo.naturalHeight)
    gl!.uniform3f(L.u.uLight, light[0], light[1], S.elevation)
    gl!.uniform3f(L.u.uLightColor, ...hexToRgb(S.lightColor))
    gl!.uniform3f(L.u.uBackground, ...hexToRgb(S.backgroundColor))
    gl!.uniform1f(L.u.uTime, time)
    gl!.uniform1f(L.u.uDisplacement, S.displacement)
    gl!.uniform1f(L.u.uNormal, S.normalStrength)
    gl!.uniform1f(L.u.uDetail, S.detail)
    gl!.uniform1f(L.u.uShadow, S.shadowIntensity)
    gl!.uniform1f(L.u.uSoftness, Math.max(0.01, S.shadowSoftness))
    gl!.uniform1f(L.u.uIntensity, S.lightIntensity)
    gl!.uniform1f(L.u.uFalloff, S.falloff)
    gl!.uniform1f(L.u.uAmbient, S.ambient)
    gl!.uniform1f(L.u.uPreserve, S.colorPreserve)
    gl!.uniform1f(L.u.uAlbedo, S.albedo)
    gl!.uniform1f(L.u.uSmoke, S.smoke)
    draw(L, null, canvas.width, canvas.height)
    report()
    if (root.dataset.ready !== "true") {
      root.dataset.ready = "true"
      canvas.classList.replace("opacity-0", "opacity-100")
    }
  }

  const running = () => visible && !reduced && !lost && !document.hidden

  function frame(now: number) {
    raf = 0
    if (!running()) return
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60
    last = now
    time += dt
    const S = live.current!
    const goal = pointer ?? (S.autoOrbit ? orbitAt(time) : light)
    const k = 1 - Math.pow(1 - Math.min(Math.max(S.follow, 0), 1), dt * 60)
    light = [light[0] + (goal[0] - light[0]) * k, light[1] + (goal[1] - light[1]) * k]
    render()
    raf = requestAnimationFrame(frame)
  }
  function kick() {
    if (!raf && running()) {
      last = 0
      raf = requestAnimationFrame(frame)
    }
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  const onPointerMove = (e: PointerEvent) => {
    if (reduced) return
    const rect = root.getBoundingClientRect()
    pointer = [(e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height]
    kick()
  }
  const onPointerLeave = () => {
    pointer = null
  }
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) kick()
    else stop()
  })
  const ro = new ResizeObserver(() => {
    if (resize()) render()
  })
  const onMotion = () => {
    reduced = motionQuery.matches
    if (reduced) {
      stop()
      pointer = null
      light = [...STILL_LIGHT]
      render()
    } else kick()
  }
  const onVisibility = () => (document.hidden ? stop() : kick())
  const onLost = (e: Event) => {
    e.preventDefault()
    lost = true
    stop()
  }
  const onRestored = () => {
    try {
      build()
      lost = false
      render()
      kick()
    } catch (err) {
      console.error(err)
    }
  }

  build()
  resize()
  render()
  io.observe(root)
  ro.observe(root)
  root.addEventListener("pointermove", onPointerMove, { passive: true })
  root.addEventListener("pointerleave", onPointerLeave)
  motionQuery.addEventListener("change", onMotion)
  document.addEventListener("visibilitychange", onVisibility)
  canvas.addEventListener("webglcontextlost", onLost)
  canvas.addEventListener("webglcontextrestored", onRestored)

  return {
    /** Settings changed: redraw (the height field rebuilds itself if its inputs moved). */
    update() {
      resize()
      render()
      kick()
    },
    dispose() {
      stop()
      io.disconnect()
      ro.disconnect()
      root.removeEventListener("pointermove", onPointerMove)
      root.removeEventListener("pointerleave", onPointerLeave)
      motionQuery.removeEventListener("change", onMotion)
      document.removeEventListener("visibilitychange", onVisibility)
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
      canvas.remove()
      delete root.dataset.ready
    },
  }
}

export interface DepthImageProps extends Partial<Settings> {
  image: string
  alt: string
  className?: string
  children?: React.ReactNode
}

export default function DepthImage({ image, alt, className, children, ...props }: DepthImageProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const photoRef = React.useRef<HTMLImageElement>(null)
  const engineRef = React.useRef<ReturnType<typeof startEngine> | null>(null)

  const own = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined)) as Partial<Settings>
  const settings: Settings = { ...DEFAULTS, ...own }
  const key = JSON.stringify(settings)
  const live = React.useRef<Settings>(settings)
  live.current = settings

  React.useEffect(() => {
    const root = rootRef.current
    const photo = photoRef.current
    if (!root || !photo) return
    let cancelled = false
    const start = () => {
      if (cancelled || engineRef.current) return
      try {
        engineRef.current = startEngine(root, photo, live)
      } catch (err) {
        // No WebGL: the photo stays as it is.
        console.warn(err)
      }
    }
    if (photo.complete && photo.naturalWidth) start()
    else photo.addEventListener("load", start, { once: true })
    return () => {
      cancelled = true
      photo.removeEventListener("load", start)
      engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [image])

  React.useEffect(() => {
    engineRef.current?.update()
  }, [key])

  return (
    <div
      ref={rootRef}
      data-depth-image
      className={cn("relative isolate overflow-hidden", className)}
      style={{ backgroundColor: settings.backgroundColor }}
    >
      {/* The photo itself: what shows before the light is drawn, and instead of it without WebGL. */}
      <img ref={photoRef} src={image} alt={alt} decoding="async" className="absolute inset-0 size-full object-cover" />
      {children !== undefined && <div className="relative z-10 size-full">{children}</div>}
    </div>
  )
}
