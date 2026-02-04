/**
 * Media Preloader Utilities
 *
 * Helper functions for media path generation.
 * Critical media preloading is handled by vite-plugin-critical-media
 * which injects preload links directly into index.html at build time.
 */

/**
 * Generate poster path from video path
 * /videos/example.mp4 -> /images/example-poster.webp
 */
export function getPosterPath(videoPath: string): string {
	const match = videoPath.match(/\/videos\/(.+)\.mp4$/i)
	if (match) {
		return `/images/${match[1]}-poster.webp`
	}
	return ''
}
