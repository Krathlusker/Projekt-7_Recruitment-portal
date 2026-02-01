<template>
	<div
		ref="playerRef"
		class="video-player"
		:class="{
			'video-player--controls-visible': controlsVisible,
			'video-player--fullscreen': isFullscreen,
			'video-player--hide-cursor': isFullscreen && !controlsVisible && !isMouseOverControls,
			'video-player--contain': objectFit === 'contain'
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
			:style="videoStyle"
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
		<div
			class="video-player__gradient"
			:class="{ 'video-player__gradient--hidden': hasInteracted && !controlsVisible }"
		/>

		<!-- Title overlay -->
		<div
			v-if="title"
			class="video-player__title-wrapper"
			:class="{ 'video-player__title-wrapper--fade': hasInteracted && !controlsVisible }"
		>
			<h2 class="video-player__title">{{ title }}</h2>
			<el-text v-if="subtitle" class="video-player__subtitle">{{ subtitle }}</el-text>
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
				@click.stop="togglePlay(); onButtonInteraction()"
				@touchstart.stop="onButtonTouch"
			>
				<MdPause v-if="isPlaying" />
				<MdPlayArrow v-else />
			</button>

			<!-- Volume control wrapper -->
			<div class="video-player__volume-wrapper">
				<!-- Volume button -->
				<button
					class="video-player__btn video-player__btn--volume"
					:aria-label="isMuted ? 'Slå lyd til' : 'Slå lyd fra'"
					@click.stop="toggleMute(); onButtonInteraction()"
					@touchstart.stop="onButtonTouch"
				>
					<MdVolumeOff v-if="isMuted || volume === 0" />
					<MdVolumeMute v-else-if="volume < 0.5" />
					<MdVolumeUp v-else />
				</button>
				<!-- Volume slider (PC only - mobile uses system volume) -->
				<div v-if="!isTouchDevice" class="video-player__volume-slider">
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
					/>
				</div>
			</div>

			<!-- Time display -->
			<span class="video-player__time">{{ formatTime(currentTime) }}</span>

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
				@mousemove="onProgressHover"
				@mouseleave="tooltipVisible = false"
			>
				<!-- Custom tooltip that follows mouse -->
				<div
					v-show="tooltipVisible"
					class="video-player__progress-tooltip"
					:style="{ left: `${tooltipX}%` }"
				>
					{{ formatTime(hoverTime) }}
				</div>
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
				@click.stop="toggleFullscreen(); onButtonInteraction()"
				@touchstart.stop="onButtonTouch"
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
	maxHeight?: string
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
	maxHeight: '',
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

// Computed: object-fit for video (fullscreen always uses contain)
const objectFit = computed(() => props.objectFit)

// Computed: video element style
const videoStyle = computed(() => {
	const style: Record<string, string> = {
		objectFit: isFullscreen.value ? 'contain' : props.objectFit
	}
	// Apply maxHeight only when not fullscreen and using contain
	if (props.maxHeight && !isFullscreen.value && props.objectFit === 'contain') {
		style.maxHeight = props.maxHeight
	}
	return style
})
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
const hoverTime = ref(0) // Time at hover position for tooltip
const tooltipVisible = ref(false) // Show/hide progress tooltip
const tooltipX = ref(0) // Tooltip X position (percentage)
const wasPlayingBeforeSeek = ref(false) // Remember play state before scrubbing

// Touch device detection
const isTouchDevice = ref(false)

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
	if (!playerRef.value || !videoRef.value) return

	try {
		// Check if already in fullscreen
		const isCurrentlyFullscreen = document.fullscreenElement || (document as any).webkitFullscreenElement

		if (!isCurrentlyFullscreen) {
			// Try standard Fullscreen API first (works on most browsers)
			if (playerRef.value.requestFullscreen) {
				await playerRef.value.requestFullscreen()
				isFullscreen.value = true
			}
			// Webkit prefix for older Safari
			else if ((playerRef.value as any).webkitRequestFullscreen) {
				await (playerRef.value as any).webkitRequestFullscreen()
				isFullscreen.value = true
			}
			// iOS Safari: use video element's webkitEnterFullscreen
			else if ((videoRef.value as any).webkitEnterFullscreen) {
				(videoRef.value as any).webkitEnterFullscreen()
				isFullscreen.value = true
			}
		} else {
			// Exit fullscreen
			if (document.exitFullscreen) {
				await document.exitFullscreen()
			} else if ((document as any).webkitExitFullscreen) {
				await (document as any).webkitExitFullscreen()
			}
			isFullscreen.value = false
		}
	} catch (err) {
		console.error('Fullscreen error:', err)
	}
}

const onFullscreenChange = () => {
	isFullscreen.value = !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
}

// Show controls with auto-hide timer
const showControlsWithDelay = (delay: number) => {
	controlsVisible.value = true
	clearHideTimeout()

	// Don't auto-hide if: has keyboard focus
	// On touch devices, ignore isMouseOverControls (irrelevant)
	if (props.controlsAutoHide && isPlaying.value && hasInteracted.value && !hasFocus.value) {
		hideControlsTimeout = window.setTimeout(() => {
			// Check conditions again when timer fires
			const mouseBlocking = !isTouchDevice.value && isMouseOverControls.value
			if (isPlaying.value && !isSeeking.value && !hasFocus.value && !mouseBlocking) {
				controlsVisible.value = false
			}
		}, delay)
	}
}

const showControls = () => {
	showControlsWithDelay(props.autoHideDelay)
}

// Called only on actual mouse interaction (not programmatic)
const onMouseInteraction = () => {
	hasInteracted.value = true
	showControls()
}

// Called on touchstart on buttons - marks device as touch
const onButtonTouch = () => {
	isTouchDevice.value = true
}

// Called after button interactions on mobile to start auto-hide timer
const onButtonInteraction = () => {
	if (isTouchDevice.value) {
		hasInteracted.value = true
		// Delay to let state update (e.g., isPlaying changes)
		setTimeout(() => {
			if (isPlaying.value) {
				showControlsWithDelay(3000) // 3 second auto-hide on mobile after button
			}
		}, 50)
	}
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

	// Start auto-hide timer (PC only - touch devices use different logic)
	if (props.controlsAutoHide && isPlaying.value && !hasFocus.value && !isTouchDevice.value) {
		hideControlsTimeout = window.setTimeout(() => {
			if (isPlaying.value && !isSeeking.value && !hasFocus.value && !isMouseOverControls.value) {
				controlsVisible.value = false
			}
		}, props.autoHideDelay)
	}
}

const hideControlsDelayed = () => {
	// PC only - on touch devices, controls are toggled explicitly
	if (props.controlsAutoHide && isPlaying.value && hasInteracted.value && !hasFocus.value && !isTouchDevice.value) {
		hideControlsTimeout = window.setTimeout(() => {
			if (!hasFocus.value && !isMouseOverControls.value) {
				controlsVisible.value = false
			}
		}, 500)
	}
}

// Debounce touch to prevent multiple rapid toggles (blinking)
let lastTouchTime = 0
const toggleControlsTouch = (event: TouchEvent) => {
	// Mark as touch device when user actually touches
	isTouchDevice.value = true

	// Don't toggle if touch was on a control element (button, slider, etc.)
	const target = event.target as HTMLElement
	if (target.closest('.video-player__controls')) {
		return
	}

	const now = Date.now()
	if (now - lastTouchTime < 400) return // Debounce 400ms
	lastTouchTime = now

	hasInteracted.value = true
	if (controlsVisible.value && isPlaying.value) {
		controlsVisible.value = false
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

// Progress bar hover - calculate time at mouse position for tooltip
const onProgressHover = (event: MouseEvent) => {
	const progressEl = progressRef.value
	if (!progressEl) return

	const rect = progressEl.getBoundingClientRect()
	const hoverPosition = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
	hoverTime.value = hoverPosition * duration.value
	tooltipX.value = hoverPosition * 100
	tooltipVisible.value = true
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

	// Pause video while scrubbing, remember if it was playing
	wasPlayingBeforeSeek.value = isPlaying.value
	if (videoRef.value && isPlaying.value) {
		videoRef.value.pause()
	}

	seek(event)
	tooltipVisible.value = true

	const onMove = (e: MouseEvent | TouchEvent) => {
		if (!videoRef.value) return
		const progressEl = progressRef.value
		if (!progressEl) return

		const rect = progressEl.getBoundingClientRect()
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
		const clickPosition = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
		const newTime = clickPosition * duration.value
		videoRef.value.currentTime = newTime

		// Update progress bar, tooltip time and position while scrubbing
		progress.value = clickPosition * 100
		currentTime.value = newTime
		hoverTime.value = newTime
		tooltipX.value = clickPosition * 100
	}

	const onEnd = () => {
		isSeeking.value = false
		tooltipVisible.value = false

		// Resume video if it was playing before scrubbing
		if (wasPlayingBeforeSeek.value && videoRef.value) {
			videoRef.value.play()
		}

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
	// isTouchDevice is set to true when user first touches the player
	// This ensures volume slider is shown on PC even if device reports touch support

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

	// Listen for fullscreen changes (including webkit prefix for Safari)
	document.addEventListener('fullscreenchange', onFullscreenChange)
	document.addEventListener('webkitfullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
	clearHideTimeout()
	if (mouseMoveTimeout) {
		clearTimeout(mouseMoveTimeout)
	}
	document.removeEventListener('fullscreenchange', onFullscreenChange)
	document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
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
	background-color: $c-primary;
	cursor: pointer;

	// Contain mode: height follows video aspect ratio
	&--contain {
		height: auto;
		background-color: transparent;
	}

	// Fullscreen always fills and centers
	&--fullscreen {
		height: 100%;
		background-color: $c-primary;
	}

	// Hide cursor in fullscreen when controls are hidden
	&--hide-cursor {
		cursor: none;

		// Override cursor on all child elements
		* {
			cursor: none !important;
		}
	}

	&__video {
		display: block; // Remove inline element gap
		width: 100%;
		height: auto; // Let video keep its aspect ratio

		// Fullscreen: fill container, centered
		.video-player--fullscreen & {
			height: 100%;
			object-fit: contain;
		}
	}

	// Dark gradient overlay (bottom to transparent)
	&__gradient {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 50%;
		background: linear-gradient(to top, rgba(var(--el-color-primary-rgb), 0.8) 0%, transparent 100%);
		pointer-events: none;
		opacity: 1;
		transition: opacity $transition-duration $transition-ease;

		&--hidden {
			opacity: 0;
		}
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
		background: linear-gradient(to top, rgba(var(--el-color-primary-rgb), 0.6) 0%, transparent 100%);
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
		@include button-colors-light;
		display: flex;
		align-items: center;
		justify-content: center;
		width: $spacing-xl;
		height: $spacing-xl;
		border: $border-width-thin solid transparent;
		border-radius: $border-radius-sm;
		cursor: pointer;
		transition: all $transition-duration $transition-ease;
		flex-shrink: 0;
		user-select: none;
		-webkit-user-select: none;
		-webkit-tap-highlight-color: transparent;

		svg {
			width: $spacing-lg;
			height: $spacing-lg;
		}

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
		&:focus-within::before {
			pointer-events: auto;
		}
	}

	// Volume slider container
	&__volume-slider {
		position: absolute;
		bottom: calc(100% + $spacing-sm);
		left: 50%;
		transform: translateX(-50%) translateY(10px);
		background-color: $c-bg;
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

		// Arrow pointing down
		&::after {
			content: '';
			position: absolute;
			bottom: -6px;
			left: 50%;
			transform: translateX(-50%);
			border-left: 6px solid transparent;
			border-right: 6px solid transparent;
			border-top: 6px solid $c-bg;
		}
	}

	// Vertical volume input
	&__volume-input {
		-webkit-appearance: none;
		appearance: none;
		width: 70px;
		height: 4px;
		background: $c-fill-light;
		border-radius: $border-radius-xs;
		outline: none;
		cursor: pointer;
		transform: rotate(-90deg);

		// Webkit (Chrome, Safari)
		&::-webkit-slider-thumb {
			-webkit-appearance: none;
			appearance: none;
			width: 12px;
			height: 12px;
			background: $c-primary;
			border-radius: $border-radius-circle;
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
			background: $c-primary;
			border: none;
			border-radius: $border-radius-circle;
			cursor: pointer;
		}

		&::-moz-range-track {
			background: $c-fill-light;
			border-radius: $border-radius-xs;
			height: 4px;
		}

		&:focus-visible {
			outline: 2px solid $c-warning;
			outline-offset: 4px;
		}
	}

	// Time display
	&__time {
		@include body-font;
		font-size: $font-size-body;
		font-variant-numeric: tabular-nums;
		color: $c-bg;
		min-width: 40px;
		text-align: center;
		user-select: none;
	}

	// Progress bar
	&__progress {
		position: relative;
		flex: 1;
		height: $spacing-xl;
		display: flex;
		align-items: center;
		cursor: pointer;
		padding: 0 $spacing-xs;
		border-radius: $border-radius-sm;

		&:focus-visible {
			outline: 2px solid $c-warning;
			outline-offset: 2px;
		}
	}

	// Custom tooltip that follows mouse
	&__progress-tooltip {
		position: absolute;
		bottom: calc(100% + $spacing-xs);
		transform: translateX(-50%);
		background-color: $c-bg;
		color: $c-primary;
		padding: $spacing-xs $spacing-sm;
		border-radius: $border-radius-sm;
		font-size: $font-size-body;
		font-variant-numeric: tabular-nums;
		box-shadow: $shadow-card;
		white-space: nowrap;
		pointer-events: none;
		z-index: 10;

		// Arrow pointing down
		&::after {
			content: '';
			position: absolute;
			top: 100%;
			left: 50%;
			transform: translateX(-50%);
			border-left: 5px solid transparent;
			border-right: 5px solid transparent;
			border-top: 5px solid $c-bg;
		}
	}

	&__progress-track {
		position: relative;
		width: 100%;
		height: 6px;
		background-color: rgba(var(--el-color-white-rgb), 0.3);
		border-radius: $border-radius-xs;
		overflow: visible;
	}

	&__progress-fill {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		background-color: $c-bg;
		border-radius: $border-radius-xs;
		transition: width 0.1s linear;
	}

	&__progress-handle {
		position: absolute;
		top: 50%;
		width: 14px;
		height: 14px;
		background-color: $c-bg;
		border-radius: $border-radius-circle;
		transform: translate(-50%, -50%);
		box-shadow: 0 2px 4px rgba(var(--el-color-primary-rgb), 0.3);
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
