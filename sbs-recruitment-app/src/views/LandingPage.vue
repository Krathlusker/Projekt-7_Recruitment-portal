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
					<h1 class="landing-page__intro-title">Hvad er SBS jobportal?</h1>
					<p class="landing-page__intro-text">
						Siden 1964 har Scandinavian Brake Systems (SBS) arbejdet på at udvikle og producere bremseteknologi til både
						2-og 4 hjulede køretøjer. Vi producerer lokalt, men vores løsninger og produkter bliver brugt over hele
						verden.
					</p>
					<p class="landing-page__intro-text">
						Hos SBS kan du blive en del af et stort team af skønne medarbejder hvor du har mulighed for periodisk at
						være i vores pakkeri eller over længere tid, udvikle dig selv som industritekniker i vores produktion.
					</p>
				</div>
			</section>

			<!-- Job Cards Section -->
			<section class="landing-page__jobs">
				<div class="landing-page__jobs-container">
					<h2 class="landing-page__jobs-title">Hvad kan du blive hos os?</h2>
					<p class="landing-page__jobs-intro">
						SBS er en virksomhed med mange forskellige muligheder. Hvis du er ungarbejder og mangler et job i dit
						sabbatår så er vores pakkeri det perfekte job.
					</p>
					<p class="landing-page__jobs-intro">
						Hvis du er i gang med eller færdig med din uddannelse indenfor maskiner, industri eller teknik. Så er du
						måske mere interesseret i at arbejde i vores produktion, hvor du får dybdegående forståelser for vores
						proces og de værktøjer vi bruger til at skabe førende bremseklods løsninger verden over.
					</p>
					<div class="landing-page__jobs-grid">
						<el-card
							v-for="job in jobs"
							:key="job.id"
							class="el-image-card"
							shadow="hover"
							@click="openJobModal(job.id)"
						>
							<div class="el-image-card__image">
								<img :src="job.image" :alt="job.title" />
							</div>
							<div class="el-image-card__content">
								<h3 class="el-image-card__title">{{ job.title }}</h3>
							</div>
							<el-button class="btn-light el-image-card__button">Læs mere</el-button>
						</el-card>
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
						<div v-for="benefit in benefits.slice(0, 6)" :key="benefit.id" class="el-info-card">
							<div class="el-info-card__icon">
								<el-icon :size="48">
									<component :is="benefit.icon" />
								</el-icon>
							</div>
							<h3 class="el-info-card__title">{{ benefit.title }}</h3>
							<p class="el-info-card__text">{{ benefit.text }}</p>
						</div>
						<div class="landing-page__benefits-last-row">
							<div v-for="benefit in benefits.slice(6)" :key="benefit.id" class="el-info-card">
								<div class="el-info-card__icon">
									<el-icon :size="48">
										<component :is="benefit.icon" />
									</el-icon>
								</div>
								<h3 class="el-info-card__title">{{ benefit.title }}</h3>
								<p class="el-info-card__text">{{ benefit.text }}</p>
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
						<el-link href="https://dk.linkedin.com/company/scandinavian-brake-systems-a-s" target="_blank" :underline="false" class="social-link">
							<AkLinkedInFill />
						</el-link>
						<el-link href="https://www.facebook.com/sbsbrakes" target="_blank" :underline="false" class="social-link">
							<FaBandsFacebookF />
						</el-link>
						<el-link href="https://www.instagram.com/sbsbrakes/" target="_blank" :underline="false" class="social-link">
							<AkInstagramFill />
						</el-link>
						<el-link href="https://www.youtube.com/@sbsbrakes" target="_blank" :underline="false" class="social-link">
							<BsYoutube />
						</el-link>
					</div>

					<!-- Nyttige links -->
					<div class="landing-page__footer-section">
						<h4 class="landing-page__footer-title">Nyttige links</h4>
						<el-link href="https://sfriction.dk" target="_blank" class="footer-link">SBS</el-link>
						<el-link href="https://sfriction.dk/karriere" target="_blank" class="footer-link">SBS - Career</el-link>
						<el-link href="https://www.brembo.com" target="_blank" class="footer-link">Brembo</el-link>
					</div>

					<!-- SBS A/S Info -->
					<div class="landing-page__footer-section">
						<h4 class="landing-page__footer-title">SBS A/S</h4>
						<el-link
							href="https://www.google.com/maps/place/SBS+Friction+A%2FS/@55.0768882,10.5817289"
							target="_blank"
							class="footer-link footer-link--icon"
						>
							<el-icon :size="15">
								<Location />
							</el-icon>
							<span>Kuopiovej 11, 5700 Svendborg</span>
						</el-link>
						<el-link href="tel:+4563211515" class="footer-link footer-link--icon">
							<el-icon :size="15">
								<Phone />
							</el-icon>
							<span>+45 6321 15 15</span>
						</el-link>
						<el-link href="mailto:sbs@sbs.dk?subject=Recruitment%20enquirie" class="footer-link footer-link--icon">
							<el-icon :size="15">
								<Message />
							</el-icon>
							<span>SBS@SBS.dk</span>
						</el-link>
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
						<el-link href="/privacy" class="footer-link footer-link--small">Persondata</el-link>
						<span class="landing-page__legal-separator"></span>
						<el-link href="/cookies" class="footer-link footer-link--small">Cookiepolitik</el-link>
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
import { AkLinkedInFill, AkInstagramFill } from '@kalimahapps/vue-icons/ak'
import { BsYoutube } from '@kalimahapps/vue-icons/bs'
import { FaBandsFacebookF } from '@kalimahapps/vue-icons/fa'
import { LaTshirtSolid, MdOutlinedDiscount, ReHomeWifiLine, PhIsland, TaOutlineMassage, MdRoundFitnessCenter, FlFood, CaFruitBowl } from '@kalimahapps/vue-icons';
import {
	VideoPlay,
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
		icon: shallowRef(LaTshirtSolid),
		title: 'Arbejdsuniformer',
		text: 'Vi sørger for det rigtige arbejdstøj'
	},
	{
		id: 2,
		icon: shallowRef(MdOutlinedDiscount),
		title: 'Selskabs rabatter',
		text: 'Vi samarbejder med en bred vifte af lokale netværkspartnere – lige fra malerværksteder til motorcykelforhandlere.'
	},
	{
		id: 3,
		icon: shallowRef(ReHomeWifiLine),
		title: 'Gratis Wifi',
		text: 'Udstyr dit hjemmekontor med højhastighedsforbindelse.'
	},
	{
		id: 4,
		icon: shallowRef(PhIsland),
		title: '6 ugers ferie',
		text: 'Nyd en ekstra uges ferie, så du kan lade op og yde dit bedste.'
	},
	{
		id: 5,
		icon: shallowRef(TaOutlineMassage),
		title: 'Massage',
		text: 'Få løsnet spændte og ømme led med en behandling hos vores interne massør.'
	},
	{
		id: 6,
		icon: shallowRef(MdRoundFitnessCenter),
		title: 'Træningscenter',
		text: 'Vi er en virksomhed med fokus på både krop og sind. Nyd en god træning i vores kontorfitness.'
	},
	{
		id: 7,
		icon: shallowRef(FlFood),
		title: 'Frokost i vores kantine',
		text: 'Hårdt arbejde kræver god mad. Nyd lækkerierne fra vores kantine.'
	},
	{
		id: 8,
		icon: shallowRef(CaFruitBowl),
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
		border-bottom: $border-width-thin solid $color-light-gray;
		z-index: $z-index-header;
		transition: all $transition-duration-slow $transition-ease-smooth;
		flex-shrink: 0;

		&--scrolled {
			.landing-page__logo {
				height: $font-size-button;
			}

			.landing-page__header-title {
				font-size: $font-size-button;
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
		height: $element-height-standard;
		width: auto;
		transition: height $transition-duration-slow $transition-ease-smooth;
	}

	&__header-title {
		font-family: $font-title;
		font-weight: $font-weight-medium;
		font-size: $font-size-title;
		color: $color-dark-gray;
		margin: 0;
		text-transform: uppercase;
		transition: font-size $transition-duration-slow $transition-ease-smooth;
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
		height: $hero-image-height;
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

	&__footer-section {
		@include flex-column;
		align-items: flex-start;
		gap: $spacing-xs;
		padding: $spacing-md 0;
		width: 100%;
	}

	&__footer-title {
		font-family: $font-title;
		font-weight: 500;
		font-size: $font-size-title;
		color: $color-white;
		margin: 0 0 $spacing-sm 0;
	}

	&__copyright {
		display: flex;
		align-items: center;
		gap: $spacing-xs;
		font-family: $font-body;
		font-weight: 400;
		font-size: $font-size-body;
		color: $color-white;
	}

	&__legal {
		display: flex;
		align-items: center;
		gap: $spacing-xs;
	}

	&__legal-separator {
		width: $spacing-xs;
		height: $spacing-xs;
		background-color: $color-white;
		border-radius: 50%;
	}
}

svg {
  stroke-linejoin: round;  /* Runder hjørner hvor linjer mødes */
  stroke-linecap: round;   /* Runder enden af linjer */
}
</style>
