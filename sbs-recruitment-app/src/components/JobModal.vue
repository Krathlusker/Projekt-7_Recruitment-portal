<template>
	<el-dialog
		v-model="dialogVisible"
		:show-close="false"
		:close-on-click-modal="true"
		:close-on-press-escape="true"
		class="job-modal"
		width="341px"
		align-center
		@close="handleClose"
	>
		<template #header>
			<button class="job-modal__close-btn" @click="handleClose">
				<el-icon :size="20"><Close /></el-icon>
			</button>
		</template>

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

		<!-- Navigation Buttons -->
		<div class="job-modal__navigation">
			<button class="job-modal__nav-btn job-modal__nav-btn--prev" @click="prevJob">
				<el-icon :size="15"><ArrowLeft /></el-icon>
			</button>
			<button class="job-modal__nav-btn job-modal__nav-btn--next" @click="nextJob">
				<el-icon :size="15"><ArrowRight /></el-icon>
			</button>
		</div>

		<!-- CTA Button -->
		<template #footer>
			<div class="job-modal__footer">
				<el-button type="primary" class="job-modal__cta" @click="handleApply">
					ANSØG NU
					<el-icon :size="20" class="job-modal__cta-icon"><Right /></el-icon>
				</el-button>
			</div>
		</template>
	</el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Close, Check, ArrowLeft, ArrowRight, Right } from '@element-plus/icons-vue'

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
		image: '/images/pakkeriet.jpg',
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
		image: '/images/produktion.jpg',
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
		image: '/images/andre.jpg',
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
})

const handleClose = () => {
	dialogVisible.value = false
	emit('close')
}

const prevJob = () => {
	currentJobIndex.value = currentJobIndex.value === 0 ? jobsData.length - 1 : currentJobIndex.value - 1
}

const nextJob = () => {
	currentJobIndex.value = currentJobIndex.value === jobsData.length - 1 ? 0 : currentJobIndex.value + 1
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

		@media (max-width: $breakpoint-md) {
			max-height: calc($modal-max-height-mobile - 200px);
			overflow-y: auto;
		}
	}

	&__image {
		width: 100%;
		height: 200px;
		border-radius: $border-radius-lg;
		overflow: hidden;
		background-color: $color-light-gray;

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
		font-family: 'Neo Sans W1G', sans-serif;
		font-weight: 500;
		font-size: 36px;
		color: $color-dark-gray;
		margin: 0;
	}

	&__quote {
		font-family: 'Inter', sans-serif;
		font-style: italic;
		font-size: 12px;
		color: $color-dark-gray;
		margin: 0;
	}

	&__description {
		font-family: 'Helvetica Neue LT Pro', 'Helvetica Neue', Helvetica, sans-serif;
		font-size: 12px;
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
		font-family: 'Helvetica Neue LT Pro', 'Helvetica Neue', Helvetica, sans-serif;
		font-size: 12px;
		color: $color-dark-gray;
	}

	&__task-icon {
		color: $color-dark-gray;
		flex-shrink: 0;
		margin-top: 2px;
	}

	&__requirements {
		font-family: 'Helvetica Neue LT Pro', 'Helvetica Neue', Helvetica, sans-serif;
		font-size: 12px;
		color: $color-dark-gray;
		line-height: 1.5;
		margin: 0;
	}

	&__navigation {
		display: flex;
		justify-content: space-between;
		padding: $spacing-md;
		position: absolute;
		bottom: 80px;
		left: 0;
		right: 0;
	}

	&__nav-btn {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 1px solid transparent;
		background-color: $color-light-gray;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: $shadow-modal;
		transition: transform 0.2s ease;

		&:hover {
			transform: scale(1.1);
		}
	}

	&__close-btn {
		position: absolute;
		top: 0;
		right: 0;
		width: 55px;
		height: 55px;
		background-color: $color-light-gray;
		border: none;
		border-bottom-left-radius: $border-radius-lg;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: $shadow-modal;
		z-index: 10;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: #dedede;
		}
	}

	&__footer {
		width: 100%;
		padding: 0 $spacing-md $spacing-md;
	}

	&__cta {
		width: 100%;
		height: 50px;
		background-color: $color-red;
		border: none;
		border-radius: $border-radius-sm;
		font-family: 'Neo Sans W1G', sans-serif;
		font-weight: 500;
		font-size: 24px;
		color: $color-white;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: $spacing-sm;
		cursor: pointer;
		box-shadow: $shadow-modal;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: #c5281d;
		}
	}

	&__cta-icon {
		margin-left: $spacing-sm;
	}
}

// Override Element Plus dialog styles
:deep(.el-dialog) {
	border-radius: $border-radius-lg;
	overflow: hidden;
	box-shadow: $shadow-modal;
	padding: 0;
	max-height: 595px;
	overflow-y: auto;

	.el-dialog__header {
		padding: 0;
		margin: 0;
	}

	.el-dialog__body {
		padding: 0;
	}

	.el-dialog__footer {
		padding: 0;
	}
}
</style>
