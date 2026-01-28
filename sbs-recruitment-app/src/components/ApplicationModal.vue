<template>
	<Transition name="modal">
		<div v-if="dialogVisible" class="modal-wrapper">
			<div class="modal-wrapper__backdrop"></div>
			<div class="modal-wrapper__container">
				<!-- Modal white box containing scrollable content + stepper -->
				<div class="modal-wrapper__modal">
					<!-- Close button (rotated X in corner) -->
					<ModalCloseButton @click="handleClose" />

					<!-- Scrollable content area -->
					<OverlayScrollbarsComponent
						class="modal-wrapper__scroll-area"
						:options="{
							scrollbars: {
								autoHide: 'scroll',
								autoHideDelay: 1000
							}
						}"
					>
						<Transition :name="slideDirection" mode="out-in">
							<div :key="currentStep" class="application-modal__content">
								<!-- Step 1: Personal Information -->
								<div v-if="currentStep === 1" class="application-modal__step">
									<h2 class="application-modal__title">Hvem er du?</h2>
									<p class="application-modal__description">
										Vi vil rigtig gerne vide hvem du er, derfor beder vi om at du udfylder de generelle info om dig, og
										svarer på de følgende 5 spørgsmål. Så er det bare lidt lettere at lære hinanden at kende.
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
													class="application-modal__select"
													clearable
													@focus="isAgeFocused = true"
													@visible-change="handleAgeVisibleChange"
												>
													<el-option
														v-for="age in ageOptions"
														:key="age"
														:label="`${age} år`"
														:value="age.toString()"
													/>
												</el-select>
											</el-tooltip>
										</el-form-item>

										<el-form-item label="Hvilket job ønsker du at søge?" prop="jobPosition">
											<el-select
												v-model="formData.jobPosition"
												placeholder="Select option"
												class="application-modal__select"
											>
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
														{{ formData.cvFile ? formData.cvFile.name : 'Træk eller klik for at uploade' }}
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
										<span class="application-modal__quiz-progress-text">
											{{ currentQuestion + 1 }} af {{ discQuestions.length }}
										</span>
										<el-progress
											:percentage="((currentQuestion + 1) / discQuestions.length) * 100"
											:show-text="false"
											:stroke-width="8"
											class="application-modal__quiz-progress-bar"
										/>
									</div>

									<!-- Question -->
									<p class="application-modal__quiz-question">
										{{ discQuestions[currentQuestion].question }}
									</p>

									<!-- Radio options -->
									<el-radio-group
										:model-value="getSelectedOptionValue(currentQuestion)"
										class="application-modal__quiz-options"
										@change="(val: number) => selectOptionByIndex(currentQuestion, val)"
									>
										<el-radio
											v-for="(option, index) in discQuestions[currentQuestion].options"
											:key="index"
											:value="index"
											class="application-modal__quiz-option"
										>
											{{ option.text }}
										</el-radio>
									</el-radio-group>
								</div>

								<!-- Step 3: Date Selection (Qualified) -->
								<div v-else-if="currentStep === 3" class="application-modal__step">
									<h2 class="application-modal__title">Din ønskede tid</h2>
									<p class="application-modal__description">
										Her kan du vælge 2 tidspunkter på de dage vi holder samtaler, og selv passe din aftale ind i din
										hverdag.
									</p>

									<div class="application-modal__date-section" v-loading="slotsLoading">
										<!-- Top section: Date header + slots -->
										<div class="application-modal__date-top">
											<!-- Date header with selected date and button -->
											<div class="application-modal__date-header">
												<span class="application-modal__date-display">{{
													selectedDate ? formatShortDate(selectedDate) : 'Ingen dato valgt'
												}}</span>
												<el-button class="application-modal__date-btn" @click="openCalendarModal">
													<el-icon><Calendar /></el-icon>
													<span>VÆLG DATO</span>
												</el-button>
											</div>

											<!-- Time slots for selected date -->
											<div v-if="selectedDate && availableSlots.length > 0" class="application-modal__slots">
												<div
													v-for="slot in availableSlots"
													:key="slot.id"
													class="application-modal__slot"
													:class="{
														'application-modal__slot--selected': isSlotSelected(slot.id),
														'application-modal__slot--disabled':
															selectedSlots.length >= 2 && !isSlotSelected(slot.id)
													}"
													@click="toggleSlot(slot)"
												>
													<span class="application-modal__slot-time">{{ slot.time }}</span>
													<span class="application-modal__slot-type">{{
														slot.type === 'fysisk' ? 'Fysisk' : 'Virtuel'
													}}</span>
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
										</div>

										<!-- Selected slots section -->
										<div class="application-modal__selected-section">
											<div class="application-modal__slots-count">Valgt: {{ selectedSlots.length }} af 2</div>
											<div class="application-modal__selected-slots">
												<div
													v-for="(_, index) in [0, 1]"
													:key="index"
													class="application-modal__selected-slot"
													:class="{ 'application-modal__selected-slot--empty': !selectedSlots[index] }"
												>
													<template v-if="selectedSlots[index]">
														<div class="application-modal__selected-slot-info">
															<span class="application-modal__selected-slot-time">{{ getSlotById(selectedSlots[index])?.time }}</span>
															<span class="application-modal__selected-slot-date">{{ formatShortDate(getSlotById(selectedSlots[index])?.date || '') }}</span>
														</div>
														<el-button class="application-modal__selected-slot-remove" @click="removeSlotByIndex(index)" :icon="Delete" circle />
													</template>
													<template v-else>
														<span class="application-modal__selected-slot-empty">{{ index + 1 }}. valg</span>
													</template>
												</div>
											</div>
										</div>
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
									<ConsentModal v-model="consentAccepted" />
								</div>

								<!-- Step 5: Not Qualified -->
								<div v-else-if="currentStep === 5" class="application-modal__step application-modal__step--centered">
									<el-icon :size="64" class="application-modal__result-icon application-modal__result-icon--warning">
										<WarningFilled />
									</el-icon>
									<h2 class="application-modal__title">Tak for din interesse</h2>
									<p class="application-modal__description">
										Desværre matcher din profil ikke det vi søger lige nu. Vi gemmer din ansøgning og kontakter dig,
										hvis der åbner sig en passende mulighed.
									</p>
									<p class="application-modal__description">
										Du er altid velkommen til at søge igen på et senere tidspunkt.
									</p>
								</div>

								<!-- Step 6: Success -->
								<div v-else-if="currentStep === 6" class="application-modal__step application-modal__step--centered">
									<el-icon :size="64" class="application-modal__result-icon application-modal__result-icon--success">
										<SuccessFilled />
									</el-icon>
									<h2 class="application-modal__title">Tak for din ansøgning</h2>
									<p class="application-modal__description">
										Vi har modtaget din ansøgning og dine ønsker til samtaletider. Du vil modtage en bekræftelse på mail
										med de endelige detaljer.
									</p>
									<p class="application-modal__description">Vi glæder os til at møde dig!</p>
								</div>
							</div>
						</Transition>
					</OverlayScrollbarsComponent>

					<!-- Steps navigation (inside modal box, at bottom) -->
					<div class="application-modal__footer">
						<el-steps :active="currentStep - 1" simple :class="{ 'is-completed': currentStep >= 5 }">
							<el-step
								v-for="step in steps"
								:key="step.id"
								:title="step.label"
								:icon="getStepIcon(step)"
								:status="getStepStatus(step.id)"
								@click="goToStep(step.id)"
							/>
						</el-steps>
					</div>
				</div>

				<!-- Navigation Buttons (outside modal box, below) -->
				<div v-if="currentStep < 4" class="modal-wrapper__actions">
					<!-- During quiz (step 2+): show back arrow, otherwise show X (rotated) -->
					<el-button v-if="currentStep > 1" type="primary" @click="previousStep" class="modal-nav-btn" :icon="ArrowLeft" />
					<el-button v-else type="primary" @click="handleClose" class="modal-nav-btn modal-nav-btn--close" :icon="Plus" />
					<el-button type="warning" @click="nextStep" :disabled="!canProceed" class="modal-nav-btn" :icon="ArrowRight" />
				</div>

				<!-- Step 4: Send step with Send button -->
				<div v-else-if="currentStep === 4" class="modal-wrapper__actions">
					<el-button type="primary" @click="previousStep" class="modal-nav-btn" :icon="ArrowLeft" />
					<el-button type="warning" @click="handleSubmit" :disabled="!consentAccepted" class="modal-nav-btn">
						<el-icon><Message /></el-icon>
						<span>Send</span>
					</el-button>
				</div>

				<!-- Step 5: Not Qualified -->
				<div v-else-if="currentStep === 5" class="modal-wrapper__actions">
					<el-button type="primary" @click="handleClose" class="modal-nav-btn modal-nav-btn--full">Luk</el-button>
				</div>

				<!-- Step 6: Success with Færdig button -->
				<div v-else-if="currentStep === 6" class="modal-wrapper__actions">
					<el-button type="warning" @click="handleClose" class="modal-nav-btn modal-nav-btn--full">Færdig</el-button>
				</div>
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
							<el-button v-if="!isCurrentMonth" key="today-btn" class="calendar-modal__today-btn" @click="goToToday">
								I dag
							</el-button>
							<span v-else key="today-placeholder" class="calendar-modal__today-placeholder"></span>
						</Transition>
						<div class="calendar-modal__controls">
							<Transition name="fade" mode="out-in">
								<el-button v-if="!isCurrentMonth" key="prev-btn" class="calendar-modal__nav" :icon="ArrowLeft" @click="prevMonth" />
								<span v-else key="prev-placeholder" class="calendar-modal__nav-placeholder"></span>
							</Transition>
							<el-button class="calendar-modal__nav" :icon="ArrowRight" @click="nextMonth" />
						</div>
					</div>
					<div class="calendar-modal__calendar-wrapper">
						<Transition :name="calendarSlideDirection" mode="out-in">
							<el-calendar v-model="calendarDate" class="calendar-modal__calendar" :key="calendarKey">
								<template #header>
									<span></span>
								</template>
								<template #date-cell="{ data }">
									<div
										class="calendar-modal__day"
										:class="{
											'calendar-modal__day--has-slots': hasTimeSlotsOnDate(data.day) && !isDateInPast(data.day),
											'calendar-modal__day--selected':
												selectedDate === data.day && hasTimeSlotsOnDate(data.day) && !isDateInPast(data.day),
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

						<!-- Calendar Legend -->
						<div class="calendar-modal__legend">
							<div class="calendar-modal__legend-item">
								<span class="calendar-modal__legend-color calendar-modal__legend-color--today"></span>
								<span class="calendar-modal__legend-label">Dags dato</span>
							</div>
							<div class="calendar-modal__legend-item">
								<span class="calendar-modal__legend-color calendar-modal__legend-color--available"></span>
								<span class="calendar-modal__legend-label">Ledige tider</span>
							</div>
							<div class="calendar-modal__legend-item">
								<span class="calendar-modal__legend-color calendar-modal__legend-color--selected"></span>
								<span class="calendar-modal__legend-label">Valgt dato</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'
import ModalCloseButton from '@/components/ModalCloseButton.vue'
import ConsentModal from '@/components/ConsentModal.vue'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import {
	Plus,
	ArrowRight,
	ArrowLeft,
	User,
	Edit,
	Calendar,
	Message,
	SuccessFilled,
	WarningFilled,
	Delete,
	Check
} from '@element-plus/icons-vue'
import { discQuestions, QUALIFICATION_THRESHOLD } from '@/config/discQuestions'
import type {
	ApplicationFormData,
	DiscAnswers,
	DiscResult,
	DiscOption,
	DiscProfile,
	InterviewSlot,
	JobPosition
} from '@/types'
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

// LocalStorage key for draft data
const DRAFT_STORAGE_KEY = 'sbs-application-draft'
const DRAFT_EXPIRY_HOURS = 48 // 2 døgn

// Save draft to localStorage
const saveDraft = () => {
	// Don't save if application was submitted (step 5)
	if (currentStep.value >= 5) return

	// If on consent step (4), save as step 3 so user returns to date selection
	const stepToSave = currentStep.value === 4 ? 3 : currentStep.value

	const draft = {
		formData: formData.value,
		discAnswers: discAnswers.value,
		currentStep: stepToSave,
		currentQuestion: currentQuestion.value,
		highestStepReached: highestStepReached.value,
		timestamp: Date.now()
	}
	localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

// Load draft from localStorage
const loadDraft = () => {
	const saved = localStorage.getItem(DRAFT_STORAGE_KEY)
	if (!saved) return false

	try {
		const draft = JSON.parse(saved)
		const hoursElapsed = (Date.now() - draft.timestamp) / (1000 * 60 * 60)

		// Check if draft is expired
		if (hoursElapsed > DRAFT_EXPIRY_HOURS) {
			localStorage.removeItem(DRAFT_STORAGE_KEY)
			return false
		}

		// Restore data
		formData.value = { ...formData.value, ...draft.formData, cvFile: null } // Can't restore file
		discAnswers.value = draft.discAnswers || {}
		currentStep.value = draft.currentStep || 1
		currentQuestion.value = draft.currentQuestion || 0
		highestStepReached.value = draft.highestStepReached || 1
		return true
	} catch {
		localStorage.removeItem(DRAFT_STORAGE_KEY)
		return false
	}
}

// Clear draft from localStorage
const clearDraft = () => {
	localStorage.removeItem(DRAFT_STORAGE_KEY)
}

// Lås/frigiv body scroll når modal åbner/lukker
watch(
	() => props.visible,
	(newVal) => {
		if (newVal) {
			const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
			document.body.style.overflow = 'hidden'
			document.body.style.paddingRight = `${scrollbarWidth}px`
			document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`)
			// Fetch available time slots when opening
			loadAvailableSlots()
		} else {
			document.body.style.overflow = ''
			document.body.style.paddingRight = ''
			document.documentElement.style.setProperty('--scrollbar-width', '0px')
			// Release reservations and clear time selection when modal closes
			stopPolling()
			releaseAllReservations()
			// Clear time selection (don't persist in localStorage)
			selectedSlots.value = []
			selectedDate.value = ''
			availableSlots.value = []
		}
	}
)

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
const slotsLoading = ref(false)
const calendarSlideDirection = ref<'calendar-slide-left' | 'calendar-slide-right'>('calendar-slide-left')

// Consent
const consentAccepted = ref(false)

// Calendar key for transition - changes when month changes
const calendarKey = computed(() => {
	return `${calendarDate.value.getFullYear()}-${calendarDate.value.getMonth()}`
})

// Polling interval for live slot updates
let pollingInterval: ReturnType<typeof setInterval> | null = null
const POLLING_INTERVAL_MS = 2000 // Poll every 2 seconds for faster updates

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

// Simple watch: Start/stop polling based on whether step 3 (Dato) is visible
watch(
	() => currentStep.value,
	(step) => {
		if (step === 3) {
			// On step 3 (Dato) - start polling and load slots
			loadAvailableSlots()
			startPolling()
		} else {
			// Not on step 3 - stop polling
			stopPolling()
		}
	},
	{ immediate: true }
)

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
	navigator.sendBeacon(
		`${api.defaults.baseURL}/interview-slots/release-all`,
		new Blob([data], { type: 'application/json' })
	)
}

// Setup and cleanup
onMounted(() => {
	window.addEventListener('beforeunload', handleBeforeUnload)
	// Load saved draft on mount if modal is visible
	if (props.visible) {
		loadDraft()
	}
})

// Load draft when modal opens
watch(
	() => props.visible,
	(newVal) => {
		if (newVal) {
			loadDraft()
		}
	}
)

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
		// Only set job position if no draft is loaded or formData is empty
		if (newJob && !formData.value.fullName) {
			formData.value.jobPosition = newJob
		}
	}
)

// Computed: Can proceed to next step
const canProceed = computed(() => {
	if (currentStep.value === 1) {
		return formData.value.fullName && formData.value.phone && formData.value.email && formData.value.jobPosition
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

// Get selected option value (index) for el-radio-group
const getSelectedOptionValue = (questionId: number): number | undefined => {
	const answer = discAnswers.value[questionId]
	if (!answer) return undefined
	const options = discQuestions[questionId].options
	return options.findIndex((opt) => opt.profile === answer.profile)
}

// Select DISC option by index (for el-radio-group)
const selectOptionByIndex = (questionId: number, index: number) => {
	const option = discQuestions[questionId].options[index]
	if (option) {
		selectOption(questionId, option)
	}
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

const getSlotById = (slotId: string): InterviewSlot | undefined => {
	return allTimeSlots.value.find((slot: InterviewSlot) => slot.id === slotId)
}

const removeSlotByIndex = async (index: number) => {
	const slotId = selectedSlots.value[index]
	if (!slotId) return

	const slot = getSlotById(slotId)
	if (slot) {
		selectedSlots.value.splice(index, 1)
		try {
			await api.post(`/interview-slots/${slot.id}/release`, { sessionId: sessionId.value })
			await loadAvailableSlots()
		} catch (error) {
			console.error('Failed to release slot reservation:', error)
		}
	}
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
			// Show user-friendly message
			ElMessage.warning('Denne tid er lige blevet reserveret af en anden. Vælg venligst en anden tid.')
			// Refresh to show updated status
			await loadAvailableSlots()
		}
	}
}

// Load available slots
const loadAvailableSlots = async () => {
	slotsLoading.value = true
	try {
		const response = await api.get('/interview-slots')
		allTimeSlots.value = response.data

		// Clean up selectedSlots - remove any slots that no longer exist or are no longer available
		const validSelectedSlots = selectedSlots.value.filter((slotId) => {
			const slot = allTimeSlots.value.find((s: InterviewSlot) => s.id === slotId)
			// Keep slot if it exists and is either available or reserved by this session
			return slot && !slot.isBooked && !slot.heldBy && (!slot.reservedBy || slot.reservedBy === sessionId.value)
		})

		// If some slots were removed, update the array
		if (validSelectedSlots.length !== selectedSlots.value.length) {
			selectedSlots.value = validSelectedSlots
		}

		// Auto-select first available date if none selected
		if (!selectedDate.value) {
			const firstAvailableDate = findFirstAvailableDate()
			if (firstAvailableDate) {
				selectedDate.value = firstAvailableDate
				// Set calendar to show the month of the first available date
				calendarDate.value = new Date(firstAvailableDate)
			}
		}

		// Update available slots if a date is selected (exclude booked, held, and reserved by others)
		if (selectedDate.value) {
			availableSlots.value = allTimeSlots.value.filter(
				(slot) =>
					slot.date === selectedDate.value &&
					!slot.isBooked &&
					!slot.heldBy &&
					(!slot.reservedBy || slot.reservedBy === sessionId.value)
			)
		}
	} catch (error) {
		console.error('Failed to load slots:', error)
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
	} finally {
		slotsLoading.value = false
	}
}

// Find first available date with slots
const findFirstAvailableDate = (): string | null => {
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	// Get all unique dates with available slots, sorted
	const datesWithSlots = [...new Set(
		allTimeSlots.value
			.filter((slot) => !slot.isBooked && !slot.heldBy && (!slot.reservedBy || slot.reservedBy === sessionId.value))
			.map((slot) => slot.date)
	)].sort()

	// Find the first date that's not in the past
	for (const date of datesWithSlots) {
		if (new Date(date) >= today) {
			return date
		}
	}

	return null
}

// Calendar functions
const hasTimeSlotsOnDate = (date: string): boolean => {
	const slots = getAvailableTimeSlotsForDate(date)
	return slots.length > 0
}

const getAvailableTimeSlotsForDate = (date: string): InterviewSlot[] => {
	// Note: SQLite returns isBooked as 0/1, so check for falsy values
	// Filter out booked, held, and slots reserved by others
	const slotsForDate = allTimeSlots.value.filter((slot) => slot.date === date)
	const filtered = slotsForDate.filter(
		(slot) => !slot.isBooked && !slot.heldBy && (!slot.reservedBy || slot.reservedBy === sessionId.value)
	)
	return filtered
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
	return calendarDate.value.getMonth() === now.getMonth() && calendarDate.value.getFullYear() === now.getFullYear()
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
const openCalendarModal = async () => {
	// Refresh available slots before showing calendar
	await loadAvailableSlots()
	calendarModalVisible.value = true
}

const closeCalendarModal = () => {
	calendarModalVisible.value = false
}

const selectDateAndClose = (date: string) => {
	const availableOnDate = getAvailableTimeSlotsForDate(date)
	if (availableOnDate.length > 0) {
		selectedDate.value = date
		// Filter out booked, held, and slots reserved by others - only show available slots and own reservations
		availableSlots.value = allTimeSlots.value.filter(
			(slot) =>
				slot.date === date &&
				!slot.isBooked &&
				!slot.heldBy &&
				(!slot.reservedBy || slot.reservedBy === sessionId.value)
		)
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
		ElMessage.error('Kunne ikke sende ansøgning. Prøv igen.')
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
				// Qualified - go to date selection
				currentStep.value = 3
				highestStepReached.value = Math.max(highestStepReached.value, 3)
				// Polling starts automatically via watch on currentStep
			} else {
				// Not qualified - skip date selection, go directly to Send step
				currentStep.value = 4
				highestStepReached.value = Math.max(highestStepReached.value, 4)
			}
		}
	} else if (currentStep.value === 3) {
		// Go to Send confirmation step
		// Polling stops automatically via watch on currentStep
		currentStep.value = 4
		highestStepReached.value = Math.max(highestStepReached.value, 4)
	}
}

// Get step status for el-steps
const getStepStatus = (stepId: number): 'wait' | 'process' | 'finish' => {
	// If completed (success/fail screen), all steps are finished
	if (currentStep.value >= 5) return 'finish'
	// Current step is in process
	if (stepId === currentStep.value) return 'process'
	// Steps already completed (based on highest reached)
	if (stepId < highestStepReached.value) return 'finish'
	// Steps not yet reached
	return 'wait'
}

// Check if a step is completed (data filled in)
const isStepCompleted = (stepId: number): boolean => {
	if (stepId === 1) {
		return !!(formData.value.fullName && formData.value.phone && formData.value.email && formData.value.jobPosition)
	}
	if (stepId === 2) {
		// All quiz questions answered
		return Object.keys(discAnswers.value).length === discQuestions.length
	}
	if (stepId === 3) {
		return selectedSlots.value.length === 2
	}
	if (stepId === 4) {
		// Consent is always re-required, so check if we've passed it
		return currentStep.value > 4 || highestStepReached.value > 4
	}
	return false
}

// Get icon for step - checkmark when completed and not current step, otherwise original icon
const getStepIcon = (step: { id: number; icon: any }) => {
	// Show checkmark if step is completed AND user is not currently on that step
	if (isStepCompleted(step.id) && currentStep.value !== step.id) {
		return Check
	}
	return step.icon
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

	// Polling starts/stops automatically via watch on currentStep
	currentStep.value = stepId
}

// Handle form submission
const handleSubmit = async () => {
	await submitApplication()
	slideDirection.value = 'slide-left'

	// Check qualification to determine result page
	const result = calculateDiscResult()
	if (result.isQualified) {
		currentStep.value = 6 // Success
	} else {
		currentStep.value = 5 // Not qualified
	}
}

// Reset and close
const handleClose = async () => {
	// Stop polling and release reservations before closing
	stopPolling()
	await releaseAllReservations()

	// Save draft if not submitted (step < 5 = not yet on success/rejected screen)
	if (currentStep.value < 5) {
		saveDraft()
	} else {
		// Clear draft after successful submission (step 5 = success/rejected)
		clearDraft()
	}

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
	consentAccepted.value = false
	// Generate new session ID for next session
	sessionId.value = generateSessionId()
	emit('close')
}
</script>

<style lang="scss" scoped>
.application-modal {
	&__header {
		position: relative;
	}

	&__content {
		height: 100%;
		flex: 1;
		overflow: hidden;
	}

	&__step {
		@include flex-column;
		gap: $spacing-sm;
		height: 100%;

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

		:deep(.el-progress-bar__outer) {
			border: 1px solid $color-dark-gray;
			background-color: $color-white;
		}

		:deep(.el-progress-bar__inner) {
			background-color: $color-dark-gray;
			transition: width 0.3s ease;
		}
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
		align-items: flex-start;
	}

	&__quiz-option {
		@include body-font;
		line-height: 1.4;
		height: auto;
		white-space: normal;
		align-items: flex-start;

		:deep(.el-radio__inner) {
			transition: all $transition-duration $transition-ease;
		}

		:deep(.el-radio__label) {
			white-space: normal;
			line-height: 1.4;
			transition: color $transition-duration $transition-ease;
		}

		&.is-checked {
			:deep(.el-radio__label) {
				font-weight: $font-weight-bold;
				color: $color-dark-gray;
			}
		}
	}

	// Date selection
	&__date-section {
		@include flex-column;
		justify-content: space-between;
		flex: 1;
	}

	&__date-top {
		@include flex-column;
		gap: $spacing-sm;
		flex: 1;
	}

	&__date-header {
		@include slot-picker-header;
		width: 100%;
	}

	&__date-display {
		@include slot-picker-date-display;
	}

	&__date-btn {
		@include slot-picker-date-btn;
	}

	&__no-date,
	&__no-slots {
		@include slot-empty-state;
	}

	&__slots {
		@include slot-grid;
		flex: 1;
		align-content: start;
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
		@include button-dark;
		width: 40px;
		height: 40px;
		padding: 0;

		.el-icon {
			color: inherit;
		}
	}

	&__calendar-title {
		@include subtitle-font;
		text-transform: capitalize;
		min-width: 180px;
		text-align: center;
	}

	&__calendar-today {
		@include button-dark;
		// Kun størrelses-tilpasninger
		padding: $spacing-sm $spacing-lg;
		font-size: $font-size-body;
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
		min-height: $spacing-xl + $spacing-sm;
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
			margin-top: $spacing-xs;
			color: currentColor;
			background: transparent;
			padding: 0;
			width: 100%;
			text-align: center;
		}
	}

	&__slots {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
	}

	&__slots-title {
		@include subtitle-font;
		margin-bottom: $spacing-sm;
		grid-column: 1 / -1;
	}

	&__slot {
		@include slot-item;

		&--selected {
			@include slot-item-selected;
		}

		&--disabled {
			@include slot-item-disabled;
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
		@include slot-time;
	}

	&__slot-type {
		@include slot-type-badge;
	}

	&__slot-choice {
		position: absolute;
		top: -$spacing-xs;
		right: 0;
		background-color: $color-yellow;
		color: $color-dark-gray;
		padding: $spacing-xs $spacing-xs;
		border-radius: $border-radius-sm;
		font-size: $font-size-small;
	}

	&__selected-section {
		@include selected-slots-section;
	}

	&__slots-count {
		@include selected-slots-count;
	}

	&__selected-slots {
		@include selected-slots-grid;
	}

	&__selected-slot {
		@include selected-slot;

		&--empty {
			@include selected-slot-empty;
		}
	}

	&__selected-slot-info {
		@include selected-slot-info;
	}

	&__selected-slot-priority {
		font-size: 10px;
		opacity: 0.7;
	}

	&__selected-slot-time {
		@include selected-slot-time;
	}

	&__selected-slot-date {
		@include selected-slot-date;
	}

	&__selected-slot-empty {
		@include selected-slot-empty-text;
	}

	&__selected-slot-remove {
		@include selected-slot-remove-btn;
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

	// Actions
	&__actions {
		display: flex;
		gap: $spacing-md;
	}

	&__footer {
		flex-shrink: 0;
		position: relative;
		z-index: 1; // Keep below ConsentModal (z-index: 4000)
	}
}

// Application modal scroll-area padding (content area)
:deep(.modal-wrapper__scroll-area) {
	[data-overlayscrollbars-contents] {
		padding: $spacing-md $spacing-md 0 $spacing-md !important;
	}
}

// Full width select elements
.application-modal__select {
	width: 100%;
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
	margin-bottom: 0;
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

// Calendar Modal Styles are in _global.scss
</style>
