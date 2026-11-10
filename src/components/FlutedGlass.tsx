import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * Fluted Glass: coloured liquid stirred by the pointer, seen through a pane of reeded glass.
 * One WebGL2 context, three stages:
 *   1. A small fluid simulation (velocity + dye) that the pointer, or a slow autoplay path, pours into.
 *   2. A "scene" pass: the backdrop colour, a slow domain-warped swirl and the dye on top.
 *   3. The glass: each flute refracts and compresses the scene, splits colour at its seams and
 *      carries a specular line.
 * Without float render targets the liquid still pours and fades, it just does not flow.
 */

export interface FlutedGlassProps {
  /** Two liquid colours. Strokes up and to the right lean towards the second, down and to the left towards the first */
  colors?: [string, string]
  /** Surface behind the glass. Light surfaces get soft shadows instead of highlights. "transparent" shows the page */
  backgroundColor?: string
  /** Strength of the slow swirl in the surface behind the glass */
  texture?: number
  /** Direction of the flutes in degrees. 0 gives vertical bars */
  angle?: number
  /** Number of flutes across the width of the frame */
  flutes?: number
  /** How strongly each flute bends and compresses the light behind it */
  refraction?: number
  /** Splits red, green and blue at the flute seams */
  aberration?: number
  /** 0 keeps each flute flat in the middle with sharp seams, 1 bends it in a gentle curve */
  softness?: number
  /** How far the flutes sway along their length */
  wave?: number
  /** How many sways fit along each flute */
  waveFrequency?: number
  /** Slowly slides the flutes sideways. Negative reverses it */
  drift?: number
  /** Strength of the specular line on each flute */
  highlight?: number
  /** 0 keeps the highlight pin sharp, 1 spreads it into a sheen */
  highlightSoftness?: number
  /** Where the highlight sits across each flute, in degrees */
  lightAngle?: number
  /** Size of the liquid stroke each pointer movement pours in */
  radius?: number
  /** How hard the pointer stirs the liquid and how long the flow keeps going after it stops */
  momentum?: number
  /** Lets the liquid curl into eddies. 0 keeps each movement a single smooth stroke */
  swirl?: number
  /** How much coloured liquid the pointer pours in */
  intensity?: number
  /** How slowly the liquid fades once the pointer rests */
  trail?: number
  /** Stirs the liquid along a slow wandering path whenever the pointer has been away for a moment.
   * "touch" does so only while the pointer in use cannot hover (a finger or pen), so a mouse keeps the surface dark */
  autoplay?: boolean | "touch"
  /** Lets the pointer stir coloured liquid behind the glass */
  interactive?: boolean
  /** Film grain, weighted towards the darker areas */
  grain?: number
  /** Speed of the surface swirl, the flute sway and the autoplay path */
  speed?: number
  /** Freezes the animation */
  paused?: boolean
  /** Upper bound for the device pixel ratio */
  dpr?: number
  className?: string
  style?: React.CSSProperties
  /** Content layered above the glass */
  children?: React.ReactNode
}

type Settings = Required<Omit<FlutedGlassProps, "className" | "style" | "children">>


const DEFAULTS: Settings = {
  colors: ["#5227FF", "#FF9FFC"],
  backgroundColor: "#050505",
  texture: 0.6,
  angle: 28,
  flutes: 8,
  refraction: 4,
  aberration: 0.61,
  softness: 0.5,
  wave: 0.06,
  waveFrequency: 1.5,
  drift: 0,
  highlight: 0.12,
  highlightSoftness: 0.3,
  lightAngle: -90,
  radius: 6.5,
  momentum: 13,
  swirl: 0,
  intensity: 1,
  trail: 1,
  autoplay: true,
  interactive: true,
  grain: 0.05,
  speed: 1,
  paused: false,
  dpr: 1.5,
}

/** Seconds without pointer input before autoplay takes over. */
const AUTOPLAY_AFTER = 2.5
/** Long side, in texels, of the velocity grid and of the dye/scene textures. */
const SIM_LONG_SIDE = 128
const DYE_LONG_SIDE = 384
const PRESSURE_ITERATIONS = 12

/* ------------------------------------------------------------------ *
 * Shaders
 * ------------------------------------------------------------------ */
const VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`

const HEAD = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
`

// Moves a field along the velocity (velocity is in frame-height units per second).
const ADVECT = `${HEAD}
uniform sampler2D uVel;
uniform sampler2D uSrc;
uniform float uDt;
uniform float uDecay;
uniform float uAspect;
void main() {
  vec2 v = texture(uVel, vUv).xy;
  outColor = texture(uSrc, vUv - uDt * v * vec2(1.0 / uAspect, 1.0)) * uDecay;
}`

// Adds a soft capsule from uA to uB, so fast strokes stay continuous.
const SPLAT = `${HEAD}
uniform sampler2D uTarget;
uniform vec2 uA;
uniform vec2 uB;
uniform vec3 uValue;
uniform float uRadius;
uniform float uAspect;
uniform float uCap;
void main() {
  vec2 k = vec2(uAspect, 1.0);
  vec2 p = vUv * k, a = uA * k, ab = uB * k - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
  vec2 d = p - a - ab * h;
  float g = exp(-dot(d, d) / (uRadius * uRadius));
  vec3 v = texture(uTarget, vUv).xyz + uValue * g;
  float peak = max(abs(v.x), max(abs(v.y), abs(v.z)));
  outColor = vec4(v * min(1.0, uCap / max(peak, 1e-4)), 1.0);
}`

const SCALE = `${HEAD}
uniform sampler2D uSrc;
uniform float uK;
void main() { outColor = texture(uSrc, vUv) * uK; }`

const CURL = `${HEAD}
uniform sampler2D uVel;
uniform vec2 uTexel;
void main() {
  float L = texture(uVel, vUv - vec2(uTexel.x, 0.0)).y;
  float R = texture(uVel, vUv + vec2(uTexel.x, 0.0)).y;
  float B = texture(uVel, vUv - vec2(0.0, uTexel.y)).x;
  float T = texture(uVel, vUv + vec2(0.0, uTexel.y)).x;
  outColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`

const VORTICITY = `${HEAD}
uniform sampler2D uVel;
uniform sampler2D uCurl;
uniform vec2 uTexel;
uniform float uStrength;
uniform float uDt;
void main() {
  float L = texture(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture(uCurl, vUv - vec2(0.0, uTexel.y)).x;
  float T = texture(uCurl, vUv + vec2(0.0, uTexel.y)).x;
  float C = texture(uCurl, vUv).x;
  vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  f = f / (length(f) + 1e-4) * uStrength * C;
  f.y = -f.y;
  outColor = vec4(texture(uVel, vUv).xy + f * uDt, 0.0, 1.0);
}`

const DIVERGENCE = `${HEAD}
uniform sampler2D uVel;
uniform vec2 uTexel;
void main() {
  float L = texture(uVel, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uVel, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture(uVel, vUv - vec2(0.0, uTexel.y)).y;
  float T = texture(uVel, vUv + vec2(0.0, uTexel.y)).y;
  outColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`

const PRESSURE = `${HEAD}
uniform sampler2D uP;
uniform sampler2D uDiv;
uniform vec2 uTexel;
void main() {
  float L = texture(uP, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uP, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture(uP, vUv - vec2(0.0, uTexel.y)).x;
  float T = texture(uP, vUv + vec2(0.0, uTexel.y)).x;
  outColor = vec4((L + R + B + T - texture(uDiv, vUv).x) * 0.25, 0.0, 0.0, 1.0);
}`

const GRADIENT = `${HEAD}
uniform sampler2D uP;
uniform sampler2D uVel;
uniform vec2 uTexel;
void main() {
  float L = texture(uP, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uP, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture(uP, vUv - vec2(0.0, uTexel.y)).x;
  float T = texture(uP, vUv + vec2(0.0, uTexel.y)).x;
  outColor = vec4(texture(uVel, vUv).xy - 0.5 * vec2(R - L, T - B), 0.0, 1.0);
}`

// Backdrop + slow swirl + liquid. Alpha carries coverage for transparent backdrops.
const SCENE = `${HEAD}
uniform sampler2D uDye;
uniform float uTime;
uniform float uAspect;
uniform float uTexture;
uniform vec3 uBg;
uniform vec3 uC0;
uniform vec3 uC1;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return s;
}

void main() {
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  float t = uTime * 0.04;
  vec2 q = vec2(fbm(p * 1.2 + vec2(t, -t)), fbm(p * 1.2 + vec2(5.2 - t, 1.3 + t)));
  float n = fbm(p * 1.5 + 2.2 * q + vec2(0.6 * t, -0.3 * t));
  // A faint neutral sheen: the backdrop stays black, colour only comes from the liquid.
  vec3 swirl = vec3(smoothstep(0.35, 0.95, n) * 0.045 * uTexture);
  vec3 add = swirl + texture(uDye, vUv).rgb;
  float peak = max(add.r, max(add.g, add.b));
  // Soft saturation: dense liquid approaches full colour without a hard plateau edge.
  float m = 1.0 - exp(-2.0 * peak);
  outColor = vec4(mix(uBg, add / max(peak, 1e-4), m), m);
}`

const GLASS = `${HEAD}
uniform sampler2D uScene;
uniform vec2 uRes;
uniform float uTime;
uniform float uAngle;
uniform float uFlutes;
uniform float uRefraction;
uniform float uAberration;
uniform float uSoftness;
uniform float uWave;
uniform float uWaveFreq;
uniform float uDrift;
uniform float uHighlight;
uniform float uHighlightSoft;
uniform float uLightAngle;
uniform float uGrain;
uniform float uLightSurface;
uniform float uTransparent;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
  float c = cos(uAngle), s = sin(uAngle);
  vec2 r = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  vec2 across = vec2(c, -s); // direction in which r.x grows: across the flutes
  float fw = aspect / max(uFlutes, 1.0);

  float u = r.x / fw + uDrift * uTime * 0.1 + (0.03 * uWave / fw) * sin(r.y * uWaveFreq * 6.2831853 + uTime * 0.6);
  float f = fract(u) - 0.5;
  float a = abs(2.0 * f);

  // Lens profile: flat with steep seams at softness 0, one gentle curve at 1.
  float profile = mix(sign(f) * pow(a, 6.0), 2.0 * f, uSoftness);
  float bend = profile * uRefraction * fw * 0.2;
  float compress = -f * fw * min(uRefraction * 0.12, 0.85);
  vec2 offset = across * (bend + compress);
  vec2 split = across * sign(f) * uAberration * fw * 0.06 * pow(a, 3.0);

  vec2 toUv = vec2(1.0 / aspect, 1.0);
  vec4 sr = texture(uScene, vUv + (offset + split) * toUv);
  vec4 sg = texture(uScene, vUv + offset * toUv);
  vec4 sb = texture(uScene, vUv + (offset - split) * toUv);
  vec3 col = vec3(sr.r, sg.g, sb.b);
  float alpha = max(sr.a, max(sg.a, sb.a));

  // Volume: a touch darker at the seams, then the specular line.
  col *= 1.0 - 0.35 * smoothstep(0.96, 1.0, a);
  float lightPos = 0.45 * sin(radians(uLightAngle));
  float width = mix(0.004, 0.16, uHighlightSoft * uHighlightSoft);
  float spec = uHighlight * exp(-pow((f - lightPos) / width, 2.0));
  col = mix(col + spec, col * (1.0 - spec * 0.6), uLightSurface);
  alpha = max(alpha, spec * (1.0 - uLightSurface));

  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float grain = (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * uGrain * (1.0 - lum);

  // Over a transparent backdrop the scene is already premultiplied (colour x coverage), so it is output as is,
  // and grain only touches what is actually there instead of speckling the page behind.
  if (uTransparent > 0.5) outColor = vec4(col + grain * alpha, alpha);
  else outColor = vec4(col + grain, 1.0);
}`

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "")
  if (h.length === 3) h = h.replace(/./g, "$&$&")
  const v = parseInt(h.slice(0, 6), 16) || 0
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
}

const luminance = ([r, g, b]: number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b

/** Slow wandering path in uv space, used by autoplay and for the still frame under reduced motion. */
function pathAt(t: number): [number, number] {
  return [
    0.5 + 0.32 * Math.sin(t * 0.37) + 0.08 * Math.sin(t * 1.13 + 1.7),
    0.5 + 0.28 * Math.sin(t * 0.29 + 0.6) + 0.07 * Math.sin(t * 0.97 + 2.3),
  ]
}

interface Target {
  tex: WebGLTexture
  fb: WebGLFramebuffer
  w: number
  h: number
}

interface Pair {
  read: Target
  write: Target
  swap(): void
}

interface Stroke {
  a: [number, number]
  b: [number, number]
  /** Pointer velocity, frame-height units per second */
  v: [number, number]
  strength: number
}

/* ------------------------------------------------------------------ *
 * Engine
 * ------------------------------------------------------------------ */
function startEngine(root: HTMLDivElement, live: React.RefObject<Settings>) {
  const canvas = document.createElement("canvas")
  canvas.setAttribute("aria-hidden", "true")
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block"
  root.prepend(canvas)

  const gl = canvas.getContext("webgl2", { antialias: false, alpha: true, premultipliedAlpha: true })
  if (!gl) {
    canvas.remove()
    return null
  }

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "FlutedGlass: shader")
    return sh
  }
  const program = (vert: WebGLShader, src: string) => {
    const prog = gl.createProgram()!
    gl.attachShader(prog, vert)
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, src))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "FlutedGlass: program")
    const uniforms: Record<string, WebGLUniformLocation | null> = {}
    const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(prog, i)!.name
      uniforms[name] = gl.getUniformLocation(prog, name)
    }
    return { prog, u: uniforms }
  }
  // Everything that lives on the GPU. Rebuilt from scratch when a lost context is restored.
  function buildPrograms() {
    const vert = compile(gl!.VERTEX_SHADER, VERT)
    return {
      advect: program(vert, ADVECT),
      splat: program(vert, SPLAT),
      scale: program(vert, SCALE),
      curl: program(vert, CURL),
      vorticity: program(vert, VORTICITY),
      divergence: program(vert, DIVERGENCE),
      pressure: program(vert, PRESSURE),
      gradient: program(vert, GRADIENT),
      scene: program(vert, SCENE),
      glass: program(vert, GLASS),
    }
  }
  function buildGeometry() {
    gl!.bindVertexArray(gl!.createVertexArray())
    gl!.bindBuffer(gl!.ARRAY_BUFFER, gl!.createBuffer())
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl!.STATIC_DRAW)
    gl!.enableVertexAttribArray(0)
    gl!.vertexAttribPointer(0, 2, gl!.FLOAT, false, 0, 0)
  }
  // Extensions are lost with the context, so they are requested again on restore.
  const hasFloatTargets = () => !!(gl!.getExtension("EXT_color_buffer_float") || gl!.getExtension("EXT_color_buffer_half_float"))

  let floatTargets = hasFloatTargets()
  let P = buildPrograms()
  buildGeometry()

  const created: Target[] = []
  function target(w: number, h: number, float: boolean): Target {
    const tex = gl!.createTexture()!
    gl!.bindTexture(gl!.TEXTURE_2D, tex)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE)
    if (float) gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA16F, w, h, 0, gl!.RGBA, gl!.HALF_FLOAT, null)
    else gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA8, w, h, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null)
    const fb = gl!.createFramebuffer()!
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fb)
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, tex, 0)
    gl!.viewport(0, 0, w, h)
    gl!.clearColor(0, 0, 0, 0)
    gl!.clear(gl!.COLOR_BUFFER_BIT)
    const t = { tex, fb, w, h }
    created.push(t)
    return t
  }
  function pair(w: number, h: number, float: boolean): Pair {
    let a = target(w, h, float)
    let b = target(w, h, float)
    return {
      get read() { return a },
      get write() { return b },
      swap() { [a, b] = [b, a] },
    }
  }

  let vel: Pair, dye: Pair, pressure: Pair, curl: Target, divergence: Target, scene: Target
  let fluid = floatTargets
  let size = { w: 0, h: 0 }

  function freeTargets() {
    for (const t of created.splice(0)) {
      gl!.deleteFramebuffer(t.fb)
      gl!.deleteTexture(t.tex)
    }
  }

  function grid(long: number) {
    const aspect = size.w / size.h
    return aspect >= 1
      ? { w: long, h: Math.max(1, Math.round(long / aspect)) }
      : { w: Math.max(1, Math.round(long * aspect)), h: long }
  }

  function allocate() {
    freeTargets()
    const sim = grid(SIM_LONG_SIDE)
    const fine = grid(Math.min(DYE_LONG_SIDE, Math.max(size.w, size.h)))
    vel = pair(sim.w, sim.h, floatTargets)
    pressure = pair(sim.w, sim.h, floatTargets)
    curl = target(sim.w, sim.h, floatTargets)
    divergence = target(sim.w, sim.h, floatTargets)
    dye = pair(fine.w, fine.h, floatTargets)
    scene = target(fine.w, fine.h, false)
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, vel.read.fb)
    fluid = floatTargets && gl!.checkFramebufferStatus(gl!.FRAMEBUFFER) === gl!.FRAMEBUFFER_COMPLETE
  }

  function draw(p: { prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }, out: Target | null, set: (u: Record<string, WebGLUniformLocation | null>) => void, textures: [string, WebGLTexture][] = []) {
    gl!.useProgram(p.prog)
    textures.forEach(([name, tex], i) => {
      gl!.activeTexture(gl!.TEXTURE0 + i)
      gl!.bindTexture(gl!.TEXTURE_2D, tex)
      gl!.uniform1i(p.u[name], i)
    })
    set(p.u)
    if (out) {
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, out.fb)
      gl!.viewport(0, 0, out.w, out.h)
    } else {
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null)
      gl!.viewport(0, 0, canvas.width, canvas.height)
    }
    gl!.drawArrays(gl!.TRIANGLES, 0, 3)
  }

  const aspect = () => size.w / size.h

  function splat(field: Pair, stroke: Stroke, value: [number, number, number], radius: number, cap: number) {
    draw(P.splat, field.write, (u) => {
      gl!.uniform2f(u.uA, stroke.a[0], stroke.a[1])
      gl!.uniform2f(u.uB, stroke.b[0], stroke.b[1])
      gl!.uniform3f(u.uValue, value[0], value[1], value[2])
      gl!.uniform1f(u.uRadius, radius)
      gl!.uniform1f(u.uAspect, aspect())
      gl!.uniform1f(u.uCap, cap)
    }, [["uTarget", field.read.tex]])
    field.swap()
  }

  function step(dt: number, strokes: Stroke[]) {
    const S = live.current
    const [c0, c1] = [hexToRgb(S.colors[0]), hexToRgb(S.colors[1])]
    const radius = Math.max(S.radius, 0.1) * 0.014
    const momentum = Math.max(S.momentum, 0.1)

    if (fluid) {
      const texel = [1 / vel.read.w, 1 / vel.read.h]
      draw(P.advect, vel.write, (u) => {
        gl!.uniform1f(u.uDt, dt)
        gl!.uniform1f(u.uDecay, Math.exp(-dt / (0.08 * momentum)))
        gl!.uniform1f(u.uAspect, aspect())
      }, [["uVel", vel.read.tex], ["uSrc", vel.read.tex]])
      vel.swap()
      for (const s of strokes) {
        const k = 0.06 * momentum * s.strength
        splat(vel, s, [s.v[0] * k, s.v[1] * k, 0], radius, 50)
      }
      if (S.swirl > 0) {
        draw(P.curl, curl, (u) => gl!.uniform2f(u.uTexel, texel[0], texel[1]), [["uVel", vel.read.tex]])
        draw(P.vorticity, vel.write, (u) => {
          gl!.uniform2f(u.uTexel, texel[0], texel[1])
          gl!.uniform1f(u.uStrength, S.swirl * 30)
          gl!.uniform1f(u.uDt, dt)
        }, [["uVel", vel.read.tex], ["uCurl", curl.tex]])
        vel.swap()
      }
      // Always project: a compressible flow advecting itself forms shock fronts that pile the liquid
      // into hard, jagged edges. Swirl only adds vorticity on top.
      {
        draw(P.divergence, divergence, (u) => gl!.uniform2f(u.uTexel, texel[0], texel[1]), [["uVel", vel.read.tex]])
        draw(P.scale, pressure.write, (u) => gl!.uniform1f(u.uK, 0.8), [["uSrc", pressure.read.tex]])
        pressure.swap()
        for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
          draw(P.pressure, pressure.write, (u) => gl!.uniform2f(u.uTexel, texel[0], texel[1]), [["uP", pressure.read.tex], ["uDiv", divergence.tex]])
          pressure.swap()
        }
        draw(P.gradient, vel.write, (u) => gl!.uniform2f(u.uTexel, texel[0], texel[1]), [["uP", pressure.read.tex], ["uVel", vel.read.tex]])
        vel.swap()
      }
    }

    draw(P.advect, dye.write, (u) => {
      gl!.uniform1f(u.uDt, fluid ? dt : 0)
      gl!.uniform1f(u.uDecay, Math.exp(-dt / (Math.max(S.trail, 0.05) * 2.2)))
      gl!.uniform1f(u.uAspect, aspect())
    }, [["uVel", vel.read.tex], ["uSrc", dye.read.tex]])
    dye.swap()
    for (const s of strokes) {
      const len = Math.hypot(s.v[0], s.v[1])
      // Up and to the right leans towards the second colour, down and to the left towards the first.
      const t = len > 1e-5 ? 0.5 + 0.5 * ((s.v[0] + s.v[1]) / (len * Math.SQRT2)) : 0.5
      const amount = 0.42 * S.intensity * s.strength * Math.min(1, len * 4)
      const col: [number, number, number] = [0, 1, 2].map((i) => (c0[i] + (c1[i] - c0[i]) * t) * amount) as [number, number, number]
      splat(dye, s, col, radius, 1.0)
    }
  }

  function render() {
    if (lost) return
    const S = live.current
    const transparent = S.backgroundColor === "transparent"
    const bg = transparent ? [0, 0, 0] : hexToRgb(S.backgroundColor)
    const [c0, c1] = [hexToRgb(S.colors[0]), hexToRgb(S.colors[1])]
    draw(P.scene, scene, (u) => {
      gl!.uniform1f(u.uTime, time)
      gl!.uniform1f(u.uAspect, aspect())
      gl!.uniform1f(u.uTexture, S.texture)
      gl!.uniform3fv(u.uBg, bg)
      gl!.uniform3fv(u.uC0, c0)
      gl!.uniform3fv(u.uC1, c1)
    }, [["uDye", dye.read.tex]])
    draw(P.glass, null, (u) => {
      gl!.uniform2f(u.uRes, canvas.width, canvas.height)
      gl!.uniform1f(u.uTime, time)
      gl!.uniform1f(u.uAngle, (S.angle * Math.PI) / 180)
      gl!.uniform1f(u.uFlutes, S.flutes)
      gl!.uniform1f(u.uRefraction, S.refraction)
      gl!.uniform1f(u.uAberration, S.aberration)
      gl!.uniform1f(u.uSoftness, Math.min(Math.max(S.softness, 0), 1))
      gl!.uniform1f(u.uWave, S.wave)
      gl!.uniform1f(u.uWaveFreq, S.waveFrequency)
      gl!.uniform1f(u.uDrift, S.drift)
      gl!.uniform1f(u.uHighlight, S.highlight)
      gl!.uniform1f(u.uHighlightSoft, Math.min(Math.max(S.highlightSoftness, 0), 1))
      gl!.uniform1f(u.uLightAngle, S.lightAngle)
      gl!.uniform1f(u.uGrain, S.grain)
      gl!.uniform1f(u.uLightSurface, !transparent && luminance(bg) > 0.5 ? 1 : 0)
      gl!.uniform1f(u.uTransparent, transparent ? 1 : 0)
    }, [["uScene", scene.tex]])
  }

  /* ---------------- input, autoplay and the frame loop ---------------- */
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
  let reduced = motionQuery.matches
  let visible = false
  let lost = false
  let raf = 0
  let last = 0
  let time = 0
  let autoT = 0
  let lastPointerAt = -Infinity
  let pointer: { x: number; y: number; t: number } | null = null
  let pending: Stroke[] = []

  const running = () => visible && !reduced && !live.current.paused && !lost && !document.hidden

  // "touch" follows whether the pointer actually in use can hover, so hybrid devices switch with the person:
  // a mouse, or a pen seen moving without contact, leaves the surface dark until it stirs; a finger, or a pen
  // that only moves while touching, gets autoplay. Before any input, guess from whether any hovering pointer
  // exists at all.
  const anyHover = window.matchMedia("(any-hover: hover)")
  let lastPointerType: string | null = null
  let inputHovers: boolean | null = null
  function autoplayOn() {
    const mode = live.current.autoplay
    if (mode !== "touch") return mode
    return inputHovers === null ? !anyHover.matches : !inputHovers
  }
  function reflectAutoplay() {
    root.dataset.autoplay = autoplayOn() ? "on" : "off"
  }
  function onPointerType(e: PointerEvent) {
    const switched = e.pointerType !== lastPointerType
    lastPointerType = e.pointerType
    let hovers = inputHovers
    if (e.pointerType === "mouse") hovers = true
    else if (e.pointerType === "touch") hovers = false
    else if (e.type === "pointermove" && e.buttons === 0) hovers = true // a pen hovering above the screen
    else if (switched) hovers = false // a pen not yet seen hovering behaves like a finger
    if (hovers === inputHovers) return
    inputHovers = hovers
    reflectAutoplay()
  }

  function autoStroke(dt: number): Stroke {
    const a = pathAt(autoT)
    autoT += dt * live.current.speed
    const b = pathAt(autoT)
    const k = 1 / Math.max(dt, 1e-3)
    return { a, b, v: [(b[0] - a[0]) * aspect() * k, (b[1] - a[1]) * k], strength: 0.6 }
  }

  function advance(dt: number, now: number) {
    const S = live.current
    time += dt * S.speed
    const strokes = pending
    pending = []
    if (autoplayOn() && now - lastPointerAt > AUTOPLAY_AFTER * 1000) strokes.push(autoStroke(dt))
    step(dt, strokes)
  }

  /** Pours a few seconds of autoplay so a fresh surface, or a still frame, never starts empty when autoplay is on. */
  function warm() {
    if (!autoplayOn()) return
    for (let i = 0; i < 90; i++) step(1 / 60, [autoStroke(1 / 60)])
  }

  function tick(now: number) {
    raf = 0
    const dt = Math.min((now - last) / 1000, 1 / 30)
    last = now
    // The page loader covers everything on a first visit: do no work underneath it.
    if (!document.documentElement.classList.contains("is-loading")) {
      advance(dt, now)
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

  function resize() {
    if (lost) return false
    const dpr = Math.min(window.devicePixelRatio || 1, live.current.dpr)
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
    if (w === canvas.width && h === canvas.height && size.w) return false
    canvas.width = w
    canvas.height = h
    size = { w, h }
    allocate()
    warm()
    return true
  }

  function onPointerMove(e: PointerEvent) {
    onPointerType(e)
    // Under reduced motion or while frozen the pointer has no visible effect, so it must not wake anything.
    if (!live.current.interactive || !running()) return
    const rect = root.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = 1 - (e.clientY - rect.top) / rect.height
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      pointer = null
      return
    }
    const now = performance.now()
    lastPointerAt = now
    if (pointer) {
      const dt = Math.max((now - pointer.t) / 1000, 1 / 120)
      pending.push({
        a: [pointer.x, pointer.y],
        b: [x, y],
        v: [((x - pointer.x) * aspect()) / dt, (y - pointer.y) / dt],
        strength: 1,
      })
      if (pending.length > 8) pending.splice(0, pending.length - 8)
    }
    pointer = { x, y, t: now }
  }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) kick()
    else stop()
  })
  io.observe(root)
  const ro = new ResizeObserver(() => {
    if (resize() && !running()) render()
  })
  ro.observe(root)

  const onMotion = () => {
    reduced = motionQuery.matches
    if (reduced) {
      // Freeze on the current frame.
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

  motionQuery.addEventListener("change", onMotion)
  document.addEventListener("visibilitychange", onVisibility)
  window.addEventListener("pointermove", onPointerMove, { passive: true })
  window.addEventListener("pointerdown", onPointerType, { passive: true })
  const onRestored = () => {
    try {
      // The old textures and framebuffers died with the context: forget them, never delete them.
      created.length = 0
      size = { w: 0, h: 0 }
      floatTargets = hasFloatTargets()
      P = buildPrograms()
      buildGeometry()
      lost = false
      resize()
      render()
      kick()
    } catch (err) {
      console.error(err)
    }
  }

  canvas.addEventListener("webglcontextlost", onLost)
  canvas.addEventListener("webglcontextrestored", onRestored)

  reflectAutoplay()
  resize()
  render()
  kick()

  return {
    /** Props changed: pick up pause/resume, and redraw a still frame. */
    update() {
      reflectAutoplay()
      resize()
      if (running()) kick()
      else {
        stop()
        render()
      }
    },
    dispose() {
      stop()
      io.disconnect()
      ro.disconnect()
      motionQuery.removeEventListener("change", onMotion)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerdown", onPointerType)
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      freeTargets()
      gl.getExtension("WEBGL_lose_context")?.loseContext()
      canvas.remove()
    },
  }
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */
export default function FlutedGlass({ className, style, children, ...props }: FlutedGlassProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const engineRef = React.useRef<ReturnType<typeof startEngine>>(null)

  const own = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined)) as Partial<Settings>
  const settings: Settings = { ...DEFAULTS, ...own }
  const key = JSON.stringify(settings)
  const live = React.useRef<Settings>(settings)
  live.current = settings

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

  const background = settings.backgroundColor === "transparent" ? undefined : settings.backgroundColor

  return (
    <div ref={rootRef} className={cn("relative isolate overflow-hidden", className)} style={{ backgroundColor: background, ...style }}>
      {children !== undefined && <div className="relative z-10 size-full">{children}</div>}
    </div>
  )
}
