<template>
	<Transition name="modal">
		<div v-if="dialogVisible" class="modal-wrapper">
			<div class="modal-wrapper__backdrop" @click="handleClose"></div>
			<div class="modal-wrapper__container">
				<!-- Close button (rotated X in corner) -->
				<ModalCloseButton @click="handleClose" />

				<!-- Modal content -->
				<OverlayScrollbarsComponent
					class="modal-wrapper__modal"
					:options="{
						scrollbars: {
							autoHide: 'scroll',
							autoHideDelay: 1000
						}
					}"
					defer
				>
					<div class="job-modal__content">
						<!-- Image -->
						<div class="job-modal__image">
							<img :src="currentJob.image" :alt="currentJob.title" />
						</div>

						<!-- Section -->
						<div class="job-modal__section">
							<!-- Title -->
							<h2 class="job-modal__title">{{ currentJob.title }}</h2>

							<!-- Quote -->
							<p class="job-modal__quote">"INSÆT CITAT HER" - FORNAVN</p>

							<!-- Description -->
							<p class="job-modal__description">{{ currentJob.description }}</p>

							<!-- Tasks List -->
							<ul class="job-modal__tasks">
								<li v-for="(task, index) in currentJob.tasks" :key="index" class="job-modal__task">
									<el-icon :size="15" class="job-modal__task-icon"><Check /></el-icon>
									<span>{{ task }}</span>
								</li>
							</ul>

							<!-- Requirements -->
							<p class="job-modal__requirements">{{ currentJob.requirements }}</p>
						</div>
					</div>
				</OverlayScrollbarsComponent>

				<!-- CTA Button (outside modal, below) -->
				<div class="modal-wrapper__actions">
					<el-button type="danger" size="large" class="job-modal__cta-btn" @click="handleApply">
						ANSØG NU
						<el-icon :size="24"><Right /></el-icon>
					</el-button>
				</div>
			</div>
		</div>
	</Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Check, Right } from '@element-plus/icons-vue'
import ModalCloseButton from '@/components/ModalCloseButton.vue'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'

interface JobData {
	id: string
	title: string
	image: string
	description: string
	tasks: string[]
	requirements: string
}

const props = defineProps<{
	visible: boolean
	jobId: string
}>()

const emit = defineEmits<{
	(e: 'update:visible', value: boolean): void
	(e: 'close'): void
	(e: 'apply', jobId: string): void
}>()

const dialogVisible = ref(false)
const currentJobIndex = ref(0)

// Job data fra Figma
const jobsData: JobData[] = [
	{
		id: 'pakkeriet',
		title: 'Pakkeriet',
		image: 'https://picsum.photos/seed/pakkeriet/400/300',
		description:
			'Med job i vores pakkeri får du muligheden for et ufaglært job, hvor du kan blive så længe det passer dig. Oplæringen er kort og simpel hvorefter du kommer til at stå i vores pakkeri, sammen med en masse andre vikarer, studerende og ufaglærte. Der er fokus på det sociale, med rig mulighed for at danne venskaber mens man arbejder og kvalitetssikre.',
		tasks: [
			'Samlebåndsarbejde og pakning af bremsedele',
			'Let vedligeholdelse og rengøring',
			'Kvalitetskontrol',
			'Optælling'
		],
		requirements:
			'Der vil være en oplæringsperiode, men det forventes at du har en vis erfaring med teknik eller maskinelt arbejde, enten gennem uddannelse eller tidligere job. Forståelse for IT og kendskab til lean (5s og flow). Derudover er der tale om dag-, aften-, nat- og weekendarbejde så du skal være åben for at kunne arbejde på alle skift men med stor fleksibilitet.'
	},
	{
		id: 'produktion',
		title: 'Produktion',
		image: 'https://picsum.photos/seed/produktion/400/300',
		description:
			'Som produktionsmedarbejder er du ude på gulvet og er med til at producere de bremseklodser vi sender ud til hele verden. Du vil få indgående kendskab til vores specifikke maskiner og processer og blive en del af et socialt team med en masse erfaring at dele ud af. Arbejdet består af følgende opgaver:',
		tasks: [
			'Drift og overvågning af maskiner og robotter',
			'Forberedelse af værktøj og værktøjsskift',
			'Let vedligeholdelse og rengøring af maskiner',
			'Kvalitetskontrol',
			'Påfyldning af råvarer og andre forefaldne produktionsopgaver'
		],
		requirements:
			'Der vil være en oplæringsperiode, men det forventes at du har en vis erfaring med teknik eller maskinelt arbejde, enten gennem uddannelse eller tidligere job. Forståelse for IT og kendskab til lean (5s og flow). Derudover er der tale om dag-, aften-, nat- og weekendarbejde så du skal være åben for at kunne arbejde på alle skift men med stor fleksibilitet.'
	},
	{
		id: 'andre',
		title: 'Andre stillinger',
		image: 'https://picsum.photos/seed/andre/400/300',
		description:
			'SBS er en stor international virksomhed i vækst, og derfor mangler vi ofte folk i andre afdelinger til vores team. Har du andre erfaringer end maskineri, så send en uopfordret ansøgning og så vil vi vende tilbage til dig i tilfælde af en stilling er ledig. Dette kan for eksempel være:',
		tasks: ['HR (Human Resource)', 'Salg- og marketing', 'Køkken/kantine', 'Fragt', 'Kundesupport og kontor'],
		requirements: 'Vi ser frem til at høre fra dig.'
	}
]

const currentJob = computed(() => jobsData[currentJobIndex.value])

// Watch for visibility changes
watch(
	() => props.visible,
	(newVal) => {
		dialogVisible.value = newVal
		if (newVal && props.jobId) {
			const index = jobsData.findIndex((job) => job.id === props.jobId)
			if (index !== -1) {
				currentJobIndex.value = index
			}
		}
	}
)

watch(dialogVisible, (newVal) => {
	emit('update:visible', newVal)
	// Lås/frigiv body scroll uden at fjerne scrollbar visuelt
	if (newVal) {
		const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
		document.body.style.overflow = 'hidden'
		document.body.style.paddingRight = `${scrollbarWidth}px`
		document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`)
	} else {
		document.body.style.overflow = ''
		document.body.style.paddingRight = ''
		document.documentElement.style.setProperty('--scrollbar-width', '0px')
	}
})

const handleClose = () => {
	dialogVisible.value = false
	emit('close')
}

const handleApply = () => {
	emit('apply', currentJob.value.id)
	handleClose()
}
</script>

<style lang="scss" scoped>
.job-modal {
	&__content {
		display: flex;
		flex-direction: column;
		gap: $spacing-md;
		padding-bottom: $spacing-md;
	}

	&__image {
		width: 100%;
		height: $job-image-height;
		min-height: $job-image-height;
		flex-shrink: 0;
		overflow: hidden;
		background-color: $color-light-gray;
		border-radius: 0 0 $border-radius-lg $border-radius-lg; // Runding på nedre hjørner

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	&__section {
		display: flex;
		flex-direction: column;
		gap: $spacing-md;
		padding: 0 $spacing-md;
	}

	&__title {
		font-family: $font-title;
		font-weight: 500;
		font-size: $font-size-title;
		color: $color-dark-gray;
		margin: 0;
	}

	&__quote {
		font-family: $font-body;
		font-style: italic;
		font-size: $font-size-body;
		color: $color-dark-gray;
		margin: 0;
	}

	&__description {
		font-family: $font-body;
		font-size: $font-size-body;
		color: $color-dark-gray;
		line-height: 1.5;
		margin: 0;
	}

	&__tasks {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: $spacing-sm;
	}

	&__task {
		display: flex;
		align-items: flex-start;
		gap: $spacing-sm;
		font-family: $font-body;
		font-size: $font-size-body;
		color: $color-dark-gray;
	}

	&__task-icon {
		color: $color-dark-gray;
		flex-shrink: 0;
		margin-top: $spacing-xs;
	}

	&__requirements {
		font-family: $font-body;
		font-size: $font-size-body;
		color: $color-dark-gray;
		line-height: 1.5;
		margin: 0;
	}

	&__footer {
		width: 100%;
		padding: 0 $spacing-md $spacing-md;
	}

	&__cta-btn {
		width: 100%;
	}
}

// Modal wrapper og nav-btn styles er defineret globalt i _global.scss
</style>
