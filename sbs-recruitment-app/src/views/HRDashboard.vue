<template>
	<div class="hr-dashboard">
		<!-- Login Screen -->
		<div v-if="!isAuthenticated" class="hr-dashboard__login">
			<div class="hr-dashboard__login-card">
				<img src="/logo.svg" alt="SBS Friction A/S" class="hr-dashboard__login-logo" />
				<h1 class="hr-dashboard__login-title">HR Dashboard</h1>
				<p class="hr-dashboard__login-text">Indtast adgangskode for at fortsaette</p>

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
					<el-button type="primary" :loading="isLoading" @click="handleLogin" class="hr-dashboard__login-btn">
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
					<el-button @click="loadApplications">
						<el-icon><Refresh /></el-icon>
						Opdater
					</el-button>
					<el-button @click="scrollToUpcoming"> Kommende samtaler </el-button>
					<el-button @click="scrollToApplications"> Alle ansgninger </el-button>
					<el-button type="danger" @click="handleLogout"> Log ud </el-button>
				</div>
			</header>

			<!-- Stats Section -->
			<section class="hr-dashboard__stats">
				<h2 class="hr-dashboard__section-title">Statistik</h2>
				<div class="hr-dashboard__stats-grid">
					<div class="stat-card">
						<span class="stat-card__value">{{ stats.totalApplications }}</span>
						<span class="stat-card__label">Ansgninger i alt</span>
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
							<el-button type="primary" @click="viewApplication(interview)"> Se ansgning </el-button>
							<el-button type="success" @click="markInterviewCompleted(interview.id)"> Afholdt </el-button>
						</div>
					</div>

					<div v-if="upcomingInterviews.length === 0" class="hr-dashboard__empty">Ingen kommende samtaler</div>
				</div>
			</section>

			<!-- All Applications Section -->
			<section ref="applicationsSection" class="hr-dashboard__applications">
				<h2 class="hr-dashboard__section-title">Alle ansgninger</h2>

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
							<span class="application-card__days">{{ getDaysRemaining(application.expiresAt) }}d</span>
						</div>

						<div class="application-card__separator" />

						<div class="application-card__body">
							<div class="application-card__row">
								<span>Modtaget:</span>
								<span>{{ formatDate(application.createdAt) }}</span>
							</div>
							<div class="application-card__row">
								<span>Status:</span>
								<el-select
									v-model="application.status"
									size="small"
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
								<span>Alder:</span>
								<span>{{ application.age }}</span>
							</div>
							<div class="application-card__row">
								<span>Email:</span>
								<span>{{ application.email }}</span>
							</div>
							<div class="application-card__row">
								<span>Telefon:</span>
								<span>{{ application.phone }}</span>
							</div>

							<div class="application-card__separator" />

							<div class="application-card__row">
								<span>Samtale aftalt:</span>
								<span>{{ application.confirmedSlot ? formatDateTime(application.confirmedSlot) : 'Ikke aftalt' }}</span>
							</div>
						</div>

						<el-button type="primary" class="application-card__btn" @click="viewApplication(application)">
							Se fuld ansgning
						</el-button>
					</div>

					<div v-if="paginatedApplications.length === 0" class="hr-dashboard__empty">Ingen ansgninger fundet</div>
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
		</div>

		<!-- Application Detail Dialog -->
		<el-dialog v-model="showDetailDialog" title="Ansgning detaljer" width="600px">
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
					<el-button type="primary" @click="downloadCV(selectedApplication.cvFileName)"> Download CV </el-button>
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
				<el-button @click="showDetailDialog = false">Luk</el-button>
				<el-button type="danger" @click="deleteApplication(selectedApplication?.id)"> Slet ansgning </el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
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

// Refs for scrolling
const upcomingSection = ref<HTMLElement | null>(null)
const applicationsSection = ref<HTMLElement | null>(null)

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
	showDetailDialog.value = true
}

// Scroll handlers
const scrollToUpcoming = () => {
	upcomingSection.value?.scrollIntoView({ behavior: 'smooth' })
}

const scrollToApplications = () => {
	applicationsSection.value?.scrollIntoView({ behavior: 'smooth' })
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

const getDaysRemaining = (expiresAt: string): number => {
	const now = new Date()
	const expires = new Date(expiresAt)
	const diff = expires.getTime() - now.getTime()
	return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
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
		max-width: 400px;
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

	&__login-btn {
		@include button-primary;
		width: 100%;
	}

	&__login-error {
		@include body-font;
		color: $color-red;
	}

	// Content
	&__content {
		max-width: 1440px;
		margin: 0 auto;
		padding: $spacing-lg;
	}

	// Header
	&__header {
		@include flex-between;
		margin-bottom: $spacing-xl;
		flex-wrap: wrap;
		gap: $spacing-md;
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
		flex-wrap: wrap;
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
	gap: $spacing-sm;

	&__header {
		@include flex-between;
	}

	&__name {
		@include subtitle-font;
		font-size: 18px;
	}

	&__days {
		@include subtitle-font;
		font-size: 18px;
		color: $color-gray;
	}

	&__separator {
		height: 1px;
		background-color: $color-light-gray;
		margin: $spacing-xs 0;
	}

	&__body {
		@include flex-column;
		gap: $spacing-xs;
	}

	&__row {
		@include flex-between;
		@include body-font;
	}

	&__btn {
		@include button-primary;
		margin-top: $spacing-sm;
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
}
</style>
