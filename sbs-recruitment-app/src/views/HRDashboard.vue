<template>
	<div class="hr-dashboard">
		<!-- Login Screen -->
		<div v-if="!isAuthenticated" class="hr-dashboard__login">
			<div class="hr-dashboard__login-card">
				<img src="/logo.svg" alt="SBS Friction A/S" class="hr-dashboard__login-logo" />
				<h1 class="hr-dashboard__login-title">HR Dashboard</h1>
				<el-text class="hr-dashboard__login-text">Indtast adgangskode for at fortsætte</el-text>

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
					<el-button :loading="isLoading" @click="handleLogin" class="btn-red"> Log ind </el-button>
				</el-form>

				<el-alert
					v-if="loginError"
					:title="loginError"
					type="error"
					:closable="false"
					show-icon
					class="hr-dashboard__login-error"
				/>
			</div>
		</div>

		<!-- Dashboard Content -->
		<div v-else class="hr-dashboard__content">
			<!-- Header -->
			<header class="hr-dashboard__header">
				<div class="hr-dashboard__header-left">
					<h1 class="hr-dashboard__title">HR Dashboard</h1>
					<el-text class="hr-dashboard__subtitle">
						<span
							class="hr-dashboard__status-dot"
							:class="{ 'hr-dashboard__status-dot--breathing': isBreathing }"
						></span>
						Sidst opdateret: {{ lastUpdated }}
					</el-text>
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
				ref="scrollableRef"
				class="hr-dashboard__scrollable"
				:options="{ scrollbars: { theme: 'os-theme-dark', autoHide: 'scroll', autoHideDelay: 1000 } }"
			>
				<div class="hr-dashboard__scrollable-content">
					<!-- Stats Section -->
					<section class="hr-dashboard__stats">
						<h2 class="hr-dashboard__section-title">Statistik</h2>
						<div class="hr-dashboard__stats-grid">
							<div class="el-stat-card el-stat-card--clickable" @click="scrollToApplications('all')">
								<el-statistic :value="stats.totalApplications" title="Ansøgninger i alt" />
							</div>
							<div class="el-stat-card el-stat-card--clickable" @click="scrollToApplications('pending')">
								<el-statistic :value="stats.pendingApplications" title="Afventer behandling" />
							</div>
							<div class="el-stat-card el-stat-card--clickable" @click="scrollToApplications('reserved')">
								<el-statistic :value="pendingWithReservedSlots" title="Reserveret - ikke booket" />
							</div>
							<div class="el-stat-card el-stat-card--clickable" @click="scrollToApplications('interview-scheduled')">
								<el-statistic :value="stats.scheduledInterviews" title="Planlagte samtaler" />
							</div>
						</div>
					</section>

					<!-- Upcoming Interviews Section -->
					<section ref="upcomingSection" class="hr-dashboard__upcoming">
						<h2 class="hr-dashboard__section-title">Kommende samtaler</h2>
						<div class="hr-dashboard__upcoming-list">
							<div v-for="interview in upcomingInterviews" :key="interview.id" class="el-interview-card">
								<div class="el-interview-card__date">
									<span class="el-interview-card__day">{{ formatDay(interview.confirmedSlot?.date) }}</span>
									<span class="el-interview-card__month">{{ formatMonth(interview.confirmedSlot?.date) }}</span>
								</div>
								<div class="el-interview-card__info">
									<h3 class="el-interview-card__name">{{ interview.fullName }}</h3>
									<el-text size="small" class="el-interview-card__detail">Job: {{ formatJobPosition(interview.jobPosition) }}</el-text>
									<el-text size="small" class="el-interview-card__detail">Email: {{ interview.email }}</el-text>
									<el-text size="small" class="el-interview-card__detail">Telefon: {{ interview.phone }}</el-text>
									<el-text size="small" class="el-interview-card__detail">Tid: {{ interview.confirmedSlot?.time }}</el-text>
								</div>
								<div class="el-interview-card__actions">
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
						<div
							ref="gridContainerRef"
							class="hr-dashboard__applications-grid-wrapper"
							:style="{ minHeight: gridMinHeight + 'px' }"
						>
							<Transition name="fade" mode="out-in">
								<div
									:key="filters.status + '-' + pagination.itemsPerPage + '-' + pagination.currentPage"
									class="hr-dashboard__applications-grid"
								>
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
												<el-tooltip
													:disabled="!(application.status === 'interview-scheduled' && application.confirmedSlot)"
													content="Frigiv eller afhold samtalen før du kan ændre status"
													placement="top"
												>
													<el-select
														v-model="application.status"
														size="small"
														class="application-card__status-select"
														:disabled="application.status === 'interview-scheduled' && !!application.confirmedSlot"
														@change="updateApplicationStatus(application.id, application.status)"
													>
														<el-option value="pending" label="Afventer" />
														<el-option value="reviewing" label="Under behandling" />
														<el-option value="interview-scheduled" label="Samtale planlagt" disabled />
														<el-option value="interview-completed" label="Samtale afholdt" />
														<el-option value="accepted" label="Accepteret" />
														<el-option value="rejected" label="Afvist" />
													</el-select>
												</el-tooltip>
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
												<span class="application-card__value">{{
													application.confirmedSlot ? formatDateTime(application.confirmedSlot) : 'Ikke aftalt'
												}}</span>
											</div>

											<div class="application-card__row application-card__row--button">
												<el-button @click="viewApplication(application)" class="btn-dark btn--full-width"> DETALJER </el-button>
											</div>
										</div>
									</div>
								</div>
							</Transition>
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
			</OverlayScrollbarsComponent>
		</div>

		<!-- Application Detail Dialog -->
		<Transition name="modal">
			<div v-if="showDetailDialog" class="modal-wrapper">
				<div class="modal-wrapper__backdrop" @click="showDetailDialog = false"></div>
				<div class="modal-wrapper__container modal-wrapper__container--fullscreen">
					<ModalCloseButton @click="showDetailDialog = false" />
					<OverlayScrollbarsComponent
						class="modal-wrapper__modal"
						:options="{ scrollbars: { autoHide: 'scroll', autoHideDelay: 1000 } }"
					>
						<div v-if="selectedApplication" class="application-detail">
							<h2 class="application-detail__title">Ansøgning detaljer</h2>

							<!-- Top grid: Personal info, DISC, CV -->
							<div class="application-detail__top-grid">
								<div class="application-detail__section">
									<h3>Personlige oplysninger</h3>
									<div class="application-detail__info-grid">
										<el-text class="application-detail__label">Navn</el-text>
										<el-text class="application-detail__value">{{ selectedApplication.fullName }}</el-text>
										<el-text class="application-detail__label">Email</el-text>
										<el-text class="application-detail__value">{{ selectedApplication.email }}</el-text>
										<el-text class="application-detail__label">Telefon</el-text>
										<el-text class="application-detail__value">{{ selectedApplication.phone }}</el-text>
										<el-text class="application-detail__label">Alder</el-text>
										<el-text class="application-detail__value">{{ selectedApplication.age }}</el-text>
										<el-text class="application-detail__label">Stilling</el-text>
										<el-text class="application-detail__value">{{ formatJobPosition(selectedApplication.jobPosition) }}</el-text>
									</div>
								</div>

								<div class="application-detail__section">
									<h3>DISC Resultat</h3>
									<div class="application-detail__info-grid">
										<el-text class="application-detail__label">Total point</el-text>
										<el-text class="application-detail__value">{{ selectedApplication.discResult?.totalPoints }} / 15</el-text>
										<el-text class="application-detail__label">Kvalificeret</el-text>
										<el-text class="application-detail__value">{{ selectedApplication.discResult?.isQualified ? 'Ja' : 'Nej' }}</el-text>
										<el-text class="application-detail__label">Dominant profil</el-text>
										<el-text class="application-detail__value">{{ selectedApplication.discResult?.dominantProfile }}</el-text>
									</div>
								</div>

								<div v-if="selectedApplication.cvFileName" class="application-detail__section application-detail__section--cv">
									<h3>CV</h3>
									<el-button @click="openCVViewer(selectedApplication.cvFileName)" class="btn-dark btn--full-width">
										Se CV
									</el-button>
								</div>

								<div class="application-detail__section application-detail__section--status">
									<h3>Status</h3>
									<el-tooltip
										:disabled="!(selectedApplication?.status === 'interview-scheduled' && selectedApplication?.confirmedSlot)"
										content="Frigiv eller afhold samtalen før du kan ændre status"
										placement="top"
									>
										<el-select
											v-model="selectedApplication.status"
											:disabled="selectedApplication?.status === 'interview-scheduled' && !!selectedApplication?.confirmedSlot"
											@change="updateApplicationStatus(selectedApplication.id, selectedApplication.status)"
										>
											<el-option value="pending" label="Afventer" />
											<el-option value="reviewing" label="Under behandling" />
											<el-option value="interview-scheduled" label="Samtale planlagt" disabled />
											<el-option value="interview-completed" label="Samtale afholdt" />
											<el-option value="accepted" label="Accepteret" />
											<el-option value="rejected" label="Afvist" />
										</el-select>
									</el-tooltip>
								</div>
							</div>

							<div class="application-detail__section">
								<h3>Samtaletider</h3>

								<!-- Show confirmed slot if exists and no selected slots (manually booked) -->
								<div
									v-if="
										selectedApplication.confirmedSlot &&
										(!selectedApplication.selectedSlots || selectedApplication.selectedSlots.length === 0)
									"
									class="application-detail__confirmed-slot"
								>
									<h4>Bekræftet samtaletid</h4>
									<div class="application-detail__slot application-detail__slot--confirmed">
										<div class="application-detail__slot-info">
											<span class="application-detail__slot-date">{{ selectedApplication.confirmedSlot.date }}</span>
											<span class="application-detail__slot-time">{{ selectedApplication.confirmedSlot.time }}</span>
											<span class="application-detail__slot-type">
												{{
													selectedApplication.confirmedSlot.type === 'fysisk' ? 'Fysisk (45 min)' : 'Virtuel (60 min)'
												}}
											</span>
										</div>
										<div class="application-detail__slot-actions">
											<span class="application-detail__confirmed-badge">Bekræftet</span>
											<el-button size="small" class="btn-red" @click="releaseConfirmedSlot(selectedApplication.id)">
												Frigiv tid
											</el-button>
										</div>
									</div>
								</div>

								<!-- Show selected slots if available (priority times from applicant) -->
								<div
									v-else-if="selectedApplication.selectedSlots && selectedApplication.selectedSlots.length > 0"
									class="application-detail__selected-slots"
								>
									<h4>Ansøgerens ønskede tidspunkter</h4>
									<div
										v-for="(slotId, index) in selectedApplication.selectedSlots"
										:key="slotId"
										class="application-detail__slot"
									>
										<div class="application-detail__slot-info">
											<span class="application-detail__slot-priority">{{ index + 1 }}. prioritet</span>
											<span class="application-detail__slot-date">{{
												getSlotInfo(slotId)?.date || 'Dato ikke fundet'
											}}</span>
											<span class="application-detail__slot-time">{{
												getSlotInfo(slotId)?.time || 'Tid ikke fundet'
											}}</span>
											<span class="application-detail__slot-type">
												{{ getSlotInfo(slotId)?.type === 'fysisk' ? 'Fysisk (45 min)' : 'Virtuel (60 min)' }}
											</span>
										</div>
										<div class="application-detail__slot-actions">
											<!-- No confirmed slot yet - show confirm button or reserved badge -->
											<template v-if="!selectedApplication.confirmedSlot">
												<!-- Check if slot is still available (held by this application) -->
												<template v-if="isSlotAvailableForApplication(slotId, selectedApplication.id)">
													<span class="application-detail__reserved-badge">Reserveret</span>
													<el-button
														@click="confirmInterviewSlot(selectedApplication.id, slotId)"
														class="btn-yellow"
													>
														Bekræft tid
													</el-button>
												</template>
												<!-- Slot was taken by someone else -->
												<span v-else class="application-detail__unavailable-badge">Ikke længere tilgængelig</span>
											</template>
											<!-- This is the confirmed slot -->
											<template v-else-if="slotId === selectedApplication.confirmedSlot?.id">
												<span class="application-detail__confirmed-badge">Bekræftet</span>
												<el-button size="small" class="btn-red" @click="releaseConfirmedSlot(selectedApplication.id)">
													Frigiv tid
												</el-button>
											</template>
											<!-- Other selected slot (not confirmed) - check if still available -->
											<template v-else-if="isSlotAvailableForApplication(slotId, selectedApplication.id)">
												<el-button @click="changeToSelectedSlot(selectedApplication.id, slotId)" class="btn-dark">
													Skift til denne tid
												</el-button>
											</template>
											<!-- Slot was taken by someone else -->
											<span v-else class="application-detail__unavailable-badge">Ikke længere tilgængelig</span>
										</div>
									</div>
								</div>

								<!-- No slots at all -->
										<el-text v-else type="info" class="application-detail__no-slots">
											Ansøgeren har ikke valgt tidspunkter (ikke kvalificeret til DISC-test)
										</el-text>
								<!-- Calendar slot picker for existing slots -->
								<div class="application-detail__custom-time-section">
									<h4>
										{{
											selectedApplication.confirmedSlot ||
											(selectedApplication.selectedSlots && selectedApplication.selectedSlots.length > 0)
												? 'Skift til ny tid'
												: 'Vælg tid'
										}}
									</h4>
									<CalendarSlotPicker
										:available-slots="availableSlotsForBooking"
										:loading="isBookingCustomSlot"
										:confirm-button-text="
											selectedApplication.confirmedSlot ||
											(selectedApplication.selectedSlots && selectedApplication.selectedSlots.length > 0)
												? 'Skift til valgt tid'
												: 'Bekræft og book tid'
										"
										@confirm="handleCalendarSlotConfirm"
									/>

									<!-- Manual time picker -->
									<CustomTimeSlotPicker
										:loading="isBookingCustomSlot"
										:button-text="
											selectedApplication.confirmedSlot ||
											(selectedApplication.selectedSlots && selectedApplication.selectedSlots.length > 0)
												? 'Book manuelt oprettet tid'
												: 'Opret og book tid'
										"
										@submit="handleCustomTimeSubmit"
									/>
								</div>
							</div>

							<div class="application-detail__actions">
								<el-button @click="showDetailDialog = false" class="btn-dark">Luk</el-button>
								<el-button @click="deleteApplication(selectedApplication?.id)" class="btn-red"
									>Slet ansøgning</el-button
								>
							</div>
						</div>
					</OverlayScrollbarsComponent>
				</div>
			</div>
		</Transition>

		<!-- Time Slots Modal -->
		<Transition name="modal">
			<div v-if="showTimeSlotsModal" class="modal-wrapper">
				<div class="modal-wrapper__backdrop" @click="showTimeSlotsModal = false"></div>
				<div class="modal-wrapper__container modal-wrapper__container--fullscreen">
					<ModalCloseButton @click="showTimeSlotsModal = false" />
					<OverlayScrollbarsComponent
						class="modal-wrapper__modal"
						:options="{ scrollbars: { autoHide: 'scroll', autoHideDelay: 1000 } }"
					>
						<div class="time-slots-manager">
							<h2 class="time-slots-manager__title">Administrer tilgængelige tider</h2>
							<el-text class="time-slots-manager__description">
								Klik på en dag i kalenderen for at tilføje eller se tilgængelige tider. Ansøgere kan vælge 1. og 2.
								prioritet.
							</el-text>

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
											<div v-if="getTimeSlotsForDate(data.day).length > 0" class="calendar-day__chips">
												<el-tag size="small" class="el-tag--available"
													>{{ getAvailableSlotsCount(data.day) }}/{{ getTimeSlotsForDate(data.day).length }}</el-tag
												>
												<el-tag size="small" class="el-tag--reserved"
													>{{ getReservedSlotsCount(data.day) }}/{{ getTimeSlotsForDate(data.day).length }}</el-tag
												>
												<el-tag size="small" class="el-tag--booked"
													>{{ getBookedSlotsCount(data.day) }}/{{ getTimeSlotsForDate(data.day).length }}</el-tag
												>
											</div>
										</div>
									</template>
								</el-calendar>

								<!-- Calendar Legend -->
								<div class="calendar-legend">
									<div class="calendar-legend__item">
										<span class="calendar-legend__color calendar-legend__color--available"></span>
										<span class="calendar-legend__label">Ledige tider</span>
									</div>
									<div class="calendar-legend__item">
										<span class="calendar-legend__color calendar-legend__color--reserved"></span>
										<span class="calendar-legend__label">Reserveret</span>
									</div>
									<div class="calendar-legend__item">
										<span class="calendar-legend__color calendar-legend__color--booked"></span>
										<span class="calendar-legend__label">Booket</span>
									</div>
								</div>
							</div>

							<!-- Selected Date Details -->
							<Transition :name="selectedDateSlideDirection" mode="out-in">
								<div
									v-if="selectedDate"
									:key="selectedDate"
									ref="selectedDateSection"
									class="time-slots-manager__selected"
								>
									<div class="time-slots-manager__selected-header">
										<h3>{{ formatSelectedDate(selectedDate) }}</h3>
										<el-button @click="selectedDate = null" class="btn-dark">Luk</el-button>
									</div>

									<!-- Add time slot for selected date -->
									<div class="time-slots-manager__add">
										<div class="time-slots-manager__form">
											<el-select
												v-model="newTimeSlot.type"
												placeholder="Vælg type"
												class="time-slots-manager__type-select"
											>
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
											<div
												v-for="slot in getTimeSlotsForDate(selectedDate)"
												:key="slot.id"
												class="time-slot-item"
												:class="getSlotStatusClass(slot)"
											>
												<span class="time-slot-item__time">{{ slot.time }}</span>
												<span class="time-slot-item__type">{{
													slot.type === 'fysisk' ? 'Fysisk (45 min)' : 'Virtuel (60 min)'
												}}</span>
												<span class="time-slot-item__status">{{ getSlotStatusLabel(slot) }}</span>
												<el-button
													@click="removeTimeSlot(slot.id)"
													class="btn-red"
													:disabled="!!slot.isBooked || !!slot.heldBy"
													>Slet</el-button
												>
											</div>
										</div>
									</div>
								</div>
							</Transition>
						</div>
					</OverlayScrollbarsComponent>
				</div>
			</div>
		</Transition>

		<!-- Cleanup Modal -->
		<el-dialog v-model="showCleanupModal" title="Ryd op i gamle ansøgninger" transition="dialog-scale">
			<div class="cleanup-manager">
				<el-text class="cleanup-manager__description">
					Slet alle ansøgninger som er ældre end det valgte antal måneder fra modtagelsesdato.
				</el-text>

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
						<el-text><strong>Antal ansøgninger som vil blive slettet:</strong> {{ oldApplicationsCount }}</el-text>
					</div>
				</div>

				<!-- Clear all data section for testing -->
				<div class="cleanup-manager__danger-zone">
					<h4>Test Zone</h4>
					<el-text type="danger" class="cleanup-manager__warning">
						Slet ALLE ansøgninger og samtaletider. Denne handling kan ikke fortrydes!
					</el-text>
					<el-button class="btn-red" @click="clearAllData"> Ryd al data </el-button>
				</div>
			</div>

			<template #footer>
				<el-button @click="showCleanupModal = false" class="btn-dark">Annuller</el-button>
				<el-button :disabled="!cleanupMonths || oldApplicationsCount === 0" @click="performCleanup" class="btn-red">
					Slet {{ oldApplicationsCount }} ansøgninger
				</el-button>
			</template>
		</el-dialog>

		<!-- CV Viewer Modal -->
		<Transition name="modal">
			<div v-if="showCVViewer" class="modal-wrapper">
				<div class="modal-wrapper__backdrop" @click="closeCVViewer"></div>
				<div class="modal-wrapper__container modal-wrapper__container--fullscreen">
					<ModalCloseButton @click="closeCVViewer" />
					<div class="modal-wrapper__modal cv-viewer">
						<div class="cv-viewer__header">
							<div class="cv-viewer__zoom">
								<el-button
									:disabled="cvScale <= 0.5"
									@click="cvScale = Math.max(0.5, cvScale - 0.25)"
									class="btn-dark"
									size="small"
								>
									−
								</el-button>
								<span>{{ Math.round(cvScale * 100) }}%</span>
								<el-button
									:disabled="cvScale >= 2"
									@click="cvScale = Math.min(2, cvScale + 0.25)"
									class="btn-dark"
									size="small"
								>
									+
								</el-button>
							</div>
							<div class="cv-viewer__pagination">
								<el-button
									:disabled="cvCurrentPage <= 1"
									@click="cvCurrentPage--"
									class="btn-dark"
									size="small"
								>
									Forrige
								</el-button>
								<span>Side {{ cvCurrentPage }} af {{ cvTotalPages }}</span>
								<el-button
									:disabled="cvCurrentPage >= cvTotalPages"
									@click="cvCurrentPage++"
									class="btn-dark"
									size="small"
								>
									Næste
								</el-button>
							</div>
							<div class="cv-viewer__spacer"></div>
						</div>
						<OverlayScrollbarsComponent
							class="cv-viewer__content"
							:options="{ scrollbars: { autoHide: 'leave' } }"
						>
							<div class="cv-viewer__pdf-wrapper">
								<VuePDF
									v-if="cvPdf"
									:pdf="cvPdf"
									:page="cvCurrentPage"
									:scale="cvScale"
									text-layer
								/>
							</div>
						</OverlayScrollbarsComponent>
					</div>
				</div>
			</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
import { User, Message, Phone, Calendar } from '@element-plus/icons-vue'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import { VuePDF, usePDF } from '@tato30/vue-pdf'
import '@tato30/vue-pdf/style.css'
import ModalCloseButton from '@/components/ModalCloseButton.vue'
import CalendarSlotPicker from '@/components/CalendarSlotPicker.vue'
import CustomTimeSlotPicker from '@/components/CustomTimeSlotPicker.vue'
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
const isBreathing = ref(false)
const refreshInterval = ref<ReturnType<typeof setInterval> | null>(null)
const slotPollingInterval = ref<ReturnType<typeof setInterval> | null>(null)
const SLOT_POLLING_INTERVAL_MS = 3000 // Poll every 3 seconds

// UI state
const showDetailDialog = ref(false)
const selectedApplication = ref<Application | null>(null)
const showTimeSlotsModal = ref(false)
const showCleanupModal = ref(false)
const scrollableRef = ref<InstanceType<typeof OverlayScrollbarsComponent> | null>(null)
const applicationsSection = ref<HTMLElement | null>(null)
const gridContainerRef = ref<HTMLElement | null>(null)
const selectedDateSection = ref<HTMLElement | null>(null)
const gridColumns = ref(3)

// Time slots management
const availableTimeSlots = ref<InterviewSlot[]>([])
const calendarDate = ref(new Date())
const selectedDate = ref<string | null>(null)
const selectedDateSlideDirection = ref<'slide-left' | 'slide-right' | 'slide-fade'>('slide-fade')
const newTimeSlot = ref({
	date: '',
	time: '',
	type: 'fysisk'
})
const customSlotSelection = ref<string>('')
const customDate = ref<string>('')
const customTime = ref<string>('')
const customType = ref<string>('fysisk')
const isBookingCustomSlot = ref(false)

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

// Applications with reserved slots but not yet booked
const pendingWithReservedSlots = computed(() => {
	return applications.value.filter((a) => a.selectedSlots && a.selectedSlots.length > 0 && !a.confirmedSlot).length
})

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

// Calculate grid min-height based on columns and items per page
const CARD_HEIGHT = 290 // Approximate card height in pixels
const CARD_GAP = 16 // Gap between cards ($spacing-md)
const MIN_CARD_WIDTH = 420 // minmax(420px, 1fr)

const gridMinHeight = computed(() => {
	const itemsPerPage = pagination.value.itemsPerPage
	const columns = gridColumns.value
	const rows = Math.ceil(itemsPerPage / columns)
	return rows * CARD_HEIGHT + (rows - 1) * CARD_GAP
})

// Update grid columns on resize
const updateGridColumns = () => {
	if (gridContainerRef.value) {
		const containerWidth = gridContainerRef.value.offsetWidth
		gridColumns.value = Math.max(1, Math.floor(containerWidth / MIN_CARD_WIDTH))
	}
}

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

// Available slots for booking (not booked, not held, not reserved)
const availableSlotsForBooking = computed(() => {
	return availableTimeSlots.value
		.filter((slot) => !slot.isBooked && !slot.heldBy && !slot.reservedBy)
		.sort((a, b) => {
			const dateA = new Date(`${a.date} ${a.time}`)
			const dateB = new Date(`${b.date} ${b.time}`)
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

		// Trigger breathing animation
		isBreathing.value = true
		setTimeout(() => {
			isBreathing.value = false
		}, 1000)
	} catch (error) {
		console.error('Failed to load applications:', error)
		throw error
	}
}

// Auto refresh
const startAutoRefresh = () => {
	refreshInterval.value = setInterval(async () => {
		await loadApplications()
		await loadTimeSlots()
	}, 5000)
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
		ElMessage.error('Kunne ikke opdatere status')
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
		ElMessage.error('Kunne ikke slette ansøgning')
	}
}

// CV Viewer state
const showCVViewer = ref(false)
const cvPdfSource = ref('')
const cvCurrentPage = ref(1)
const cvTotalPages = ref(0)
const cvScale = ref(1)
const { pdf: cvPdf, pages: cvPages } = usePDF(cvPdfSource)

// Watch for pages changes
watch(cvPages, (pages) => {
	if (pages) {
		cvTotalPages.value = pages
	}
})

// Open CV in viewer modal
const openCVViewer = async (filename: string) => {
	try {
		const response = await api.get(`/download-cv/${filename}`, {
			responseType: 'blob'
		})
		const blob = new Blob([response.data], { type: 'application/pdf' })
		cvPdfSource.value = URL.createObjectURL(blob)
		cvCurrentPage.value = 1
		cvScale.value = 1
		showCVViewer.value = true
	} catch (error) {
		console.error('Failed to load CV:', error)
		ElMessage.error('Kunne ikke indlæse CV')
	}
}

// Close CV viewer
const closeCVViewer = () => {
	showCVViewer.value = false
	if (cvPdfSource.value) {
		URL.revokeObjectURL(cvPdfSource.value)
		cvPdfSource.value = ''
	}
}

// View application details
const viewApplication = async (application: Application) => {
	selectedApplication.value = { ...application }
	customSlotSelection.value = ''
	customDate.value = ''
	customTime.value = ''
	customType.value = 'fysisk'
	// Load slots and start polling for live sync
	await loadTimeSlots()
	startSlotPolling()
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

// Scroll to applications and filter
const scrollToApplications = (filterType: string) => {
	// Set filter based on clicked stat
	if (filterType === 'all') {
		filters.value.status = 'all'
	} else if (filterType === 'reserved') {
		// For reserved, we show all and let the user see those with reserved slots
		filters.value.status = 'all'
	} else {
		filters.value.status = filterType as ApplicationStatus | 'all'
	}

	pagination.value.currentPage = 1

	// Scroll to applications section using OverlayScrollbars
	const section = applicationsSection.value
	const osInstance = scrollableRef.value?.osInstance()
	if (section && osInstance) {
		const viewport = osInstance.elements().viewport
		const sectionTop = section.offsetTop - 24 // Small offset for padding
		viewport.scrollTo({ top: sectionTop, behavior: 'smooth' })
	}
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
		pakkeri: 'Pakkeri',
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
		ElMessage.error('Kunne ikke indlæse tider')
	}
}

// Start polling for slot updates (live sync like ApplicationModal)
const startSlotPolling = () => {
	if (slotPollingInterval.value) return
	slotPollingInterval.value = setInterval(() => {
		loadTimeSlots()
	}, SLOT_POLLING_INTERVAL_MS)
}

// Stop slot polling
const stopSlotPolling = () => {
	if (slotPollingInterval.value) {
		clearInterval(slotPollingInterval.value)
		slotPollingInterval.value = null
	}
}

// Get slot info by ID
const getSlotInfo = (slotId: string): InterviewSlot | undefined => {
	return availableTimeSlots.value.find((slot) => slot.id === slotId)
}

// Check if a slot is available for a specific application (held by this application or not held/booked at all)
const isSlotAvailableForApplication = (slotId: string, applicationId: string): boolean => {
	const slot = availableTimeSlots.value.find((s) => s.id === slotId)
	if (!slot) return false

	// SQLite returns 0/1 for booleans, so check both
	const isBooked = slot.isBooked === true || (slot.isBooked as unknown) === 1

	// If booked - only available if booked by this application
	if (isBooked) {
		return slot.bookedBy === applicationId
	}

	// If held - only available if held by this application
	if (slot.heldBy) {
		return slot.heldBy === applicationId
	}

	// If reserved (temporary) - only available if reserved by this application's session
	// Note: reservedBy is typically a session ID, not an application ID, so this check
	// is mainly for showing temporary reservations from landing page
	if (slot.reservedBy) {
		return false // Reserved by someone on landing page
	}

	// Not booked, not held, not reserved - available
	return true
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
		ElMessage.success('Samtale bekræftet')
	} catch (error) {
		console.error('Failed to confirm interview slot:', error)
		ElMessage.error('Kunne ikke bekræfte samtale')
	}
}

// Release confirmed slot (make it available again)
const releaseConfirmedSlot = async (applicationId: string) => {
	try {
		await api.post(`/applications/${applicationId}/release-confirmed-slot`)

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
		ElMessage.success('Tid frigivet')
	} catch (error) {
		console.error('Failed to release confirmed slot:', error)
		ElMessage.error('Kunne ikke frigive tid')
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
		ElMessage.success('Tid ændret')
	} catch (error) {
		console.error('Failed to change to selected slot:', error)
		ElMessage.error('Kunne ikke skifte til valgt tid')
	}
}

// Handle custom time submit from CustomTimeSlotPicker component
const handleCustomTimeSubmit = async (data: { date: string; time: string; type: 'fysisk' | 'virtuel' }) => {
	if (!selectedApplication.value) return

	isBookingCustomSlot.value = true

	try {
		const applicationId = selectedApplication.value.id

		// Create the custom slot
		const customSlot: InterviewSlot = {
			id: `custom-${Date.now()}`,
			date: data.date,
			time: data.time,
			type: data.type,
			isBooked: true,
			bookedBy: applicationId
		}

		// Release all existing slots (confirmed and reserved)
		await releaseAllApplicationSlots(selectedApplication.value)

		// Update application with custom confirmed slot, clear selectedSlots, and set status
		await api.patch(`/applications/${applicationId}`, {
			confirmedSlot: customSlot,
			selectedSlots: [],
			status: 'interview-scheduled'
		})

		// Reload data
		await loadApplications()
		await loadTimeSlots()

		// Update selected application
		const updated = applications.value.find((app) => app.id === applicationId)
		if (updated) {
			selectedApplication.value = { ...updated }
		}
		ElMessage.success('Samtaletid oprettet')
	} catch (error) {
		console.error('Failed to book custom slot:', error)
		ElMessage.error('Kunne ikke oprette samtaletid')
	} finally {
		isBookingCustomSlot.value = false
	}
}

// Handle confirming a slot from CalendarSlotPicker
const handleCalendarSlotConfirm = async (slot: {
	id: string
	date: string
	time: string
	type: 'fysisk' | 'virtuel'
}) => {
	if (!selectedApplication.value) return

	isBookingCustomSlot.value = true

	try {
		const applicationId = selectedApplication.value.id

		// Release all existing slots (confirmed and reserved)
		await releaseAllApplicationSlots(selectedApplication.value)

		// Book the selected slot
		await api.patch(`/interview-slots/${slot.id}/book`, {
			applicationId: applicationId
		})

		// Create confirmed slot object
		const confirmedSlot: InterviewSlot = {
			id: slot.id,
			date: slot.date,
			time: slot.time,
			type: slot.type,
			isBooked: true,
			bookedBy: applicationId
		}

		// Update application with the confirmed slot, clear selectedSlots, and set status
		await api.patch(`/applications/${applicationId}`, {
			confirmedSlot: confirmedSlot,
			selectedSlots: [],
			status: 'interview-scheduled'
		})

		// Reload data
		await loadApplications()
		await loadTimeSlots()

		// Update selected application
		const updated = applications.value.find((app) => app.id === applicationId)
		if (updated) {
			selectedApplication.value = { ...updated }
		}
		ElMessage.success('Tid booket')
	} catch (error) {
		console.error('Failed to book slot:', error)
		ElMessage.error('Kunne ikke booke tid')
	} finally {
		isBookingCustomSlot.value = false
	}
}

// Release all slots associated with an application (both confirmed and reserved)
const releaseAllApplicationSlots = async (application: Application) => {
	// Release confirmed slot if it exists and is not custom
	if (application.confirmedSlot && !application.confirmedSlot.id.startsWith('custom-')) {
		try {
			await api.patch(`/interview-slots/${application.confirmedSlot.id}/unbook`)
		} catch (error) {
			console.error('Failed to unbook confirmed slot:', error)
		}
	}

	// Release all reserved slots from selectedSlots using force-release (HR only)
	if (application.selectedSlots && application.selectedSlots.length > 0) {
		for (const slotId of application.selectedSlots) {
			if (!slotId.startsWith('custom-')) {
				try {
					await api.patch(`/interview-slots/${slotId}/force-release`)
				} catch (error) {
					console.error(`Failed to release slot ${slotId}:`, error)
				}
			}
		}
	}
}

const selectDate = (dateString: string) => {
	// Don't allow selecting past dates
	if (isDateInPast(dateString)) return

	// Determine slide direction based on date comparison
	if (selectedDate.value) {
		const newDate = new Date(dateString)
		const oldDate = new Date(selectedDate.value)
		selectedDateSlideDirection.value = newDate > oldDate ? 'slide-left' : 'slide-right'
	} else {
		selectedDateSlideDirection.value = 'slide-fade'
	}

	selectedDate.value = dateString
	newTimeSlot.value.time = ''

	// Scroll to the selected date section after Vue updates the DOM
	setTimeout(() => {
		if (selectedDateSection.value) {
			selectedDateSection.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}
	}, 100)
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

const getAvailableSlotsCount = (dateString: string): number => {
	return availableTimeSlots.value.filter(
		(slot) => slot.date === dateString && !slot.isBooked && !slot.heldBy && !slot.reservedBy
	).length
}

const getReservedSlotsCount = (dateString: string): number => {
	// Includes both reservedBy and heldBy slots (all pending/reserved states)
	return availableTimeSlots.value.filter(
		(slot) => slot.date === dateString && (slot.reservedBy || slot.heldBy) && !slot.isBooked
	).length
}

const getBookedSlotsCount = (dateString: string): number => {
	return availableTimeSlots.value.filter((slot) => slot.date === dateString && slot.isBooked).length
}

const getSlotStatusClass = (slot: InterviewSlot): string => {
	if (slot.isBooked) return 'time-slot-item--booked'
	if (slot.heldBy || slot.reservedBy) return 'time-slot-item--reserved'
	return 'time-slot-item--available'
}

const getSlotStatusLabel = (slot: InterviewSlot): string => {
	if (slot.isBooked) return 'Booket'
	if (slot.heldBy || slot.reservedBy) return 'Reserveret'
	return 'Ledig'
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
		ElMessage.success('Tid tilføjet')
	} catch (error) {
		console.error('Failed to add time slot:', error)
		ElMessage.error('Kunne ikke tilføje tid')
	}
}

const removeTimeSlot = async (slotId: string) => {
	try {
		await api.delete(`/interview-slots/${slotId}`)
		await loadTimeSlots()
		ElMessage.success('Tid fjernet')
	} catch (error) {
		console.error('Failed to remove time slot:', error)
		ElMessage.error('Kunne ikke fjerne tid')
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
		ElMessage.success('Gamle ansøgninger slettet')
	} catch (error) {
		console.error('Failed to cleanup applications:', error)
		ElMessage.error('Kunne ikke rydde op i ansøgninger')
	}
}

// Clear all data (for testing)
const clearAllData = async () => {
	if (
		!confirm('Er du sikker på at du vil slette ALLE ansøgninger og samtaletider? Denne handling kan ikke fortrydes!')
	) {
		return
	}

	try {
		await api.delete('/clear-all-data')

		showCleanupModal.value = false
		await loadApplications()
		await loadTimeSlots()
		ElMessage.success('Alle data slettet')
	} catch (error) {
		console.error('Failed to clear all data:', error)
		ElMessage.error('Kunne ikke slette data')
	}
}

// Resize observer for grid columns
let resizeObserver: ResizeObserver | null = null

// Lifecycle
onMounted(() => {
	// Setup resize observer for grid columns
	resizeObserver = new ResizeObserver(() => {
		updateGridColumns()
	})

	// Observe after a short delay to ensure element is rendered
	setTimeout(() => {
		if (gridContainerRef.value) {
			resizeObserver?.observe(gridContainerRef.value)
			updateGridColumns()
		}
	}, 100)
})

onUnmounted(() => {
	stopAutoRefresh()
	stopSlotPolling()
	resizeObserver?.disconnect()
})

// Watch for detail dialog close to stop polling
watch(showDetailDialog, (newVal) => {
	if (!newVal) {
		stopSlotPolling()
	}
})
</script>

<style lang="scss" scoped>
@use 'sass:math';

.hr-dashboard {
	min-height: 100vh;
	background-color: $c-fill-light;

	// Login
	&__login {
		@include flex-center;
		min-height: 100vh;
		background-color: $c-bg;
	}

	&__login-card {
		@include card;
		@include flex-column;
		align-items: center;
		gap: $spacing-lg;
		width: 100%;
		max-width: 402px;
		padding: $spacing-xl;

		:deep(.el-form) {
			width: 100%;
			display: flex;
			flex-direction: column;
			align-items: center;
		}

		:deep(.el-form-item) {
			width: 100%;
			max-width: 280px;
			margin-bottom: $spacing-md;
		}

		:deep(.el-input) {
			width: 100%;
		}

		:deep(.el-input__wrapper) {
			width: 100%;
			box-sizing: border-box;
		}

		.btn-red {
			width: 100%;
			max-width: 280px;
		}
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
		color: $c-danger;
	}

	// Content
	&__content {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: $c-fill-light;
	}

	// Header
	&__header {
		@include flex-between;
		flex-shrink: 0;
		padding: $spacing-lg;
		padding-bottom: 0;
		max-width: $modal-max-width-wide;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
		flex-wrap: wrap;
		gap: $spacing-md;
	}

	&__scrollable {
		flex: 1;
		overflow: hidden;
	}

	&__scrollable-content {
		max-width: $modal-max-width-wide;
		margin: 0 auto;
		padding: $spacing-lg;
	}

	&__header-left {
		@include flex-column;
	}

	&__title {
		@include title-font;
	}

	&__subtitle {
		@include body-font;
		color: $c-primary;
		@include flex-center;
		justify-content: flex-start;
		gap: $spacing-xs;
	}

	&__status-dot {
		width: $spacing-sm;
		height: $spacing-sm;
		background-color: $c-success;
		border-radius: $border-radius-circle;
		transition:
			transform $transition-duration-slow $transition-ease,
			opacity $transition-duration-slow $transition-ease;

		&--breathing {
			animation: breathe 1s ease-in-out;
		}
	}

	@keyframes breathe {
		0% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.5);
			opacity: 0.7;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	&__header-right {
		display: flex;
		gap: $spacing-sm;
		flex-wrap: wrap;
	}

	&__header-btn {
		// Kun størrelses-tilpasninger tilladt her - alt andet kommer fra button mixins
		height: $element-height-standard;
		padding: $spacing-sm $spacing-xs;
		font-size: $font-size-subtitle;
	}

	&__header-btn--dark {
		@include button-dark;
	}

	&__header-btn--yellow {
		@include button-yellow;
	}

	&__header-btn--red {
		@include button-red;
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
		grid-template-columns: 1fr;
		gap: $spacing-lg;

		// 2 columns at medium screens
		@media (min-width: 600px) {
			grid-template-columns: repeat(2, 1fr);
		}

		// 4 columns at large screens
		@media (min-width: 1200px) {
			grid-template-columns: repeat(4, 1fr);
		}
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

		// First dropdown (Vis antal)
		&:first-child .el-select {
			width: 130px;
		}

		// Second dropdown (Filtrer status)
		&:nth-child(2) .el-select {
			width: 170px;
		}
	}

	&__filter-label {
		@include body-font;
		white-space: nowrap;
	}

	&__filter-info {
		display: flex;
		gap: $spacing-lg;
		@include body-font;
		color: $c-primary;
	}

	&__applications-grid-wrapper {
		transition: min-height $transition-duration-slow $transition-ease;
	}

	&__applications-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax($card-min-width, 1fr));
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
		color: $c-primary;
	}
}

// Application Card
.application-card {
	@include card;
	@include flex-column;
	gap: 0;
	padding: 0;
	overflow: hidden;
	transition:
		transform 0.2s ease,
		box-shadow 0.2s ease;

	&:hover {
		transform: translateY(-4px);
		box-shadow: $shadow-modal;
	}

	&__header {
		@include flex-between;
		padding: $spacing-md;
		background-color: $c-bg;
		border-bottom: $border-width-thin solid $c-fill-light;
	}

	&__name {
		@include subtitle-font;
		font-size: $font-size-button;
	}

	&__age {
		@include subtitle-font;
		font-size: $font-size-button;
		color: $c-primary;
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
			border-top: $border-width-thin solid $c-fill-light;
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
		color: $c-primary;
		min-width: 80px;
	}

	&__value {
		flex: 1;
		text-align: right;
		font-weight: $font-weight-regular;
		color: $c-primary;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&__status-select {
		flex: 1;
		max-width: 60%;

		:deep(.el-input__wrapper) {
			padding: math.div($spacing-xs, 2) $spacing-sm;
			min-height: 28px;
			font-size: $font-size-body;
		}

		:deep(.el-input__inner) {
			height: $spacing-lg;
			font-size: $font-size-body;
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
	padding: $spacing-xl;

	&__title {
		@include title-font;
		margin: 0;
	}

	&__actions {
		display: flex;
		gap: $spacing-md;
		margin-top: $spacing-lg;
		padding-top: $spacing-lg;
		border-top: $border-width-thin solid $c-fill-light;
	}

	&__section {
		@include flex-column;
		gap: $spacing-sm;

		h3 {
			@include subtitle-font;
			font-size: $font-size-button;
			margin-bottom: $spacing-xs;
		}

		p {
			@include body-font;
		}

		&--cv {
			.btn {
				margin-top: $spacing-sm;
			}
		}
	}

	// Grid layout for top sections (Personlige oplysninger, DISC, CV)
	&__top-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: $spacing-lg;
	}

	&__info-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: $spacing-xs $spacing-md;
		align-items: baseline;
	}

	&__label {
		@include body-bold-font;
		color: $c-primary-light-5;
	}

	&__value {
		@include body-font;
		word-break: break-word;
	}

	&__confirmed-slot {
		@include flex-column;
		gap: $spacing-sm;
		padding: $spacing-md;
		background-color: $c-fill-light;
		border-radius: $border-radius-md;

		h4 {
			@include body-bold-font;
			margin-bottom: $spacing-xs;
		}
	}

	&__selected-slots {
		@include flex-column;
		gap: $spacing-sm;
		padding: $spacing-md;
		background-color: $c-fill-light;
		border-radius: $border-radius-md;

		h4 {
			@include body-bold-font;
			margin-bottom: $spacing-xs;
		}
	}

	&__slot {
		@include flex-between;
		padding: $spacing-md;
		background-color: $c-bg;
		border-radius: $border-radius-md;
		border: $border-width-normal solid $c-primary;
	}

	&__slot-actions {
		@include flex-center;
		gap: $spacing-sm;
	}

	&__slot-info {
		@include flex-center;
		gap: $spacing-md;
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
		font-size: $font-size-body;
		padding: math.div($spacing-xs, 2) $spacing-sm;
		background-color: $c-bg;
		border-radius: $border-radius-sm;
	}

	&__change-time {
		margin-top: $spacing-lg;
		padding: $spacing-md;
		background-color: $c-warning;
		border-radius: $border-radius-md;
		border: $border-width-thin dashed $c-warning;

		h4 {
			@include body-bold-font;
			margin-bottom: $spacing-md;
		}
	}

	&__custom-time {
		@include flex-center;
		gap: $spacing-sm;
	}

	&__confirmed-badge {
		@include body-bold-font;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		padding: calc(#{$spacing-xs} + #{math.div((1 - $font-body-cap-height) - $font-body-descender, 2)}em) $spacing-sm calc(#{$spacing-xs} - #{math.div((1 - $font-body-cap-height) - $font-body-descender, 2)}em) $spacing-sm;
		font-size: $font-size-body;
		background-color: $c-success;
		color: $c-bg;
		border-radius: $border-radius-sm;
		white-space: nowrap;
	}

	&__reserved-badge {
		@include body-bold-font;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		padding: calc(#{$spacing-xs} + #{math.div((1 - $font-body-cap-height) - $font-body-descender, 2)}em) $spacing-sm calc(#{$spacing-xs} - #{math.div((1 - $font-body-cap-height) - $font-body-descender, 2)}em) $spacing-sm;
		font-size: $font-size-body;
		background-color: $c-warning;
		color: $c-bg;
		border-radius: $border-radius-sm;
		white-space: nowrap;
	}

	&__unavailable-badge {
		@include body-font;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		padding: calc(#{$spacing-xs} + #{math.div((1 - $font-body-cap-height) - $font-body-descender, 2)}em) $spacing-sm calc(#{$spacing-xs} - #{math.div((1 - $font-body-cap-height) - $font-body-descender, 2)}em) $spacing-sm;
		font-size: $font-size-body;
		background-color: $c-primary-light-5;
		color: $c-bg;
		border-radius: $border-radius-sm;
		white-space: nowrap;
		font-style: italic;
	}

	&__no-slots {
		@include body-font;
		color: $c-primary;
		font-style: italic;
		margin: 0;
	}

	&__custom-time-section {
		margin-top: $spacing-lg;
		padding: $spacing-md;
		background-color: $c-fill-light;
		border-radius: $border-radius-md;
	}
}

// Time Slots Manager
.time-slots-manager {
	@include flex-column;
	gap: $spacing-xl;
	padding: $spacing-xl;

	&__title {
		@include title-font;
		margin: 0;
	}

	&__description {
		@include body-font;
		color: $c-primary;
	}

	&__calendar {
		width: 100%;
		border: $border-width-thin solid $c-fill-light;
		border-radius: $border-radius-md;
		overflow: hidden;

		// Remove Element Plus default padding from calendar cells
		:deep(.el-calendar-table) {
			td {
				padding: 0;
				border: $border-width-thin solid $c-fill-light;
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
		background-color: $c-fill-light;
		border-radius: $border-radius-md;
	}

	&__selected-header {
		display: flex;
		justify-content: space-between;
		align-items: center;

		h3 {
			@include subtitle-font;
			font-size: $font-size-button;
			margin: 0;
		}
	}

	&__add {
		@include flex-column;
		gap: $spacing-md;

		h3 {
			@include subtitle-font;
			font-size: $font-size-button;
		}
	}

	&__form {
		display: flex;
		gap: $spacing-md;
		flex-wrap: wrap;
		align-items: center;
	}

	&__type-select {
		width: 138px;
	}

	&__list {
		@include flex-column;
		gap: $spacing-md;

		h3 {
			@include subtitle-font;
			font-size: $font-size-button;
		}
	}

	&__empty {
		@include body-font;
		color: $c-primary;
		padding: $spacing-lg;
		text-align: center;
		background-color: $c-bg;
		border-radius: $border-radius-md;
		border: $border-width-thin dashed $c-fill-light;
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
	transition: all $transition-duration $transition-ease;
	@include flex-column;
	align-items: flex-start;
	justify-content: flex-start;
	gap: $spacing-xs;
	width: 100%;
	height: 100%;
	background-color: $c-bg;

	&:hover:not(&--past):not(&--selected) {
		background-color: $c-fill-light;
	}

	&--has-slots {
		background-color: $c-primary;
		color: $c-bg;

		&:hover:not(.calendar-day--selected) {
			background-color: $c-fill-light;
			color: $c-primary;
		}

		.calendar-day__date {
			color: inherit;
		}
	}

	&--past {
		opacity: 0.4;
		pointer-events: none;
		cursor: default;
	}

	&--selected {
		background-color: $c-warning !important;
		color: $c-primary !important;

		.calendar-day__date {
			color: $c-primary;
		}
	}

	&__date {
		@include body-font;
		font-weight: $font-weight-medium;
		font-size: $font-size-body;
	}

	&__chips {
		display: flex;
		flex-wrap: wrap;
		gap: math.div($spacing-xs, 3);
		width: 100%;
	}
}

.time-slot-item {
	@include flex-center;
	justify-content: flex-start;
	gap: $spacing-md;
	padding: $spacing-md;
	background-color: $c-bg;
	border-radius: $border-radius-md;
	border: $border-width-thin solid $c-fill-light;

	&__date {
		flex: 1;
		@include body-font;
		font-weight: $font-weight-medium;
	}

	&__time {
		@include body-font;
		color: $c-primary;
	}

	&__type {
		@include body-font;
		font-size: $font-size-body;
		color: $c-primary;
		padding: math.div($spacing-xs, 2) $spacing-sm;
		background-color: $c-fill-light;
		border-radius: $border-radius-sm;
	}

	&__status {
		@include body-font;
		font-size: $font-size-body;
		padding: math.div($spacing-xs, 2) $spacing-sm;
		padding-top: $spacing-xs;
		border-radius: $border-radius-sm;
		margin-left: auto;
	}

	&--available {
		border-color: $c-warning;
		background-color: $c-warning-light-9;

		.time-slot-item__status {
			color: $c-primary;
			background-color: $c-warning;
		}
	}

	&--reserved {
		border-color: $c-danger;
		background-color: $c-danger-light-9;

		.time-slot-item__status {
			color: $c-bg;
			background-color: $c-danger;
		}
	}

	&--booked {
		.time-slot-item__status {
			color: $c-bg;
			background-color: $c-primary;
		}
	}
}

// Calendar Legend
.calendar-legend {
	@include flex-center;
	gap: $spacing-lg;
	padding: $spacing-md;
	flex-wrap: wrap;

	&__item {
		@include flex-center;
		gap: $spacing-sm;
	}

	&__color {
		width: $spacing-sm + math.div($spacing-xs, 2);
		height: $spacing-sm + math.div($spacing-xs, 2);
		border-radius: $border-radius-sm;

		&--available {
			background-color: $c-warning;
		}

		&--reserved {
			background-color: $c-danger;
		}

		&--booked {
			background-color: $c-primary;
		}
	}

	&__label {
		@include body-font;
		font-size: $font-size-small;
		color: $c-primary;
	}
}

// Cleanup Manager
// Fade transition for grid changes
.fade-enter-active,
.fade-leave-active {
	transition: opacity $transition-duration $transition-ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

// Slide-fade transition for calendar selection with height animation
.slide-fade-enter-active {
	transition:
		opacity 0.3s ease-out,
		transform 0.3s ease-out,
		max-height 0.3s ease-out;
	overflow: hidden;
}

.slide-fade-leave-active {
	transition:
		opacity 0.25s ease-in,
		transform 0.25s ease-in,
		max-height 0.3s ease-in;
	overflow: hidden;
}

.slide-fade-enter-from {
	transform: translateY(-10px);
	opacity: 0;
	max-height: 0;
}

.slide-fade-enter-to {
	max-height: 500px;
}

.slide-fade-leave-from {
	max-height: 500px;
}

.slide-fade-leave-to {
	transform: translateY(-10px);
	opacity: 0;
	max-height: 0;
}

// Slide left/right transitions for date selection
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
	transition: all $transition-duration-slow $transition-ease;
}

.slide-left-enter-from {
	transform: translateX($slide-offset);
	opacity: 0;
}

.slide-left-leave-to {
	transform: translateX(-$slide-offset);
	opacity: 0;
}

.slide-right-enter-from {
	transform: translateX(-$slide-offset);
	opacity: 0;
}

.slide-right-leave-to {
	transform: translateX($slide-offset);
	opacity: 0;
}

.cleanup-manager {
	@include flex-column;
	gap: $spacing-xl;

	&__description {
		@include body-font;
		color: $c-primary;
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
		background-color: $c-fill-light;
		border-radius: $border-radius-md;

		p {
			@include body-font;
			margin: 0;
		}
	}

	&__danger-zone {
		margin-top: $spacing-lg;
		padding: $spacing-md;
		border: $border-width-normal solid $c-danger;
		border-radius: $border-radius-md;
		background-color: rgba(var(--el-color-danger-rgb), 0.05);

		h4 {
			@include body-font;
			font-weight: $font-weight-bold;
			color: $c-danger;
			margin: 0 0 $spacing-sm 0;
		}
	}

	&__warning {
		@include body-font;
		color: $c-primary;
		margin-bottom: $spacing-md;
	}
}

// CV Viewer - bruger modal-wrapper fra global SCSS for DRY
.cv-viewer {
	&__header {
		@include flex-between;
		padding: $spacing-md $spacing-lg;
		border-bottom: $border-width-thin solid $c-fill-light;
	}

	&__zoom {
		@include flex-center;
		gap: $spacing-xs;
		min-width: 120px;

		span {
			@include body-font;
			min-width: 50px;
			text-align: center;
		}
	}

	&__pagination {
		@include flex-center;
		gap: $spacing-sm;

		span {
			@include body-font;
			min-width: 100px;
			text-align: center;
		}
	}

	&__spacer {
		min-width: 120px;
	}

	&__content {
		flex: 1;
		overflow: hidden;
		background-color: $c-fill-light;
	}

	&__pdf-wrapper {
		padding: $spacing-md;
		display: flex;
		justify-content: center;
		min-height: 100%;

		canvas {
			max-width: 100%;
			height: auto;
		}
	}
}
</style>
