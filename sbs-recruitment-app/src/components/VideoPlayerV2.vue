<template>
	<div
		class="video-player-v2"
		:class="{
			'video-player-v2--contain': objectFit === 'contain'
		}"
	>
		<!-- Title overlay (above video) -->
		<div
			v-if="title"
			class="video-player-v2__title-wrapper"
			:class="{ 'video-player-v2__title-wrapper--fade': state?.playing && !state?.userActive }"
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

interface VideoPlayerState {
	playing: boolean
	paused: boolean
	ended: boolean
	waiting: boolean
	seeking: boolean
	muted: boolean
	volume: number
	currentTime: number
	duration: number
	userActive: boolean
	isFullscreen: boolean
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
}

const props = withDefaults(defineProps<Props>(), {
	poster: '',
	title: '',
	subtitle: '',
	autoplay: true,
	loop: true,
	muted: true,
	fluid: true,
	objectFit: 'cover',
	initialVolume: 0.6
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
const state = ref<VideoPlayerState | null>(null)

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
	state.value = payload.state

	// Apply object-fit via CSS class
	if (props.objectFit === 'cover') {
		payload.video.style.objectFit = 'cover'
	}

	emit('mounted', payload.player)
}

const onPlay = () => emit('play')
const onPause = () => emit('pause')
const onEnded = () => emit('ended')

const onTimeUpdate = () => {
	if (state.value) {
		emit('timeupdate', state.value.currentTime, state.value.duration)
	}
}

// Expose player instance for parent control
defineExpose({
	player,
	state,
	play: () => player.value?.play(),
	pause: () => player.value?.pause(),
	togglePlay: () => {
		if (state.value?.playing) {
			player.value?.pause()
		} else {
			player.value?.play()
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
.video-player-v2 {
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
	background-color: $c-primary;
	border-radius: $border-radius-lg;

	// Contain mode: height follows video aspect ratio
	&--contain {
		height: auto;
		background-color: transparent;
	}

	// Title wrapper (positioned at bottom like v1)
	&__title-wrapper {
		position: absolute;
		bottom: calc(48px + $spacing-lg); // Control bar height + 18px gap
		left: $spacing-lg;
		right: $spacing-lg;
		pointer-events: none;
		z-index: 1; // Below control bar (z-index 2)
		opacity: 1;
		transition: opacity $transition-duration $transition-ease;

		&--fade {
			opacity: 0;
		}
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
		height: 100%;

		// Override video.js default styles with SBS branding
		:deep(.video-js) {
			// Font
			font-family: $font-body;

			// Video element
			video {
				object-fit: cover;
			}

			// When in contain mode
			.video-player-v2--contain & video {
				object-fit: contain;
			}
		}

		// Dark gradient overlay (like v1)
		:deep(.vjs-poster) {
			background-size: cover;
		}

		// Control bar
		:deep(.vjs-control-bar) {
			background: linear-gradient(to top, rgba(var(--el-color-primary-rgb), 0.6) 0%, transparent 100%);
			height: calc(48px + $spacing-sm);
			padding: 0 $spacing-md $spacing-sm $spacing-md;
		}

		// Big play button
		:deep(.vjs-big-play-button) {
			@include button-colors-light;
			border: $border-width-thin solid transparent;
			border-radius: 50%;
			width: 80px;
			height: 80px;
			line-height: 80px;
			font-size: 40px;
			transition: all $transition-duration $transition-ease;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);

			&:hover {
				border-color: $c-bg !important;
				transform: translate(-50%, -50%) scale(1.05);
			}

			&:focus-visible {
				outline: 2px solid $c-warning;
				outline-offset: 2px;
			}

			.vjs-icon-placeholder::before {
				display: flex;
				align-items: center;
				justify-content: center;
			}
		}

		// Control buttons
		:deep(.vjs-button) {
			@include button-colors-light;
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

			&:focus-visible {
				outline: 2px solid $c-warning;
				outline-offset: 2px;
			}

			.vjs-icon-placeholder::before {
				font-size: 24px;
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
				left: -3.75em !important;

				// Volume bar track
				.vjs-volume-bar.vjs-slider-vertical {
					background-color: $c-fill-light;
					border-radius: 2px;

					// Volume level fill
					.vjs-volume-level {
						background-color: $c-primary;
						border-radius: 2px;

						// Handle/knop at top of level
						&::before {
							content: '';
							position: absolute;
							top: 0;
							left: 50%;
							width: 12px;
							height: 12px;
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
			font-size: $font-size-body;
			font-variant-numeric: tabular-nums;
			color: $c-bg;
			padding: 0 $spacing-xs;
			min-width: 40px;
			display: flex;
			align-items: center;
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
				height: 6px;
				border-radius: 3px;
				background-color: rgba(var(--el-color-white-rgb), 0.3);

				&:focus-visible {
					outline: 2px solid $c-warning;
					outline-offset: 2px;
				}
			}

			.vjs-play-progress {
				background-color: $c-bg;
				border-radius: 3px;

				// Progress handle
				&::before {
					content: '';
					position: absolute;
					top: 50%;
					right: -7px;
					width: 14px;
					height: 14px;
					background-color: $c-bg;
					border-radius: 50%;
					transform: translateY(-50%);
					box-shadow: 0 2px 4px rgba(var(--el-color-primary-rgb), 0.3);
					opacity: 0;
					transition: opacity $transition-duration $transition-ease;
				}
			}

			.vjs-load-progress {
				background-color: rgba(var(--el-color-white-rgb), 0.3);
				border-radius: 3px;

				div {
					background-color: rgba(var(--el-color-white-rgb), 0.2);
				}
			}

			// Show handle on hover
			&:hover .vjs-play-progress::before {
				opacity: 1;
			}

			// Time tooltip
			.vjs-time-tooltip {
				background-color: $c-bg;
				color: $c-primary;
				padding: $spacing-xs $spacing-sm;
				border-radius: $border-radius-sm;
				font-size: $font-size-body;
				font-variant-numeric: tabular-nums;
				box-shadow: $shadow-card;
			}

			.vjs-mouse-display {
				.vjs-time-tooltip {
					background-color: $c-bg;
					color: $c-primary;
				}
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
