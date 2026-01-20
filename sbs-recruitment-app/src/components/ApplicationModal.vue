<template>
	<el-dialog
		v-model="dialogVisible"
		:show-close="false"
		:close-on-click-modal="false"
		:close-on-press-escape="false"
		width="380px"
		class="application-modal"
		align-center
	>
		<template #header>
			<div class="application-modal__header">
				<button class="application-modal__close" @click="handleClose">
					<el-icon :size="24">
						<Close />
					</el-icon>
				</button>
			</div>
		</template>

		<div class="application-modal__content">
			<!-- Step 1: Personal Information -->
			<div v-if="currentStep === 1" class="application-modal__step">
				<h2 class="application-modal__title">Hvem er du?</h2>
				<p class="application-modal__description">
					Vi vil rigtig gerne vide hvem du er, derfor beder vi om at du udfylder de generelle info om dig, og svare pa
					de folgende 5 sporgsmal. Sa er det bare lidt lettere at laere hinanden at kende.
				</p>

				<el-form
					ref="personalFormRef"
					:model="formData"
					:rules="personalFormRules"
					label-position="top"
					class="application-modal__form"
				>
					<el-form-item label="Fulde navn *" prop="fullName">
						<el-input v-model="formData.fullName" placeholder="Skriv her..." />
					</el-form-item>

					<el-form-item label="Telefonnummer *" prop="phone">
						<el-input v-model="formData.phone" placeholder="Skriv her..." />
					</el-form-item>

					<el-form-item label="E-mail *" prop="email">
						<el-input v-model="formData.email" placeholder="Skriv her..." />
					</el-form-item>

					<el-form-item label="Alder *" prop="age">
						<el-select v-model="formData.age" placeholder="Valg her..." style="width: 100%">
							<el-option label="18-25 ar" value="18-25" />
							<el-option label="26-35 ar" value="26-35" />
							<el-option label="36-45 ar" value="36-45" />
							<el-option label="46-55 ar" value="46-55" />
							<el-option label="56+ ar" value="56+" />
						</el-select>
					</el-form-item>

					<el-form-item label="Hvilket job onsker du at soge?" prop="jobPosition">
						<el-select v-model="formData.jobPosition" placeholder="Select option" style="width: 100%">
							<el-option label="Pakkeriet" value="pakkeriet" />
							<el-option label="Produktion" value="produktion" />
							<el-option label="Andre stillinger" value="andre" />
						</el-select>
					</el-form-item>

					<div class="application-modal__cv-row">
						<div class="application-modal__cv-toggle">
							<span class="application-modal__cv-label">Vedhaft CV?</span>
							<el-switch v-model="formData.hasCV" />
							<span class="application-modal__cv-hint">{{ formData.hasCV ? 'Ja' : 'Nej' }}</span>
						</div>

						<div v-if="formData.hasCV" class="application-modal__cv-upload">
							<span class="application-modal__cv-label">Upload</span>
							<el-upload
								ref="uploadRef"
								:auto-upload="false"
								:limit="1"
								accept=".pdf,.doc,.docx"
								@change="handleFileChange"
							>
								<el-button type="default" size="small">
									{{ formData.cvFile ? formData.cvFile.name : 'Klik her for at uploade...' }}
								</el-button>
							</el-upload>
						</div>
					</div>
				</el-form>
			</div>

			<!-- Step 2: DISC Quiz -->
			<div v-else-if="currentStep === 2" class="application-modal__step">
				<h2 class="application-modal__title">Sporgsmal {{ currentQuestion + 1 }} af {{ discQuestions.length }}</h2>
				<p class="application-modal__description">
					{{ discQuestions[currentQuestion].question }}
				</p>

				<div class="application-modal__options">
					<button
						v-for="(option, index) in discQuestions[currentQuestion].options"
						:key="index"
						class="application-modal__option"
						:class="{ 'application-modal__option--selected': isOptionSelected(currentQuestion, option) }"
						@click="selectOption(currentQuestion, option)"
					>
						{{ option.text }}
					</button>
				</div>

				<div class="application-modal__progress">
					<span>{{ currentQuestion + 1 }} / {{ discQuestions.length }}</span>
				</div>
			</div>

			<!-- Step 3: Date Selection (Qualified) -->
			<div v-else-if="currentStep === 3" class="application-modal__step">
				<h2 class="application-modal__title">Din onskede tid</h2>
				<p class="application-modal__description">
					Her kan du valge 2 tidspunkter pa de dage vi holder samtaler, og selv passe din aftale ind i din hverdag.
				</p>

				<div class="application-modal__date-section">
					<div class="application-modal__date-header">
						<h3 class="application-modal__date-title">{{ selectedDate || 'Valg dato' }}</h3>
						<el-button type="primary" size="small" @click="showDatePicker = true">
							<el-icon>
								<Calendar />
							</el-icon>
							VALG DATO
						</el-button>
					</div>

					<el-date-picker
						v-if="showDatePicker"
						v-model="selectedDate"
						type="date"
						placeholder="Valg en dato"
						format="DD. MMMM"
						value-format="YYYY-MM-DD"
						@change="showDatePicker = false"
						style="margin-bottom: 12px"
					/>

					<div v-if="availableSlots.length > 0" class="application-modal__slots">
						<div
							v-for="slot in availableSlots"
							:key="slot.id"
							class="application-modal__slot"
							:class="{
								'application-modal__slot--selected': isSlotSelected(slot.id),
								'application-modal__slot--disabled': slot.isBooked
							}"
							@click="toggleSlot(slot)"
						>
							<span class="application-modal__slot-time">{{ slot.time }}</span>
							<span class="application-modal__slot-type">{{ slot.type === 'fysisk' ? 'Fysisk' : 'Virtuel' }}</span>
							<span v-if="isSlotSelected(slot.id)" class="application-modal__slot-choice">
								{{ getSlotChoiceNumber(slot.id) }}. valg
							</span>
						</div>
					</div>

					<div class="application-modal__slots-count">Valgt: {{ selectedSlots.length }} af 2</div>
				</div>
			</div>

			<!-- Step 4: Not Qualified -->
			<div v-else-if="currentStep === 4" class="application-modal__step application-modal__step--centered">
				<el-icon :size="64" class="application-modal__result-icon application-modal__result-icon--warning">
					<WarningFilled />
				</el-icon>
				<h2 class="application-modal__title">Tak for din interesse</h2>
				<p class="application-modal__description">
					Desvaerre matcher din profil ikke det vi soger lige nu. Vi gemmer din ansgning og kontakter dig, hvis der
					abner sig en passende mulighed.
				</p>
				<p class="application-modal__description">Du er altid velkommen til at soge igen pa et senere tidspunkt.</p>
			</div>

			<!-- Step 5: Success -->
			<div v-else-if="currentStep === 5" class="application-modal__step application-modal__step--centered">
				<el-icon :size="64" class="application-modal__result-icon application-modal__result-icon--success">
					<SuccessFilled />
				</el-icon>
				<h2 class="application-modal__title">Tak for din ansgning</h2>
				<p class="application-modal__description">
					Vi har modtaget din ansgning og dine onsker til samtaletider. Du vil modtage en bekraftelse pa mail med de
					endelige detaljer.
				</p>
				<p class="application-modal__description">Vi glader os til at mode dig!</p>
			</div>
		</div>

		<template #footer>
			<!-- Stepper -->
			<div class="application-modal__stepper">
				<div
					v-for="step in steps"
					:key="step.id"
					class="application-modal__stepper-step"
					:class="{
						'application-modal__stepper-step--active': currentStep === step.id,
						'application-modal__stepper-step--completed': currentStep > step.id
					}"
				>
					<div class="application-modal__stepper-icon">
						<el-icon v-if="currentStep > step.id">
							<Check />
						</el-icon>
						<el-icon v-else>
							<component :is="step.icon" />
						</el-icon>
					</div>
					<span class="application-modal__stepper-label">{{ step.label }}</span>
				</div>
				<div
					v-for="i in 3"
					:key="'connector-' + i"
					class="application-modal__stepper-connector"
					:class="{ 'application-modal__stepper-connector--completed': currentStep > i }"
				/>
			</div>

			<!-- Navigation Buttons -->
			<div v-if="currentStep < 4" class="application-modal__actions">
				<el-button v-if="currentStep > 1" @click="previousStep" class="application-modal__btn-prev">
					<el-icon>
						<ArrowLeft />
					</el-icon>
				</el-button>
				<el-button type="primary" @click="nextStep" :disabled="!canProceed" class="application-modal__btn-next">
					<el-icon>
						<ArrowRight />
					</el-icon>
				</el-button>
			</div>

			<div v-else class="application-modal__actions">
				<el-button type="primary" @click="handleClose" class="application-modal__btn-close"> Luk </el-button>
			</div>
		</template>
	</el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, shallowRef } from 'vue'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'
import {
	Close,
	Check,
	ArrowLeft,
	ArrowRight,
	User,
	Edit,
	Calendar,
	Message,
	SuccessFilled,
	WarningFilled
} from '@element-plus/icons-vue'
import { discQuestions, QUALIFICATION_THRESHOLD } from '@/config/discQuestions'
import type { ApplicationFormData, DiscAnswers, DiscResult, DiscOption, DiscProfile, InterviewSlot, JobPosition } from '@/types'
import api from '@/config/api'

// Props
const props = defineProps<{
	visible: boolean
	selectedJob?: JobPosition | ''
}>()

// Emits
const emit = defineEmits<{
	'update:visible': [value: boolean]
	close: []
}>()

// Dialog visibility
const dialogVisible = computed({
	get: () => props.visible,
	set: (val) => emit('update:visible', val)
})

// Form ref
const personalFormRef = ref<FormInstance>()

// Current step (1: Info, 2: Quiz, 3: Date, 4: Rejected, 5: Success)
const currentStep = ref(1)
const currentQuestion = ref(0)

// Form data
const formData = ref<ApplicationFormData>({
	fullName: '',
	phone: '',
	email: '',
	age: '',
	jobPosition: props.selectedJob || '',
	hasCV: false,
	cvFile: null
})

// DISC answers
const discAnswers = ref<DiscAnswers>({})

// Date selection
const showDatePicker = ref(false)
const selectedDate = ref('')
const selectedSlots = ref<string[]>([])
const availableSlots = ref<InterviewSlot[]>([])

// Form validation rules
const personalFormRules: FormRules = {
	fullName: [{ required: true, message: 'Fulde navn er pakravet', trigger: 'blur' }],
	phone: [{ required: true, message: 'Telefonnummer er pakravet', trigger: 'blur' }],
	email: [
		{ required: true, message: 'E-mail er pakravet', trigger: 'blur' },
		{ type: 'email', message: 'Indtast en gyldig e-mail', trigger: 'blur' }
	],
	age: [{ required: true, message: 'Alder er pakravet', trigger: 'change' }],
	jobPosition: [{ required: true, message: 'Valg venligst en stilling', trigger: 'change' }]
}

// Steps configuration
const steps = [
	{ id: 1, label: 'Info', icon: shallowRef(User) },
	{ id: 2, label: 'Quiz', icon: shallowRef(Edit) },
	{ id: 3, label: 'Dato', icon: shallowRef(Calendar) },
	{ id: 4, label: 'Send', icon: shallowRef(Message) }
]

// Watch for selected job from props
watch(
	() => props.selectedJob,
	(newJob) => {
		if (newJob) {
			formData.value.jobPosition = newJob
		}
	}
)

// Computed: Can proceed to next step
const canProceed = computed(() => {
	if (currentStep.value === 1) {
		return (
			formData.value.fullName &&
			formData.value.phone &&
			formData.value.email &&
			formData.value.age &&
			formData.value.jobPosition
		)
	}
	if (currentStep.value === 2) {
		return discAnswers.value[currentQuestion.value] !== undefined
	}
	if (currentStep.value === 3) {
		return selectedSlots.value.length === 2
	}
	return true
})

// Check if option is selected
const isOptionSelected = (questionId: number, option: DiscOption): boolean => {
	const answer = discAnswers.value[questionId]
	return answer?.profile === option.profile
}

// Select DISC option
const selectOption = (questionId: number, option: DiscOption) => {
	discAnswers.value[questionId] = {
		profile: option.profile,
		points: option.points
	}
}

// Calculate DISC result
const calculateDiscResult = (): DiscResult => {
	const profileScores: { D: number; I: number; S: number; C: number } = { D: 0, I: 0, S: 0, C: 0 }
	let totalPoints = 0

	Object.values(discAnswers.value).forEach((answer: { profile: DiscProfile; points: number }) => {
		profileScores[answer.profile] += answer.points
		totalPoints += answer.points
	})

	const dominantProfile = (Object.keys(profileScores) as Array<keyof typeof profileScores>).reduce((a, b) =>
		profileScores[a] > profileScores[b] ? a : b
	)

	return {
		totalPoints,
		isQualified: totalPoints >= QUALIFICATION_THRESHOLD,
		dominantProfile,
		profileScores
	}
}

// Handle file change
const handleFileChange = (file: UploadFile) => {
	formData.value.cvFile = file.raw || null
}

// Slot selection helpers
const isSlotSelected = (slotId: string): boolean => {
	return selectedSlots.value.includes(slotId)
}

const getSlotChoiceNumber = (slotId: string): number => {
	return selectedSlots.value.indexOf(slotId) + 1
}

const toggleSlot = (slot: InterviewSlot) => {
	if (slot.isBooked) return

	const index = selectedSlots.value.indexOf(slot.id)
	if (index > -1) {
		selectedSlots.value.splice(index, 1)
	} else if (selectedSlots.value.length < 2) {
		selectedSlots.value.push(slot.id)
	}
}

// Load available slots
const loadAvailableSlots = async () => {
	try {
		const response = await api.get('/interview-slots')
		availableSlots.value = response.data.filter((slot: InterviewSlot) => !slot.isBooked)
	} catch {
		// Mock data if API fails
		availableSlots.value = [
			{ id: '1', date: '2024-04-22', time: '8:30', type: 'fysisk', isBooked: false },
			{ id: '2', date: '2024-04-22', time: '9:30', type: 'virtuel', isBooked: false },
			{ id: '3', date: '2024-04-22', time: '10:30', type: 'fysisk', isBooked: false },
			{ id: '4', date: '2024-04-22', time: '13:30', type: 'fysisk', isBooked: false },
			{ id: '5', date: '2024-04-22', time: '15:30', type: 'virtuel', isBooked: false },
			{ id: '6', date: '2024-04-22', time: '20:30', type: 'fysisk', isBooked: false }
		]
	}
}

// Submit application
const submitApplication = async () => {
	const discResult = calculateDiscResult()

	const applicationData = new FormData()
	applicationData.append('fullName', formData.value.fullName)
	applicationData.append('phone', formData.value.phone)
	applicationData.append('email', formData.value.email)
	applicationData.append('age', formData.value.age)
	applicationData.append('jobPosition', formData.value.jobPosition)
	applicationData.append('discResult', JSON.stringify(discResult))
	applicationData.append('selectedSlots', JSON.stringify(selectedSlots.value))

	if (formData.value.cvFile) {
		applicationData.append('cv', formData.value.cvFile)
	}

	try {
		await api.post('/apply', applicationData, {
			headers: { 'Content-Type': 'multipart/form-data' }
		})
	} catch (error) {
		console.error('Failed to submit application:', error)
	}
}

// Navigation
const nextStep = async () => {
	if (currentStep.value === 1) {
		// Validate form
		const valid = await personalFormRef.value?.validate().catch(() => false)
		if (!valid) return
		currentStep.value = 2
	} else if (currentStep.value === 2) {
		// Handle quiz navigation
		if (currentQuestion.value < discQuestions.length - 1) {
			currentQuestion.value++
		} else {
			// Quiz completed - check qualification
			const result = calculateDiscResult()
			if (result.isQualified) {
				currentStep.value = 3
				loadAvailableSlots()
			} else {
				currentStep.value = 4
				submitApplication()
			}
		}
	} else if (currentStep.value === 3) {
		// Submit and show success
		await submitApplication()
		currentStep.value = 5
	}
}

const previousStep = () => {
	if (currentStep.value === 2 && currentQuestion.value > 0) {
		currentQuestion.value--
	} else if (currentStep.value > 1) {
		currentStep.value--
	}
}

// Reset and close
const handleClose = () => {
	currentStep.value = 1
	currentQuestion.value = 0
	formData.value = {
		fullName: '',
		phone: '',
		email: '',
		age: '',
		jobPosition: '',
		hasCV: false,
		cvFile: null
	}
	discAnswers.value = {}
	selectedSlots.value = []
	selectedDate.value = ''
	emit('close')
}
</script>

<style lang="scss" scoped>
.application-modal {
	&__header {
		position: relative;
	}

	&__close {
		position: absolute;
		top: -40px;
		right: -20px;
		background-color: $color-light-gray;
		border: none;
		border-radius: 0 0 0 $border-radius-lg;
		padding: $spacing-md;
		cursor: pointer;
		box-shadow: $shadow-modal;

		&:hover {
			background-color: #dedede; // Slightly darker than $color-light-gray
		}
	}

	&__content {
		min-height: 400px;

		@media (max-width: $breakpoint-md) {
			max-height: calc($modal-max-height-mobile - 150px);
			overflow-y: auto;
		}
	}

	&__step {
		@include flex-column;
		gap: $spacing-lg;

		&--centered {
			align-items: center;
			text-align: center;
			justify-content: center;
			padding: $spacing-xl 0;
		}
	}

	&__title {
		@include title-font;
	}

	&__description {
		@include body-font;
	}

	&__form {
		@include flex-column;
		gap: $spacing-sm;
	}

	&__cv-row {
		display: flex;
		gap: $spacing-md;
	}

	&__cv-toggle {
		@include flex-center;
		gap: $spacing-sm;
		flex: 1;
	}

	&__cv-upload {
		flex: 1;
	}

	&__cv-label {
		@include body-font;
	}

	&__cv-hint {
		@include body-font;
	}

	// Quiz options
	&__options {
		@include flex-column;
		gap: $spacing-sm;
	}

	&__option {
		@include body-font;
		text-align: left;
		padding: $spacing-md;
		border: 1px solid $color-dark-gray;
		border-radius: $border-radius-sm;
		background-color: $color-white;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			background-color: $color-light-gray;
		}

		&--selected {
			background-color: $color-dark-gray;
			color: $color-white;
		}
	}

	&__progress {
		@include body-bold-font;
		text-align: center;
	}

	// Date selection
	&__date-section {
		@include flex-column;
		gap: $spacing-md;
	}

	&__date-header {
		@include flex-between;
	}

	&__date-title {
		@include subtitle-font;
	}

	&__slots {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: $spacing-md;
	}

	&__slot {
		@include flex-column;
		@include flex-center;
		gap: $spacing-sm;
		padding: $spacing-md;
		border: 2px solid $color-dark-gray;
		border-radius: $border-radius-md;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;

		&:hover:not(&--disabled) {
			background-color: $color-light-gray;
		}

		&--selected {
			background-color: $color-dark-gray;
			color: $color-white;
		}

		&--disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	&__slot-time {
		@include body-bold-font;
	}

	&__slot-type {
		@include body-font;
		padding: $spacing-xs $spacing-sm;
		border: 1px solid currentColor;
		border-radius: $border-radius-sm;
	}

	&__slot-choice {
		position: absolute;
		top: -8px;
		right: -8px;
		background-color: $color-gray;
		color: $color-dark-gray;
		padding: 2px 6px;
		border-radius: $border-radius-sm;
		font-size: $font-size-small;
	}

	&__slots-count {
		@include body-bold-font;
		text-align: center;
	}

	// Result icons
	&__result-icon {
		margin-bottom: $spacing-md;

		&--success {
			color: #67c23a;
		}

		&--warning {
			color: $color-yellow;
		}
	}

	// Stepper
	&__stepper {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: $spacing-lg;
		position: relative;
	}

	&__stepper-step {
		@include flex-column;
		@include flex-center;
		gap: $spacing-sm;
		z-index: 1;
	}

	&__stepper-icon {
		@include flex-center;
		width: 32px;
		height: 32px;
		border: 1px solid $color-dark-gray;
		border-radius: $border-radius-md;
		background-color: $color-white;
		transition: all 0.2s ease;

		.application-modal__stepper-step--active & {
			background-color: $color-white;
			border-color: $color-dark-gray;
		}

		.application-modal__stepper-step--completed & {
			background-color: $color-dark-gray;
			color: $color-white;
		}
	}

	&__stepper-label {
		@include body-font;
	}

	&__stepper-connector {
		position: absolute;
		top: 16px;
		height: 4px;
		background-color: $color-dark-gray;
		opacity: 0.5;
		border-radius: 5px;

		&:nth-of-type(1) {
			left: calc(12.5% + 16px);
			width: calc(25% - 32px);
		}

		&:nth-of-type(2) {
			left: calc(37.5% + 16px);
			width: calc(25% - 32px);
		}

		&:nth-of-type(3) {
			left: calc(62.5% + 16px);
			width: calc(25% - 32px);
		}

		&--completed {
			opacity: 1;
		}
	}

	// Actions
	&__actions {
		display: flex;
		gap: $spacing-md;
	}

	&__btn-prev,
	&__btn-next {
		flex: 1;
		height: 50px;
	}

	&__btn-next {
		@include button-primary;
	}

	&__btn-close {
		@include button-primary;
		width: 100%;
		height: 50px;
	}
}

// Dialog overrides
:deep(.el-dialog) {
	border-radius: $border-radius-lg;
	box-shadow: $shadow-modal;
	overflow: visible;
}

:deep(.el-dialog__header) {
	padding: $spacing-md;
	margin: 0;
}

:deep(.el-dialog__body) {
	padding: $spacing-md;
}

:deep(.el-dialog__footer) {
	padding: $spacing-md;
}

:deep(.el-form-item__label) {
	@include body-font;
}
</style>
