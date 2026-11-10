import { useEffect, useRef } from 'react';

/**
 * A live topographic survey: contour lines of a drifting height field, drawn in WebGL2.
 * The terrain gathers into a summit around a focus point, which other islands move by
 * dispatching `topo:focus` with `{ x, y }` in normalised viewport space (0..1, origin top left).
 */

export const TOPO_FOCUS_EVENT = 'topo:focus';

export function setTopoFocus(x: number, y: number) {
	window.dispatchEvent(new CustomEvent(TOPO_FOCUS_EVENT, { detail: { x, y } }));
}

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 uView;
uniform float uTime;
uniform vec2 uFocus;
uniform vec2 uPointer;
uniform float uPointerAmp;
uniform vec3 uMinor;
uniform vec3 uMajor;
uniform vec3 uGround;

out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 turn = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = turn * p * 2.02;
    amplitude *= 0.5;
  }
  return value;
}

float contour(float h, float levels) {
  float v = h * levels;
  float d = abs(fract(v - 0.5) - 0.5) / fwidth(v);
  return 1.0 - clamp(d, 0.0, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uView;
  float aspect = uView.x / uView.y;
  vec2 p = vec2(uv.x * aspect, uv.y);

  vec2 focus = vec2(uFocus.x * aspect, 1.0 - uFocus.y);
  vec2 pointer = vec2(uPointer.x * aspect, 1.0 - uPointer.y);

  float h = fbm(p * 1.6 + vec2(uTime * 0.012, -uTime * 0.008));
  h += 0.55 * exp(-dot(p - focus, p - focus) * 5.0);
  h += uPointerAmp * 0.18 * exp(-dot(p - pointer, p - pointer) * 28.0);

  float minor = contour(h, 22.0);
  float major = contour(h, 22.0 / 5.0);

  float nearFocus = exp(-dot(p - focus, p - focus) * 2.2);
  float edge = smoothstep(0.0, 0.25, uv.y) * 0.6 + 0.4;

  vec3 color = uGround;
  color = mix(color, uMinor, minor * (0.35 + 0.35 * nearFocus) * edge);
  color = mix(color, uMajor, major * (0.45 + 0.4 * nearFocus) * edge);
  outColor = vec4(color, 1.0);
}`;

const hex = (value: string) => {
	const n = parseInt(value.slice(1), 16);
	return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as const;
};

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
	const shader = gl.createShader(type)!;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.warn(gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

interface TopoFieldProps {
	/** Initial focus point, normalised viewport coordinates. */
	focus?: [number, number];
	className?: string;
}

export default function TopoField({ focus = [0.72, 0.4], className = '' }: TopoFieldProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' });
		if (!gl) return;

		const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
		const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
		if (!vertex || !fragment) return;
		const program = gl.createProgram()!;
		gl.attachShader(program, vertex);
		gl.attachShader(program, fragment);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
		gl.useProgram(program);

		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		const position = gl.getAttribLocation(program, 'aPosition');
		gl.enableVertexAttribArray(position);
		gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

		const u = (name: string) => gl.getUniformLocation(program, name);
		const uView = u('uView');
		const uTime = u('uTime');
		const uFocus = u('uFocus');
		const uPointer = u('uPointer');
		const uPointerAmp = u('uPointerAmp');
		gl.uniform3fv(u('uGround'), hex('#070907'));
		gl.uniform3fv(u('uMinor'), hex('#176d07'));
		gl.uniform3fv(u('uMajor'), hex('#2ee600'));

		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		const state = {
			focus: [...focus] as [number, number],
			target: [...focus] as [number, number],
			pointer: [0.5, 0.5] as [number, number],
			pointerTarget: [0.5, 0.5] as [number, number],
			pointerAmp: 0,
			pointerAmpTarget: 0,
			time: Math.random() * 100,
			last: 0,
			frame: 0,
			visible: true
		};

		const resize = () => {
			const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
			const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
			const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
			if (canvas.width !== width || canvas.height !== height) {
				canvas.width = width;
				canvas.height = height;
			}
			gl.viewport(0, 0, width, height);
			gl.uniform2f(uView, width, height);
		};

		const draw = () => {
			gl.uniform1f(uTime, state.time);
			gl.uniform2f(uFocus, state.focus[0], state.focus[1]);
			gl.uniform2f(uPointer, state.pointer[0], state.pointer[1]);
			gl.uniform1f(uPointerAmp, state.pointerAmp);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		};

		const tick = (now: number) => {
			state.frame = 0;
			const delta = state.last ? Math.min(now - state.last, 64) : 16;
			state.last = now;
			const ease = 1 - Math.exp(-delta / 900);
			const quick = 1 - Math.exp(-delta / 220);
			state.time += delta / 1000;
			state.focus[0] += (state.target[0] - state.focus[0]) * ease;
			state.focus[1] += (state.target[1] - state.focus[1]) * ease;
			state.pointer[0] += (state.pointerTarget[0] - state.pointer[0]) * quick;
			state.pointer[1] += (state.pointerTarget[1] - state.pointer[1]) * quick;
			state.pointerAmp += (state.pointerAmpTarget - state.pointerAmp) * quick;
			draw();
			schedule();
		};

		const schedule = () => {
			if (motion.matches || !state.visible || state.frame) return;
			state.frame = requestAnimationFrame(tick);
		};

		const stop = () => {
			if (state.frame) cancelAnimationFrame(state.frame);
			state.frame = 0;
			state.last = 0;
		};

		// Reduced motion: jump straight to the target and draw one still frame.
		const settle = () => {
			state.focus = [...state.target];
			state.pointerAmp = 0;
			draw();
		};

		const onFocus = (event: Event) => {
			const { x, y } = (event as CustomEvent<{ x: number; y: number }>).detail;
			state.target = [x, y];
			if (motion.matches) settle();
		};

		const onPointer = (event: PointerEvent) => {
			if (motion.matches) return;
			state.pointerTarget = [event.clientX / window.innerWidth, event.clientY / window.innerHeight];
			state.pointerAmpTarget = 1;
		};
		const onLeave = () => {
			state.pointerAmpTarget = 0;
		};

		const onMotion = () => {
			if (motion.matches) {
				stop();
				settle();
			} else {
				schedule();
			}
		};

		const onVisibility = () => {
			state.visible = document.visibilityState === 'visible';
			if (state.visible) schedule();
			else stop();
		};

		const observer = new ResizeObserver(() => {
			resize();
			draw();
		});
		observer.observe(canvas);

		resize();
		draw();
		schedule();

		window.addEventListener(TOPO_FOCUS_EVENT, onFocus);
		window.addEventListener('pointermove', onPointer, { passive: true });
		document.documentElement.addEventListener('pointerleave', onLeave);
		motion.addEventListener('change', onMotion);
		document.addEventListener('visibilitychange', onVisibility);

		return () => {
			stop();
			observer.disconnect();
			window.removeEventListener(TOPO_FOCUS_EVENT, onFocus);
			window.removeEventListener('pointermove', onPointer);
			document.documentElement.removeEventListener('pointerleave', onLeave);
			motion.removeEventListener('change', onMotion);
			document.removeEventListener('visibilitychange', onVisibility);
			gl.deleteProgram(program);
			gl.deleteBuffer(buffer);
		};
		// The initial focus is read once; later moves arrive through TOPO_FOCUS_EVENT.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return <canvas ref={canvasRef} aria-hidden="true" className={`block h-full w-full ${className}`} />;
}
