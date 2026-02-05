<template>
	<div class="calendar-slot-picker">
		<!-- Date header with selected date and button -->
		<div class="calendar-slot-picker__header">
			<span class="calendar-slot-picker__date-display">{{
				selectedDate ? formatShortDate(selectedDate) : 'Ingen dato valgt'
			}}</span>
			<el-button class="calendar-slot-picker__date-btn" @click="openCalendarModal">
				<el-icon><Calendar /></el-icon>
				<span>VÆLG DATO</span>
			</el-button>
		</div>

		<!-- Time slots for selected date -->
		<div v-if="selectedDate && slotsForSelectedDate.length > 0" class="calendar-slot-picker__slots">
			<div
				v-for="slot in slotsForSelectedDate"
				:key="slot.id"
				class="calendar-slot-picker__slot"
				:class="{
					'calendar-slot-picker__slot--selected': isSlotSelected(slot.id),
					'calendar-slot-picker__slot--disabled': multiSelect
						? selectedSlotIds.length >= maxSlots && !isSlotSelected(slot.id)
						: slot.isBooked || slot.heldBy
				}"
				@click="selectSlot(slot)"
			>
				<span class="calendar-slot-picker__slot-time">{{ slot.time }}</span>
				<span class="calendar-slot-picker__slot-type">{{ slot.type === 'fysisk' ? 'Fysisk' : 'Virtuel' }}</span>
			</div>
		</div>

		<!-- No date selected message -->
		<div v-else-if="!selectedDate" class="calendar-slot-picker__no-date">
			<el-text type="info">Tryk på "VÆLG DATO" for at vælge en samtaledag</el-text>
		</div>

		<!-- No slots available message -->
		<div v-else-if="selectedDate && slotsForSelectedDate.length === 0" class="calendar-slot-picker__no-slots">
			<el-text type="warning">Ingen ledige tider på denne dato</el-text>
		</div>

		<!-- Selected slots section (multi-select mode only) -->
		<div v-if="multiSelect" class="calendar-slot-picker__selected-section">
			<div class="calendar-slot-picker__slots-count">Valgt: {{ selectedSlotIds.length }} af {{ maxSlots }}</div>
			<div class="calendar-slot-picker__selected-slots">
				<div
					v-for="(_, index) in maxSlots"
					:key="index"
					class="calendar-slot-picker__selected-slot"
					:class="{ 'calendar-slot-picker__selected-slot--empty': !selectedSlotIds[index] }"
				>
					<template v-if="selectedSlotIds[index]">
						<div class="calendar-slot-picker__selected-slot-info">
							<span class="calendar-slot-picker__selected-slot-time">{{
								getSlotById(selectedSlotIds[index])?.time
							}}</span>
							<span class="calendar-slot-picker__selected-slot-date">{{
								formatShortDate(getSlotById(selectedSlotIds[index])?.date || '')
							}}</span>
						</div>
						<el-button
							class="calendar-slot-picker__selected-slot-remove"
							@click="removeSlotByIndex(index)"
							:icon="Delete"
							circle
						/>
					</template>
					<template v-else>
						<span class="calendar-slot-picker__selected-slot-empty">{{ index + 1 }}. valg</span>
					</template>
				</div>
			</div>
		</div>

		<!-- Confirm button (single-select mode only) -->
		<el-button
			v-if="!multiSelect && selectedSlotId"
			class="calendar-slot-picker__confirm-btn btn-yellow"
			:loading="loading"
			@click="confirmSelection"
		>
			{{ confirmButtonText }}
		</el-button>
	</div>

	<!-- Calendar Modal -->
	<Teleport to="body">
		<Transition name="calendar-modal">
			<div
				v-if="calendarModalVisible"
				class="calendar-modal-overlay"
				@click.self="closeCalendarModal"
			>
				<div
					class="calendar-modal"
					ref="calendarModalRef"
					role="dialog"
					aria-modal="true"
					aria-label="Vælg dato"
					tabindex="-1"
				>
					<div class="calendar-modal__content">
						<div class="calendar-modal__header">
							<Transition :name="calendarSlideDirection" mode="out-in">
								<span :key="calendarKey" class="calendar-modal__title">{{ formatMonthYear() }}</span>
							</Transition>
							<Transition name="fade" mode="out-in">
								<el-button v-if="!isCurrentMonth" key="today-btn" class="calendar-modal__today-btn" @click="goToToday">
									I dag
								</el-button>
								<span v-else key="today-placeholder" class="calendar-modal__today-placeholder"></span>
							</Transition>
							<div class="calendar-modal__controls">
								<Transition name="fade" mode="out-in">
									<el-button
										v-if="!isCurrentMonth"
										key="prev-btn"
										class="calendar-modal__nav"
										:icon="ArrowLeft"
										@click="prevMonth"
									/>
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
											:class="[
												'calendar-modal__day',
												{
													'calendar-modal__day--has-slots': hasTimeSlotsOnDate(data.day) && !isDateInPast(data.day),
													'calendar-modal__day--selected':
														selectedDate === data.day && hasTimeSlotsOnDate(data.day) && !isDateInPast(data.day),
													'calendar-modal__day--disabled': !hasTimeSlotsOnDate(data.day) || isDateInPast(data.day),
													'calendar-modal__day--other-month': isOtherMonth(data.day) || isDateInPast(data.day),
													'calendar-modal__day--today': isToday(data.day)
												}
											]"
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
	</Teleport>
</template>

<script setup lang="ts">
import { Calendar, ArrowLeft, ArrowRight, Delete } from '@element-plus/icons-vue'

interface TimeSlot {
	id: string
	date: string
	time: string
	type: 'fysisk' | 'virtuel'
	isBooked?: boolean
	heldBy?: string
	reservedBy?: string
}

interface Props {
	availableSlots: TimeSlot[]
	loading?: boolean
	confirmButtonText?: string
	initialDate?: string
	// Multi-select mode props
	multiSelect?: boolean
	maxSlots?: number
	selectedSlotIds?: string[]
	sessionId?: string
}

const props = withDefaults(defineProps<Props>(), {
	loading: false,
	confirmButtonText: 'Bekræft valg',
	initialDate: '',
	multiSelect: false,
	maxSlots: 2,
	selectedSlotIds: () => [],
	sessionId: ''
})

const emit = defineEmits<{
	(e: 'select', slot: TimeSlot): void
	(e: 'deselect', slot: TimeSlot): void
	(e: 'confirm', slot: TimeSlot): void
	(e: 'update:selectedSlotIds', ids: string[]): void
}>()

// State
const selectedDate = ref<string>(props.initialDate)
const selectedSlotId = ref<string | null>(null)
const calendarModalVisible = ref(false)
const calendarDate = ref(new Date())
const calendarSlideDirection = ref<'calendar-slide-left' | 'calendar-slide-right'>('calendar-slide-left')

// Watch for modal visibility - add tabindex when modal opens
watch(calendarModalVisible, (isVisible) => {
	if (isVisible) {
		// Wait for DOM to render, then add tabindex to available days
		setTimeout(() => {
			document.querySelectorAll('.calendar-modal__day--has-slots:not(.calendar-modal__day--disabled)').forEach((el) => {
				el.setAttribute('tabindex', '0')
			})
		}, 200)
	}
})

// Watch for initial date changes
watch(
	() => props.initialDate,
	(val) => {
		if (val) {
			selectedDate.value = val
			calendarDate.value = new Date(val)
		}
	}
)

// Calendar key for transition
const calendarKey = computed(() => {
	return `${calendarDate.value.getFullYear()}-${calendarDate.value.getMonth()}`
})

// Computed: slots for selected date
const slotsForSelectedDate = computed(() => {
	if (!selectedDate.value) return []
	return props.availableSlots.filter((slot) => {
		if (slot.date !== selectedDate.value) return false
		if (slot.isBooked) return false
		if (slot.heldBy) return false
		// In multi-select mode, show slots reserved by this session
		if (slot.reservedBy && props.multiSelect && props.sessionId) {
			return slot.reservedBy === props.sessionId
		}
		if (slot.reservedBy) return false
		return true
	})
})

// Multi-select helpers
const isSlotSelected = (slotId: string): boolean => {
	if (props.multiSelect) {
		return props.selectedSlotIds.includes(slotId)
	}
	return selectedSlotId.value === slotId
}

const getSlotById = (slotId: string): TimeSlot | undefined => {
	return props.availableSlots.find((slot) => slot.id === slotId)
}

// Check if current month is displayed
const isCurrentMonth = computed(() => {
	const now = new Date()
	return calendarDate.value.getMonth() === now.getMonth() && calendarDate.value.getFullYear() === now.getFullYear()
})

// Format functions
const formatShortDate = (dateString: string): string => {
	if (!dateString) return ''
	const date = new Date(dateString)
	return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })
}

const formatMonthYear = (): string => {
	const months = [
		'Januar',
		'Februar',
		'Marts',
		'April',
		'Maj',
		'Juni',
		'Juli',
		'August',
		'September',
		'Oktober',
		'November',
		'December'
	]
	return `${months[calendarDate.value.getMonth()]} ${calendarDate.value.getFullYear()}`
}

// Calendar helpers
const hasTimeSlotsOnDate = (dateString: string): boolean => {
	return props.availableSlots.some(
		(slot) => slot.date === dateString && !slot.isBooked && !slot.heldBy && !slot.reservedBy
	)
}

const isDateAvailable = (dateString: string): boolean => {
	return hasTimeSlotsOnDate(dateString) && !isDateInPast(dateString)
}

const isDateInPast = (dateString: string): boolean => {
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	const checkDate = new Date(dateString)
	return checkDate < today
}

const isOtherMonth = (dateString: string): boolean => {
	const date = new Date(dateString)
	return date.getMonth() !== calendarDate.value.getMonth()
}

const isToday = (dateString: string): boolean => {
	const today = new Date()
	const checkDate = new Date(dateString)
	return (
		checkDate.getDate() === today.getDate() &&
		checkDate.getMonth() === today.getMonth() &&
		checkDate.getFullYear() === today.getFullYear()
	)
}

// Calendar navigation
const prevMonth = () => {
	calendarSlideDirection.value = 'calendar-slide-right'
	const newDate = new Date(calendarDate.value)
	newDate.setDate(1) // Sæt til 1. for at undgå overflow (f.eks. 31 jan -> 1 mar)
	newDate.setMonth(newDate.getMonth() - 1)
	calendarDate.value = newDate
	// Genopsæt accessibility efter måned-skift
	setupCalendarAccessibility()
}

const nextMonth = () => {
	calendarSlideDirection.value = 'calendar-slide-left'
	const newDate = new Date(calendarDate.value)
	newDate.setDate(1) // Sæt til 1. for at undgå overflow (f.eks. 31 jan -> 1 mar)
	newDate.setMonth(newDate.getMonth() + 1)
	calendarDate.value = newDate
	// Genopsæt accessibility efter måned-skift
	setupCalendarAccessibility()
}

const goToToday = () => {
	const now = new Date()
	if (calendarDate.value > now) {
		calendarSlideDirection.value = 'calendar-slide-right'
	} else {
		calendarSlideDirection.value = 'calendar-slide-left'
	}
	calendarDate.value = now
	// Genopsæt accessibility efter måned-skift
	setupCalendarAccessibility()
}

// Modal ref for focus trap
const calendarModalRef = ref<HTMLElement | null>(null)
let previousActiveElement: HTMLElement | null = null

// Global keydown handler for focus trap
const handleGlobalKeydown = (event: KeyboardEvent) => {
	if (!calendarModalVisible.value) return

	// Luk med Escape
	if (event.key === 'Escape') {
		event.preventDefault()
		closeCalendarModal()
		return
	}

	// Focus trap med Tab
	if (event.key === 'Tab') {
		const modal = calendarModalRef.value
		if (!modal) return

		// Find alle fokusbare elementer i modalen
		const focusableSelectors = [
			'button:not([disabled])',
			'.calendar-modal__day[tabindex="0"]',
			'a[href]',
			'input:not([disabled])',
			'select:not([disabled])',
			'textarea:not([disabled])'
		].join(', ')

		const focusableElements = Array.from(modal.querySelectorAll(focusableSelectors)) as HTMLElement[]
		if (focusableElements.length === 0) return

		const firstElement = focusableElements[0]
		const lastElement = focusableElements[focusableElements.length - 1]

		// Shift+Tab fra første element → gå til sidste
		if (event.shiftKey && document.activeElement === firstElement) {
			event.preventDefault()
			lastElement.focus()
		}
		// Tab fra sidste element → gå til første
		else if (!event.shiftKey && document.activeElement === lastElement) {
			event.preventDefault()
			firstElement.focus()
		}
		// Hvis fokus er uden for modalen, flyt det ind
		else if (!modal.contains(document.activeElement)) {
			event.preventDefault()
			firstElement.focus()
		}
	}
}

// Modal controls
const openCalendarModal = () => {
	// Gem det element der havde fokus før modal åbnede
	previousActiveElement = document.activeElement as HTMLElement
	calendarModalVisible.value = true

	// Tilføj global keydown listener
	document.addEventListener('keydown', handleGlobalKeydown)

	// Tilføj tabindex til kalenderdage efter DOM er renderet
	setTimeout(() => {
		document.querySelectorAll('.calendar-modal__day--has-slots:not(.calendar-modal__day--disabled)').forEach((el) => {
			el.setAttribute('tabindex', '0')
		})
	}, 200)
}

// Tilføj tabindex og keyboard handlers til kalenderdage
const setupCalendarAccessibility = (focusFirst = false) => {
	nextTick(() => {
		setTimeout(() => {
			const modal = calendarModalRef.value
			if (!modal) return

			// Find alle kalenderdage i modalen
			const allDays = modal.querySelectorAll('.calendar-modal__day') as NodeListOf<HTMLElement>

			allDays.forEach((dayEl) => {
				const isAvailable = dayEl.classList.contains('calendar-modal__day--has-slots') &&
				                    !dayEl.classList.contains('calendar-modal__day--disabled')

				// Sæt tabindex baseret på tilgængelighed
				dayEl.setAttribute('tabindex', isAvailable ? '0' : '-1')
				dayEl.setAttribute('role', 'gridcell')

				// Tilføj keyboard handler hvis ikke allerede sat
				if (!dayEl.dataset.keyboardSetup) {
					dayEl.dataset.keyboardSetup = 'true'
					dayEl.addEventListener('keydown', (e) => handleDayKeydownFromElement(e, dayEl))
				}
			})

			// Fokuser første tilgængelige dag hvis ønsket
			if (focusFirst) {
				const firstFocusable = modal.querySelector('.calendar-modal__day[tabindex="0"]') as HTMLElement
				if (firstFocusable) {
					firstFocusable.focus()
				}
			}
		}, 100) // Delay for at sikre DOM og Transition er færdig
	})
}

const closeCalendarModal = () => {
	calendarModalVisible.value = false

	// Fjern global keydown listener
	document.removeEventListener('keydown', handleGlobalKeydown)

	// Returnér fokus til elementet der åbnede modalen
	if (previousActiveElement) {
		nextTick(() => {
			previousActiveElement?.focus()
		})
	}
}

// Cleanup ved unmount
onUnmounted(() => {
	document.removeEventListener('keydown', handleGlobalKeydown)
})

const selectDateAndClose = (dateString: string) => {
	if (!isDateAvailable(dateString)) return
	selectedDate.value = dateString
	selectedSlotId.value = null
	closeCalendarModal()
}

// Keyboard handler for calendar days - handles Enter, Space, and arrow keys
// Keyboard handler from JavaScript-added event listener
const handleDayKeydownFromElement = (event: KeyboardEvent, dayEl: HTMLElement) => {
	// Hent dato fra elementets tekst og nuværende måned
	const dayNumber = parseInt(dayEl.textContent || '0')
	const year = calendarDate.value.getFullYear()
	const month = calendarDate.value.getMonth()
	const currentDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`

	handleDayKeydown(event, currentDateString)
}

const handleDayKeydown = (event: KeyboardEvent, currentDateString: string) => {
	// Enter/Space = select date
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault()
		selectDateAndClose(currentDateString)
		return
	}

	// Arrow keys = navigate
	const currentDate = new Date(currentDateString)
	let dayOffset = 0

	switch (event.key) {
		case 'ArrowLeft':
			dayOffset = -1
			break
		case 'ArrowRight':
			dayOffset = 1
			break
		case 'ArrowUp':
			dayOffset = -7
			break
		case 'ArrowDown':
			dayOffset = 7
			break
		default:
			return // Not an arrow key
	}

	event.preventDefault()

	const targetDate = new Date(currentDate)
	targetDate.setDate(targetDate.getDate() + dayOffset)
	const targetDateString = targetDate.toISOString().split('T')[0]

	// Check if we need to change month
	if (targetDate.getMonth() !== calendarDate.value.getMonth()) {
		const now = new Date()
		now.setHours(0, 0, 0, 0)

		// Don't go before current month
		if (targetDate < now && targetDate.getMonth() < now.getMonth()) {
			return
		}

		// Change month
		if (targetDate < calendarDate.value) {
			prevMonth()
		} else {
			nextMonth()
		}

		// Focus target date after transition
		setTimeout(() => focusDateElement(targetDateString), 350)
	} else {
		focusDateElement(targetDateString)
	}
}

// Focus a specific date element in the calendar
const focusDateElement = (dateString: string) => {
	// Da vi ikke kan bruge data-date attribut, finder vi elementet via dag-nummeret
	const dayNumber = parseInt(dateString.split('-')[2])
	const calendarWrapper = document.querySelector('.calendar-modal__calendar-wrapper')
	if (!calendarWrapper) return

	const allDays = calendarWrapper.querySelectorAll('.calendar-modal__day') as NodeListOf<HTMLElement>
	for (const dayEl of allDays) {
		if (parseInt(dayEl.textContent || '0') === dayNumber) {
			// Tjek at det ikke er en "other-month" dag
			if (!dayEl.classList.contains('calendar-modal__day--other-month')) {
				dayEl.focus()
				return
			}
		}
	}
}

// Slot selection
const selectSlot = (slot: TimeSlot) => {
	if (slot.isBooked || slot.heldBy) return

	if (props.multiSelect) {
		// Multi-select mode: toggle slot
		// Allow clicking on slots reserved by this session (to deselect them)
		if (slot.reservedBy && slot.reservedBy !== props.sessionId) return

		const currentIds = [...props.selectedSlotIds]
		const index = currentIds.indexOf(slot.id)

		if (index > -1) {
			// Deselect
			currentIds.splice(index, 1)
			emit('update:selectedSlotIds', currentIds)
			emit('deselect', slot)
		} else if (currentIds.length < props.maxSlots) {
			// Select
			currentIds.push(slot.id)
			emit('update:selectedSlotIds', currentIds)
			emit('select', slot)
		}
	} else {
		// Single-select mode
		if (slot.reservedBy) return
		selectedSlotId.value = slot.id
		emit('select', slot)
	}
}

const removeSlotByIndex = (index: number) => {
	if (!props.multiSelect) return
	const slotId = props.selectedSlotIds[index]
	if (!slotId) return

	const slot = getSlotById(slotId)
	if (slot) {
		const currentIds = [...props.selectedSlotIds]
		currentIds.splice(index, 1)
		emit('update:selectedSlotIds', currentIds)
		emit('deselect', slot)
	}
}

const confirmSelection = () => {
	const slot = props.availableSlots.find((s) => s.id === selectedSlotId.value)
	if (slot) {
		emit('confirm', slot)
	}
}

// Find first available date
const findFirstAvailableDate = (): string | null => {
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const datesWithSlots = [
		...new Set(
			props.availableSlots
				.filter((slot) => !slot.isBooked && !slot.heldBy && !slot.reservedBy && new Date(slot.date) >= today)
				.map((slot) => slot.date)
		)
	].sort()

	return datesWithSlots[0] || null
}

// Reset function
const reset = () => {
	selectedDate.value = ''
	selectedSlotId.value = null
}

// Watch for slot changes - clean up selection if slot is no longer available
watch(
	() => props.availableSlots,
	(slots) => {
		// Auto-select first available date if none selected
		if (slots.length > 0 && !selectedDate.value) {
			const firstDate = findFirstAvailableDate()
			if (firstDate) {
				selectedDate.value = firstDate
				calendarDate.value = new Date(firstDate)
			}
		}

		// Clear selected slot if it's no longer available
		if (selectedSlotId.value) {
			const stillAvailable = slots.some(
				(slot) => slot.id === selectedSlotId.value && !slot.isBooked && !slot.heldBy && !slot.reservedBy
			)
			if (!stillAvailable) {
				selectedSlotId.value = null
			}
		}

		// If selected date has no more available slots, find a new date
		if (selectedDate.value) {
			const slotsOnDate = slots.filter(
				(slot) => slot.date === selectedDate.value && !slot.isBooked && !slot.heldBy && !slot.reservedBy
			)
			if (slotsOnDate.length === 0) {
				const newDate = findFirstAvailableDate()
				if (newDate && newDate !== selectedDate.value) {
					selectedDate.value = newDate
					calendarDate.value = new Date(newDate)
				}
			}
		}
	},
	{ immediate: true }
)

defineExpose({ reset })
</script>

<style lang="scss" scoped>
.calendar-slot-picker {
	display: flex;
	flex-direction: column;
	gap: $spacing-md;

	&__header {
		@include slot-picker-header;
	}

	&__date-display {
		@include slot-picker-date-display;
	}

	&__date-btn {
		@include slot-picker-date-btn;
	}

	&__slots {
		@include slot-grid;
	}

	&__slot {
		@include slot-item;

		&--selected {
			@include slot-item-selected;
		}

		&--disabled {
			@include slot-item-disabled;
		}
	}

	&__slot-time {
		@include slot-time;
	}

	&__slot-type {
		@include slot-type-badge;
	}

	&__no-date,
	&__no-slots {
		@include slot-empty-state;
	}

	&__confirm-btn {
		width: 100%;
	}

	// Multi-select: Selected slots section
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

	&__selected-slot-time {
		@include selected-slot-time;
	}

	&__selected-slot-date {
		@include selected-slot-date;
	}

	&__selected-slot-remove {
		@include selected-slot-remove-btn;
	}

	&__selected-slot-empty {
		@include selected-slot-empty-text;
	}
}

// Calendar modal styles are in _global.scss
</style>
