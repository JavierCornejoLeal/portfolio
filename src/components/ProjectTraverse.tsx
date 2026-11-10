import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import type { Project } from '@/data/portfolio';
import { setTopoFocus } from '@/components/TopoField';

export interface TraverseProject extends Project {
	image: string;
}

function Arrow({ className = '' }: { className?: string }) {
	return (
		<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" className={className}>
			<path d="M3 12h17M14 6l6 6-6 6" />
		</svg>
	);
}

const EASE = [0.16, 1, 0.3, 1] as const;
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Projects as survey stations on a traverse: one station held at a time, the rest dimmed.
 * Line pattern carries state on the rail: solid = surveyed, double = current, dashed = ahead.
 */
export default function ProjectTraverse({ projects }: { projects: TraverseProject[] }) {
	const [index, setIndex] = useState(0);
	const [direction, setDirection] = useState(1);
	const reduce = useReducedMotion();
	const rootRef = useRef<HTMLElement>(null);
	const inView = useRef(false);
	const project = projects[index];

	const go = useCallback(
		(next: number) => {
			const wrapped = (next + projects.length) % projects.length;
			if (wrapped === index) return;
			setDirection(next > index ? 1 : -1);
			setIndex(wrapped);
		},
		[index, projects.length]
	);

	// Move the terrain's summit to the active station while the traverse is on screen.
	useEffect(() => {
		if (inView.current) setTopoFocus(...project.focus);
	}, [project]);

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				inView.current = entry.isIntersecting;
				if (entry.isIntersecting) setTopoFocus(...projects[index].focus);
			},
			{ threshold: 0.45 }
		);
		observer.observe(root);
		return () => observer.disconnect();
	}, [index, projects]);

	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'ArrowRight') {
			event.preventDefault();
			go(index + 1);
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			go(index - 1);
		}
	};

	// Swipe / drag on the image plate.
	const drag = useRef<{ x: number; id: number } | null>(null);
	const onPointerDown = (event: PointerEvent) => {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		drag.current = { x: event.clientX, id: event.pointerId };
	};
	const onPointerUp = (event: PointerEvent) => {
		const start = drag.current;
		drag.current = null;
		if (!start || start.id !== event.pointerId) return;
		const dx = event.clientX - start.x;
		if (Math.abs(dx) > 48) go(index + (dx < 0 ? 1 : -1));
	};

	// 3D tilt that follows the pointer over the plate.
	const tiltX = useMotionValue(0);
	const tiltY = useMotionValue(0);
	const springX = useSpring(tiltX, { stiffness: 140, damping: 18 });
	const springY = useSpring(tiltY, { stiffness: 140, damping: 18 });
	const rotateY = useTransform(springX, v => v * 7);
	const rotateX = useTransform(springY, v => v * -5);
	const onPlateMove = (event: PointerEvent<HTMLDivElement>) => {
		if (reduce) return;
		const box = event.currentTarget.getBoundingClientRect();
		tiltX.set((event.clientX - box.left) / box.width - 0.5);
		tiltY.set((event.clientY - box.top) / box.height - 0.5);
	};
	const onPlateLeave = () => {
		tiltX.set(0);
		tiltY.set(0);
	};

	const plate = {
		enter: (dir: number) =>
			reduce
				? { opacity: 0 }
				: { clipPath: dir > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)', scale: 1.18, filter: 'blur(8px)' },
		center: { clipPath: 'inset(0 0 0 0%)', scale: 1, filter: 'blur(0px)', opacity: 1 },
		exit: (dir: number) =>
			reduce ? { opacity: 0 } : { x: dir > 0 ? '-12%' : '12%', scale: 0.92, opacity: 0, filter: 'blur(4px)' }
	};

	return (
		<section
			ref={rootRef}
			aria-roledescription="carousel"
			aria-label="Selected projects"
			className="relative"
			onKeyDown={onKeyDown}
		>
			<div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
				{/* Station sheet */}
				<div className="relative order-2 lg:order-none lg:col-span-5 lg:pt-6" aria-live="polite" aria-atomic="true">

					<div className="relative">
						<AnimatePresence mode="wait" initial={false}>
							<motion.div
								key={project.id}
								initial="hidden"
								animate="shown"
								exit="gone"
								variants={{
									hidden: {},
									shown: { transition: { staggerChildren: reduce ? 0 : 0.06 } },
									gone: { opacity: 0, transition: { duration: 0.25 } }
								}}
							>
								<h3 className="mt-5 font-poster text-[clamp(2.5rem,11vw,4rem)] lg:text-[clamp(3rem,4.2vw,4.75rem)] leading-[0.88] tracking-[0.01em] text-ink uppercase">
									<span className="sr-only">{project.title}</span>
									<span aria-hidden="true">
										{project.title.split(' ').map((word, w) => (
											<span key={w} className="mr-[0.22em] inline-block overflow-hidden pb-[0.04em] align-bottom">
												<motion.span
													className="inline-block"
													variants={{
														hidden: reduce ? { opacity: 0 } : { y: '105%' },
														shown: { y: 0, opacity: 1, transition: { duration: 0.8, ease: EASE } }
													}}
												>
													{word}
												</motion.span>
											</span>
										))}
									</span>
								</h3>

								<motion.div
									variants={{
										hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 16 },
										shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE, delay: 0.15 } }
									}}
								>
									<p className="legend mt-6 text-harlequin-400">
										Est. {pad(index + 1)} / {pad(projects.length)} · {project.context}
									</p>
									<p className="mt-3 text-sm text-ink-muted">
										{project.client} · {project.year}
									</p>
									<p className="mt-1 text-sm text-harlequin-300">{project.role}</p>
									<p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-ink text-pretty">{project.summary}</p>

									<ul className="mt-7 space-y-3">
										{project.highlights.map(item => (
											<li key={item} className="flex gap-4 text-[0.95rem] leading-snug text-ink/90">
												<span aria-hidden="true" className="rail mt-[0.6em] w-5 shrink-0 text-harlequin-500" />
												{item}
											</li>
										))}
									</ul>

									<p className="legend mt-8 leading-loose text-ink-muted">
										<span className="sr-only">Stack: </span>
										{project.stack.join(' · ')}
									</p>

									{project.links.map(link => (
										<a
											key={link.href}
											href={link.href}
											target="_blank"
											rel="noopener noreferrer"
											className="group mt-8 inline-flex items-center gap-4 font-display text-sm font-medium tracking-wide text-ink uppercase"
										>
											<span className="relative">
												{link.label}
												<span className="absolute -bottom-1 left-0 h-px w-full origin-left bg-harlequin-500 transition-transform duration-500 ease-[var(--ease-curtain)] group-hover:scale-x-0" />
											</span>
											<span
												aria-hidden="true"
												className="grid size-10 place-items-center rounded-full border border-harlequin-500 text-harlequin-400 transition-colors duration-300 group-hover:bg-harlequin-500 group-hover:text-ground"
											>
												<Arrow className="size-4 -rotate-45" />
											</span>
											<span className="sr-only">(opens in a new tab)</span>
										</a>
									))}
								</motion.div>
							</motion.div>
						</AnimatePresence>
					</div>
				</div>

				{/* Survey plate */}
				<div className="order-1 lg:order-none lg:col-span-7">
					<div
						className="relative [perspective:1400px] select-none"
						onPointerMove={onPlateMove}
						onPointerLeave={onPlateLeave}
						onPointerDown={onPointerDown}
						onPointerUp={onPointerUp}
						onPointerCancel={() => (drag.current = null)}
						style={{ touchAction: 'pan-y' }}
					>
						<motion.div
							style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
							className="relative aspect-[16/10] cursor-grab overflow-hidden bg-ground-raised active:cursor-grabbing"
						>
							<AnimatePresence initial={false} custom={direction} mode="popLayout">
								<motion.img
									key={project.id}
									src={project.image}
									alt={project.imageAlt}
									draggable={false}
									custom={direction}
									variants={plate}
									initial="enter"
									animate="center"
									exit="exit"
									transition={{ duration: reduce ? 0.2 : 1.1, ease: EASE }}
									className="absolute inset-0 h-full w-full object-cover"
									loading={index === 0 ? 'eager' : 'lazy'}
								/>
							</AnimatePresence>
							<div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ground/50 via-transparent to-transparent" />
							{project.imageNote && (
								<p className="legend absolute bottom-4 left-4 bg-ground/80 px-3 py-2 text-[0.625rem] text-ink-muted">
									{project.imageNote}
								</p>
							)}
						</motion.div>

						<div
							aria-hidden="true"
							className="pointer-events-none absolute -right-3 -bottom-[0.2em] z-10 font-poster text-[clamp(5rem,11vw,10rem)] leading-none text-transparent select-none [-webkit-text-stroke:1px_var(--color-harlequin-400)]"
						>
							<AnimatePresence mode="popLayout" initial={false}>
								<motion.span
									key={project.id}
									className="block"
									initial={reduce ? { opacity: 0 } : { y: '40%', opacity: 0 }}
									animate={{ y: 0, opacity: 1 }}
									exit={reduce ? { opacity: 0 } : { y: '-40%', opacity: 0 }}
									transition={{ duration: 0.9, ease: EASE }}
								>
									{pad(index + 1)}
								</motion.span>
							</AnimatePresence>
						</div>
						{/* Survey corner marks */}
						<span aria-hidden="true" className="pointer-events-none absolute -top-2 -left-2 size-5 border-t border-l border-harlequin-500" />
						<span aria-hidden="true" className="pointer-events-none absolute -top-2 -right-2 size-5 border-t border-r border-harlequin-500" />
						<span aria-hidden="true" className="pointer-events-none absolute -bottom-2 -left-2 size-5 border-b border-l border-harlequin-500" />
						<span aria-hidden="true" className="pointer-events-none absolute -right-2 -bottom-2 size-5 border-r border-b border-harlequin-500" />
					</div>

					<div className="mt-6 flex items-center justify-between gap-6">
						<p aria-hidden="true" className="legend text-ink-muted">
							Drag, swipe or use the arrow keys
						</p>
						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => go(index - 1)}
								aria-label="Previous project"
								className="grid size-12 place-items-center rounded-full border border-rule text-ink transition-colors duration-300 hover:border-harlequin-500 hover:text-harlequin-400"
							>
								<Arrow className="size-5 rotate-180" />
							</button>
							<button
								type="button"
								onClick={() => go(index + 1)}
								aria-label="Next project"
								className="grid size-12 place-items-center rounded-full border border-harlequin-500 bg-harlequin-500 text-ground transition-colors duration-300 hover:bg-harlequin-400"
							>
								<Arrow className="size-5" />
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Traverse rail */}
			<ol className="mt-16 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4" aria-label="Project stations">
				{projects.map((item, i) => {
					const state = i < index ? 'surveyed' : i === index ? 'current' : 'ahead';
					return (
						<li key={item.id}>
							<button
								type="button"
								onClick={() => go(i)}
								aria-current={i === index ? 'step' : undefined}
								className={`group block w-full text-left transition-opacity duration-500 ${i === index ? 'opacity-100' : 'opacity-55 hover:opacity-90'}`}
							>
								<span
									aria-hidden="true"
									className={`block text-harlequin-500 ${state === 'current' ? 'rail-double' : state === 'surveyed' ? 'rail' : 'rail rail-dashed'}`}
								/>
								<span className="legend mt-4 block text-harlequin-400">Est. {pad(i + 1)}</span>
								<span className="mt-2 block font-display text-sm font-medium text-ink">{item.title}</span>
							</button>
						</li>
					);
				})}
			</ol>
		</section>
	);
}
