/**
 * Portfolio content. Every fact here comes from Javier's CV and project notes;
 * nothing is invented. Add metrics only once they are confirmed.
 */

export interface Project {
	id: string;
	title: string;
	client: string;
	context: string;
	year: string;
	role: string;
	summary: string;
	highlights: string[];
	stack: string[];
	links: { label: string; href: string }[];
	/** Short note shown on the image when it is not a capture of the real product. */
	imageNote?: string;
	imageAlt: string;
	/** Normalised point (0..1) the contour field gathers around while this project is active. */
	focus: [number, number];
}

export const projects: Project[] = [
	{
		id: 'ocaive',
		title: 'ÒCAIVE',
		client: 'ÒCAIVE · Trans Media Tech',
		context: 'At Huming',
		year: '2025–2026',
		role: 'Sole developer, empty repository to production',
		// From ocaive.com: "+200 proyectos end-to-end"; custom platforms, audiovisual production and a 360 music agency.
		summary:
			'A tech and creative studio with 200+ end-to-end projects, from custom platforms to film and music production.',
		highlights: [
			'GSAP scrollytelling, including a hero driven by a frame sequence',
			'Video library cut from 15+ GB to under 1 GB with no visible quality loss',
			'Contact form with automated delivery through Resend, deployed on Google Cloud'
		],
		stack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'GSAP', 'Resend', 'Google Cloud'],
		links: [{ label: 'Visit ocaive.com', href: 'https://ocaive.com/' }],
		imageAlt: 'Home page of ocaive.com: a phone showing an app over the headline "+200 proyectos end-to-end"',
		focus: [0.72, 0.38]
	},
	{
		id: 'calabuig',
		title: 'Eduardo Calabuig',
		client: 'Eduardo Calabuig · interior design studio',
		context: 'Client project',
		year: '2025–2026',
		role: 'Sole developer, website and admin panel',
		summary:
			'Public website plus a separate admin panel so an interior designer in Dénia can publish projects and news without a developer.',
		highlights: [
			'Block editor with drafts, translated content per block and image uploads',
			'Analytics dashboard: visits, unique visitors, clicks and most viewed pages',
			'Row-level security on Postgres and CORS limited to the site’s origins'
		],
		stack: ['React', 'Vite', 'Next.js', 'TypeScript', 'Supabase', 'GSAP', 'Resend', 'i18next'],
		links: [{ label: 'Visit eduardocalabuig.com', href: 'https://www.eduardocalabuig.com/' }],
		imageAlt:
			'Home page of eduardocalabuig.com: a rendered Mediterranean patio under the headline "Gestionamos tu reforma, cuidamos cada detalle"',
		focus: [0.3, 0.62]
	},
	{
		id: 'cabanyal',
		title: 'Hub Cultural Cabanyal',
		client: 'Hub Cultural Cabanyal · Valencia',
		context: 'At Huming',
		year: '2025–2026',
		role: 'Developer and technical contact with the client',
		summary:
			'Cultural platform for the Cabanyal neighbourhood: spaces, an agenda of activities and a directory of local professionals.',
		highlights: [
			'Login and registration so cultural agents publish their own activities',
			'Agenda and Professionals sections, with their cards built from scratch',
			'Every string translated into Spanish, English and Valencian'
		],
		stack: ['WordPress', 'PHP', 'JavaScript'],
		links: [{ label: 'Visit culturacabanyal.com', href: 'https://culturacabanyal.com/' }],
		imageAlt: 'Home page of culturacabanyal.com, split into three panels: Espais, Agenda and Professionals',
		focus: [0.6, 0.7]
	},
	{
		id: 'balearia',
		title: 'Baleària internal tools',
		client: 'Baleària · ferry company',
		context: 'Full stack internship',
		year: '2025',
		role: 'Full stack intern on the internal applications team',
		summary:
			'Internal applications used across the company, worked on in production code following the team’s architecture and in-house libraries.',
		highlights: [
			'New employee information system in React, built on Baleària’s component libraries',
			'Features added to the tools used by the Call Center area',
			'Maintained and evolved REST APIs in Java and Spring Boot'
		],
		stack: ['React', 'JavaScript', 'Java', 'Spring Boot', 'REST APIs'],
		links: [],
		imageNote: 'Illustration · internal tools are confidential',
		imageAlt: 'Illustration: a survey chart of ferry routes crossing from the coast to the islands',
		focus: [0.45, 0.3]
	}
];

export interface Role {
	company: string;
	title: string;
	period: string;
	place: string;
	detail: string;
}

export const experience: Role[] = [
	{
		company: 'Huming',
		title: 'Front-end Developer',
		period: 'Aug 2025 – Aug 2026',
		place: 'Pedreguer',
		detail: 'New products from scratch and evolution of live ones: Next.js, TypeScript, WordPress and PHP.'
	},
	{
		company: 'Baleària',
		title: 'Full Stack Developer',
		period: 'Feb 2025 – Jun 2025',
		place: 'Dénia',
		detail: 'Internal applications in React and Java / Spring Boot, on code already in production.'
	}
];

export const education: Role[] = [
	{
		company: 'IES Enric Valor',
		title: 'Master’s in Cybersecurity',
		period: 'Oct 2025 – Jun 2026',
		place: '',
		detail: ''
	},
	{
		company: 'IES Enric Valor',
		title: 'Higher Technician in Web Application Development',
		period: 'Sep 2023 – Jun 2025',
		place: '',
		detail: ''
	},
	{
		company: 'Universitat Politècnica de València',
		title: 'Public Works Engineering',
		period: 'Sep 2019 – Jun 2022',
		place: 'València',
		detail: ''
	}
];

export const stack: { group: string; items: string[] }[] = [
	{ group: 'Frontend', items: ['React', 'TypeScript', 'Next.js', 'Astro', 'Tailwind CSS', 'GSAP'] },
	{ group: 'Backend', items: ['Java', 'Spring Boot', 'Node.js', 'PHP', 'Laravel', 'REST APIs'] },
	{ group: 'Data', items: ['PostgreSQL', 'MariaDB', 'Supabase'] },
	{ group: 'Delivery', items: ['Git', 'Docker', 'Playwright', 'GitHub Actions', 'Vercel'] }
];

