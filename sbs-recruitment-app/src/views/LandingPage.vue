<template>
	<div class="landing-page">
		<!-- Header -->
		<header class="landing-page__header" :class="{ 'landing-page__header--scrolled': isScrolled }">
			<div class="landing-page__header-container">
				<img src="/logo.svg" alt="SBS Friction A/S" class="landing-page__logo" />
				<h1 class="landing-page__header-title">JOB PORTAL</h1>
			</div>
		</header>

		<OverlayScrollbarsComponent
			class="landing-page__scrollable"
			:options="{
				scrollbars: {
					theme: 'os-theme-dark',
					autoHide: 'scroll',
					autoHideDelay: 1000
				}
			}"
			defer
			@osScroll="handleScroll"
		>
			<!-- Hero Section -->
			<section class="landing-page__hero">
			<div class="landing-page__hero-content">
				<div class="landing-page__hero-video">
					<div class="landing-page__hero-video-placeholder">
						<el-icon :size="64">
							<VideoPlay />
						</el-icon>
						<span>Video afspilles her</span>
					</div>
				</div>
			</div>
		</section>

		<!-- Introduction Section -->
		<section class="landing-page__intro">
			<div class="landing-page__intro-container">
				<h1 class="landing-page__intro-title">Vi er SBS</h1>
				<p class="landing-page__intro-text">
					Siden 1964 har Scandinavian Brake Systems (SBS) arbejdet på at udvikle og producere bremseteknologi til både
					2-og 4 hjulede køretøjer. Vi producerer lokalt, men vores løsninger og produkter bliver brugt over hele
					verden.
				</p>
				<p class="landing-page__intro-text">
					Hos SBS kan du blive en del af et stort team af skønne medarbejder hvor du har mulighed for periodisk at være
					i vores pakkeri eller over længere tid, udvikle dig selv som industritekniker i vores produktion.
				</p>
			</div>
		</section>

		<!-- Job Cards Section -->
		<section class="landing-page__jobs">
			<div class="landing-page__jobs-container">
				<h2 class="landing-page__jobs-title">Hvad kan du blive hos os?</h2>
				<p class="landing-page__jobs-intro">
					SBS er en virksomhed med mange forskellige muligheder. Hvis du er ungarbejder og mangler et job i dit sabbatår
					så er vores pakkeri det perfekte job.
				</p>
				<p class="landing-page__jobs-intro">
					Hvis du er i gang med eller færdig med din uddannelse indenfor maskiner, industri eller teknik. Så er du måske
					mere interesseret i at arbejde i vores produktion, hvor du får dybdegående forståelser for vores proces og de
					værktøjer vi bruger til at skabe førende bremseklods løsninger verden over.
				</p>
				<div class="landing-page__jobs-grid">
					<div v-for="job in jobs" :key="job.id" class="job-card" @click="openJobModal(job.id)">
						<div class="job-card__image">
							<img :src="job.image" :alt="job.title" />
						</div>
						<div class="job-card__content">
							<h3 class="job-card__title">{{ job.title }}</h3>
						</div>
					<el-button class="btn-light job-card__button">Læs mere</el-button>
					</div>
				</div>
			</div>
		</section>

		<!-- Benefits Section -->
		<section class="landing-page__benefits">
			<div class="landing-page__benefits-container">
				<h2 class="landing-page__benefits-title">Fordele hos SBS</h2>
				<p class="landing-page__benefits-intro">
					Hos SBS er der en række medarbejder fordele som alle vores ansatte nyder godt af!
				</p>
				<div class="landing-page__benefits-grid">
					<div v-for="benefit in benefits.slice(0, 6)" :key="benefit.id" class="benefit-card">
						<div class="benefit-card__icon">
							<el-icon :size="48">
								<component :is="benefit.icon" />
							</el-icon>
						</div>
						<h3 class="benefit-card__title">{{ benefit.title }}</h3>
						<p class="benefit-card__text">{{ benefit.text }}</p>
					</div>
					<div class="landing-page__benefits-last-row">
						<div v-for="benefit in benefits.slice(6)" :key="benefit.id" class="benefit-card">
							<div class="benefit-card__icon">
								<el-icon :size="48">
									<component :is="benefit.icon" />
								</el-icon>
							</div>
							<h3 class="benefit-card__title">{{ benefit.title }}</h3>
							<p class="benefit-card__text">{{ benefit.text }}</p>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Footer -->
		<footer class="landing-page__footer">
			<div class="landing-page__footer-container">
				<!-- Social Media -->
				<div class="landing-page__social">
					<a href="https://linkedin.com/company/sbs-friction" target="_blank" class="landing-page__social-link">
						<el-icon :size="20">
							<Link />
						</el-icon>
					</a>
					<a href="https://facebook.com/sbsfriction" target="_blank" class="landing-page__social-link">
						<el-icon :size="20">
							<ChatDotRound />
						</el-icon>
					</a>
					<a href="https://instagram.com/sbsfriction" target="_blank" class="landing-page__social-link">
						<el-icon :size="20">
							<Picture />
						</el-icon>
					</a>
					<a href="https://youtube.com/sbsfriction" target="_blank" class="landing-page__social-link">
						<el-icon :size="20">
							<VideoPlay />
						</el-icon>
					</a>
				</div>

				<!-- Nyttige links -->
				<div class="landing-page__footer-section">
					<h4 class="landing-page__footer-title">Nyttige links</h4>
					<div class="landing-page__footer-links">
						<a href="https://sfriction.dk" target="_blank" class="landing-page__footer-link">SBS</a>
						<a href="https://sfriction.dk/karriere" target="_blank" class="landing-page__footer-link">SBS - Career</a>
						<a href="https://www.brembo.com" target="_blank" class="landing-page__footer-link">Brembo</a>
					</div>
				</div>

				<!-- SBS A/S Info -->
				<div class="landing-page__footer-section">
					<h4 class="landing-page__footer-title">SBS A/S</h4>
					<div class="landing-page__footer-info">
						<a
							href="https://www.google.com/maps/place/SBS+Friction+A%2FS/@55.0768882,10.5817289"
							target="_blank"
							class="landing-page__footer-info-link"
						>
							<el-icon :size="15">
								<Location />
							</el-icon>
							<span>Kuopiovej 11, 5700 Svendborg</span>
						</a>
						<a href="tel:+4563211515" class="landing-page__footer-info-link">
							<el-icon :size="15">
								<Phone />
							</el-icon>
							<span>+45 6321 15 15</span>
						</a>
						<a href="mailto:sbs@sbs.dk?subject=Recruitment%20enquirie" class="landing-page__footer-info-link">
							<el-icon :size="15">
								<Message />
							</el-icon>
							<span>SBS@SBS.dk</span>
						</a>
					</div>
				</div>

				<!-- Copyright -->
				<div class="landing-page__copyright">
					<el-icon :size="15">
						<CircleCheck />
					</el-icon>
					<span>Scandinavian Brake Systems A/S (SBS)</span>
				</div>

				<!-- Legal Links -->
				<div class="landing-page__legal">
					<a href="/privacy" class="landing-page__legal-link">Persondata</a>
					<span class="landing-page__legal-separator"></span>
					<a href="/cookies" class="landing-page__legal-link">Cookiepolitik</a>
				</div>
			</div>
		</footer>
		</OverlayScrollbarsComponent>

		<!-- Floating Apply Button -->
		<FloatingApplyButton @click="openApplicationModal()" />

		<!-- Job Detail Modal -->
		<JobModal
			v-model:visible="showJobModal"
			:job-id="selectedJobId"
			@close="closeJobModal"
			@apply="openApplicationFromJobModal"
		/>

		<!-- Application Modal -->
		<ApplicationModal
			v-model:visible="showApplicationModal"
			:selected-job="selectedJob"
			@close="closeApplicationModal"
		/>
	</div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted } from 'vue'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import {
	VideoPlay,
	Link,
	ChatDotRound,
	Picture,
	Clock,
	Money,
	User,
	House,
	Bicycle,
	Coffee,
	Medal,
	Present,
	Location,
	Phone,
	Message,
	CircleCheck
} from '@element-plus/icons-vue'
import FloatingApplyButton from '@/components/FloatingApplyButton.vue'
import ApplicationModal from '@/components/ApplicationModal.vue'
import JobModal from '@/components/JobModal.vue'
import type { JobPosition } from '@/types'

// Scroll state
const isScrolled = ref(false)
let lastScrollY = 0
let isAutoScrolling = false
let scrollTimeout: number | null = null

const handleScroll = (instance: any) => {
	const viewport = instance.elements().viewport
	const scrollY = viewport?.scrollTop || 0
	const scrollingUp = scrollY < lastScrollY

	// Clear eksisterende timeout
	if (scrollTimeout) {
		clearTimeout(scrollTimeout)
		scrollTimeout = null
	}

	if (scrollingUp && scrollY > 0 && scrollY <= 50) {
		// Vent 150ms efter sidste scroll før auto-scroll starter
		scrollTimeout = window.setTimeout(() => {
			const currentScrollY = viewport?.scrollTop || 0
			if (currentScrollY > 0 && currentScrollY <= 50 && viewport) {
				isAutoScrolling = true
				viewport.scrollTo({ top: 0, behavior: 'smooth' })
				setTimeout(() => {
					isAutoScrolling = false
				}, 300)
			}
		}, 150)
	} else {
		isScrolled.value = scrollY > 50
	}

	lastScrollY = scrollY
}

const handleWheel = (e: WheelEvent) => {
	// Blokér scroll op mens vi auto-scroller, men tillad scroll ned
	if (isAutoScrolling && e.deltaY < 0) {
		e.preventDefault()
	}
}

onMounted(() => {
	// Window scroll listeners not needed when using OverlayScrollbars
	window.addEventListener('wheel', handleWheel, { passive: false })
})

onUnmounted(() => {
	window.removeEventListener('wheel', handleWheel)
	if (scrollTimeout) {
		clearTimeout(scrollTimeout)
	}
})

// Modal states
const showJobModal = ref(false)
const showApplicationModal = ref(false)
const selectedJobId = ref('')
const selectedJob = ref<JobPosition | ''>('')

// Job listings - Job cards viser ikke beskrivelser, kun titler og billeder
const jobs = ref([
	{
		id: 'pakkeriet',
		title: 'Pakkeriet',
		image: 'https://picsum.photos/seed/pakkeriet/400/300'
	},
	{
		id: 'produktion',
		title: 'Produktion',
		image: 'https://picsum.photos/seed/produktion/400/300'
	},
	{
		id: 'andre',
		title: 'Andre stillinger',
		image: 'https://picsum.photos/seed/andre/400/300'
	}
])

// Benefits fra Figma med titel og beskrivelse
const benefits = ref([
	{
		id: 1,
		icon: shallowRef(User),
		title: 'Arbejdsuniformer',
		text: 'Vi sørger for det rigtige arbejdstøj'
	},
	{
		id: 2,
		icon: shallowRef(Money),
		title: 'Selskabs rabatter',
		text: 'Vi samarbejder med en bred vifte af lokale netværkspartnere – lige fra malerværksteder til motorcykelforhandlere.'
	},
	{
		id: 3,
		icon: shallowRef(House),
		title: 'Gratis Wifi',
		text: 'Udstyr dit hjemmekontor med højhastighedsforbindelse.'
	},
	{
		id: 4,
		icon: shallowRef(Clock),
		title: '6 ugers ferie',
		text: 'Nyd en ekstra uges ferie, så du kan lade op og yde dit bedste.'
	},
	{
		id: 5,
		icon: shallowRef(Medal),
		title: 'Massage',
		text: 'Få løsnet spændte og ømme led med en behandling hos vores interne massør.'
	},
	{
		id: 6,
		icon: shallowRef(Bicycle),
		title: 'Træningscenter',
		text: 'Vi er en virksomhed med fokus på både krop og sind. Nyd en god træning i vores kontorfitness.'
	},
	{
		id: 7,
		icon: shallowRef(Coffee),
		title: 'Frokost i vores kantine',
		text: 'Hårdt arbejde kræver god mad. Nyd lækkerierne fra vores kantine.'
	},
	{
		id: 8,
		icon: shallowRef(Present),
		title: 'Frisk frugt hver dag',
		text: 'Forkæl dig selv med frisk frugt fra lokale leverandører.'
	}
])

// Job Modal handlers
const openJobModal = (jobId: string) => {
	selectedJobId.value = jobId
	showJobModal.value = true
}

const closeJobModal = () => {
	showJobModal.value = false
}

const openApplicationFromJobModal = (jobId: string) => {
	selectedJob.value = jobId as JobPosition
	showApplicationModal.value = true
}

// Application Modal handlers
const openApplicationModal = (jobId?: string) => {
	if (jobId) {
		selectedJob.value = jobId as JobPosition
	}
	showApplicationModal.value = true
}

const closeApplicationModal = () => {
	showApplicationModal.value = false
	selectedJob.value = ''
}
</script>

<style lang="scss" scoped>
.landing-page {
	min-height: 100vh;
	height: 100vh;
	background-color: $color-white;
	display: flex;
	flex-direction: column;
	overflow: hidden;

	&__scrollable {
		flex: 1;
		overflow: hidden;
	}

	// Header
	&__header {
		background-color: $color-white;
		border-bottom: 1px solid $color-light-gray;
		z-index: $z-index-header;
		transition: all 0.3s ease-in-out;
		flex-shrink: 0;

		&--scrolled {
			.landing-page__logo {
				height: 18px;
			}

			.landing-page__header-title {
				font-size: 18px;
			}
		}
	}

	&__header-container {
		@include flex-between;
		@include content-container;
		padding-top: $spacing-md;
		padding-bottom: $spacing-md;
	}

	&__logo {
		height: 42px;
		width: auto;
		transition: height 0.3s ease-in-out;
	}

	&__header-title {
		font-family: $font-title;
		font-weight: $font-weight-medium;
		font-size: $font-size-title;
		color: $color-dark-gray;
		margin: 0;
		text-transform: uppercase;
		transition: font-size 0.3s ease-in-out;
	}

	// Hero
	&__hero {
		background-color: $color-dark-gray;
	}

	&__hero-content {
		max-width: $max-content-width;
		margin: 0 auto;
		width: 100%;
	}

	&__hero-video {
		width: 100%;
		height: 420px;
		background-color: $color-dark-gray;
		overflow: hidden;
	}

	&__hero-video-placeholder {
		@include flex-center;
		@include flex-column;
		gap: $spacing-md;
		height: 100%;
		color: $color-white;
	}

	// Introduction
	&__intro {
		@include section-padding;
	}

	&__intro-container {
		@include content-container;
	}

	&__intro-title {
		@include section-title;
	}

	&__intro-text {
		@include section-intro;

		&:last-child {
			margin-bottom: 0;
		}
	}

	// Jobs
	&__jobs {
		@include section-padding;
		background-color: $color-light-gray;
	}

	&__jobs-container {
		@include content-container;
	}

	&__jobs-title {
		@include section-title;
	}

	&__jobs-intro {
		@include section-intro;

		&:last-of-type {
			margin-bottom: $spacing-xl;
		}
	}

	&__jobs-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: $spacing-lg;

		@media (min-width: $breakpoint-lg) {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	// Benefits
	&__benefits {
		@include section-padding;
	}

	&__benefits-container {
		@include content-container;
	}

	&__benefits-title {
		@include section-title;
	}

	&__benefits-intro {
		@include section-intro;
		margin-bottom: $spacing-xl;
	}

	&__benefits-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: $spacing-xl;

		@include tablet {
			grid-template-columns: repeat(2, 1fr);
		}

		@include mobile {
			grid-template-columns: 1fr;
		}
	}

	&__benefits-last-row {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: $spacing-xl;
		max-width: 66.666%;
		margin: 0 auto;

		@include tablet {
			grid-column: 1 / -1;
			max-width: 100%;
			grid-template-columns: repeat(2, 1fr);
		}

		@include mobile {
			grid-column: auto;
			max-width: 100%;
			grid-template-columns: 1fr;
		}
	}

	// Footer
	&__footer {
		background-color: $color-dark-gray;
		color: $color-white;
		padding: $spacing-lg $spacing-md $spacing-xl;
	}

	&__footer-container {
		@include flex-column;
		@include content-container;
		gap: $spacing-md;
		align-items: flex-start;
	}

	&__social {
		display: flex;
		gap: $spacing-sm;
	}

	&__social-link {
		@include flex-center;
		width: 36px;
		height: 36px;
		background-color: $color-white;
		border-radius: 50%;
		color: $color-dark-gray;
		transition: transform 0.2s ease;

		&:hover {
			transform: scale(1.1);
		}
	}

	&__footer-section {
		@include flex-column;
		gap: $spacing-md;
		padding: $spacing-md 0;
		width: 100%;
	}

	&__footer-title {
		font-family: 'Neo Sans W1G', sans-serif;
		font-weight: 500;
		font-size: 36px;
		color: $color-white;
		margin: 0;
	}

	&__footer-links {
		@include flex-column;
		gap: $spacing-xs;
	}

	&__footer-link {
		font-family: 'Helvetica Neue LT Pro', sans-serif;
		font-weight: 700;
		font-size: 18px;
		color: $color-white;
		text-decoration: none;
		border-bottom: 1px solid $color-white;
		display: inline-block;
		width: fit-content;

		&:hover {
			opacity: 0.8;
		}
	}

	&__footer-info {
		@include flex-column;
		gap: $spacing-xs;
	}

	&__footer-info-link {
		display: flex;
		align-items: center;
		gap: $spacing-xs;
		color: $color-white;
		text-decoration: none;

		span {
			font-family: 'Helvetica Neue LT Pro', sans-serif;
			font-weight: 700;
			font-size: 18px;
			border-bottom: 1px solid $color-white;
		}

		&:hover {
			opacity: 0.8;
		}
	}

	&__copyright {
		display: flex;
		align-items: center;
		gap: $spacing-xs;
		font-family: 'Helvetica Neue LT Pro', sans-serif;
		font-weight: 400;
		font-size: 12px;
		color: $color-white;
	}

	&__legal {
		display: flex;
		align-items: center;
		gap: $spacing-xs;
	}

	&__legal-link {
		font-family: 'Helvetica Neue LT Pro', sans-serif;
		font-weight: 700;
		font-size: 12px;
		color: $color-white;
		text-decoration: none;
		border-bottom: 1px solid $color-white;

		&:hover {
			opacity: 0.8;
		}
	}

	&__legal-separator {
		width: 6px;
		height: 6px;
		background-color: $color-white;
		border-radius: 50%;
	}
}

// Job Card Component
.job-card {
	position: relative;
	cursor: pointer;
	transition:
		transform 0.2s ease,
		box-shadow 0.2s ease;
	border-radius: $border-radius-lg;
	overflow: hidden;
	height: 282px;

	&:hover {
		transform: translateY(-6px);
		box-shadow: $shadow-modal;
	}

	&__image {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: $color-dark-gray;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	&__content {
		position: absolute;
		bottom: 72px;
		left: 12px;
	}

	&__title {
		font-family: $font-title;
		font-weight: $font-weight-medium;
		font-size: 24px;
		color: $color-white;
		margin: 0;
		text-shadow: 0 2px 4px rgba($color-dark-gray, 0.5);
	}

	&__description {
		@include body-font;
	}

	// Job card button - position and size based on Figma
	&__button {
		position: absolute;
		left: 12px;
		bottom: 12px;
		width: 97px;
		height: 44px;
		padding: $spacing-sm;
		font-size: 16px;
		font-weight: $font-weight-medium;
		text-transform: none;
	}
}

// Benefit Card Component
.benefit-card {
	@include flex-center;
	@include flex-column;
	gap: $spacing-sm;
	padding: $spacing-lg;
	text-align: center;

	&__icon {
		@include flex-center;
		width: 120px;
		height: 120px;
		background-color: $color-light-gray;
		border-radius: 50%;
		color: $color-dark-gray;
		margin-bottom: $spacing-sm;
	}

	&__title {
		@include body-bold-font;
		font-size: 14px;
		color: $color-dark-gray;
		margin: 0;
	}

	&__text {
		@include body-font;
		font-size: 12px;
		color: $color-dark-gray;
		line-height: 1.5;
		margin: 0;
	}
}
</style>
