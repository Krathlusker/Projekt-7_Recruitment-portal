<template>
	<div
		ref="containerRef"
		class="video-player-v2"
		:class="{
			'video-player-v2--contain': objectFit === 'contain',
			'video-player-v2--rounded': rounded
		}"
	>
		<!-- Title overlay (above video) -->
		<div
			v-if="title"
			class="video-player-v2__title-wrapper"
		>
			<h2 class="video-player-v2__title">{{ title }}</h2>
			<el-text v-if="subtitle" class="video-player-v2__subtitle">{{ subtitle }}</el-text>
		</div>

		<!-- Video.js Player -->
		<VideoPlayer
			class="video-player-v2__player video-js vjs-big-play-centered"
			:src="src"
			:poster="poster"
			:loop="loop"
			:muted="muted"
			:autoplay="autoplay"
			:controls="true"
			:playsinline="true"
			:fluid="fluid"
			:volume="initialVolume"
			:options="videoOptions"
			@mounted="onMounted"
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
import { ref, computed } from 'vue'
import { VideoPlayer } from '@videojs-player/vue'
import 'video.js/dist/video-js.css'

// Types
import type Player from 'video.js/dist/types/player'

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
	rounded: false
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
const hasStarted = ref(false)

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
const onMounted = (payload: { video: HTMLVideoElement; player: Player; state: VideoPlayerState }) => {
	player.value = payload.player

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
// Local variables for video player
$video-max-height: 600px;
$control-bar-total-height: calc($video-control-bar-height + $spacing-sm);
$title-offset-above-controls: calc($control-bar-total-height + $spacing-md);
$progress-bar-height: $spacing-xs;
$progress-bar-radius: calc($progress-bar-height / 2);
$handle-size: $spacing-sm + 2px;

.video-player-v2 {
	position: relative;
	width: 100%;
	height: auto;
	max-height: $video-max-height;
	overflow: hidden;
	background-color: $c-primary;

	// Contain mode: height follows video aspect ratio
	&--contain {
		height: auto;
		background-color: transparent;
	}

	// Rounded corners only in modals
	&--rounded {
		border-radius: $border-radius-lg;
	}

	// Title wrapper (positioned at bottom like v1)
	&__title-wrapper {
		position: absolute;
		bottom: $spacing-md; // Default: at bottom before play
		left: $spacing-lg;
		right: $spacing-lg;
		pointer-events: none;
		z-index: 1; // Below control bar (z-index 2)
		opacity: 1;
		transition: bottom $transition-duration $transition-ease, opacity $transition-duration $transition-ease;
	}

	// After video has started: move up permanently and fade out
	&--has-started &__title-wrapper {
		bottom: $title-offset-above-controls;
		opacity: 0;
	}

	// When controls are visible (after started): just fade in (position already set by has-started)
	&--controls-visible &__title-wrapper {
		opacity: 1;
	}

	&__title {
		@include title-font;
		color: $c-bg;
		margin: 0;
		text-shadow: 0 2px 8px rgba(var(--el-color-primary-rgb), 0.5);
	}

	&__subtitle {
		@include subtitle-font;
		color: $c-bg;
		margin: $spacing-xs 0 0;
		opacity: 0.9;
		text-shadow: 0 1px 4px rgba(var(--el-color-primary-rgb), 0.5);
	}

	// Video.js player
	&__player {
		width: 100%;

		// Override video.js default styles with SBS branding
		:deep(.video-js) {
			font-family: $font-body;
			max-height: $video-max-height;
		}

		// Video element
		:deep(.vjs-tech) {
			position: relative !important;
			display: block;
			max-height: $video-max-height;
			background-color: $c-primary;
		}

		// Dark gradient overlay (like v1)
		:deep(.vjs-poster) {
			background-size: cover;
		}

		// Control bar
		:deep(.vjs-control-bar) {
			background: linear-gradient(to top, rgba(var(--el-color-primary-rgb), 0.6) 0%, transparent 100%);
			height: $control-bar-total-height;
			padding: 0 $spacing-md $spacing-sm $spacing-md;
		}

		// Control buttons
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

		// Play/pause toggle
		:deep(.vjs-play-control) {
			margin-right: $spacing-xs;
		}

		// Volume panel - styled like v1
		:deep(.vjs-volume-panel.vjs-volume-panel-vertical) {
			margin-right: $spacing-md;
			z-index: 20;

			// Volume slider container - white background popup
			.vjs-volume-control.vjs-volume-vertical {
				background-color: $c-bg;
				border-radius: $border-radius-sm;
				box-shadow: $shadow-modal;
				z-index: 20;
				left: -3.77em !important;

				// Volume bar track
				.vjs-volume-bar.vjs-slider-vertical {
					background-color: $c-fill-light;
					border-radius: $progress-bar-radius;

					// Focus state for keyboard navigation
					&:focus,
					&:focus-visible {
						outline: $border-width-normal solid $c-warning;
						outline-offset: 2px;
					}

					// Volume level fill
					.vjs-volume-level {
						background-color: $c-primary;
						border-radius: $progress-bar-radius;

						// Handle/knop at top of level
						&::before {
							content: '';
							position: absolute;
							top: 0;
							left: 50%;
							width: $handle-size;
							height: $handle-size;
							background-color: $c-primary;
							border-radius: 50%;
							transform: translate(-50%, -50%);
						}
					}
				}
			}
		}

		// Time display
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

		// Progress bar
		:deep(.vjs-progress-control) {
			flex: 1;
			height: $spacing-xl;

			.vjs-progress-holder {
				height: $progress-bar-height;
				border-radius: $progress-bar-radius;
				background-color: rgba(var(--el-color-white-rgb), 0.3);

				@include focus-visible;
			}

			.vjs-play-progress {
				background-color: $c-bg;
				border-radius: $progress-bar-radius;

				// Progress handle
				&::before {
					content: '';
					position: absolute;
					top: 50%;
					right: calc($handle-size / -2);
					width: $handle-size;
					height: $handle-size;
					background-color: $c-bg;
					border-radius: 50%;
					transform: translateY(-50%);
					box-shadow: $shadow-button;
					opacity: 0;
					transition: opacity $transition-duration $transition-ease;
				}
			}

			.vjs-load-progress {
				background-color: rgba(var(--el-color-white-rgb), 0.3);
				border-radius: $progress-bar-radius;

				div {
					background-color: rgba(var(--el-color-white-rgb), 0.2);
				}
			}

			// Show handle on hover
			&:hover .vjs-play-progress::before {
				opacity: 1;
			}

			// Hide play progress tooltip (prevents duplicate - only show mouse-display)
			.vjs-play-progress .vjs-time-tooltip {
				display: none !important;
			}

			// Mouse display element - hidden by default, shown on hover
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

			// Show mouse display tooltip on hover over progress bar
			&:hover .vjs-mouse-display {
				opacity: 1;
			}
		}

		// Fullscreen button
		:deep(.vjs-fullscreen-control) {
			margin-left: $spacing-xs;
		}

		// Hide text tracks menu button (if not needed)
		:deep(.vjs-subs-caps-button) {
			display: none;
		}

		// Loading spinner
		:deep(.vjs-loading-spinner) {
			border-color: rgba(var(--el-color-white-rgb), 0.5);

			&::before,
			&::after {
				border-top-color: $c-bg;
			}
		}

		// Error display
		:deep(.vjs-error-display) {
			background-color: rgba(var(--el-color-primary-rgb), 0.8);

			.vjs-modal-dialog-content {
				color: $c-bg;
				font-family: $font-body;
			}
		}
	}
}
</style>
