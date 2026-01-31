<template>
	<el-checkbox :model-value="modelValue" class="consent-checkbox" @click.prevent="openModal">
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
									<p>
										Ved at indsende denne ansøgning giver du samtykke til, at SBS A/S indsamler og behandler dine
										personoplysninger i forbindelse med rekrutteringsprocessen.
									</p>

									<h3>Hvilke oplysninger behandler vi?</h3>
									<ul>
										<li>Kontaktoplysninger (navn, telefon, e-mail)</li>
										<li>Eventuel alder, hvis oplyst</li>
										<li>Svar på personlighedsquiz</li>
										<li>Ønskede samtaletider</li>
										<li>CV, hvis vedhæftet</li>
									</ul>

									<h3>Formål med behandlingen</h3>
									<p>
										Dine oplysninger bruges udelukkende til at vurdere din ansøgning og koordinere eventuelle samtaler.
										Vi deler ikke dine oplysninger med tredjeparter uden dit samtykke.
									</p>

									<h3>Opbevaring</h3>
									<p>
										Dine oplysninger opbevares i op til 6 måneder efter afsluttet rekrutteringsproces, medmindre du
										giver samtykke til længere opbevaring.
									</p>

									<h3>Dine rettigheder</h3>
									<p>
										Du har ret til at få indsigt i, rette eller slette dine personoplysninger. Kontakt os på hr@sbs.dk
										for spørgsmål vedrørende dine data.
									</p>
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
import { ref } from 'vue'
import ModalCloseButton from '@/components/ModalCloseButton.vue'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'

const props = defineProps<{
	modelValue: boolean
}>()

const emit = defineEmits<{
	'update:modelValue': [value: boolean]
}>()

const modalVisible = ref(false)

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
</script>

<style lang="scss" scoped>
@use 'sass:color';

.consent-checkbox {
	margin: $spacing-md 0;

	&__text {
		@include body-font;
		line-height: 1.4;
	}

	&__link {
		color: $color-dark-gray;
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
