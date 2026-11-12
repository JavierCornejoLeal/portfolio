import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * Living Gradient: ribbons of green light flowing over the near-black ground like a livelier aurora, one
 * continuous wave. Simplex noise warps the space twice, sinusoidal bands run through the warped space with a
 * bright core and a soft body, and a broad noise mask lets them fade into black between them. Written for
 * this site.
 *
 * It is the page's single backdrop, so it can grow with the scroll (`scrollIntensity`): subtle behind the hero,
 * full once the next section takes the screen. It is soft by nature, so it renders at half resolution. It draws
 * only while on screen, in a visible tab, and not under the page loader; under reduced motion it holds a still frame.
 */

export interface LivingGradientProps {
  /** Ground, deep, mid and glow colours, darkest first. */
  colors?: [string, string, string, string]
  /** Speed of the drift. */
  speed?: number
  /** Film grain strength. */
  grain?: number
  /** Brightness at the top of the page and once scrolled one screen down; it eases between the two. */
  scrollIntensity?: [number, number]
  className?: string
}

const DEFAULT_COLORS: [string, string, string, string] = ["#070907", "#0e4a05", "#2ee600", "#abff90"]

/** Render scale relative to the CSS size: the gradient has no detail worth full resolution. */
const RENDER_SCALE = 0.5

const VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

/*
 * 3D simplex noise: "webgl-noise" by Ian McEwan and Stefan Gustavson, Ashima Arts.
 * Copyright (C) 2011 Ashima Arts. Distributed under the MIT License.
 * https://github.com/ashima/webgl-noise
 */
const SIMPLEX = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uRes;
uniform float uTime;
uniform float uGrain;
uniform float uIntensity;
uniform vec3 uGround;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uGlow;
${SIMPLEX}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 1.5;
  float t = uTime * 0.1;

  // Flow: warp the space twice so straight bands bend into ribbons that keep folding.
  vec2 q = p + 0.55 * vec2(snoise(vec3(p * 0.55, t)), snoise(vec3(p * 0.55 + 5.2, t)));
  q += 0.3 * vec2(snoise(vec3(q * 1.1 + 1.7, t * 1.35)), snoise(vec3(q * 1.1 + 9.1, t * 1.35)));

  // Ribbons: one continuous wave running through the warped space.
  float phase = q.x * 1.15 + 0.4 * q.y + 0.7 * snoise(vec3(q * 0.45, t * 0.6));
  float wave = sin(phase * 2.2 - t * 2.4);
  float body = smoothstep(-0.15, 1.0, wave);
  float core = pow(max(wave, 0.0), 6.0);

  // Where the ribbons live: broad pools, with black in between.
  float mask = smoothstep(-0.3, 0.6, snoise(vec3(p * 0.4 - 3.0, t * 0.5)));

  vec3 col = uGround;
  col = mix(col, uDeep, body * mask);
  col = mix(col, uMid, smoothstep(0.45, 1.0, wave) * mask * 0.85);
  col = mix(col, uGlow, core * mask * 0.7);

  float vignette = smoothstep(1.35, 0.3, length((uv - 0.5) * vec2(1.4, 1.2)));
  col = mix(uGround, col, uIntensity * mix(0.45, 1.0, vignette));

  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * uGrain;
  outColor = vec4(col, 1.0);
}`

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "")
  if (h.length === 3) h = h.replace(/./g, "$&$&")
  const v = parseInt(h.slice(0, 6), 16) || 0
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
}

interface Settings {
  colors: [string, string, string, string]
  speed: number
  grain: number
  scrollIntensity: [number, number]
}

function startEngine(root: HTMLDivElement, live: React.RefObject<Settings>) {
  const canvas = document.createElement("canvas")
  canvas.setAttribute("aria-hidden", "true")
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block"
  root.prepend(canvas)

  let gl: WebGL2RenderingContext | null = null
  let program: WebGLProgram | null = null
  let u: Record<string, WebGLUniformLocation | null> = {}

  function build() {
    gl = canvas.getContext("webgl2", { antialias: false, alpha: false })
    if (!gl) return false
    const compile = (type: number, src: string) => {
      const sh = gl!.createShader(type)!
      gl!.shaderSource(sh, src)
      gl!.compileShader(sh)
      if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(sh) || "LivingGradient: shader")
      return sh
    }
    program = gl.createProgram()!
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "LivingGradient: program")
    gl.useProgram(program)
    u = {}
    for (const name of ["uRes", "uTime", "uGrain", "uIntensity", "uGround", "uDeep", "uMid", "uGlow"]) u[name] = gl.getUniformLocation(program, name)
    gl.bindVertexArray(gl.createVertexArray())
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    return true
  }

  if (!build()) {
    canvas.remove()
    return null
  }

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
  let reduced = motionQuery.matches
  let visible = false
  let lost = false
  let raf = 0
  let last = 0
  // Start mid-drift so the still frame under reduced motion already has light in it.
  let time = 24

  const running = () => visible && !reduced && !lost && !document.hidden

  function resize() {
    const w = Math.max(1, Math.round(canvas.clientWidth * RENDER_SCALE))
    const h = Math.max(1, Math.round(canvas.clientHeight * RENDER_SCALE))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
  }

  function render() {
    if (lost || !gl) return
    const S = live.current
    const [ground, deep, mid, glow] = S.colors.map(hexToRgb)
    resize()
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(u.uRes, canvas.width, canvas.height)
    gl.uniform1f(u.uTime, time)
    gl.uniform1f(u.uGrain, S.grain)
    // Ease from the resting brightness to full over the first screen of scroll.
    const k = Math.min(1, Math.max(0, window.scrollY / Math.max(1, window.innerHeight)))
    const eased = k * k * (3 - 2 * k)
    gl.uniform1f(u.uIntensity, S.scrollIntensity[0] + (S.scrollIntensity[1] - S.scrollIntensity[0]) * eased)
    gl.uniform3fv(u.uGround, ground)
    gl.uniform3fv(u.uDeep, deep)
    gl.uniform3fv(u.uMid, mid)
    gl.uniform3fv(u.uGlow, glow)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  function tick(now: number) {
    raf = 0
    const dt = Math.min((now - last) / 1000, 1 / 30)
    last = now
    if (!document.documentElement.classList.contains("is-loading")) {
      time += dt * live.current.speed
      render()
    }
    if (running()) raf = requestAnimationFrame(tick)
  }
  function kick() {
    if (raf || !running()) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) {
      render()
      kick()
    } else stop()
  })
  io.observe(root)
  const ro = new ResizeObserver(() => {
    if (!running()) render()
  })
  ro.observe(root)
  const onMotion = () => {
    reduced = motionQuery.matches
    if (reduced) {
      stop()
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
      lost = !build()
      render()
      kick()
    } catch (err) {
      console.error(err)
    }
  }
  const onScroll = () => {
    if (!running()) render()
  }
  window.addEventListener("scroll", onScroll, { passive: true })
  motionQuery.addEventListener("change", onMotion)
  document.addEventListener("visibilitychange", onVisibility)
  canvas.addEventListener("webglcontextlost", onLost)
  canvas.addEventListener("webglcontextrestored", onRestored)

  render()

  return {
    update: () => (running() ? kick() : render()),
    dispose() {
      stop()
      io.disconnect()
      ro.disconnect()
      window.removeEventListener("scroll", onScroll)
      motionQuery.removeEventListener("change", onMotion)
      document.removeEventListener("visibilitychange", onVisibility)
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      gl?.getExtension("WEBGL_lose_context")?.loseContext()
      canvas.remove()
    },
  }
}

export default function LivingGradient({
  colors = DEFAULT_COLORS,
  speed = 1,
  grain = 0.03,
  scrollIntensity = [1, 1],
  className,
}: LivingGradientProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const engineRef = React.useRef<ReturnType<typeof startEngine>>(null)
  const settings: Settings = { colors, speed, grain, scrollIntensity }
  const live = React.useRef<Settings>(settings)
  live.current = settings
  const key = JSON.stringify(settings)

  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let engine: ReturnType<typeof startEngine> = null
    try {
      engine = startEngine(root, live)
    } catch (err) {
      console.error(err)
    }
    engineRef.current = engine
    return () => {
      engineRef.current = null
      engine?.dispose()
    }
  }, [])

  React.useEffect(() => {
    engineRef.current?.update()
  }, [key])

  return <div ref={rootRef} data-living-gradient className={cn("relative overflow-hidden", className)} style={{ backgroundColor: colors[0] }} />
}
