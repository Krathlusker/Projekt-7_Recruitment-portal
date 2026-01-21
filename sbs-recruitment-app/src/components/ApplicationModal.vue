<template>
	<Transition name="modal">
		<div v-if="dialogVisible" class="modal-wrapper">
			<div class="modal-wrapper__backdrop"></div>
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
						<Transition :name="slideDirection" mode="out-in">
							<div :key="currentStep" class="application-modal__content">
								<!-- Step 1: Personal Information -->
								<div v-if="currentStep === 1" class="application-modal__step">
									<h2 class="application-modal__title">Hvem er du?</h2>
									<p class="application-modal__description">
										Vi vil rigtig gerne vide hvem du er, derfor beder vi om at du udfylder de generelle info om dig, og svarer på
										de følgende 5 spørgsmål. Så er det bare lidt lettere at lære hinanden at kende.
									</p>

				<el-form
					ref="personalFormRef"
					:model="formData"
					:rules="personalFormRules"
					label-position="top"
					class="application-modal__form"
				>
					<el-form-item label="Fulde navn" prop="fullName" required>
						<el-input v-model="formData.fullName" placeholder="Skriv her..." />
					</el-form-item>

					<el-form-item label="Telefonnummer" prop="phone" required>
						<el-input v-model="formData.phone" placeholder="Skriv her..." />
					</el-form-item>

					<el-form-item label="E-mail" prop="email" required>
						<el-input v-model="formData.email" placeholder="Skriv her..." />
					</el-form-item>

					<el-form-item label="Alder (valgfri)" prop="age">
						<el-tooltip
							:visible="isAgeFocused"
							content="Det er ikke et krav at oplyse din alder. Hvis du ikke ønsker at dele dette, er det helt fint."
							placement="top"
							effect="light"
							popper-class="age-hint-tooltip"
						>
							<el-select
								v-model="formData.age"
								placeholder="Vælg her..."
								style="width: 100%"
								clearable
							@focus="isAgeFocused = true"
							@visible-change="handleAgeVisibleChange"
						>
							<el-option v-for="age in ageOptions" :key="age" :label="`${age} år`" :value="age.toString()" />
						</el-select>
					</el-tooltip>
				</el-form-item>

				<el-form-item label="Hvilket job ønsker du at søge?" prop="jobPosition">
					<el-select v-model="formData.jobPosition" placeholder="Select option" style="width: 100%">
						<el-option label="Pakkeriet" value="pakkeriet" />
						<el-option label="Produktion" value="produktion" />
						<el-option label="Andre stillinger" value="andre" />
					</el-select>
				</el-form-item>

					<div class="application-modal__cv-row">
						<div class="application-modal__cv-toggle">
							<span class="application-modal__cv-label">Vedhæft CV?</span>
							<el-switch v-model="formData.hasCV" />
							<span class="application-modal__cv-hint">{{ formData.hasCV ? 'Ja' : 'Nej' }}</span>
						</div>

						<div v-if="formData.hasCV" class="application-modal__cv-upload">
							<el-upload
								ref="uploadRef"
								:auto-upload="false"
								:limit="1"
								accept=".pdf,.doc,.docx"
								drag
								@change="handleFileChange"
							>
								<span class="application-modal__cv-dropzone-text">
									{{ formData.cvFile ? formData.cvFile.name : 'Træk fil hertil eller klik for at uploade' }}
								</span>
							</el-upload>
						</div>
					</div>
				</el-form>
			</div>

			<!-- Step 2: DISC Quiz -->
			<div v-else-if="currentStep === 2" class="application-modal__step application-modal__step--quiz">
				<h2 class="application-modal__title">Quiz</h2>

				<!-- Progress bar -->
				<div class="application-modal__quiz-progress">
					<span class="application-modal__quiz-progress-text">{{ currentQuestion + 1 }} af {{ discQuestions.length }}</span>
					<div class="application-modal__quiz-progress-bar">
						<div
							class="application-modal__quiz-progress-fill"
							:style="{ width: ((currentQuestion + 1) / discQuestions.length * 100) + '%' }"
						></div>
					</div>
				</div>

				<!-- Question -->
				<p class="application-modal__quiz-question">
					{{ discQuestions[currentQuestion].question }}
				</p>

				<!-- Radio options -->
				<div class="application-modal__quiz-options">
					<label
						v-for="(option, index) in discQuestions[currentQuestion].options"
						:key="index"
						class="application-modal__quiz-option"
						:class="{ 'application-modal__quiz-option--selected': isOptionSelected(currentQuestion, option) }"
					>
						<input
							type="radio"
							:name="'question-' + currentQuestion"
							:checked="isOptionSelected(currentQuestion, option)"
							@change="selectOption(currentQuestion, option)"
							class="application-modal__quiz-radio"
						/>
						<span class="application-modal__quiz-option-text">{{ option.text }}</span>
					</label>
				</div>
			</div>

			<!-- Step 3: Date Selection (Qualified) -->
			<div v-else-if="currentStep === 3" class="application-modal__step">
				<h2 class="application-modal__title">Din ønskede tid</h2>
				<p class="application-modal__description">
					Her kan du vælge 2 tidspunkter på de dage vi holder samtaler, og selv passe din aftale ind i din hverdag.
				</p>

				<div class="application-modal__date-section">
					<!-- Date header with selected date and button -->
					<div class="application-modal__date-header">
						<span class="application-modal__date-display">{{ selectedDate ? formatShortDate(selectedDate) : 'Ingen dato valgt' }}</span>
						<button class="application-modal__date-btn" @click="openCalendarModal">
							<el-icon><Calendar /></el-icon>
							<span>VÆLG DATO</span>
						</button>
					</div>

					<!-- Time slots for selected date -->
					<div v-if="selectedDate && availableSlots.length > 0" class="application-modal__slots">
						<div
							v-for="slot in availableSlots"
							:key="slot.id"
							class="application-modal__slot"
							:class="{
								'application-modal__slot--selected': isSlotSelected(slot.id),
								'application-modal__slot--disabled': slot.isBooked || (slot.reservedBy && slot.reservedBy !== sessionId) || (selectedSlots.length >= 2 && !isSlotSelected(slot.id)),
								'application-modal__slot--reserved': slot.reservedBy && slot.reservedBy !== sessionId && !slot.isBooked
							}"
							@click="toggleSlot(slot)"
						>
							<span class="application-modal__slot-time">{{ slot.time }}</span>
							<span class="application-modal__slot-type">{{ slot.type === 'fysisk' ? 'Fysisk' : 'Virtuel' }}</span>
							<span v-if="isSlotSelected(slot.id)" class="application-modal__slot-choice">
								{{ getSlotChoiceNumber(slot.id) }}. valg
							</span>
							<span v-else-if="slot.reservedBy && slot.reservedBy !== sessionId && !slot.isBooked" class="application-modal__slot-reserved-label">
								Reserveret
							</span>
						</div>
					</div>

					<!-- No date selected message -->
					<div v-else-if="!selectedDate" class="application-modal__no-date">
						<p>Tryk på "VÆLG DATO" for at vælge en samtaledag</p>
					</div>

					<!-- No slots available message -->
					<div v-else-if="selectedDate && availableSlots.length === 0" class="application-modal__no-slots">
						<p>Ingen ledige tider på denne dato</p>
					</div>

					<div class="application-modal__slots-count">Valgt: {{ selectedSlots.length }} af 2</div>
				</div>
			</div>

			<!-- Step 4: Send Confirmation -->
			<div v-else-if="currentStep === 4" class="application-modal__step application-modal__step--centered">
				<el-icon :size="64" class="application-modal__result-icon">
					<Message />
				</el-icon>
				<h2 class="application-modal__title">Klar til at sende?</h2>
				<p class="application-modal__description">
					Du er nu klar til at sende din ansøgning. Tryk på "Send" for at indsende.
				</p>
				<p class="application-modal__description">
					Du kan gå tilbage og ændre dine oplysninger inden du sender.
				</p>
			</div>

			<!-- Step 5: Not Qualified -->
			<div v-else-if="currentStep === 5" class="application-modal__step application-modal__step--centered">
				<el-icon :size="64" class="application-modal__result-icon application-modal__result-icon--warning">
					<WarningFilled />
				</el-icon>
				<h2 class="application-modal__title">Tak for din interesse</h2>
				<p class="application-modal__description">
					Desværre matcher din profil ikke det vi søger lige nu. Vi gemmer din ansøgning og kontakter dig, hvis der
					åbner sig en passende mulighed.
				</p>
				<p class="application-modal__description">Du er altid velkommen til at søge igen på et senere tidspunkt.</p>
			</div>

			<!-- Step 6: Success -->
			<div v-else-if="currentStep === 6" class="application-modal__step application-modal__step--centered">
				<el-icon :size="64" class="application-modal__result-icon application-modal__result-icon--success">
					<SuccessFilled />
				</el-icon>
				<h2 class="application-modal__title">Tak for din ansøgning</h2>
				<p class="application-modal__description">
					Vi har modtaget din ansøgning og dine ønsker til samtaletider. Du vil modtage en bekræftelse på mail med de
					endelige detaljer.
				</p>
				<p class="application-modal__description">Vi glæder os til at møde dig!</p>
			</div>

					</div>
						</Transition>
					</OverlayScrollbarsComponent>

						<!-- Stepper (outside Transition for fixed position) -->
						<div class="application-modal__footer">
							<div class="application-modal__stepper">
								<div
									v-for="step in steps"
									:key="step.id"
									class="application-modal__stepper-step"
									:class="{
										'application-modal__stepper-step--active': currentStep === step.id && currentStep < 5,
										'application-modal__stepper-step--completed': highestStepReached > step.id || currentStep >= 5
									}"
									@click="goToStep(step.id)"
								>
									<div class="application-modal__stepper-icon-wrapper">
										<div class="application-modal__stepper-icon">
											<el-icon v-if="highestStepReached > step.id || currentStep >= 5">
												<Check />
											</el-icon>
											<el-icon v-else>
												<component :is="step.icon" />
											</el-icon>
										</div>
									</div>
									<span class="application-modal__stepper-label">{{ step.label }}</span>
								</div>
								<div
									v-for="i in 3"
									:key="'connector-' + i"
									class="application-modal__stepper-connector"
									:class="{ 'application-modal__stepper-connector--completed': highestStepReached > i || currentStep >= 5 }"
								/>
							</div>
						</div>
					</div>

					<!-- Navigation Buttons (outside modal, below) -->
					<div v-if="currentStep < 4" class="modal-wrapper__actions">
						<!-- During quiz (step 2+): show back arrow, otherwise show X (rotated) -->
						<button v-if="currentStep > 1" @click="previousStep" class="modal-nav-btn modal-nav-btn--dark">
							<el-icon :size="24">
								<ArrowLeft />
							</el-icon>
						</button>
						<button v-else @click="handleClose" class="modal-nav-btn modal-nav-btn--dark modal-nav-btn--close">
							<el-icon :size="24">
								<Plus />
							</el-icon>
						</button>
						<button @click="nextStep" :disabled="!canProceed" class="modal-nav-btn modal-nav-btn--yellow">
							<el-icon :size="24">
								<ArrowRight />
							</el-icon>
						</button>
					</div>

					<!-- Step 4: Send step with Send button -->
					<div v-else-if="currentStep === 4" class="modal-wrapper__actions">
						<button @click="previousStep" class="modal-nav-btn modal-nav-btn--dark">
							<el-icon :size="24">
								<ArrowLeft />
							</el-icon>
						</button>
						<button @click="handleSubmit" class="modal-nav-btn modal-nav-btn--yellow">
							Send
						</button>
					</div>

					<!-- Step 5: Not Qualified -->
					<div v-else-if="currentStep === 5" class="modal-wrapper__actions">
						<button @click="handleClose" class="modal-nav-btn modal-nav-btn--dark modal-nav-btn--full">
							Luk
						</button>
					</div>

					<!-- Step 6: Success with Færdig button -->
					<div v-else-if="currentStep === 6" class="modal-wrapper__actions">
						<button @click="handleClose" class="modal-nav-btn modal-nav-btn--yellow modal-nav-btn--full">
							Færdig
						</button>
					</div>
		</div>
	</Transition>

	<!-- Calendar Modal (separate overlay, outside main modal transition) -->
	<Transition name="calendar-modal">
		<div v-if="calendarModalVisible" class="calendar-modal-overlay" @click.self="closeCalendarModal">
			<div class="calendar-modal">
				<div class="calendar-modal__content">
					<div class="calendar-modal__header">
						<Transition :name="calendarSlideDirection" mode="out-in">
							<span :key="calendarKey" class="calendar-modal__title">{{ formatMonthYear('') }}</span>
						</Transition>
						<Transition name="fade" mode="out-in">
							<button v-if="!isCurrentMonth" key="today-btn" class="calendar-modal__today-btn" @click="goToToday">I dag</button>
							<span v-else key="today-placeholder" class="calendar-modal__today-placeholder"></span>
						</Transition>
						<div class="calendar-modal__controls">
							<Transition name="fade" mode="out-in">
								<button v-if="!isCurrentMonth" key="prev-btn" class="calendar-modal__nav" @click="prevMonth">
									<el-icon><ArrowLeft /></el-icon>
								</button>
								<span v-else key="prev-placeholder" class="calendar-modal__nav-placeholder"></span>
							</Transition>
							<button class="calendar-modal__nav" @click="nextMonth">
								<el-icon><ArrowRight /></el-icon>
							</button>
						</div>
					</div>
					<div class="calendar-modal__calendar-wrapper">
						<Transition :name="calendarSlideDirection" mode="out-in">
							<el-calendar
								v-model="calendarDate"
								class="calendar-modal__calendar"
								:key="calendarKey"
							>
								<template #header>
									<span></span>
								</template>
								<template #date-cell="{ data }">
									<div
										class="calendar-modal__day"
										:class="{
											'calendar-modal__day--has-slots': hasTimeSlotsOnDate(data.day) && !isDateInPast(data.day),
											'calendar-modal__day--selected': selectedDate === data.day && hasTimeSlotsOnDate(data.day) && !isDateInPast(data.day),
											'calendar-modal__day--disabled': !hasTimeSlotsOnDate(data.day) || isDateInPast(data.day),
											'calendar-modal__day--other-month': isOtherMonth(data.day) || isDateInPast(data.day),
											'calendar-modal__day--today': isToday(data.day)
										}"
										@click.stop="selectDateAndClose(data.day)"
									>
										{{ parseInt(data.day.split('-')[2]) }}
									</div>
								</template>
							</el-calendar>
						</Transition>
					</div>
				</div>
			</div>
		</div>
	</Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'
import ModalCloseButton from '@/components/ModalCloseButton.vue'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import {
	Plus,
	Check,
	ArrowRight,
	ArrowLeft,
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

// Generate unique session ID for this user's session
const generateSessionId = (): string => {
	return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
}

const sessionId = ref(generateSessionId())

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

// Lås/frigiv body scroll når modal åbner/lukker
watch(() => props.visible, (newVal) => {
	if (newVal) {
		const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
		document.body.style.overflow = 'hidden'
		document.body.style.paddingRight = `${scrollbarWidth}px`
		document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`)
	} else {
		document.body.style.overflow = ''
		document.body.style.paddingRight = ''
		document.documentElement.style.setProperty('--scrollbar-width', '0px')
		// Release reservations when modal closes
		stopPolling()
		releaseAllReservations()
	}
})

// Form ref
const personalFormRef = ref<FormInstance>()

// Current step (1: Info, 2: Quiz, 3: Date, 4: Rejected, 5: Success)
const currentStep = ref(1)
const currentQuestion = ref(0)
const highestStepReached = ref(1)

// Slide direction for step transitions
const slideDirection = ref<'slide-left' | 'slide-right'>('slide-left')

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

// Focus state for age field
const isAgeFocused = ref(false)

// DISC answers
const discAnswers = ref<DiscAnswers>({})

// Date selection
const selectedDate = ref('')
const selectedSlots = ref<string[]>([])
const availableSlots = ref<InterviewSlot[]>([])
const calendarDate = ref(new Date())
const allTimeSlots = ref<InterviewSlot[]>([])
const calendarModalVisible = ref(false)
const calendarSlideDirection = ref<'calendar-slide-left' | 'calendar-slide-right'>('calendar-slide-left')

// Calendar key for transition - changes when month changes
const calendarKey = computed(() => {
	return `${calendarDate.value.getFullYear()}-${calendarDate.value.getMonth()}`
})

// Polling interval for live slot updates
let pollingInterval: ReturnType<typeof setInterval> | null = null
const POLLING_INTERVAL_MS = 3000 // Poll every 3 seconds

// Start polling for slot updates
const startPolling = () => {
	if (pollingInterval) return
	pollingInterval = setInterval(() => {
		loadAvailableSlots()
	}, POLLING_INTERVAL_MS)
}

// Stop polling
const stopPolling = () => {
	if (pollingInterval) {
		clearInterval(pollingInterval)
		pollingInterval = null
	}
}

// Release all reservations for this session
const releaseAllReservations = async () => {
	try {
		await api.post('/interview-slots/release-all', { sessionId: sessionId.value })
	} catch (error) {
		console.error('Failed to release all reservations:', error)
	}
}

// Handle window/tab close - release reservations
const handleBeforeUnload = () => {
	// Use sendBeacon for reliable cleanup on page unload
	const data = JSON.stringify({ sessionId: sessionId.value })
	navigator.sendBeacon(`${api.defaults.baseURL}/interview-slots/release-all`, new Blob([data], { type: 'application/json' }))
}

// Setup and cleanup
onMounted(() => {
	window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
	stopPolling()
	window.removeEventListener('beforeunload', handleBeforeUnload)
	releaseAllReservations()
})

// Age options from 16 to 99
const ageOptions = Array.from({ length: 84 }, (_, i) => i + 16)

const handleAgeVisibleChange = (visible: boolean) => {
	isAgeFocused.value = visible
}

// Form validation rules
const personalFormRules: FormRules = {
	fullName: [{ required: true, message: 'Fulde navn er påkrævet', trigger: 'submit' }],
	phone: [{ required: true, message: 'Telefonnummer er påkrævet', trigger: 'submit' }],
	email: [
		{ required: true, message: 'E-mail er påkrævet', trigger: 'submit' },
		{ type: 'email', message: 'Indtast en gyldig e-mail', trigger: 'submit' }
	],
	jobPosition: [{ required: true, message: 'Vælg venligst en stilling', trigger: 'change' }]
}

// Steps configuration
const steps = [
	{ id: 1, label: 'Info', icon: User },
	{ id: 2, label: 'Quiz', icon: Edit },
	{ id: 3, label: 'Dato', icon: Calendar },
	{ id: 4, label: 'Send', icon: Message }
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

const toggleSlot = async (slot: InterviewSlot) => {
	// Check if slot is booked (permanent)
	if (slot.isBooked) return

	const index = selectedSlots.value.indexOf(slot.id)
	if (index > -1) {
		// Deselecting - release reservation
		selectedSlots.value.splice(index, 1)
		try {
			await api.post(`/interview-slots/${slot.id}/release`, { sessionId: sessionId.value })
			// Refresh slots to show updated status
			await loadAvailableSlots()
		} catch (error) {
			console.error('Failed to release slot reservation:', error)
		}
	} else if (selectedSlots.value.length < 2) {
		// Selecting - try to reserve (let server decide if available)
		try {
			await api.post(`/interview-slots/${slot.id}/reserve`, { sessionId: sessionId.value })
			selectedSlots.value.push(slot.id)
			// Refresh slots to get updated reservation status
			await loadAvailableSlots()
		} catch (error: unknown) {
			// Slot may have been reserved/booked by another user
			console.error('Failed to reserve slot:', error)
			// Refresh to show updated status
			await loadAvailableSlots()
		}
	}
}

// Load available slots
const loadAvailableSlots = async () => {
	try {
		const response = await api.get('/interview-slots')
		allTimeSlots.value = response.data
		// Update available slots if a date is selected (exclude booked and held slots)
		if (selectedDate.value) {
			availableSlots.value = allTimeSlots.value.filter((slot) => slot.date === selectedDate.value && !slot.isBooked && !slot.heldBy)
		}
	} catch {
		// Mock data if API fails
		allTimeSlots.value = [
			{ id: '1', date: '2024-04-22', time: '8:30', type: 'fysisk', isBooked: false },
			{ id: '2', date: '2024-04-22', time: '9:30', type: 'virtuel', isBooked: false },
			{ id: '3', date: '2024-04-22', time: '10:30', type: 'fysisk', isBooked: false },
			{ id: '4', date: '2024-04-22', time: '13:30', type: 'fysisk', isBooked: false },
			{ id: '5', date: '2024-04-22', time: '15:30', type: 'virtuel', isBooked: false },
			{ id: '6', date: '2024-04-22', time: '20:30', type: 'fysisk', isBooked: false }
		]
		// Don't populate availableSlots yet - wait for user to select a date
		availableSlots.value = []
	}
}

// Calendar functions
const hasTimeSlotsOnDate = (date: string): boolean => {
	return getAvailableTimeSlotsForDate(date).length > 0
}

const getAvailableTimeSlotsForDate = (date: string): InterviewSlot[] => {
	return allTimeSlots.value.filter((slot) => slot.date === date && !slot.isBooked && !slot.heldBy)
}

const isDateInPast = (dateString: string): boolean => {
	const date = new Date(dateString)
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	return date < today
}

const isToday = (dateString: string): boolean => {
	const date = new Date(dateString)
	const today = new Date()
	return date.toDateString() === today.toDateString()
}

// Check if calendar is showing the current month
const isCurrentMonth = computed(() => {
	const now = new Date()
	return calendarDate.value.getMonth() === now.getMonth() &&
		   calendarDate.value.getFullYear() === now.getFullYear()
})

// Calendar navigation functions
const formatMonthYear = (_dateString: string): string => {
	// Element Plus passes date string in format like "2026-01-21" or "January 2026"
	// Use the calendarDate ref directly for reliable formatting
	return calendarDate.value.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })
}

const prevMonth = () => {
	// Don't allow navigating before current month
	if (isCurrentMonth.value) return

	calendarSlideDirection.value = 'calendar-slide-right'
	const current = new Date(calendarDate.value)
	current.setMonth(current.getMonth() - 1)
	calendarDate.value = current
}

const nextMonth = () => {
	calendarSlideDirection.value = 'calendar-slide-left'
	const current = new Date(calendarDate.value)
	current.setMonth(current.getMonth() + 1)
	calendarDate.value = current
}

const goToToday = () => {
	const today = new Date()
	const currentMonth = calendarDate.value.getMonth()
	const todayMonth = today.getMonth()

	if (todayMonth > currentMonth || today.getFullYear() > calendarDate.value.getFullYear()) {
		calendarSlideDirection.value = 'calendar-slide-left'
	} else if (todayMonth < currentMonth || today.getFullYear() < calendarDate.value.getFullYear()) {
		calendarSlideDirection.value = 'calendar-slide-right'
	}

	calendarDate.value = today
}

// Calendar modal functions
const openCalendarModal = () => {
	calendarModalVisible.value = true
}

const closeCalendarModal = () => {
	calendarModalVisible.value = false
}

const selectDateAndClose = (date: string) => {
	const availableOnDate = getAvailableTimeSlotsForDate(date)
	if (availableOnDate.length > 0) {
		selectedDate.value = date
		// Filter out booked and held slots - only show available and reserved slots
		availableSlots.value = allTimeSlots.value.filter((slot) => slot.date === date && !slot.isBooked && !slot.heldBy)
		closeCalendarModal()
	}
}

const isOtherMonth = (dateString: string): boolean => {
	const date = new Date(dateString)
	const currentMonth = calendarDate.value.getMonth()
	return date.getMonth() !== currentMonth
}

const formatShortDate = (dateString: string): string => {
	const date = new Date(dateString)
	return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })
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
	slideDirection.value = 'slide-left'
	if (currentStep.value === 1) {
		// Validate form
		const valid = await personalFormRef.value?.validate().catch(() => false)
		if (!valid) return
		currentStep.value = 2
		highestStepReached.value = Math.max(highestStepReached.value, 2)
	} else if (currentStep.value === 2) {
		// Handle quiz navigation
		if (currentQuestion.value < discQuestions.length - 1) {
			currentQuestion.value++
		} else {
			// Quiz completed - check qualification
			const result = calculateDiscResult()
			if (result.isQualified) {
				currentStep.value = 3
				highestStepReached.value = Math.max(highestStepReached.value, 3)
				loadAvailableSlots()
				startPolling() // Start polling for live slot updates
			} else {
				// Not qualified - go to rejection page
				currentStep.value = 5
				submitApplication()
			}
		}
	} else if (currentStep.value === 3) {
		// Go to Send confirmation step
		stopPolling() // Stop polling when leaving date selection
		currentStep.value = 4
		highestStepReached.value = Math.max(highestStepReached.value, 4)
	}
}

const previousStep = () => {
	slideDirection.value = 'slide-right'
	if (currentStep.value === 2 && currentQuestion.value > 0) {
		currentQuestion.value--
	} else if (currentStep.value > 1) {
		currentStep.value--
	}
}

// Go to specific step
const goToStep = (stepId: number) => {
	// Don't allow navigation on success/fail steps
	if (currentStep.value >= 5) return
	// Don't allow going to steps that haven't been reached yet
	if (stepId > highestStepReached.value) return
	// Don't go to the same step
	if (stepId === currentStep.value) return

	// Stop polling if leaving step 3
	if (currentStep.value === 3 && stepId !== 3) {
		stopPolling()
	}

	// Set animation direction based on target step
	if (stepId < currentStep.value) {
		slideDirection.value = 'slide-right'
	} else {
		slideDirection.value = 'slide-left'
	}

	// Reset quiz to first question when going to quiz step
	if (stepId === 2) {
		currentQuestion.value = 0
	}

	// Load available slots when going to date step
	if (stepId === 3) {
		loadAvailableSlots()
		startPolling() // Start polling for live updates
	}

	currentStep.value = stepId
}

// Handle form submission
const handleSubmit = async () => {
	await submitApplication()
	slideDirection.value = 'slide-left'
	currentStep.value = 6
}

// Reset and close
const handleClose = async () => {
	// Stop polling and release reservations before closing
	stopPolling()
	await releaseAllReservations()

	currentStep.value = 1
	currentQuestion.value = 0
	highestStepReached.value = 1
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
	// Generate new session ID for next session
	sessionId.value = generateSessionId()
	emit('close')
}
</script>

<style lang="scss" scoped>
@use 'sass:color';

.application-modal {
	&__header {
		position: relative;
	}

	&__content {
		flex: 1;
		overflow-y: auto;
	}

	&__step {
		@include flex-column;
		gap: $spacing-sm;

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
	}

	&__cv-row {
		display: flex;
		gap: $spacing-md;
		justify-content: flex-start;
		align-items: center;
		height: 32px;
	}

	&__cv-toggle {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: $spacing-sm;
	}

	&__cv-upload {
		flex: 1;
		margin-left: auto;
		height: 32px;

		:deep(.el-upload) {
			width: 100%;
			height: 100%;
		}

		:deep(.el-upload-dragger) {
			width: 100%;
			height: 32px;
			padding: 0 $spacing-sm;
			display: flex;
			align-items: center;
			justify-content: center;
			border: 1px dashed $color-dark-gray;
			border-radius: $border-radius-sm;
			background-color: transparent;

			&:hover {
				border-color: $color-yellow;
			}
		}
	}

	&__cv-dropzone-text {
		@include body-font;
		font-size: $font-size-small;
		color: $color-dark-gray;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		text-align: center;
	}

	&__cv-label {
		@include body-font;
	}

	&__cv-hint {
		@include body-font;
	}

	// Quiz styles (matching Figma design)
	&__step--quiz {
		gap: $spacing-lg;
	}

	&__quiz-progress {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $spacing-xs;
		width: 100%;
	}

	&__quiz-progress-text {
		@include body-font;
	}

	&__quiz-progress-bar {
		width: 100%;
		height: 8px;
		border: 1px solid $color-dark-gray;
		border-radius: 999px;
		background-color: $color-white;
		overflow: hidden;
	}

	&__quiz-progress-fill {
		height: 100%;
		background-color: $color-dark-gray;
		border-radius: 999px 0 0 999px;
		transition: width 0.3s ease;
	}

	&__quiz-question {
		@include body-font;
		font-size: 16px;
		margin: 0;
	}

	&__quiz-options {
		display: flex;
		flex-direction: column;
		gap: $spacing-sm;
	}

	&__quiz-option {
		display: flex;
		align-items: flex-start;
		gap: $spacing-sm;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			opacity: 0.8;
		}
	}

	&__quiz-radio {
		flex-shrink: 0;
		width: 15px;
		height: 15px;
		margin-top: 2px;
		accent-color: $color-dark-gray;
		cursor: pointer;
	}

	&__quiz-option-text {
		@include body-font;
		line-height: 1.4;
	}

	// Date selection
	&__date-section {
		@include flex-column;
		gap: $spacing-md;
	}

	&__date-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}

	&__date-display {
		@include subtitle-font;
		font-size: 24px;
	}

	&__date-btn {
		display: flex;
		align-items: center;
		gap: $spacing-xs;
		padding: $spacing-sm $spacing-md;
		border: 1px solid $color-dark-gray;
		border-radius: $border-radius-md;
		background-color: $color-dark-gray;
		color: $color-white;
		cursor: pointer;
		font-family: $font-title;
		font-size: 16px;
		font-weight: 500;
		text-transform: uppercase;
		transition: all 0.2s ease;

		.el-icon {
			color: inherit;
		}

		&:hover {
			background-color: color.adjust($color-dark-gray, $lightness: 10%);
		}
	}

	&__no-date,
	&__no-slots {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: $spacing-xl;
		border: 2px dashed $color-light-gray;
		border-radius: $border-radius-md;
		color: $color-dark-gray;
		text-align: center;

		p {
			@include body-font;
			margin: 0;
		}
	}

	&__date-title {
		@include subtitle-font;
	}

	// Calendar styling
	&__calendar-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: $spacing-sm;
		padding: $spacing-md 0;
		width: 100%;
	}

	&__calendar-header-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: $spacing-md;
	}

	&__calendar-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: none;
		border-radius: $border-radius-md;
		background-color: $color-dark-gray;
		color: $color-white;
		cursor: pointer;
		transition: all 0.2s ease;

		.el-icon {
			color: inherit;
		}

		&:hover {
			background-color: color.adjust($color-dark-gray, $lightness: 10%);
		}
	}

	&__calendar-title {
		@include subtitle-font;
		text-transform: capitalize;
		min-width: 180px;
		text-align: center;
	}

	&__calendar-today {
		padding: $spacing-sm $spacing-lg;
		border: none;
		border-radius: $border-radius-md;
		background-color: $color-dark-gray;
		color: $color-white;
		cursor: pointer;
		font-size: $font-size-body;
		font-weight: 500;
		transition: all 0.2s ease;

		&:hover {
			background-color: color.adjust($color-dark-gray, $lightness: 10%);
		}
	}

	&__calendar {
		width: 100%;
		margin-bottom: $spacing-md;

		:deep(.el-calendar__body) {
			padding: 0;
		}

		:deep(.el-calendar-table td) {
			padding: 0;
		}

		:deep(.el-calendar-day) {
			padding: 0;
		}

		:deep(.el-calendar-day:hover) {
			background-color: transparent;
		}

		:deep(.el-calendar-table td.is-today .el-calendar-day) {
			background-color: transparent;
		}

		// Override Element Plus is-selected styling completely
		:deep(.el-calendar-table td.is-selected) {
			background-color: transparent;

			.el-calendar-day {
				background-color: transparent;
			}
		}

		:deep(.el-calendar-table) {
			thead th {
				@include body-font;
				padding: $spacing-sm;
			}

			td {
				border: 1px solid $color-light-gray;
				padding: 0;
			}
		}
	}

	&__calendar-day {
		@include flex-column;
		@include flex-center;
		min-height: 60px;
		width: 100%;
		height: 100%;
		padding: $spacing-sm;
		cursor: pointer;
		transition: all 0.2s ease;
		color: $color-dark-gray;

		&--has-slots {
			background-color: $color-dark-gray;
			color: $color-white;
			font-weight: 600;

			&:hover {
				background-color: $color-light-gray;
				color: $color-dark-gray;
			}
		}

		&--selected {
			background-color: $color-yellow;
			color: $color-dark-gray;

			&:hover {
				background-color: $color-yellow;
				color: $color-dark-gray;
			}
		}

		&--disabled {
			cursor: default;
			color: $color-dark-gray;
			background-color: transparent;
			pointer-events: none;
		}

		&__date {
			@include body-bold-font;
			width: 100%;
			text-align: center;
			color: inherit;
		}

		&__count {
			font-family: $font-body;
			font-weight: $font-weight-regular;
			font-size: $font-size-small;
			line-height: 1.4;
			margin-top: 6px;
			color: currentColor;
			background: transparent;
			padding: 0;
			width: 100%;
			text-align: center;
		}
	}

	&__slots {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: $spacing-md;
	}

	&__slots-title {
		@include subtitle-font;
		margin-bottom: $spacing-sm;
		grid-column: 1 / -1;
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

		&:hover:not(&--disabled):not(&--reserved) {
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

		&--reserved {
			opacity: 0.6;
			cursor: not-allowed;
			border-style: dashed;
			border-color: #f5a623;
			background-color: rgba(245, 166, 35, 0.1);
		}
	}

	&__slot-time {
		@include body-bold-font;
		color: inherit;
	}

	&__slot-type {
		@include body-font;
		padding: $spacing-xs $spacing-sm;
		border: 1px solid currentColor;
		border-radius: $border-radius-sm;
		color: inherit;
	}

	&__slot-choice {
		position: absolute;
		top: -6px;
		right: 0;
		background-color: $color-yellow;
		color: $color-dark-gray;
		padding: 6px 6px;
		border-radius: $border-radius-sm;
		font-size: $font-size-small;
	}

	&__slot-reserved-label {
		position: absolute;
		top: -6px;
		right: 0;
		background-color: #f5a623;
		color: $color-white;
		padding: 4px 8px;
		border-radius: $border-radius-sm;
		font-size: $font-size-small;
		font-weight: 600;
	}

	&__slots-count {
		@include body-bold-font;
		text-align: center;
	}

	// Result icons
	&__result-icon {
		margin-bottom: $spacing-md;

		&--success {
			color: $color-yellow;
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
		position: relative;
		padding-top: $spacing-md;
	}

	&__stepper-step {
		@include flex-column;
		@include flex-center;
		gap: 6px;
		z-index: 1;
		cursor: pointer;
		transition: opacity 0.2s ease;

		&:hover {
			opacity: 0.8;
		}
	}

	&__stepper-icon-wrapper {
		position: relative;
		@include flex-center;
		width: 42px;
		height: 42px;
		border: 2px dashed transparent;
		border-radius: $border-radius-md;
		transition: all 0.2s ease;

		.application-modal__stepper-step--active & {
			border-color: $color-dark-gray;
		}
	}

	&__stepper-icon {
		@include flex-center;
		width: 30px;
		height: 30px;
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
		line-height: 1;
	}

	&__stepper-connector {
		position: absolute;
		top: calc($spacing-md + 21px);
		height: 6px;
		background-color: $color-dark-gray;
		opacity: 0.5;
		border-radius: $border-radius-sm;

		&:nth-of-type(1) {
			left: calc(12.5% + 24px);
			width: calc(25% - 48px);
		}

		&:nth-of-type(2) {
			left: calc(37.5% + 24px);
			width: calc(25% - 48px);
		}

		&:nth-of-type(3) {
			left: calc(62.5% + 24px);
			width: calc(25% - 48px);
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

	&__footer {
		flex-shrink: 0;
	}

}

// Application modal content padding (JobModal har ikke padding)
.modal-wrapper__modal {
	padding: $spacing-md;
}

// Modal wrapper og nav-btn styles er defineret globalt i _global.scss

// Element Plus form styling
:deep(.el-form-item) {
	margin-bottom: $spacing-sm;
}

:deep(.el-form-item__label) {
	@include body-font;
}

:deep(.el-form-item--label-top .el-form-item__label) {
	margin-bottom: 6px;
}

// Required field asterisk styling - after label, red color
:deep(.el-form-item.is-required:not(.is-no-asterisk)) {
	> .el-form-item__label-wrap > .el-form-item__label::before,
	> .el-form-item__label::before {
		content: none !important;
	}

	> .el-form-item__label-wrap > .el-form-item__label::after,
	> .el-form-item__label::after {
		content: ' *';
		color: $color-red;
		font-weight: $font-weight-bold;
	}
}

// Custom tooltip styling for age hint
:deep(.age-hint-tooltip) {
	max-width: 282px;
	font-size: 12px;
	line-height: 1.4;
	font-style: italic;
	box-shadow: $shadow-card;
}

// Calendar Modal Styles
.calendar-modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 3000;
}

.calendar-modal {
	background-color: $color-white;
	border: 1px solid $color-dark-gray;
	border-radius: $border-radius-lg;
	box-shadow: $shadow-modal;
	padding: $spacing-md;
	width: 320px;
	min-width: 320px;
	max-width: 320px;
	height: 400px;
	min-height: 400px;

	&__content {
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	&__header {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		padding-bottom: $spacing-md;
		gap: $spacing-sm;
		width: 100%;
	}

	&__title {
		@include body-font;
		font-size: 14px;
		font-weight: 500;
		text-transform: capitalize;
		white-space: nowrap;
		justify-self: start;
	}

	&__today-btn {
		padding: $spacing-xs $spacing-sm;
		border: none;
		border-radius: $border-radius-sm;
		background-color: $color-dark-gray;
		color: $color-white;
		cursor: pointer;
		font-family: $font-body;
		font-size: 12px;
		font-weight: 500;
		transition: all 0.2s ease;
		justify-self: center;

		&:hover {
			background-color: color.adjust($color-dark-gray, $lightness: 10%);
		}
	}

	&__today-placeholder {
		justify-self: center;
		width: 0;
		height: 0;
	}

	&__controls {
		display: flex;
		gap: 4px;
		justify-self: end;
	}

	&__nav {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: $border-radius-sm;
		background-color: $color-dark-gray;
		color: $color-white;
		cursor: pointer;
		transition: all 0.2s ease;
		padding: 0;

		.el-icon {
			color: inherit;
			font-size: 14px;
		}

		&:hover {
			background-color: color.adjust($color-dark-gray, $lightness: 10%);
		}
	}

	&__nav-placeholder {
		width: 28px;
		height: 28px;
	}

	&__calendar-wrapper {
		position: relative;
		overflow: hidden;
	}

	&__calendar {
		width: 100%;
		border: none;
		height: 300px;
		min-height: 300px;

		:deep(.el-calendar__header) {
			display: none;
		}

		:deep(.el-calendar__body) {
			padding: 0;
		}

		:deep(.el-calendar-table) {
			table-layout: fixed;
			width: 100%;

			thead th {
				@include body-font;
				font-size: 12px;
				padding: $spacing-sm 0;
				text-align: center;
				width: 14.28%;
			}

			td {
				border: none;
				padding: 0;
				width: 14.28%;
				height: 42px;
			}
		}

		// Override ALL Element Plus is-selected and is-today styling
		:deep(.el-calendar-table td.is-today),
		:deep(.el-calendar-table td.is-selected),
		:deep(.el-calendar-table td.is-today.is-selected) {
			background-color: transparent !important;

			.el-calendar-day {
				background-color: transparent !important;
			}
		}

		:deep(.el-calendar-day) {
			padding: 0;
			height: 42px;
			background-color: transparent !important;

			&:hover {
				background-color: transparent !important;
			}
		}
	}

	&__day {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 38px;
		font-family: $font-body;
		font-size: 12px;
		color: $color-dark-gray;
		cursor: default;
		border-radius: $border-radius-sm;
		transition: background-color 0.15s ease, color 0.15s ease;
		background-color: transparent;

		&--today {
			border: 2px solid $color-dark-gray;
		}

		&--has-slots {
			background-color: $color-light-gray;
			cursor: pointer;

			&:hover {
				background-color: $color-dark-gray;
				color: $color-white;
			}
		}

		&--selected#{&}--has-slots {
			background-color: $color-yellow;
			color: $color-dark-gray;

			&:hover {
				background-color: $color-yellow;
				color: $color-dark-gray;
			}
		}

		&--disabled {
			cursor: default;
			pointer-events: none;
			background-color: transparent !important;
		}

		&--other-month {
			opacity: 0.3;
			pointer-events: none;
			background-color: transparent !important;
		}
	}
}

// Calendar modal transitions
.calendar-modal-enter-active,
.calendar-modal-leave-active {
	transition: opacity 0.2s ease;
}

.calendar-modal-enter-from,
.calendar-modal-leave-to {
	opacity: 0;
}

// Calendar slide transitions for month navigation
.calendar-slide-left-enter-active,
.calendar-slide-left-leave-active,
.calendar-slide-right-enter-active,
.calendar-slide-right-leave-active {
	transition: all 0.25s ease;
}

.calendar-slide-left-enter-from {
	opacity: 0;
	transform: translateX(20px);
}

.calendar-slide-left-leave-to {
	opacity: 0;
	transform: translateX(-20px);
}

.calendar-slide-right-enter-from {
	opacity: 0;
	transform: translateX(-20px);
}

.calendar-slide-right-leave-to {
	opacity: 0;
	transform: translateX(20px);
}

// Fade transition for buttons
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
