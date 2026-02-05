/**
 * Vite Plugin: Critical Media Preload
 *
 * Automatically scans for poster images and injects preload links
 * directly into index.html at build time for fastest possible LCP.
 *
 * No hardcoding needed - automatically discovers *-poster.webp files
 */

import { readdirSync, existsSync } from 'fs'
import { join } from 'path'
import type { Plugin, IndexHtmlTransformContext } from 'vite'

interface CriticalMediaOptions {
	/**
	 * Patterns to identify critical poster images
	 * Default: Files ending with -poster.webp in /public/images/
	 */
	posterPattern?: RegExp

	/**
	 * Priority posters (loaded first) - matched by partial filename
	 * Default: ['HERO'] - hero poster gets highest priority
	 */
	priorityPatterns?: string[]

	/**
	 * Directory containing images (relative to public folder)
	 */
	imagesDir?: string
}

export function criticalMediaPreload(options: CriticalMediaOptions = {}): Plugin {
	const {
		posterPattern = /-poster\.webp$/i,
		priorityPatterns = ['HERO_V2_8bit'],
		imagesDir = 'images'
	} = options

	return {
		name: 'vite-plugin-critical-media-preload',
		transformIndexHtml: {
			order: 'pre', // Run early to inject preloads before other processing
			handler(html: string, ctx: IndexHtmlTransformContext) {
				const publicDir = join(process.cwd(), 'public', imagesDir)

				if (!existsSync(publicDir)) {
					console.warn(`[critical-media] Directory not found: ${publicDir}`)
					return html
				}

				// Find all poster images
				const files = readdirSync(publicDir)
				const posters = files.filter(file => posterPattern.test(file))

				if (posters.length === 0) {
					return html
				}

				// Only preload PRIORITY posters (above the fold / immediately visible)
				// Other posters will be loaded on-demand when modals open
				// Only match _8bit posters (the ones we actually use)
				const priorityPosters = posters.filter(poster =>
					poster.includes('_8bit') &&
					priorityPatterns.some(p => poster.toUpperCase().includes(p.toUpperCase()))
				)

				if (priorityPosters.length === 0) {
					return html
				}

				// Generate preload links only for priority posters
				const preloadLinks = priorityPosters.map((poster, index) => {
					// First priority poster gets fetchpriority="high"
					const fetchPriority = index === 0 ? ' fetchpriority="high"' : ''

					return `    <link rel="preload" href="/${imagesDir}/${poster}" as="image" type="image/webp"${fetchPriority}>`
				})

				// Inject after existing preload/preconnect links, before </head>
				const injectionPoint = html.indexOf('</head>')
				if (injectionPoint === -1) {
					return html
				}

				const comment = '\n    <!-- Critical media preloads (auto-generated) -->\n'
				const preloadHtml = comment + preloadLinks.join('\n') + '\n  '

				return html.slice(0, injectionPoint) + preloadHtml + html.slice(injectionPoint)
			}
		}
	}
}

export default criticalMediaPreload
