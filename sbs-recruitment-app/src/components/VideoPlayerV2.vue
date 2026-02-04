<template>
	<div
		ref="containerRef"
		class="video-player-v2"
		:class="{
			'video-player-v2--contain': objectFit === 'contain',
			'video-player-v2--rounded': rounded,
			'video-player-v2--loading': !metadataLoaded
		}"
		:style="containerStyle"
	>
		<!-- Title overlay (above video) -->
		<div
			v-if="title"
			class="video-player-v2__title-wrapper"
		>
			<h2 class="video-player-v2__title">{{ title }}</h2>
			<el-text v-if="subtitle" class="video-player-v2__subtitle">{{ subtitle }}</el-text>
		</div>

		<!-- Poster image for instant LCP (shown until video is ready to play) -->
		<img
			v-if="computedPoster && fetchpriority === 'high' && !videoReady"
			:src="computedPoster"
			:alt="title || 'Video poster'"
			class="video-player-v2__poster"
			:fetchpriority="fetchpriority"
		/>

		<!-- Native video element for metadata extraction (hidden - our poster image handles LCP) -->
		<video
			v-if="!metadataLoaded && fetchpriority === 'high'"
			ref="preloadVideoRef"
			class="video-player-v2__preload-video video-player-v2__preload-video--hidden"
			:src="src"
			preload="metadata"
			:muted="muted"
			playsinline
		/>

		<!-- Video.js Player (takes over after metadata is loaded) -->
		<VideoPlayer
			v-if="metadataLoaded"
			class="video-player-v2__player video-js vjs-big-play-centered"
			:src="src"
			:loop="loop"
			:muted="muted"
			:autoplay="autoplay"
			:controls="true"
			:playsinline="true"
			:fluid="fluid"
			:volume="initialVolume"
			:options="videoOptions"
			@mounted="onPlayerMounted"
			@play="onPlay"
			@pause="onPause"
			@ended="onEnded"
			@timeupdate="onTimeUpdate"
		>
			<!-- Custom overlay slot (optional) -->
			<template v-if="$slots.overlay" #default="{ player, state: playerState }">
				<slot name="overlay" :player="player" :state="playerState" />
			</template>
		</VideoPlayer>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { VideoPlayer } from '@videojs-player/vue'
import 'video.js/dist/video-js.css'
import type videojs from 'video.js'

// Types
type Player = ReturnType<typeof videojs>

// Video.js player state (from @videojs-player/vue)
interface VideoPlayerState {
	playing: boolean
	currentTime: number
	duration: number
}

// Props
interface Props {
	src: string
	poster?: string
	title?: string
	subtitle?: string
	autoplay?: boolean
	loop?: boolean
	muted?: boolean
	fluid?: boolean
	objectFit?: 'cover' | 'contain'
	initialVolume?: number
	rounded?: boolean
	fetchpriority?: 'high' | 'low' | 'auto'
	aspectRatio?: string // e.g. "16/9" or "1920/1080" to prevent layout shift
}

const props = withDefaults(defineProps<Props>(), {
	poster: '',
	title: '',
	subtitle: '',
	autoplay: true,
	loop: true,
	muted: true,
	fluid: false,
	objectFit: 'cover',
	initialVolume: 0.6,
	rounded: false,
	fetchpriority: 'auto',
	aspectRatio: ''
})

// Auto-generate poster path from video src if not provided
// /videos/HERO_V2_compressed.mp4 -> /images/HERO_V2_compressed-poster.webp
const computedPoster = computed(() => {
	if (props.poster) return props.poster

	// Extract filename from src and convert to poster path
	const match = props.src.match(/\/videos\/(.+)\.mp4$/i)
	if (match) {
		return `/images/${match[1]}-poster.webp`
	}
	return ''
})

// Emits
const emit = defineEmits<{
	play: []
	pause: []
	ended: []
	timeupdate: [currentTime: number, duration: number]
	mounted: [player: Player]
}>()

// State
const player = ref<Player | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const preloadVideoRef = ref<HTMLVideoElement | null>(null)
const hasStarted = ref(false)
const metadataLoaded = ref(false)
const videoReady = ref(false) // Video is ready to play (poster can be hidden)
const videoAspectRatio = ref<number | null>(null)

// Computed style for dynamic aspect-ratio
const containerStyle = computed(() => {
	// Use provided aspectRatio prop if available (prevents layout shift)
	if (props.aspectRatio) {
		return { aspectRatio: props.aspectRatio }
	}
	// Use detected aspect ratio from video metadata
	if (videoAspectRatio.value) {
		return { aspectRatio: `${videoAspectRatio.value}` }
	}
	// Fallback til 16/9 mens metadata loader
	return { aspectRatio: '16 / 9' }
})

// Preload video metadata to get dimensions
const preloadMetadata = () => {
	// If we have a native preload video element (high priority), use it
	if (props.fetchpriority === 'high' && preloadVideoRef.value) {
		const video = preloadVideoRef.value
		const handleMetadata = () => {
			const width = video.videoWidth
			const height = video.videoHeight
			if (width && height) {
				videoAspectRatio.value = width / height
			}
			metadataLoaded.value = true
			video.removeEventListener('loadedmetadata', handleMetadata)
			video.removeEventListener('error', handleError)
		}
		const handleError = () => {
			metadataLoaded.value = true
			video.removeEventListener('loadedmetadata', handleMetadata)
			video.removeEventListener('error', handleError)
		}
		if (video.readyState >= 1) {
			// Metadata already loaded
			handleMetadata()
		} else {
			video.addEventListener('loadedmetadata', handleMetadata)
			video.addEventListener('error', handleError)
		}
		return
	}

	// Fallback: create hidden video element for metadata
	const video = document.createElement('video')
	video.preload = 'metadata'
	video.src = props.src

	video.onloadedmetadata = () => {
		const width = video.videoWidth
		const height = video.videoHeight
		if (width && height) {
			videoAspectRatio.value = width / height
		}
		metadataLoaded.value = true
		video.remove()
	}

	video.onerror = () => {
		// Fallback - vis alligevel
		metadataLoaded.value = true
		video.remove()
	}
}

// Preload on mount - use nextTick to ensure refs are available
onMounted(() => {
	// Small delay to ensure preload video ref is mounted
	requestAnimationFrame(() => {
		preloadMetadata()
	})
})

// Watch for src changes
watch(() => props.src, () => {
	metadataLoaded.value = false
	videoAspectRatio.value = null
	preloadMetadata()
})

// Video.js options
const videoOptions = computed(() => ({
	// Responsive behavior
	responsive: true,
	// Language
	language: 'da',
	// Control bar config
	controlBar: {
		volumePanel: {
			inline: false,
			vertical: true
		},
		children: [
			'playToggle',
			'volumePanel',
			'currentTimeDisplay',
			'timeDivider',
			'durationDisplay',
			'progressControl',
			'fullscreenToggle'
		]
	},
	// User activity timeout (hide controls)
	inactivityTimeout: 2000
}))

// Event handlers
const onPlayerMounted = (payload: { video: HTMLVideoElement; player: Player; state: VideoPlayerState }) => {
	player.value = payload.player

	// Set fetchpriority attribute on video element
	if (props.fetchpriority && props.fetchpriority !== 'auto') {
		payload.video.setAttribute('fetchpriority', props.fetchpriority)
	}

	// Listen for useractive/userinactive to toggle container class (only after video has started)
	payload.player.on('useractive', () => {
		if (hasStarted.value) {
			containerRef.value?.classList.add('video-player-v2--controls-visible')
		}
	})
	payload.player.on('userinactive', () => {
		containerRef.value?.classList.remove('video-player-v2--controls-visible')
	})

	emit('mounted', payload.player)
}

const onPlay = () => {
	// Mark as started on first play - now title can move/fade with controls
	if (!hasStarted.value) {
		hasStarted.value = true
		videoReady.value = true // Hide poster when video starts playing
		containerRef.value?.classList.add('video-player-v2--has-started')
		// Set controls visible immediately since user just clicked
		if (player.value?.userActive()) {
			containerRef.value?.classList.add('video-player-v2--controls-visible')
		}
	}
	emit('play')
}
const onPause = () => emit('pause')
const onEnded = () => emit('ended')

const onTimeUpdate = () => {
	const p = player.value
	if (p) {
		emit('timeupdate', p.currentTime() || 0, p.duration() || 0)
	}
}

// Expose player instance for parent control
defineExpose({
	player,
	play: () => player.value?.play(),
	pause: () => player.value?.pause(),
	togglePlay: () => {
		if (player.value?.paused()) {
			player.value?.play()
		} else {
			player.value?.pause()
		}
	},
	mute: () => player.value?.muted(true),
	unmute: () => player.value?.muted(false),
	setVolume: (vol: number) => player.value?.volume(vol),
	seek: (time: number) => player.value?.currentTime(time),
	enterFullscreen: () => player.value?.requestFullscreen(),
	exitFullscreen: () => player.value?.exitFullscreen()
})
</script>

<style lang="scss" scoped>
// =============================================================================
// VIDEO PLAYER V2 - SCOPED OVERRIDES
// =============================================================================
// Base styles are defined in _video-player.scss (global).
// This scoped section applies :deep() selectors for video.js DOM.

// Poster image - instant LCP element
.video-player-v2__poster {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
	z-index: 1; // Below Video.js controls (z-index 2+)
}

.video-player-v2--contain .video-player-v2__poster {
	object-fit: contain;
}

// Preload video - shown immediately for LCP discovery
.video-player-v2__preload-video {
	width: 100%;
	height: 100%;
	object-fit: cover;
	background-color: $c-primary;

	&--hidden {
		opacity: 0;
		pointer-events: none;
	}
}

.video-player-v2--contain .video-player-v2__preload-video {
	object-fit: contain;
}

// Apply global .video-player-v2__player styles to video.js elements
.video-player-v2__player {
	:deep(.video-js) {
		font-family: $font-body;
		max-height: 600px;
	}

	// Big play button - prevent flying animation on load
	:deep(.vjs-big-play-button) {
		position: absolute !important;
		top: 50% !important;
		left: 50% !important;
		transform: translate(-50%, -50%) !important;
		transition: none !important;
		margin: 0 !important;
	}

	:deep(.vjs-tech) {
		position: relative !important;
		display: block;
		max-height: 600px;
		background-color: $c-primary;
	}

	:deep(.vjs-poster) {
		background-size: cover;
	}

	:deep(.vjs-control-bar) {
		background: linear-gradient(to top, rgba(var(--el-color-primary-rgb), 0.6) 0%, transparent 100%);
		height: calc($video-control-bar-height + $spacing-sm);
		padding: 0 $spacing-md $spacing-sm $spacing-md;
	}

	:deep(.vjs-button) {
		@include button-colors-light;
		@include flex-center;
		width: $spacing-xl;
		height: $spacing-xl;
		border: $border-width-thin solid transparent;
		border-radius: $border-radius-sm;
		transition: all $transition-duration $transition-ease;

		&:hover {
			border-color: $c-bg !important;
		}

		&:active {
			transform: scale(0.98);
		}

		@include focus-visible;

		.vjs-icon-placeholder::before {
			font-size: $spacing-lg;
			line-height: $spacing-xl;
		}
	}

	:deep(.vjs-play-control) {
		margin-right: $spacing-xs;
	}

	:deep(.vjs-volume-panel.vjs-volume-panel-vertical) {
		margin-right: $spacing-md;
		z-index: 20;

		.vjs-volume-control.vjs-volume-vertical {
			background-color: $c-bg;
			border-radius: $border-radius-sm;
			box-shadow: $shadow-modal;
			z-index: 20;
			left: -3.77em !important;

			.vjs-volume-bar.vjs-slider-vertical {
				background-color: $c-fill-light;
				border-radius: calc($spacing-xs / 2);

				&:focus,
				&:focus-visible {
					outline: $border-width-normal solid $c-warning;
					outline-offset: 2px;
				}

				.vjs-volume-level {
					background-color: $c-primary;
					border-radius: calc($spacing-xs / 2);

					&::before {
						content: '';
						position: absolute;
						top: 0;
						left: 50%;
						width: $spacing-sm + 2px;
						height: $spacing-sm + 2px;
						background-color: $c-primary;
						border-radius: $border-radius-circle;
						transform: translate(-50%, -50%);
					}
				}
			}
		}
	}

	:deep(.vjs-time-control) {
		@include body-font;
		font-variant-numeric: tabular-nums;
		color: $c-bg;
		padding: 0 $spacing-xs;
		min-width: 40px;
		@include flex-center;
	}

	:deep(.vjs-time-divider) {
		color: $c-bg;
		padding: 0;
		min-width: auto;
	}

	:deep(.vjs-progress-control) {
		flex: 1;
		height: $spacing-xl;

		.vjs-progress-holder {
			height: $spacing-xs;
			border-radius: calc($spacing-xs / 2);
			background-color: rgba(var(--el-color-white-rgb), 0.3);

			@include focus-visible;
		}

		.vjs-play-progress {
			background-color: $c-bg;
			border-radius: calc($spacing-xs / 2);

			&::before {
				content: '';
				position: absolute;
				top: 50%;
				right: calc(($spacing-sm + 2px) / -2);
				width: $spacing-sm + 2px;
				height: $spacing-sm + 2px;
				background-color: $c-bg;
				border-radius: $border-radius-circle;
				transform: translateY(-50%);
				box-shadow: $shadow-button;
				opacity: 0;
				transition: opacity $transition-duration $transition-ease;
			}
		}

		.vjs-load-progress {
			background-color: rgba(var(--el-color-white-rgb), 0.3);
			border-radius: calc($spacing-xs / 2);

			div {
				background-color: rgba(var(--el-color-white-rgb), 0.2);
			}
		}

		&:hover .vjs-play-progress::before {
			opacity: 1;
		}

		.vjs-play-progress .vjs-time-tooltip {
			display: none !important;
		}

		.vjs-mouse-display {
			display: block !important;
			opacity: 0;
			transition: opacity $transition-duration $transition-ease;

			.vjs-time-tooltip {
				background-color: $c-bg;
				color: $c-primary;
				padding: $spacing-xs $spacing-sm;
				border-radius: $border-radius-sm;
				font-size: $font-size-body;
				font-variant-numeric: tabular-nums;
				box-shadow: $shadow-card;
			}
		}

		&:hover .vjs-mouse-display {
			opacity: 1;
		}
	}

	:deep(.vjs-fullscreen-control) {
		margin-left: $spacing-xs;
	}

	:deep(.vjs-subs-caps-button) {
		display: none;
	}

	:deep(.vjs-loading-spinner) {
		border-color: rgba(var(--el-color-white-rgb), 0.5);

		&::before,
		&::after {
			border-top-color: $c-bg;
		}
	}

	:deep(.vjs-error-display) {
		background-color: rgba(var(--el-color-primary-rgb), 0.8);

		.vjs-modal-dialog-content {
			color: $c-bg;
			font-family: $font-body;
		}
	}
}
</style>
