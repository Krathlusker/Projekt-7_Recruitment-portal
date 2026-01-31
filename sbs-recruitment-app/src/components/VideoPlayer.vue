<template>
	<div
		ref="playerRef"
		class="video-player"
		:class="{
			'video-player--controls-visible': controlsVisible,
			'video-player--fullscreen': isFullscreen,
			'video-player--hide-cursor': isFullscreen && !controlsVisible && !isMouseOverControls
		}"
		@mouseenter="onMouseInteraction"
		@mouseleave="hideControlsDelayed"
		@mousemove="onMouseMove"
		@touchstart="toggleControlsTouch"
		@focusin="onFocusIn"
		@focusout="onFocusOut"
	>
		<!-- Video element -->
		<video
			ref="videoRef"
			class="video-player__video"
			:style="{ objectFit: isFullscreen ? 'contain' : objectFit }"
			:src="src"
			:poster="poster"
			:loop="loop"
			playsinline
			@timeupdate="onTimeUpdate"
			@loadedmetadata="onLoadedMetadata"
			@play="onPlay"
			@pause="onPause"
			@ended="onEnded"
			@click="togglePlay"
		>
			<!-- Captions track (WCAG 1.2.2) -->
			<track
				v-if="captionsSrc"
				kind="captions"
				:src="captionsSrc"
				:srclang="captionsLang"
				:label="captionsLabel"
				default
			/>
			<!-- Audio description track (WCAG 1.2.5) -->
			<track
				v-if="audioDescSrc"
				kind="descriptions"
				:src="audioDescSrc"
				:srclang="audioDescLang"
				:label="audioDescLabel"
			/>
		</video>

		<!-- Gradient overlay for title -->
		<div class="video-player__gradient" />

		<!-- Title overlay -->
		<div
			v-if="title"
			class="video-player__title-wrapper"
			:class="{ 'video-player__title-wrapper--fade': hasInteracted && !controlsVisible }"
		>
			<h2 class="video-player__title">{{ title }}</h2>
			<p v-if="subtitle" class="video-player__subtitle">{{ subtitle }}</p>
		</div>

		<!-- Controls overlay -->
		<div
			class="video-player__controls"
			@mouseenter="isMouseOverControls = true"
			@mouseleave="onControlsMouseLeave"
		>
			<!-- Play/Pause button -->
			<button
				class="video-player__btn video-player__btn--play"
				:aria-label="isPlaying ? 'Pause' : 'Afspil'"
				@click.stop="togglePlay"
			>
				<MdPause v-if="isPlaying" />
				<MdPlayArrow v-else />
			</button>

			<!-- Volume control wrapper -->
			<div
				class="video-player__volume-wrapper"
				:class="{ 'video-player__volume-wrapper--mobile-open': volumeSliderOpenMobile }"
			>
				<!-- Volume button -->
				<button
					class="video-player__btn video-player__btn--volume"
					:aria-label="isMuted ? 'Slå lyd til' : 'Slå lyd fra'"
					@click.stop="toggleMute"
					@touchstart.stop
				>
					<MdVolumeOff v-if="isMuted || volume === 0" />
					<MdVolumeMute v-else-if="volume < 0.5" />
					<MdVolumeUp v-else />
				</button>
				<!-- Volume slider (PC: hover/focus, Mobile: tap to open) -->
				<div class="video-player__volume-slider">
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						:value="volume"
						class="video-player__volume-input"
						aria-label="Lydstyrke"
						@input="onVolumeChange"
						@click.stop
						@touchstart.stop="onVolumeSliderTouchStart"
						@touchend.stop="onVolumeSliderTouchEnd"
					/>
				</div>
			</div>

			<!-- Progress bar (WCAG 2.1.1 keyboard + semantics) -->
			<div
				ref="progressRef"
				class="video-player__progress"
				role="slider"
				tabindex="0"
				:aria-label="'Videoposition: ' + formatTime(currentTime) + ' af ' + formatTime(duration)"
				:aria-valuenow="Math.round(progress)"
				aria-valuemin="0"
				aria-valuemax="100"
				:aria-valuetext="formatTime(currentTime) + ' af ' + formatTime(duration)"
				@click="seek"
				@mousedown="startSeeking"
				@touchstart="startSeeking"
				@keydown="onProgressKeydown"
			>
				<div class="video-player__progress-track">
					<div
						class="video-player__progress-fill"
						:style="{ width: `${progress}%` }"
					/>
					<div
						class="video-player__progress-handle"
						:style="{ left: `${progress}%` }"
					/>
				</div>
			</div>

			<!-- Fullscreen button -->
			<button
				class="video-player__btn video-player__btn--fullscreen"
				:aria-label="isFullscreen ? 'Afslut fuldskærm' : 'Fuldskærm'"
				@click.stop="toggleFullscreen"
			>
				<MdFullscreenExit v-if="isFullscreen" />
				<MdFullscreen v-else />
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { MdPlayArrow, MdPause, MdVolumeUp, MdVolumeMute, MdVolumeOff, MdFullscreen, MdFullscreenExit } from '@kalimahapps/vue-icons/md'

// Props
interface Props {
	src: string
	poster?: string
	title?: string
	subtitle?: string
	autoplay?: boolean
	loop?: boolean
	muted?: boolean
	controlsAutoHide?: boolean
	autoHideDelay?: number
	objectFit?: 'cover' | 'contain'
	// Captions (WCAG 1.2.2)
	captionsSrc?: string
	captionsLang?: string
	captionsLabel?: string
	// Audio description (WCAG 1.2.5)
	audioDescSrc?: string
	audioDescLang?: string
	audioDescLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
	poster: '',
	title: '',
	subtitle: '',
	autoplay: true,
	loop: true,
	muted: true,
	controlsAutoHide: true,
	autoHideDelay: 2000,
	objectFit: 'cover',
	// Captions defaults
	captionsSrc: '',
	captionsLang: 'da',
	captionsLabel: 'Dansk',
	// Audio description defaults
	audioDescSrc: '',
	audioDescLang: 'da',
	audioDescLabel: 'Lydbeskrivelse'
})

// Emits
const emit = defineEmits<{
	play: []
	pause: []
	ended: []
	timeupdate: [currentTime: number, duration: number]
}>()

// Refs
const playerRef = ref<HTMLElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const progressRef = ref<HTMLElement | null>(null)
const isPlaying = ref(false)
const isMuted = ref(props.muted)
const volume = ref(props.muted ? 0 : 1)
const previousVolume = ref(1) // Remember volume before muting
const isFullscreen = ref(false)
const hasInteracted = ref(false) // True after first mouse interaction
const progress = ref(0)
const duration = ref(0)
const currentTime = ref(0)
const controlsVisible = ref(true)
const isSeeking = ref(false)
const hasFocus = ref(false) // Keyboard focus in player (for WCAG)
const isMouseOverControls = ref(false) // Mouse over controls area

// Volume slider state - separate from main controls
const isTouchDevice = ref(false) // Touch device detection
const volumeSliderOpenMobile = ref(false) // Mobile only: slider open state
const isVolumeSliderDragging = ref(false) // Dragging volume slider

let hideControlsTimeout: number | null = null

// Methods
const togglePlay = () => {
	if (!videoRef.value) return

	if (isPlaying.value) {
		videoRef.value.pause()
	} else {
		videoRef.value.play()
	}
}

const toggleMute = () => {
	if (!videoRef.value) return

	// Mobile: first tap opens slider, second tap mutes/unmutes
	if (isTouchDevice.value && !volumeSliderOpenMobile.value) {
		volumeSliderOpenMobile.value = true
		showControlsWithDelay(10000) // Extended delay when slider is open
		return
	}

	// Toggle mute
	if (isMuted.value || volume.value === 0) {
		const newVolume = previousVolume.value > 0 ? previousVolume.value : 1
		volume.value = newVolume
		videoRef.value.volume = newVolume
		videoRef.value.muted = false
		isMuted.value = false
	} else {
		previousVolume.value = volume.value
		volume.value = 0
		videoRef.value.muted = true
		isMuted.value = true
	}
}

const onVolumeChange = (event: Event) => {
	if (!videoRef.value) return

	const target = event.target as HTMLInputElement
	const newVolume = parseFloat(target.value)

	volume.value = newVolume
	videoRef.value.volume = newVolume

	if (newVolume === 0) {
		isMuted.value = true
		videoRef.value.muted = true
	} else {
		isMuted.value = false
		videoRef.value.muted = false
		previousVolume.value = newVolume
	}
}

const toggleFullscreen = async () => {
	if (!playerRef.value) return

	try {
		if (!document.fullscreenElement) {
			await playerRef.value.requestFullscreen()
			isFullscreen.value = true
		} else {
			await document.exitFullscreen()
			isFullscreen.value = false
		}
	} catch (err) {
		console.error('Fullscreen error:', err)
	}
}

const onFullscreenChange = () => {
	isFullscreen.value = !!document.fullscreenElement
}

// Show controls with auto-hide timer
const showControlsWithDelay = (delay: number) => {
	controlsVisible.value = true
	clearHideTimeout()

	// Don't auto-hide if: has keyboard focus, dragging slider, or mouse over controls
	if (props.controlsAutoHide && isPlaying.value && hasInteracted.value && !hasFocus.value && !isVolumeSliderDragging.value) {
		hideControlsTimeout = window.setTimeout(() => {
			if (isPlaying.value && !isSeeking.value && !hasFocus.value && !isVolumeSliderDragging.value && !isMouseOverControls.value) {
				controlsVisible.value = false
				volumeSliderOpenMobile.value = false // Close mobile slider
			}
		}, delay)
	}
}

const showControls = () => {
	// Extended delay when mobile slider is open
	const delay = (isTouchDevice.value && volumeSliderOpenMobile.value) ? 10000 : props.autoHideDelay
	showControlsWithDelay(delay)
}

// Volume slider touch handlers - prevent auto-hide while dragging
const onVolumeSliderTouchStart = () => {
	isVolumeSliderDragging.value = true
	clearHideTimeout()
}

const onVolumeSliderTouchEnd = () => {
	isVolumeSliderDragging.value = false
	// Reset auto-hide timer after finishing drag
	if (isTouchDevice.value && volumeSliderOpenMobile.value) {
		showControlsWithDelay(10000)
	}
}

// Called only on actual mouse interaction (not programmatic)
const onMouseInteraction = () => {
	hasInteracted.value = true
	showControls()
}

// When mouse leaves controls, blur any focused element (so hasFocus doesn't block auto-hide)
const onControlsMouseLeave = () => {
	isMouseOverControls.value = false
	// Blur any focused element inside controls (buttons, sliders, progress bar)
	const activeElement = document.activeElement as HTMLElement
	if (playerRef.value?.contains(activeElement)) {
		activeElement.blur()
	}
}

// Handle mouse movement - reset auto-hide timer
let mouseMoveTimeout: number | null = null
const onMouseMove = () => {
	hasInteracted.value = true
	controlsVisible.value = true
	clearHideTimeout()

	if (mouseMoveTimeout) {
		clearTimeout(mouseMoveTimeout)
	}

	// Start auto-hide timer
	if (props.controlsAutoHide && isPlaying.value && !hasFocus.value && !isVolumeSliderDragging.value) {
		hideControlsTimeout = window.setTimeout(() => {
			if (isPlaying.value && !isSeeking.value && !hasFocus.value && !isVolumeSliderDragging.value && !isMouseOverControls.value) {
				controlsVisible.value = false
				volumeSliderOpenMobile.value = false
			}
		}, props.autoHideDelay)
	}
}

const hideControlsDelayed = () => {
	if (props.controlsAutoHide && isPlaying.value && hasInteracted.value && !hasFocus.value) {
		hideControlsTimeout = window.setTimeout(() => {
			if (!hasFocus.value && !isMouseOverControls.value) {
				controlsVisible.value = false
				volumeSliderOpenMobile.value = false
			}
		}, 500)
	}
}

const toggleControlsTouch = () => {
	isTouchDevice.value = true
	hasInteracted.value = true
	if (controlsVisible.value && isPlaying.value) {
		controlsVisible.value = false
		volumeSliderOpenMobile.value = false
	} else {
		showControls()
	}
}

// Keyboard focus handlers - show controls when tabbing into player
const onFocusIn = () => {
	hasInteracted.value = true
	hasFocus.value = true
	showControls()
}

const onFocusOut = (event: FocusEvent) => {
	// Only hide if focus is leaving the player entirely
	const relatedTarget = event.relatedTarget as HTMLElement | null
	if (!playerRef.value?.contains(relatedTarget)) {
		hasFocus.value = false
		hideControlsDelayed()
	}
}

const clearHideTimeout = () => {
	if (hideControlsTimeout) {
		clearTimeout(hideControlsTimeout)
		hideControlsTimeout = null
	}
}

// Format time as MM:SS
const formatTime = (seconds: number): string => {
	if (!seconds || !isFinite(seconds)) return '0:00'
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Keyboard navigation for progress bar (WCAG 2.1.1)
const onProgressKeydown = (event: KeyboardEvent) => {
	if (!videoRef.value) return

	const step = 5 // 5 seconds
	const bigStep = 10 // 10 seconds for Page Up/Down
	let newTime = videoRef.value.currentTime

	switch (event.key) {
		case 'ArrowLeft':
			newTime = Math.max(0, newTime - step)
			event.preventDefault()
			break
		case 'ArrowRight':
			newTime = Math.min(duration.value, newTime + step)
			event.preventDefault()
			break
		case 'ArrowUp':
			newTime = Math.min(duration.value, newTime + step)
			event.preventDefault()
			break
		case 'ArrowDown':
			newTime = Math.max(0, newTime - step)
			event.preventDefault()
			break
		case 'PageUp':
			newTime = Math.min(duration.value, newTime + bigStep)
			event.preventDefault()
			break
		case 'PageDown':
			newTime = Math.max(0, newTime - bigStep)
			event.preventDefault()
			break
		case 'Home':
			newTime = 0
			event.preventDefault()
			break
		case 'End':
			newTime = duration.value
			event.preventDefault()
			break
		default:
			return
	}

	videoRef.value.currentTime = newTime
}

const seek = (event: MouseEvent | TouchEvent) => {
	if (!videoRef.value) return

	const progressEl = (event.currentTarget as HTMLElement)
	const rect = progressEl.getBoundingClientRect()
	const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
	const clickPosition = (clientX - rect.left) / rect.width
	const newTime = clickPosition * duration.value

	videoRef.value.currentTime = Math.max(0, Math.min(newTime, duration.value))
}

const startSeeking = (event: MouseEvent | TouchEvent) => {
	isSeeking.value = true
	seek(event)

	const onMove = (e: MouseEvent | TouchEvent) => {
		if (!videoRef.value) return
		const progressEl = document.querySelector('.video-player__progress') as HTMLElement
		if (!progressEl) return

		const rect = progressEl.getBoundingClientRect()
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
		const clickPosition = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
		videoRef.value.currentTime = clickPosition * duration.value
	}

	const onEnd = () => {
		isSeeking.value = false
		document.removeEventListener('mousemove', onMove)
		document.removeEventListener('mouseup', onEnd)
		document.removeEventListener('touchmove', onMove)
		document.removeEventListener('touchend', onEnd)
	}

	document.addEventListener('mousemove', onMove)
	document.addEventListener('mouseup', onEnd)
	document.addEventListener('touchmove', onMove)
	document.addEventListener('touchend', onEnd)
}

// Event handlers
const onTimeUpdate = () => {
	if (!videoRef.value || isSeeking.value) return
	const current = videoRef.value.currentTime
	currentTime.value = current
	progress.value = (current / duration.value) * 100
	emit('timeupdate', current, duration.value)
}

const onLoadedMetadata = () => {
	if (!videoRef.value) return
	duration.value = videoRef.value.duration
}

const onPlay = () => {
	isPlaying.value = true
	emit('play')
	showControls()
}

const onPause = () => {
	isPlaying.value = false
	emit('pause')
	controlsVisible.value = true
	clearHideTimeout()
}

const onEnded = () => {
	isPlaying.value = false
	emit('ended')
	controlsVisible.value = true
}

// Lifecycle
onMounted(() => {
	if (videoRef.value) {
		videoRef.value.muted = props.muted

		if (props.autoplay) {
			// Browsers require muted for autoplay
			videoRef.value.muted = true
			isMuted.value = true
			videoRef.value.play().catch(() => {
				// Autoplay blocked - user interaction required
				console.log('Autoplay blocked by browser')
			})
		}
	}

	// Listen for fullscreen changes
	document.addEventListener('fullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
	clearHideTimeout()
	if (mouseMoveTimeout) {
		clearTimeout(mouseMoveTimeout)
	}
	document.removeEventListener('fullscreenchange', onFullscreenChange)
})

// Expose methods for parent components
defineExpose({
	play: () => videoRef.value?.play(),
	pause: () => videoRef.value?.pause(),
	togglePlay,
	toggleMute,
	toggleFullscreen,
	seek: (time: number) => {
		if (videoRef.value) videoRef.value.currentTime = time
	}
})
</script>

<style lang="scss" scoped>
.video-player {
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
	background-color: $color-dark-gray;
	cursor: pointer;

	// Hide cursor in fullscreen when controls are hidden
	&--hide-cursor {
		cursor: none;

		// Override cursor on all child elements
		* {
			cursor: none !important;
		}
	}

	&__video {
		width: 100%;
		height: 100%;
	}

	// Dark gradient overlay (bottom to transparent)
	&__gradient {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 50%;
		background: linear-gradient(to top, rgba($color-dark-gray, 0.8) 0%, transparent 100%);
		pointer-events: none;
	}

	// Title overlay
	&__title-wrapper {
		position: absolute;
		bottom: $spacing-xl + $spacing-lg; // Above controls
		left: $spacing-lg;
		right: $spacing-lg;
		pointer-events: none;
		z-index: 2;
		opacity: 1;
		transition: opacity $transition-duration $transition-ease;

		// Fade out after user has interacted
		&--fade {
			opacity: 0;
		}
	}

	&__title {
		@include title-font;
		color: $color-white;
		margin: 0;
		text-shadow: 0 2px 8px rgba($color-dark-gray, 0.5);
	}

	&__subtitle {
		@include subtitle-font;
		color: $color-white;
		margin: $spacing-xs 0 0;
		opacity: 0.9;
		text-shadow: 0 1px 4px rgba($color-dark-gray, 0.5);
	}

	// Controls container
	&__controls {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		gap: $spacing-xs;
		padding: $spacing-sm $spacing-lg;
		background: linear-gradient(to top, rgba($color-dark-gray, 0.6) 0%, transparent 100%);
		opacity: 1;
		transition: opacity $transition-duration $transition-ease;
		z-index: 3;
	}

	// Hide controls when not visible
	&:not(&--controls-visible) &__controls {
		opacity: 0;
	}

	// Control buttons
	&__btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: $spacing-xl;
		height: $spacing-xl;
		background-color: $color-white;
		border: none;
		border-radius: $border-radius-sm;
		color: $color-dark-gray;
		cursor: pointer;
		transition: all $transition-duration $transition-ease;
		flex-shrink: 0;

		svg {
			width: $spacing-lg;
			height: $spacing-lg;
		}

		&:hover {
			transform: scale(1.05);
			box-shadow: $shadow-button-hover;
		}

		&:active {
			transform: scale(0.98);
		}

		&:focus-visible {
			outline: 2px solid $color-yellow;
			outline-offset: 2px;
		}
	}

	// Volume wrapper - contains button and slider
	&__volume-wrapper {
		position: relative;
		display: flex;
		align-items: center;

		// Extend hover area upwards to connect button with slider
		&::before {
			content: '';
			position: absolute;
			bottom: 100%;
			left: 0;
			right: 0;
			height: calc($spacing-sm + 90px + 10px);
			pointer-events: none;
		}

		// Enable hover bridge when hovering or keyboard focus
		&:hover::before,
		&:focus-within::before,
		&--mobile-open::before {
			pointer-events: auto;
		}
	}

	// Volume slider container
	&__volume-slider {
		position: absolute;
		bottom: calc(100% + $spacing-sm);
		left: 50%;
		transform: translateX(-50%) translateY(10px);
		background-color: $color-white;
		border-radius: $border-radius-sm;
		width: 32px;
		height: 90px;
		box-shadow: $shadow-modal;
		opacity: 0;
		pointer-events: none;
		transition: all $transition-duration $transition-ease;
		z-index: 10;
		display: flex;
		justify-content: center;
		align-items: center;

		// PC: Show on hover
		.video-player__volume-wrapper:hover & {
			opacity: 1;
			pointer-events: auto;
			transform: translateX(-50%) translateY(0);
		}

		// Keyboard: Show on focus-within (tab navigation)
		.video-player__volume-wrapper:focus-within & {
			opacity: 1;
			pointer-events: auto;
			transform: translateX(-50%) translateY(0);
		}

		// Mobile: Show when explicitly opened
		.video-player__volume-wrapper--mobile-open & {
			opacity: 1;
			pointer-events: auto;
			transform: translateX(-50%) translateY(0);
		}

		// Arrow pointing down
		&::after {
			content: '';
			position: absolute;
			bottom: -6px;
			left: 50%;
			transform: translateX(-50%);
			border-left: 6px solid transparent;
			border-right: 6px solid transparent;
			border-top: 6px solid $color-white;
		}
	}

	// Vertical volume input
	&__volume-input {
		-webkit-appearance: none;
		appearance: none;
		width: 70px;
		height: 4px;
		background: $color-light-gray;
		border-radius: 2px;
		outline: none;
		cursor: pointer;
		transform: rotate(-90deg);

		// Webkit (Chrome, Safari)
		&::-webkit-slider-thumb {
			-webkit-appearance: none;
			appearance: none;
			width: 12px;
			height: 12px;
			background: $color-dark-gray;
			border-radius: 50%;
			cursor: pointer;
			transition: transform $transition-duration $transition-ease;

			&:hover {
				transform: scale(1.2);
			}
		}

		// Firefox
		&::-moz-range-thumb {
			width: 12px;
			height: 12px;
			background: $color-dark-gray;
			border: none;
			border-radius: 50%;
			cursor: pointer;
		}

		&::-moz-range-track {
			background: $color-light-gray;
			border-radius: 2px;
			height: 4px;
		}

		&:focus-visible {
			outline: 2px solid $color-yellow;
			outline-offset: 4px;
		}
	}

	// Progress bar
	&__progress {
		flex: 1;
		height: $spacing-xl;
		display: flex;
		align-items: center;
		cursor: pointer;
		padding: 0 $spacing-xs;
		border-radius: $border-radius-sm;

		&:focus-visible {
			outline: 2px solid $color-yellow;
			outline-offset: 2px;
		}
	}

	&__progress-track {
		position: relative;
		width: 100%;
		height: 6px;
		background-color: rgba($color-white, 0.3);
		border-radius: 3px;
		overflow: visible;
	}

	&__progress-fill {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		background-color: $color-white;
		border-radius: 3px;
		transition: width 0.1s linear;
	}

	&__progress-handle {
		position: absolute;
		top: 50%;
		width: 14px;
		height: 14px;
		background-color: $color-white;
		border-radius: 50%;
		transform: translate(-50%, -50%);
		box-shadow: 0 2px 4px rgba($color-dark-gray, 0.3);
		opacity: 0;
		transition: opacity $transition-duration $transition-ease;
	}

	// Show handle on hover
	&--controls-visible &__progress:hover &__progress-handle,
	&--controls-visible &__progress:active &__progress-handle {
		opacity: 1;
	}

	// Fullscreen mode styling
	&--fullscreen {
		&__title-wrapper {
			bottom: $spacing-xl * 2;
		}

		&__controls {
			padding: $spacing-md $spacing-xl;
		}

		&__btn {
			width: $spacing-xl + $spacing-sm;
			height: $spacing-xl + $spacing-sm;

			svg {
				width: $spacing-lg + $spacing-xs;
				height: $spacing-lg + $spacing-xs;
			}
		}
	}
}
</style>
