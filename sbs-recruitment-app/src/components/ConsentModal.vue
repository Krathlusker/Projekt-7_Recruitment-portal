<template>
	<el-checkbox
		:model-value="modelValue"
		class="consent-checkbox"
		@click.prevent="openModal"
		@keydown.enter.prevent="openModal"
		@keydown.space.prevent="openModal"
	>
		<span class="consent-checkbox__text">
			Jeg accepterer <span class="consent-checkbox__link">behandling af mine persondata</span>
		</span>
	</el-checkbox>

	<!-- Consent Modal (teleported to body to escape parent stacking context) -->
	<Teleport to="body">
		<Transition name="modal">
			<div v-if="modalVisible" class="modal-wrapper consent-modal-wrapper">
				<div class="modal-wrapper__backdrop" @click="closeModal"></div>
				<div class="modal-wrapper__container consent-modal-wrapper__container">
					<!-- Modal white box -->
					<div class="modal-wrapper__modal">
						<!-- Close button -->
						<ModalCloseButton @click="closeModal" />

						<!-- Scrollable content area -->
						<OverlayScrollbarsComponent
							class="modal-wrapper__scroll-area"
							:options="{
								scrollbars: {
									autoHide: 'scroll',
									autoHideDelay: 1000
								}
							}"
							defer
						>
							<div class="consent-modal__content">
								<h2 class="consent-modal__title">Samtykke til behandling af persondata</h2>

								<div class="consent-modal__body">
									<el-text>
										Ved udfyldning af denne ansøgning vil din data kun blive brugt til vurdering af din ansøgning og
										opbevares sikkert hos SBS. Vi deler ikke dine oplysninger med tredjeparter uden dit samtykke.
									</el-text>

									<h3>Hvilke oplysninger behandler vi?</h3>
									<ul>
										<li>Navn</li>
										<li>Alder</li>
										<li>Telefonnummer</li>
										<li>E-mail</li>
										<li>Jobpræference</li>
										<li>Svar på personlighedsquiz</li>
										<li>Ønskede samtaletider</li>
										<li>CV (hvis vedhæftet)</li>
									</ul>

									<h3>Formål med behandlingen</h3>
									<el-text>
										Dine oplysninger bruges udelukkende til at vurdere din ansøgning og koordinere eventuelle samtaler.
										Det gør det muligt at kontakte dig efter du har sendt din ansøgning.
									</el-text>

									<h3>Opbevaring</h3>
									<el-text>
										I tilfælde af at du ikke bliver ansat eller kaldt til samtale, vil dine data blive slettet
										automatisk efter 12 måneder. Skulle du ikke få et job, har vi derfor 12 måneder til at kontakte
										dig, i tilfælde af at en stilling skulle åbne sig.
									</el-text>

									<h3>Dine rettigheder</h3>
									<el-text>
										Du har ret til at få indsigt i, rette eller slette dine personoplysninger. Du kan til enhver tid
										få slettet din data ved at kontakte os på data@sbs.dk.
									</el-text>
								</div>
							</div>
						</OverlayScrollbarsComponent>
					</div>

					<!-- Action buttons (outside modal box, same style as ApplicationModal) -->
					<div class="modal-wrapper__actions">
						<el-button type="danger" @click="handleDecline" class="modal-nav-btn">Afslå</el-button>
						<el-button type="warning" @click="handleAccept" class="modal-nav-btn">Acceptér</el-button>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import ModalCloseButton from '@/components/ModalCloseButton.vue'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'

const props = defineProps<{
	modelValue: boolean
}>()

const emit = defineEmits<{
	'update:modelValue': [value: boolean]
}>()

const modalVisible = ref(false)
let previousActiveElement: HTMLElement | null = null

const openModal = () => {
	modalVisible.value = true
}

const closeModal = () => {
	modalVisible.value = false
}

const handleAccept = () => {
	emit('update:modelValue', true)
	closeModal()
}

const handleDecline = () => {
	emit('update:modelValue', false)
	closeModal()
}

// ESC handler for consent modal
const handleKeydown = (event: KeyboardEvent) => {
	if (event.key === 'Escape' && modalVisible.value) {
		event.preventDefault()
		event.stopPropagation()
		closeModal()
	}
}

// Focus trap handler
const handleFocusTrap = (event: KeyboardEvent) => {
	if (event.key !== 'Tab' || !modalVisible.value) return

	const modal = document.querySelector('.consent-modal-wrapper__container') as HTMLElement
	if (!modal) return

	const focusableElements = modal.querySelectorAll<HTMLElement>(
		'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
	)
	if (focusableElements.length === 0) return

	const firstElement = focusableElements[0]
	const lastElement = focusableElements[focusableElements.length - 1]

	if (event.shiftKey) {
		// Shift+Tab: hvis på første element, gå til sidste
		if (document.activeElement === firstElement) {
			event.preventDefault()
			lastElement.focus()
		}
	} else {
		// Tab: hvis på sidste element, gå til første
		if (document.activeElement === lastElement) {
			event.preventDefault()
			firstElement.focus()
		}
	}
}

// Watch for modal visibility changes
watch(modalVisible, (newVal) => {
	if (newVal) {
		// Modal opens - save focus and setup listeners
		previousActiveElement = document.activeElement as HTMLElement
		document.addEventListener('keydown', handleKeydown, true) // capture phase for ESC
		document.addEventListener('keydown', handleFocusTrap)
		// Focus first button after modal renders
		nextTick(() => {
			const firstButton = document.querySelector('.consent-modal-wrapper .modal-nav-btn') as HTMLElement
			if (firstButton) firstButton.focus()
		})
	} else {
		// Modal closes - cleanup and restore focus
		document.removeEventListener('keydown', handleKeydown, true)
		document.removeEventListener('keydown', handleFocusTrap)
		if (previousActiveElement) {
			previousActiveElement.focus()
		}
	}
})

// Cleanup on unmount
onUnmounted(() => {
	document.removeEventListener('keydown', handleKeydown, true)
	document.removeEventListener('keydown', handleFocusTrap)
})
</script>

<style lang="scss" scoped>
@use 'sass:color';

.consent-checkbox {
	margin: $spacing-md 0;
	margin-left: 4px; // Giv plads til focus ring
	align-items: center; // Center checkbox and text vertically

	// Override Element Plus checkbox alignment
	:deep(.el-checkbox__input) {
		flex-shrink: 0; // Prevent checkbox from shrinking
	}

	// Make checkbox larger
	:deep(.el-checkbox__inner) {
		width: 20px;
		height: 20px;
		border-radius: $border-radius-xs;

		&::after {
			// Adjust checkmark for larger checkbox
			height: 10px;
			width: 6px;
			left: 9px;
			top: 7px;
			border-width: 2px;
		}
	}

	// Focus styling på checkbox (kun keyboard, ikke touch)
	:deep(.el-checkbox__input.is-focus .el-checkbox__inner),
	:deep(.el-checkbox__original:focus-visible + .el-checkbox__inner) {
		box-shadow: 0 0 0 2px $c-warning !important;
		outline: none;
	}

	:deep(.el-checkbox__label) {
		flex: 1; // Let label take remaining space
	}

	&__text {
		@include body-font;
		line-height: 1.4;
		white-space: normal; // Allow text to wrap
		text-align: left; // Ensure left alignment
		display: block;
	}

	&__link {
		color: $c-primary;
		text-decoration: underline;
		font-weight: $font-weight-bold;

		&:hover {
			opacity: 0.8;
		}
	}
}

// Consent modal wrapper overrides for smaller size
.consent-modal-wrapper {
	z-index: 4000; // Above ApplicationModal (z-index: 1000)

	&__container {
		max-width: 500px !important;
		height: $modal-height-standard; // Same fixed height as ApplicationModal
		max-height: calc(100vh - #{$spacing-md * 2});
	}
}

.consent-modal {
	&__content {
		@include flex-column;
		gap: $spacing-sm;
		padding: $spacing-md;
	}

	&__title {
		@include title-font;
		font-size: $font-size-subtitle;
		margin: 0;
	}

	&__body {
		@include flex-column;
		gap: $spacing-xs;

		p {
			@include body-font;
			margin: 0;
			line-height: 1.5;
		}

		h3 {
			@include body-bold-font;
			margin: $spacing-sm 0 0;
		}

		ul {
			@include body-font;
			margin: 0;
			padding-left: $spacing-lg;

			li {
				margin-bottom: $spacing-xs;
			}
		}
	}
}

// Scroll area padding for consent modal
:deep(.modal-wrapper__scroll-area) {
	[data-overlayscrollbars-contents] {
		padding: 0 !important;
	}
}
</style>
