<script setup lang="ts">

interface ImageSource {
	media: string
	srcset: string
}

interface Props {
	/** Base navn på billede (uden _w400.webp osv.) */
	baseName: string
	/** Alt text for accessibility */
	alt: string
	/**
	 * Breakpoint definition string
	 * Syntaks: "width,min-max;width,min-max;width,min+"
	 * Eksempler:
	 *   "400,0-400;800,400-800;1200,800+"              // Standard
	 *   "400,0-400;800,400-800;1200,800-989;400,989+"  // Skifter til lille ved 989px+
	 */
	breakpoints?: string
	/** Object-fit style */
	objectFit?: 'cover' | 'contain' | 'fill' | 'none'
	/** Object-position for cropping focus point (e.g., '80% 10%') */
	focusPosition?: string
	/** Enable lazy loading (works with OverlayScrollbars) */
	lazy?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	breakpoints: '400,0;800,400;1200,800',
	objectFit: 'cover',
	focusPosition: 'center center',
	lazy: true
})

// Parse breakpoints og byg sources
// Syntaks: "billedbredde,fra-viewport;billedbredde,fra-viewport;..."
// Eksempel: "400,0;800,400;1200,800;400,990"
// = 400w fra 0px, 800w fra 400px, 1200w fra 800px, 400w fra 990px
const parsedImage = computed(() => {
	const sources: ImageSource[] = []
	const parts = props.breakpoints.split(';')

	for (const part of parts) {
		const [widthStr, fromStr] = part.split(',')
		const width = parseInt(widthStr.trim())
		const fromViewport = parseInt(fromStr.trim())

		sources.push({
			media: `(min-width: ${fromViewport}px)`,
			srcset: `/images/${props.baseName}_w${width}.webp`
		})
	}

	// Sorter efter viewport breakpoint (højeste først)
	// Så matcher vi den første hvor viewport >= breakpoint
	sources.sort((a, b) => {
		const getMinWidth = (media: string): number => {
			const match = media.match(/min-width:\s*(\d+)px/)
			return match ? parseInt(match[1]) : 0
		}
		return getMinWidth(b.media) - getMinWidth(a.media)
	})

	return {
		src: `/images/${props.baseName}_w400.webp`,
		sources
	}
})

const containerRef = ref<HTMLElement | null>(null)
const shouldLoad = ref(!props.lazy)
const isFirstLoad = ref(true)

// Track hvilke billeder der er loaded og hvilken der er aktiv
const loadedSources = ref(new Set<string>())
const activeSource = ref('')      // Det billede der vises
const pendingSource = ref('')     // Det billede vi venter på

// Find det rigtige billede baseret på viewport bredde
const getMatchingSource = (): string => {
	if (!parsedImage.value.sources.length) return parsedImage.value.src

	for (const source of parsedImage.value.sources) {
		if (window.matchMedia(source.media).matches) {
			return source.srcset
		}
	}
	return parsedImage.value.src
}

// Opdater aktiv source - loader kun hvis ikke allerede loaded
const updateActiveSource = () => {
	if (!shouldLoad.value) return
	const newSrc = getMatchingSource()

	if (newSrc === activeSource.value) return

	// Hvis billedet allerede er loaded, skift med det samme
	if (loadedSources.value.has(newSrc)) {
		activeSource.value = newSrc
	} else {
		// Ellers sæt som pending - skifter først når loaded
		pendingSource.value = newSrc
	}
}

// MediaQueryList listeners
const mediaQueries: { mql: MediaQueryList; handler: () => void }[] = []

let lazyObserver: IntersectionObserver | null = null

const onImageLoad = (src: string) => {
	loadedSources.value.add(src)

	// Hvis dette var det pending billede, gør det aktivt nu
	if (src === pendingSource.value) {
		activeSource.value = src
		pendingSource.value = ''
	}
	// Første billede ved page load
	else if (!activeSource.value) {
		activeSource.value = src
	}

	// Efter første billede er loaded, deaktiver fade
	if (isFirstLoad.value) {
		setTimeout(() => {
			isFirstLoad.value = false
		}, 400) // Vent til fade er færdig
	}
}

// Alle unikke sources inkl. fallback
const allSources = computed(() => {
	const sources = new Set<string>()
	sources.add(parsedImage.value.src)
	for (const source of parsedImage.value.sources) {
		sources.add(source.srcset)
	}
	return Array.from(sources)
})

onMounted(() => {
	// Lazy loading setup
	if (props.lazy && containerRef.value) {
		const scrollRoot = containerRef.value.closest('[data-overlayscrollbars-viewport]') as HTMLElement | null

		lazyObserver = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					shouldLoad.value = true
					updateActiveSource()
					lazyObserver?.disconnect()
				}
			},
			{ root: scrollRoot, rootMargin: '300px', threshold: 0 }
		)

		lazyObserver.observe(containerRef.value)
	} else {
		shouldLoad.value = true
		updateActiveSource()
	}

	// Opret matchMedia listeners - fyrer KUN ved breakpoint kryds
	for (const source of parsedImage.value.sources) {
		const mql = window.matchMedia(source.media)
		const handler = () => updateActiveSource()
		mql.addEventListener('change', handler)
		mediaQueries.push({ mql, handler })
	}
})

onUnmounted(() => {
	lazyObserver?.disconnect()
	for (const { mql, handler } of mediaQueries) {
		mql.removeEventListener('change', handler)
	}
})

const imageStyle = computed(() => ({
	objectFit: props.objectFit,
	objectPosition: props.focusPosition
}))
</script>

<template>
	<div ref="containerRef" class="responsive-image-container">
		<!--
			Alle billeder renderes, men kun den aktive vises.
			Når et billede først er loaded, forbliver det i DOM og browser cache.
			Ved resize skifter vi bare hvilken der vises - ingen ny download!
		-->
		<img
			v-for="src in allSources"
			:key="src"
			:src="shouldLoad && (src === activeSource || src === pendingSource || loadedSources.has(src)) ? src : undefined"
			:alt="alt"
			:style="imageStyle"
			:class="{
				'responsive-image': true,
				'responsive-image--active': src === activeSource,
				'responsive-image--loaded': loadedSources.has(src),
				'responsive-image--first-load': isFirstLoad
			}"
			@load="onImageLoad(src)"
		/>
	</div>
</template>

<style scoped>
.responsive-image-container {
	display: block;
	width: 100%;
	height: 100%;
	position: relative;
}

.responsive-image {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	opacity: 0;
	pointer-events: none;
}

/* Kun fade-in første gang billedet loader */
.responsive-image--first-load {
	transition: opacity 0.4s ease-in-out;
}

.responsive-image--active.responsive-image--loaded {
	opacity: 1;
	pointer-events: auto;
}
</style>
