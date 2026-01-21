<template>
	<div class="hr-dashboard">
		<!-- Login Screen -->
		<div v-if="!isAuthenticated" class="hr-dashboard__login">
			<div class="hr-dashboard__login-card">
				<img src="/logo.svg" alt="SBS Friction A/S" class="hr-dashboard__login-logo" />
				<h1 class="hr-dashboard__login-title">HR Dashboard</h1>
				<p class="hr-dashboard__login-text">Indtast adgangskode for at fortsætte</p>

				<el-form @submit.prevent="handleLogin">
					<el-form-item>
						<el-input
							v-model="password"
							type="password"
							placeholder="Adgangskode"
							show-password
							@keyup.enter="handleLogin"
						/>
					</el-form-item>
					<el-button :loading="isLoading" @click="handleLogin" class="btn-red">
						Log ind
					</el-button>
				</el-form>

				<p v-if="loginError" class="hr-dashboard__login-error">
					{{ loginError }}
				</p>
			</div>
		</div>

		<!-- Dashboard Content -->
		<div v-else class="hr-dashboard__content">
			<!-- Header -->
			<header class="hr-dashboard__header">
				<div class="hr-dashboard__header-left">
					<h1 class="hr-dashboard__title">HR Dashboard</h1>
					<p class="hr-dashboard__subtitle">Sidst opdateret: {{ lastUpdated }}</p>
				</div>
				<div class="hr-dashboard__header-right">
					<el-button @click="loadApplications" class="btn-dark">Opdater</el-button>
					<el-button @click="openTimeSlotsModal" class="btn-dark">Tider</el-button>
					<el-button @click="openCleanupModal" class="btn-yellow">Ryd Op</el-button>
					<el-button @click="handleLogout" class="btn-red">Log ud</el-button>
				</div>
			</header>

			<!-- Scrollable Content -->
			<OverlayScrollbarsComponent
				class="hr-dashboard__scrollable"
				:options="{ scrollbars: { theme: 'os-theme-dark', autoHide: 'scroll', autoHideDelay: 1000 } }"
			>
			<!-- Stats Section -->
			<section class="hr-dashboard__stats">
				<h2 class="hr-dashboard__section-title">Statistik</h2>
				<div class="hr-dashboard__stats-grid">
					<div class="stat-card">
						<span class="stat-card__value">{{ stats.totalApplications }}</span>
						<span class="stat-card__label">Ansøgninger i alt</span>
					</div>
					<div class="stat-card">
						<span class="stat-card__value">{{ stats.scheduledInterviews }}</span>
						<span class="stat-card__label">Planlagte samtaler</span>
					</div>
				</div>
			</section>

			<!-- Upcoming Interviews Section -->
			<section ref="upcomingSection" class="hr-dashboard__upcoming">
				<h2 class="hr-dashboard__section-title">Kommende samtaler</h2>
				<div class="hr-dashboard__upcoming-list">
					<div v-for="interview in upcomingInterviews" :key="interview.id" class="interview-card">
						<div class="interview-card__date">
							<span class="interview-card__day">{{ formatDay(interview.confirmedSlot?.date) }}</span>
							<span class="interview-card__month">{{ formatMonth(interview.confirmedSlot?.date) }}</span>
						</div>
						<div class="interview-card__info">
							<h3 class="interview-card__name">{{ interview.fullName }}</h3>
							<p class="interview-card__detail">Job: {{ formatJobPosition(interview.jobPosition) }}</p>
							<p class="interview-card__detail">Email: {{ interview.email }}</p>
							<p class="interview-card__detail">Telefon: {{ interview.phone }}</p>
							<p class="interview-card__detail">Tid: {{ interview.confirmedSlot?.time }}</p>
						</div>
						<div class="interview-card__actions">
							<el-button @click="viewApplication(interview)" class="btn-dark"> Se ansøgning </el-button>
							<el-button @click="markInterviewCompleted(interview.id)" class="btn-yellow"> Afholdt </el-button>
						</div>
					</div>

					<div v-if="upcomingInterviews.length === 0" class="hr-dashboard__empty">Ingen kommende samtaler</div>
				</div>
			</section>

			<!-- All Applications Section -->
			<section ref="applicationsSection" class="hr-dashboard__applications">
				<h2 class="hr-dashboard__section-title">Alle ansøgninger</h2>

				<!-- Filters -->
				<div class="hr-dashboard__filters">
					<div class="hr-dashboard__filter-group">
						<span class="hr-dashboard__filter-label">Vis antal:</span>
						<el-select v-model="pagination.itemsPerPage" @change="handleItemsPerPageChange">
							<el-option :value="9" label="9 per side" />
							<el-option :value="18" label="18 per side" />
							<el-option :value="27" label="27 per side" />
						</el-select>
					</div>
					<div class="hr-dashboard__filter-group">
						<span class="hr-dashboard__filter-label">Filtrer status:</span>
						<el-select v-model="filters.status" @change="handleFilterChange">
							<el-option value="all" label="Alle" />
							<el-option value="pending" label="Afventer" />
							<el-option value="reviewing" label="Under behandling" />
							<el-option value="interview-scheduled" label="Samtale planlagt" />
							<el-option value="interview-completed" label="Samtale afholdt" />
							<el-option value="accepted" label="Accepteret" />
							<el-option value="rejected" label="Afvist" />
						</el-select>
					</div>
					<div class="hr-dashboard__filter-info">
						<span>Side {{ pagination.currentPage }} af {{ totalPages }}</span>
						<span>Viser {{ paginatedApplications.length }} af {{ filteredApplications.length }}</span>
					</div>
				</div>

				<!-- Applications Grid -->
				<div class="hr-dashboard__applications-grid">
					<div v-for="application in paginatedApplications" :key="application.id" class="application-card">
						<div class="application-card__header">
							<span class="application-card__name">{{ application.fullName }}</span>
							<span class="application-card__age">{{ application.age }}</span>
						</div>

						<div class="application-card__body">
							<div class="application-card__row">
								<span class="application-card__label">Modtaget:</span>
								<span class="application-card__value">{{ formatDate(application.createdAt) }}</span>
							</div>
							<div class="application-card__row application-card__row--status">
								<span class="application-card__label">Status:</span>
								<el-select
									v-model="application.status"
									size="small"
									class="application-card__status-select"
									@change="updateApplicationStatus(application.id, application.status)"
								>
									<el-option value="pending" label="Afventer" />
									<el-option value="reviewing" label="Under behandling" />
									<el-option value="interview-scheduled" label="Samtale planlagt" />
									<el-option value="interview-completed" label="Samtale afholdt" />
									<el-option value="accepted" label="Accepteret" />
									<el-option value="rejected" label="Afvist" />
								</el-select>
							</div>
							<div class="application-card__row">
						<span class="application-card__label">
							<el-icon><User /></el-icon>
							Alder:
						</span>
						<span class="application-card__value">{{ application.age }}</span>
					</div>
					<div class="application-card__row">
						<span class="application-card__label">
							<el-icon><Message /></el-icon>
							Email:
						</span>
						<span class="application-card__value">{{ application.email }}</span>
					</div>
					<div class="application-card__row">
						<span class="application-card__label">
							<el-icon><Phone /></el-icon>
							Telefon:
						</span>
						<span class="application-card__value">{{ application.phone }}</span>
					</div>

					<div class="application-card__row application-card__row--confirmed">
						<span class="application-card__label">
							<el-icon><Calendar /></el-icon>
							Bekræftet samtale tid:
						</span>
						<span class="application-card__value">{{ application.confirmedSlot ? formatDateTime(application.confirmedSlot) : 'Ikke aftalt' }}</span>
					</div>

					<div class="application-card__row application-card__row--button">
						<el-button @click="viewApplication(application)" class="btn-dark">
							DETALJER
						</el-button>
					</div>
				</div>
			</div>
				</div>

				<!-- Pagination -->
				<div class="hr-dashboard__pagination">
					<el-pagination
						v-model:current-page="pagination.currentPage"
						:page-size="pagination.itemsPerPage"
						:total="filteredApplications.length"
						layout="prev, pager, next"
						@current-change="handlePageChange"
					/>
				</div>
			</section>
			</OverlayScrollbarsComponent>
		</div>

		<!-- Application Detail Dialog -->
		<el-dialog v-model="showDetailDialog" title="Ansøgning detaljer">
			<div v-if="selectedApplication" class="application-detail">
				<div class="application-detail__section">
					<h3>Personlige oplysninger</h3>
					<p><strong>Navn:</strong> {{ selectedApplication.fullName }}</p>
					<p><strong>Email:</strong> {{ selectedApplication.email }}</p>
					<p><strong>Telefon:</strong> {{ selectedApplication.phone }}</p>
					<p><strong>Alder:</strong> {{ selectedApplication.age }}</p>
					<p><strong>Stilling:</strong> {{ formatJobPosition(selectedApplication.jobPosition) }}</p>
				</div>

				<div class="application-detail__section">
					<h3>DISC Resultat</h3>
					<p><strong>Total point:</strong> {{ selectedApplication.discResult?.totalPoints }} / 15</p>
					<p><strong>Kvalificeret:</strong> {{ selectedApplication.discResult?.isQualified ? 'Ja' : 'Nej' }}</p>
					<p><strong>Dominant profil:</strong> {{ selectedApplication.discResult?.dominantProfile }}</p>
				</div>

				<div v-if="selectedApplication.cvFileName" class="application-detail__section">
					<h3>CV</h3>
					<el-button @click="downloadCV(selectedApplication.cvFileName)" class="btn-dark"> Download CV </el-button>
				</div>

				<div class="application-detail__section">
					<h3>Ønskede tidspunkter</h3>
					<div v-if="selectedApplication.selectedSlots && selectedApplication.selectedSlots.length > 0">
						<div
							v-for="(slotId, index) in selectedApplication.selectedSlots"
							:key="slotId"
							class="application-detail__slot"
						>
							<div class="application-detail__slot-info">
								<span class="application-detail__slot-priority">{{ index + 1 }}. prioritet</span>
								<span class="application-detail__slot-date">{{ getSlotInfo(slotId)?.date || 'Dato ikke fundet' }}</span>
								<span class="application-detail__slot-time">{{ getSlotInfo(slotId)?.time || 'Tid ikke fundet' }}</span>
								<span class="application-detail__slot-type">
									{{ getSlotInfo(slotId)?.type === 'fysisk' ? 'Fysisk (45 min)' : 'Virtuel (60 min)' }}
								</span>
							</div>
							<div class="application-detail__slot-actions">
								<el-button
									v-if="!selectedApplication.confirmedSlot"
									@click="confirmInterviewSlot(selectedApplication.id, slotId)"
									class="btn-yellow"
								>
									Bekræft tid
								</el-button>
								<span v-else-if="slotId === selectedApplication.confirmedSlot?.id" class="application-detail__confirmed-badge">
									Bekræftet
								</span>
								<el-button
									v-else
									@click="changeToSelectedSlot(selectedApplication.id, slotId)"
									class="btn-dark"
								>
									Skift til denne tid
								</el-button>
							</div>
						</div>
					</div>
					<p v-else>Ingen tidspunkter valgt</p>

					<!-- Change confirmed time section -->
					<div v-if="selectedApplication.confirmedSlot" class="application-detail__change-time">
						<h4>Skift bekræftet tid</h4>

						<!-- Custom date and time pickers -->
						<div class="application-detail__custom-time">
							<el-date-picker
								v-model="customDate"
								type="date"
								placeholder="Vælg dato"
								format="YYYY-MM-DD"
								value-format="YYYY-MM-DD"
								style="width: 48%; margin-right: 4%"
							/>
							<el-time-select
								v-model="customTime"
								placeholder="Vælg tid"
								start="08:00"
								step="00:15"
								end="17:00"
								style="width: 48%"
							/>
						</div>
						<div class="application-detail__custom-time" style="margin-top: 12px">
							<el-select v-model="customType" placeholder="Vælg type" style="width: 100%">
								<el-option label="Fysisk (45 min)" value="fysisk" />
								<el-option label="Virtuel (60 min)" value="virtuel" />
							</el-select>
						</div>
						<el-button
							:disabled="!customDate || !customTime || !customType"
							@click="changeToCustomSlot(selectedApplication.id)"
							class="btn-dark"
							style="width: 100%; margin-top: 12px"
						>
							Skift til valgt tid
						</el-button>
					</div>
				</div>

				<div class="application-detail__section">
					<h3>Status</h3>
					<el-select
						v-model="selectedApplication.status"
						@change="updateApplicationStatus(selectedApplication.id, selectedApplication.status)"
					>
						<el-option value="pending" label="Afventer" />
						<el-option value="reviewing" label="Under behandling" />
						<el-option value="interview-scheduled" label="Samtale planlagt" />
						<el-option value="interview-completed" label="Samtale afholdt" />
						<el-option value="accepted" label="Accepteret" />
						<el-option value="rejected" label="Afvist" />
					</el-select>
				</div>
			</div>

			<template #footer>
				<el-button @click="showDetailDialog = false" class="btn-dark">Luk</el-button>
				<el-button @click="deleteApplication(selectedApplication?.id)" class="btn-red"> Slet ansøgning </el-button>
			</template>
		</el-dialog>

		<!-- Time Slots Modal -->
		<el-dialog v-model="showTimeSlotsModal" title="Administrer tilgængelige tider">
			<div class="time-slots-manager">
				<p class="time-slots-manager__description">
					Klik på en dag i kalenderen for at tilføje eller se tilgængelige tider. Ansøgere kan vælge 1. og 2. prioritet.
				</p>

				<!-- Calendar Overview -->
				<div class="time-slots-manager__calendar">
					<el-calendar v-model="calendarDate">
						<template #date-cell="{ data }">
							<div
								class="calendar-day"
								:class="{
									'calendar-day--has-slots': hasTimeSlotsOnDate(data.day) && !isDateInPast(data.day),
									'calendar-day--selected': selectedDate === data.day && !isDateInPast(data.day),
									'calendar-day--past': isDateInPast(data.day)
								}"
								@click="selectDate(data.day)"
							>
								<div class="calendar-day__date">{{ data.day.split('-')[2] }}</div>
								<div v-if="getTimeSlotsForDate(data.day).length > 0" class="calendar-day__slots">
									<span class="calendar-day__count">{{ getTimeSlotsForDate(data.day).length }} tider</span>
								</div>
							</div>
						</template>
					</el-calendar>
				</div>

				<!-- Selected Date Details -->
				<div v-if="selectedDate" class="time-slots-manager__selected">
					<div class="time-slots-manager__selected-header">
						<h3>{{ formatSelectedDate(selectedDate) }}</h3>
						<el-button @click="selectedDate = null" class="btn-dark">Luk</el-button>
					</div>

					<!-- Add time slot for selected date -->
					<div class="time-slots-manager__add">
						<div class="time-slots-manager__form">
							<el-select v-model="newTimeSlot.type" placeholder="Vælg type" style="width: 138px">
								<el-option label="Fysisk (45 min)" value="fysisk" />
								<el-option label="Virtuel (60 min)" value="virtuel" />
							</el-select>
							<el-time-select
								v-model="newTimeSlot.time"
								placeholder="Vælg tidspunkt"
								start="08:00"
								step="00:30"
								end="17:00"
							/>
							<el-button @click="addTimeSlotForSelectedDate" class="btn-dark">Tilføj tid</el-button>
						</div>
					</div>

					<!-- Time slots for selected date -->
					<div class="time-slots-manager__list">
						<div v-if="getTimeSlotsForDate(selectedDate).length === 0" class="time-slots-manager__empty">
							Ingen tider tilgængelige på denne dato
						</div>
						<div v-else class="time-slots-manager__items">
							<div v-for="slot in getTimeSlotsForDate(selectedDate)" :key="slot.id" class="time-slot-item">
								<span class="time-slot-item__time">{{ slot.time }}</span>
								<span class="time-slot-item__type">{{ slot.type === 'fysisk' ? 'Fysisk (45 min)' : 'Virtuel (60 min)' }}</span>
								<el-button @click="removeTimeSlot(slot.id)" class="btn-red">Slet</el-button>
							</div>
						</div>
					</div>
				</div>
			</div>

			<template #footer>
				<el-button @click="showTimeSlotsModal = false" class="btn-dark">Luk</el-button>
			</template>
		</el-dialog>

		<!-- Cleanup Modal -->
		<el-dialog v-model="showCleanupModal" title="Ryd op i gamle ansøgninger">
			<div class="cleanup-manager">
				<p class="cleanup-manager__description">
					Slet alle ansøgninger som er ældre end det valgte antal måneder fra modtagelsesdato.
				</p>

				<div class="cleanup-manager__form">
					<div class="cleanup-manager__field">
						<label>Slet ansøgninger ældre end:</label>
						<el-select v-model="cleanupMonths" placeholder="Vælg antal måneder">
							<el-option :value="1" label="1 måned" />
							<el-option :value="3" label="3 måneder" />
							<el-option :value="6" label="6 måneder" />
							<el-option :value="12" label="12 måneder" />
						</el-select>
					</div>

					<div v-if="cleanupMonths" class="cleanup-manager__preview">
						<p><strong>Antal ansøgninger som vil blive slettet:</strong> {{ oldApplicationsCount }}</p>
					</div>
				</div>
			</div>

			<template #footer>
				<el-button @click="showCleanupModal = false" class="btn-dark">Annuller</el-button>
				<el-button :disabled="!cleanupMonths || oldApplicationsCount === 0" @click="performCleanup" class="btn-red">
					Slet {{ oldApplicationsCount }} ansøgninger
				</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { User, Message, Phone, Calendar } from '@element-plus/icons-vue'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import api, { setAuthHeader, clearAuthHeader } from '@/config/api'
import type {
	Application,
	ApplicationStatus,
	JobPosition,
	InterviewSlot,
	FilterOptions,
	PaginationState,
	DashboardStats
} from '@/types'

// Authentication state
const isAuthenticated = ref(false)
const password = ref('')
const loginError = ref('')
const isLoading = ref(false)

// Data
const applications = ref<Application[]>([])
const lastUpdated = ref('')
const refreshInterval = ref<ReturnType<typeof setInterval> | null>(null)

// UI state
const showDetailDialog = ref(false)
const selectedApplication = ref<Application | null>(null)
const showTimeSlotsModal = ref(false)
const showCleanupModal = ref(false)

// Time slots management
const availableTimeSlots = ref<InterviewSlot[]>([])
const calendarDate = ref(new Date())
const selectedDate = ref<string | null>(null)
const newTimeSlot = ref({
	date: '',
	time: '',
	type: 'fysisk'
})
const customSlotSelection = ref<string>('')
const customDate = ref<string>('')
const customTime = ref<string>('')
const customType = ref<string>('fysisk')

// Cleanup management
const cleanupMonths = ref<number | null>(null)

// Filters and pagination
const filters = ref<FilterOptions>({
	status: 'all',
	jobPosition: 'all'
})

const pagination = ref<PaginationState>({
	currentPage: 1,
	itemsPerPage: 9,
	totalItems: 0
})

// Computed stats
const stats = computed<DashboardStats>(() => ({
	totalApplications: applications.value.length,
	pendingApplications: applications.value.filter((a) => a.status === 'pending').length,
	scheduledInterviews: applications.value.filter((a) => a.status === 'interview-scheduled').length,
	completedInterviews: applications.value.filter((a) => a.status === 'interview-completed').length
}))

// Filtered applications
const filteredApplications = computed(() => {
	let result = [...applications.value]

	if (filters.value.status !== 'all') {
		result = result.filter((a) => a.status === filters.value.status)
	}

	if (filters.value.jobPosition !== 'all') {
		result = result.filter((a) => a.jobPosition === filters.value.jobPosition)
	}

	return result
})

// Paginated applications
const paginatedApplications = computed(() => {
	const start = (pagination.value.currentPage - 1) * pagination.value.itemsPerPage
	const end = start + pagination.value.itemsPerPage
	return filteredApplications.value.slice(start, end)
})

// Total pages
const totalPages = computed(() => {
	return Math.ceil(filteredApplications.value.length / pagination.value.itemsPerPage) || 1
})

// Upcoming interviews
const upcomingInterviews = computed(() => {
	return applications.value
		.filter((a) => a.status === 'interview-scheduled' && a.confirmedSlot)
		.sort((a, b) => {
			const dateA = new Date(`${a.confirmedSlot!.date} ${a.confirmedSlot!.time}`)
			const dateB = new Date(`${b.confirmedSlot!.date} ${b.confirmedSlot!.time}`)
			return dateA.getTime() - dateB.getTime()
		})
})

// Login handler
const handleLogin = async () => {
	if (!password.value) {
		loginError.value = 'Indtast venligst adgangskode'
		return
	}

	isLoading.value = true
	loginError.value = ''

	try {
		setAuthHeader(password.value)
		await loadApplications()
		await loadTimeSlots()
		isAuthenticated.value = true
		startAutoRefresh()
	} catch {
		loginError.value = 'Forkert adgangskode'
		clearAuthHeader()
	} finally {
		isLoading.value = false
	}
}

// Logout handler
const handleLogout = () => {
	isAuthenticated.value = false
	password.value = ''
	applications.value = []
	clearAuthHeader()
	stopAutoRefresh()
}

// Load applications
const loadApplications = async () => {
	try {
		const response = await api.get('/applications')
		applications.value = response.data
		lastUpdated.value = new Date().toLocaleTimeString('da-DK')
	} catch (error) {
		console.error('Failed to load applications:', error)
		throw error
	}
}

// Auto refresh
const startAutoRefresh = () => {
	refreshInterval.value = setInterval(loadApplications, 5000)
}

const stopAutoRefresh = () => {
	if (refreshInterval.value) {
		clearInterval(refreshInterval.value)
		refreshInterval.value = null
	}
}

// Update application status
const updateApplicationStatus = async (id: string, status: ApplicationStatus) => {
	try {
		await api.patch(`/applications/${id}`, { status })
	} catch (error) {
		console.error('Failed to update status:', error)
	}
}

// Mark interview completed
const markInterviewCompleted = async (id: string) => {
	await updateApplicationStatus(id, 'interview-completed')
	await loadApplications()
}

// Delete application
const deleteApplication = async (id?: string) => {
	if (!id) return

	try {
		await api.delete(`/applications/${id}`)
		showDetailDialog.value = false
		await loadApplications()
	} catch (error) {
		console.error('Failed to delete application:', error)
	}
}

// Download CV
const downloadCV = (filename: string) => {
	window.open(`${api.defaults.baseURL}/download-cv/${filename}`, '_blank')
}

// View application details
const viewApplication = (application: Application) => {
	selectedApplication.value = { ...application }
	customSlotSelection.value = ''
	customDate.value = ''
	customTime.value = ''
	customType.value = 'fysisk'
	showDetailDialog.value = true
}

// Pagination handlers
const handlePageChange = (page: number) => {
	pagination.value.currentPage = page
}

const handleItemsPerPageChange = () => {
	pagination.value.currentPage = 1
}

const handleFilterChange = () => {
	pagination.value.currentPage = 1
}

// Format helpers
const formatDate = (dateString: string): string => {
	const date = new Date(dateString)
	return date.toLocaleDateString('da-DK')
}

const formatDay = (dateString?: string): string => {
	if (!dateString) return ''
	const date = new Date(dateString)
	return date.getDate().toString()
}

const formatMonth = (dateString?: string): string => {
	if (!dateString) return ''
	const date = new Date(dateString)
	return date.toLocaleDateString('da-DK', { month: 'short' })
}

const formatDateTime = (slot: InterviewSlot): string => {
	const date = new Date(slot.date)
	return `${date.toLocaleDateString('da-DK')} kl. ${slot.time}`
}

const formatJobPosition = (position: JobPosition): string => {
	const positions: Record<JobPosition, string> = {
		pakkeriet: 'Pakkeriet',
		produktion: 'Produktion',
		andre: 'Andre stillinger'
	}
	return positions[position] || position
}

// Time slots functions
const openTimeSlotsModal = async () => {
	await loadTimeSlots()
	selectedDate.value = null
	showTimeSlotsModal.value = true
}

const loadTimeSlots = async () => {
	try {
		const response = await api.get('/interview-slots')
		availableTimeSlots.value = response.data
	} catch (error) {
		console.error('Failed to load time slots:', error)
	}
}

// Get slot info by ID
const getSlotInfo = (slotId: string): InterviewSlot | undefined => {
	return availableTimeSlots.value.find((slot) => slot.id === slotId)
}

// Confirm interview slot
const confirmInterviewSlot = async (applicationId: string, slotId: string) => {
	try {
		// Use the confirm-slot endpoint which handles:
		// 1. Booking the slot
		// 2. Releasing other held slots for this application
		// 3. Updating application status
		await api.post(`/applications/${applicationId}/confirm-slot`, {
			slotId
		})

		// Reload data
		await loadApplications()
		await loadTimeSlots()

		// Update selected application if dialog is open
		if (selectedApplication.value) {
			const updated = applications.value.find((app) => app.id === applicationId)
			if (updated) {
				selectedApplication.value = { ...updated }
			}
		}

		// Reset custom slot selection
		customSlotSelection.value = ''
	} catch (error) {
		console.error('Failed to confirm interview slot:', error)
	}
}

// Change to one of the selected slots (not currently confirmed)
const changeToSelectedSlot = async (applicationId: string, slotId: string) => {
	if (!selectedApplication.value?.confirmedSlot) return

	try {
		const oldSlotId = selectedApplication.value.confirmedSlot.id

		// Unbook the old slot
		await api.patch(`/interview-slots/${oldSlotId}/unbook`)

		// Book the new slot
		await api.patch(`/interview-slots/${slotId}/book`, {
			applicationId
		})

		// Update application with new confirmed slot
		await api.patch(`/applications/${applicationId}`, {
			confirmedSlot: slotId
		})

		// Reload data
		await loadApplications()
		await loadTimeSlots()

		// Update selected application
		const updated = applications.value.find((app) => app.id === applicationId)
		if (updated) {
			selectedApplication.value = { ...updated }
		}
	} catch (error) {
		console.error('Failed to change to selected slot:', error)
	}
}

// Change to custom date/time
const changeToCustomSlot = async (applicationId: string) => {
	if (!selectedApplication.value?.confirmedSlot || !customDate.value || !customTime.value || !customType.value) return

	try {
		const oldSlotId = selectedApplication.value.confirmedSlot.id

		// Create the custom slot
		const customSlot: InterviewSlot = {
			id: `custom-${Date.now()}`,
			date: customDate.value,
			time: customTime.value,
			type: customType.value as 'fysisk' | 'virtuel',
			isBooked: true,
			bookedBy: applicationId
		}

		// Unbook the old slot (only if it's not a custom slot)
		if (!oldSlotId.startsWith('custom-')) {
			await api.patch(`/interview-slots/${oldSlotId}/unbook`)
		}

		// Update application with custom confirmed slot
		await api.patch(`/applications/${applicationId}`, {
			confirmedSlot: customSlot
		})

		// Reload data
		await loadApplications()
		await loadTimeSlots()

		// Update selected application
		const updated = applications.value.find((app) => app.id === applicationId)
		if (updated) {
			selectedApplication.value = { ...updated }
		}

		// Reset custom inputs
		customDate.value = ''
		customTime.value = ''
		customType.value = 'fysisk'
	} catch (error) {
		console.error('Failed to change to custom slot:', error)
	}
}

const selectDate = (dateString: string) => {
	// Don't allow selecting past dates
	if (isDateInPast(dateString)) return

	selectedDate.value = dateString
	newTimeSlot.value.time = ''
}

const hasTimeSlotsOnDate = (dateString: string): boolean => {
	return availableTimeSlots.value.some((slot) => slot.date === dateString)
}

const isDateInPast = (dateString: string): boolean => {
	const date = new Date(dateString)
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	return date < today
}

const getTimeSlotsForDate = (dateString: string) => {
	return availableTimeSlots.value
		.filter((slot) => slot.date === dateString)
		.sort((a, b) => a.time.localeCompare(b.time))
}

const formatSelectedDate = (dateString: string): string => {
	const date = new Date(dateString)
	return date.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const addTimeSlotForSelectedDate = async () => {
	if (!selectedDate.value || !newTimeSlot.value.time || !newTimeSlot.value.type) {
		return
	}

	try {
		await api.post('/interview-slots', {
			date: selectedDate.value,
			time: newTimeSlot.value.time,
			type: newTimeSlot.value.type
		})
		newTimeSlot.value.time = ''
		newTimeSlot.value.type = 'fysisk'
		await loadTimeSlots()
	} catch (error) {
		console.error('Failed to add time slot:', error)
	}
}

const removeTimeSlot = async (slotId: string) => {
	try {
		await api.delete(`/interview-slots/${slotId}`)
		await loadTimeSlots()
	} catch (error) {
		console.error('Failed to remove time slot:', error)
	}
}

// Cleanup functions
const openCleanupModal = () => {
	cleanupMonths.value = null
	showCleanupModal.value = true
}

const oldApplicationsCount = computed(() => {
	if (!cleanupMonths.value) return 0

	const cutoffDate = new Date()
	cutoffDate.setMonth(cutoffDate.getMonth() - cleanupMonths.value)

	return applications.value.filter((app) => {
		const submittedDate = new Date(app.createdAt)
		return submittedDate < cutoffDate
	}).length
})

const performCleanup = async () => {
	if (!cleanupMonths.value) return

	try {
		const cutoffDate = new Date()
		cutoffDate.setMonth(cutoffDate.getMonth() - cleanupMonths.value)

		const toDelete = applications.value.filter((app) => {
			const submittedDate = new Date(app.createdAt)
			return submittedDate < cutoffDate
		})

		for (const app of toDelete) {
			await api.delete(`/applications/${app.id}`)
		}

		showCleanupModal.value = false
		await loadApplications()
	} catch (error) {
		console.error('Failed to cleanup applications:', error)
	}
}

// Lifecycle
onMounted(() => {
	// Check if already authenticated (e.g., from session storage)
})

onUnmounted(() => {
	stopAutoRefresh()
})
</script>

<style lang="scss" scoped>
@use 'sass:color';

.hr-dashboard {
	min-height: 100vh;
	background-color: $color-light-gray;

	// Login
	&__login {
		@include flex-center;
		min-height: 100vh;
		background-color: $color-white;
	}

	&__login-card {
		@include card;
		@include flex-column;
		@include flex-center;
		gap: $spacing-lg;
		width: 100%;
		max-width: 402px;
		padding: $spacing-xl;
	}

	&__login-logo {
		height: 60px;
		width: auto;
	}

	&__login-title {
		@include title-font;
	}

	&__login-text {
		@include body-font;
		text-align: center;
	}

	&__login-error {
		@include body-font;
		color: $color-red;
	}

	// Content
	&__content {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: $color-light-gray;
	}

	// Header
	&__header {
		@include flex-between;
		flex-shrink: 0;
		padding: $spacing-lg;
		padding-bottom: 0;
		max-width: 1440px;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
		flex-wrap: wrap;
		gap: $spacing-md;
	}

	&__scrollable {
		flex: 1;
		overflow: hidden;
		padding: 12px;

		> div {
			max-width: 1440px;
			margin: 0 auto;
			padding: $spacing-lg;
		}
	}

	&__header-left {
		@include flex-column;
	}

	&__title {
		@include title-font;
	}

	&__subtitle {
		@include body-font;
		color: $color-gray;
	}

	&__header-right {
		display: flex;
		gap: $spacing-sm;
		flex-wrap: wrap;
	}

	&__header-btn {
		height: 42px;
		padding: 12px 6px;
		border-radius: $border-radius-md;
		border: none;
		text-transform: uppercase;
		font-family: $font-title;
		font-weight: $font-weight-bold;
		font-size: 24px;
		line-height: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	&__header-btn--dark {
		@include button-dark;
		padding: 12px 6px;
	}

	&__header-btn--border {
		border: 1px solid $color-dark-gray;
	}

	&__header-btn--yellow {
		@include button-yellow;
		padding: 12px 6px;
	}

	&__header-btn--red {
		@include button-red;
		padding: 12px 6px;
	}

	// Section title
	&__section-title {
		@include subtitle-font;
		margin-bottom: $spacing-lg;
	}

	// Stats
	&__stats {
		margin-bottom: $spacing-xl;
	}

	&__stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: $spacing-lg;
	}

	// Upcoming
	&__upcoming {
		margin-bottom: $spacing-xl;
	}

	&__upcoming-list {
		@include flex-column;
		gap: $spacing-md;
	}

	// Applications
	&__applications {
		margin-bottom: $spacing-xl;
	}

	&__filters {
		@include flex-between;
		gap: $spacing-md;
		margin-bottom: $spacing-lg;
	}

	&__filter-group {
		display: flex;
		align-items: center;
		gap: $spacing-sm;
	}

	&__filter-label {
		@include body-font;
	}

	&__filter-info {
		display: flex;
		gap: $spacing-lg;
		@include body-font;
		color: $color-gray;
	}

	&__applications-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
		gap: $spacing-md;
	}

	&__pagination {
		@include flex-center;
		margin-top: $spacing-lg;
	}

	&__empty {
		@include body-font;
		text-align: center;
		padding: $spacing-xl;
		color: $color-gray;
	}
}

// Stat Card
.stat-card {
	@include card;
	@include flex-column;
	@include flex-center;
	gap: $spacing-sm;
	padding: $spacing-xl;

	&__value {
		font-size: 48px;
		font-weight: $font-weight-bold;
		color: $color-dark-gray;
	}

	&__label {
		@include body-font;
		color: $color-gray;
		display: flex;
		align-items: center;
		gap: $spacing-xs;

		.el-icon {
			font-size: 18px;
		}
	}
}

// Interview Card
.interview-card {
	@include card;
	display: flex;
	gap: $spacing-lg;
	align-items: stretch;

	&__date {
		@include flex-column;
		@include flex-center;
		min-width: 100px;
		padding: $spacing-md;
		background-color: $color-light-gray;
		border-radius: $border-radius-md;
	}

	&__day {
		font-size: 48px;
		font-weight: $font-weight-bold;
		line-height: 1;
	}

	&__month {
		@include subtitle-font;
		text-transform: capitalize;
	}

	&__info {
		flex: 1;
		@include flex-column;
		gap: $spacing-xs;
	}

	&__name {
		@include subtitle-font;
		margin-bottom: $spacing-sm;
	}

	&__detail {
		@include body-font;
	}

	&__actions {
		@include flex-column;
		gap: $spacing-sm;
		justify-content: center;
	}
}

// Application Card
.application-card {
	@include card;
	@include flex-column;
	gap: 0;
	padding: 0;
	overflow: hidden;

	&__header {
		@include flex-between;
		padding: $spacing-md;
		background-color: $color-white;
		border-bottom: 1px solid $color-light-gray;
	}

	&__name {
		@include subtitle-font;
		font-size: 18px;
	}

	&__age {
		@include subtitle-font;
		font-size: 18px;
		color: $color-gray;
	}

	&__body {
		@include flex-column;
		gap: 8px;
		padding: $spacing-md;
	}

	&__row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		@include body-font;
		gap: $spacing-md;
		min-height: 28px;

		&--status {
			align-items: center;
		}

		&--confirmed {
			padding-top: $spacing-sm;
			border-top: 1px solid $color-light-gray;
			margin-top: $spacing-xs;
		}

		&--button {
			margin-top: $spacing-sm;
			justify-content: flex-start;
		}
	}

	&__label {
		flex-shrink: 0;
		font-weight: $font-weight-regular;
		color: $color-dark-gray;
		min-width: 80px;
	}

	&__value {
		flex: 1;
		text-align: right;
		font-weight: $font-weight-regular;
		color: $color-dark-gray;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&__status-select {
		flex: 1;
		max-width: 60%;

		:deep(.el-input__wrapper) {
			padding: 2px 8px;
			min-height: 28px;
			font-size: 12px;
		}

		:deep(.el-input__inner) {
			height: 24px;
			font-size: 12px;
		}

		:deep(.el-input__suffix) {
			display: flex;
			align-items: center;
		}
	}
}

// Application Detail
.application-detail {
	@include flex-column;
	gap: $spacing-lg;

	&__section {
		@include flex-column;
		gap: $spacing-sm;

		h3 {
			@include subtitle-font;
			font-size: 18px;
			margin-bottom: $spacing-xs;
		}

		p {
			@include body-font;
		}
	}

	&__slot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: $spacing-md;
		background-color: $color-light-gray;
		border-radius: $border-radius-md;
		border: 1px solid $color-dark-gray;
	}

	&__slot-actions {
		display: flex;
		gap: $spacing-sm;
		align-items: center;
	}

	&__slot-info {
		display: flex;
		gap: $spacing-md;
		align-items: center;
		flex-wrap: wrap;
	}

	&__slot-priority {
		@include body-bold-font;
		min-width: 80px;
	}

	&__slot-date {
		@include body-font;
		min-width: 100px;
	}

	&__slot-time {
		@include body-font;
		font-weight: $font-weight-medium;
		min-width: 60px;
	}

	&__slot-type {
		@include body-font;
		font-size: 11px;
		padding: 2px 8px;
		background-color: $color-white;
		border-radius: $border-radius-sm;
	}

	&__change-time {
		margin-top: $spacing-lg;
		padding: $spacing-md;
		background-color: $color-yellow;
		border-radius: $border-radius-md;
		border: 1px dashed $color-yellow;

		h4 {
			@include body-bold-font;
			margin-bottom: $spacing-md;
		}
	}

	&__custom-time {
		display: flex;
		gap: $spacing-sm;
		align-items: center;
	}

	&__confirmed-badge {
		@include body-bold-font;
		font-size: 11px;
		padding: 4px 12px;
		background-color: $color-green;
		color: $color-white;
		border-radius: $border-radius-sm;
		white-space: nowrap;
	}
}

// Time Slots Manager
.time-slots-manager {
	@include flex-column;
	gap: $spacing-xl;

	&__description {
		@include body-font;
		color: $color-dark-gray;
	}

	&__calendar {
		width: 100%;
		border: 1px solid $color-light-gray;
		border-radius: $border-radius-md;
		overflow: hidden;

		// Remove Element Plus default padding from calendar cells
		:deep(.el-calendar-table) {
			td {
				padding: 0;
				border: 1px solid $color-light-gray;
			}

			// Override Element Plus is-selected styling
			td.is-selected,
			td.is-today {
				background-color: transparent !important;
			}

			.el-calendar-day {
				padding: 0;

				&:hover {
					background-color: transparent !important;
				}
			}
		}
	}

	&__selected {
		@include flex-column;
		gap: $spacing-md;
		padding: $spacing-lg;
		background-color: $color-light-gray;
		border-radius: $border-radius-md;
	}

	&__selected-header {
		display: flex;
		justify-content: space-between;
		align-items: center;

		h3 {
			@include subtitle-font;
			font-size: 18px;
			margin: 0;
		}
	}

	&__add {
		@include flex-column;
		gap: $spacing-md;

		h3 {
			@include subtitle-font;
			font-size: 18px;
		}
	}

	&__form {
		display: flex;
		gap: $spacing-md;
		flex-wrap: wrap;
		align-items: center;
	}

	&__list {
		@include flex-column;
		gap: $spacing-md;

		h3 {
			@include subtitle-font;
			font-size: 18px;
		}
	}

	&__empty {
		@include body-font;
		color: $color-dark-gray;
		padding: $spacing-lg;
		text-align: center;
		background-color: $color-white;
		border-radius: $border-radius-md;
		border: 1px dashed $color-light-gray;
	}

	&__items {
		@include flex-column;
		gap: $spacing-sm;
	}
}

.calendar-day {
	min-height: 80px;
	padding: $spacing-sm;
	cursor: pointer;
	transition: all 0.2s ease;
	@include flex-column;
	align-items: flex-start;
	justify-content: flex-start;
	gap: $spacing-xs;
	width: 100%;
	height: 100%;

	&:hover {
		background-color: #e8e8e8;
	}

	&--has-slots {
		background-color: $color-dark-gray;
		color: $color-white;

		&:hover {
			background-color: color.adjust($color-dark-gray, $lightness: 10%);
		}

		.calendar-day__date {
			color: $color-white;
		}

		.calendar-day__count {
			color: $color-dark-gray;
			background-color: $color-white;
		}
	}

	&--past {
		opacity: 0.4;
		pointer-events: none;
		cursor: default;
	}

	&--selected {
		background-color: $color-yellow !important;
		color: $color-dark-gray !important;

		.calendar-day__date {
			color: $color-dark-gray;
		}

		.calendar-day__count {
			color: $color-yellow;
			background-color: $color-dark-gray;
		}
	}

	&__date {
		@include body-font;
		font-weight: $font-weight-medium;
		font-size: 14px;
	}

	&__slots {
		width: 100%;
	}

	&__count {
		@include body-font;
		font-size: 12px;
		color: $color-red;
		background-color: $color-light-gray;
		padding: 2px 6px;
		border-radius: $border-radius-sm;
		display: inline-block;
	}
}

.time-slot-item {
	display: flex;
	align-items: center;
	gap: $spacing-md;
	padding: $spacing-md;
	background-color: $color-white;
	border-radius: $border-radius-md;
	border: 1px solid $color-light-gray;

	&__date {
		flex: 1;
		@include body-font;
		font-weight: $font-weight-medium;
	}

	&__time {
		@include body-font;
		color: $color-dark-gray;
	}

	&__type {
		@include body-font;
		font-size: 12px;
		color: $color-dark-gray;
		padding: 2px 8px;
		background-color: $color-light-gray;
		border-radius: $border-radius-sm;
	}
}

// Cleanup Manager
.cleanup-manager {
	@include flex-column;
	gap: $spacing-xl;

	&__description {
		@include body-font;
		color: $color-dark-gray;
	}

	&__form {
		@include flex-column;
		gap: $spacing-md;
	}

	&__field {
		@include flex-column;
		gap: $spacing-sm;

		label {
			@include body-font;
			font-weight: $font-weight-medium;
		}
	}

	&__preview {
		padding: $spacing-md;
		background-color: $color-light-gray;
		border-radius: $border-radius-md;

		p {
			@include body-font;
			margin: 0;
		}
	}
}
</style>

