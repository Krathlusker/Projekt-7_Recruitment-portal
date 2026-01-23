<template>
	<div class="calendar-slot-picker" v-loading="loading">
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
						? (selectedSlotIds.length >= maxSlots && !isSlotSelected(slot.id))
						: (slot.isBooked || slot.heldBy)
				}"
				@click="selectSlot(slot)"
			>
				<span class="calendar-slot-picker__slot-time">{{ slot.time }}</span>
				<span class="calendar-slot-picker__slot-type">{{ slot.type === 'fysisk' ? 'Fysisk' : 'Virtuel' }}</span>
			</div>
		</div>

		<!-- No date selected message -->
		<div v-else-if="!selectedDate" class="calendar-slot-picker__no-date">
			<p>Tryk på "VÆLG DATO" for at vælge en samtaledag</p>
		</div>

		<!-- No slots available message -->
		<div v-else-if="selectedDate && slotsForSelectedDate.length === 0" class="calendar-slot-picker__no-slots">
			<p>Ingen ledige tider på denne dato</p>
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
							<span class="calendar-slot-picker__selected-slot-time">{{ getSlotById(selectedSlotIds[index])?.time }}</span>
							<span class="calendar-slot-picker__selected-slot-date">{{ formatShortDate(getSlotById(selectedSlotIds[index])?.date || '') }}</span>
						</div>
						<el-button class="calendar-slot-picker__selected-slot-remove" @click="removeSlotByIndex(index)" :icon="Delete" circle />
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
			<div v-if="calendarModalVisible" class="calendar-modal-overlay" @click.self="closeCalendarModal">
				<div class="calendar-modal">
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
	</Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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

// Watch for initial date changes
watch(() => props.initialDate, (val) => {
	if (val) {
		selectedDate.value = val
		calendarDate.value = new Date(val)
	}
})

// Calendar key for transition
const calendarKey = computed(() => {
	return `${calendarDate.value.getFullYear()}-${calendarDate.value.getMonth()}`
})

// Computed: slots for selected date
const slotsForSelectedDate = computed(() => {
	if (!selectedDate.value) return []
	return props.availableSlots.filter(slot => {
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
	return props.availableSlots.find(slot => slot.id === slotId)
}

// Check if current month is displayed
const isCurrentMonth = computed(() => {
	const now = new Date()
	return (
		calendarDate.value.getMonth() === now.getMonth() &&
		calendarDate.value.getFullYear() === now.getFullYear()
	)
})

// Format functions
const formatShortDate = (dateString: string): string => {
	if (!dateString) return ''
	const date = new Date(dateString)
	return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })
}

const formatMonthYear = (): string => {
	const months = [
		'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
		'Juli', 'August', 'September', 'Oktober', 'November', 'December'
	]
	return `${months[calendarDate.value.getMonth()]} ${calendarDate.value.getFullYear()}`
}

// Calendar helpers
const hasTimeSlotsOnDate = (dateString: string): boolean => {
	return props.availableSlots.some(slot => slot.date === dateString && !slot.isBooked && !slot.heldBy && !slot.reservedBy)
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
	newDate.setMonth(newDate.getMonth() - 1)
	calendarDate.value = newDate
}

const nextMonth = () => {
	calendarSlideDirection.value = 'calendar-slide-left'
	const newDate = new Date(calendarDate.value)
	newDate.setMonth(newDate.getMonth() + 1)
	calendarDate.value = newDate
}

const goToToday = () => {
	const now = new Date()
	if (calendarDate.value > now) {
		calendarSlideDirection.value = 'calendar-slide-right'
	} else {
		calendarSlideDirection.value = 'calendar-slide-left'
	}
	calendarDate.value = now
}

// Modal controls
const openCalendarModal = () => {
	calendarModalVisible.value = true
}

const closeCalendarModal = () => {
	calendarModalVisible.value = false
}

const selectDateAndClose = (dateString: string) => {
	if (!hasTimeSlotsOnDate(dateString) || isDateInPast(dateString)) return
	selectedDate.value = dateString
	selectedSlotId.value = null
	closeCalendarModal()
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
	const slot = props.availableSlots.find(s => s.id === selectedSlotId.value)
	if (slot) {
		emit('confirm', slot)
	}
}

// Find first available date
const findFirstAvailableDate = (): string | null => {
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const datesWithSlots = [...new Set(
		props.availableSlots
			.filter(slot => !slot.isBooked && !slot.heldBy && !slot.reservedBy && new Date(slot.date) >= today)
			.map(slot => slot.date)
	)].sort()

	return datesWithSlots[0] || null
}

// Reset function
const reset = () => {
	selectedDate.value = ''
	selectedSlotId.value = null
}

// Watch for slot changes - clean up selection if slot is no longer available
watch(() => props.availableSlots, (slots) => {
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
			slot => slot.id === selectedSlotId.value &&
			!slot.isBooked &&
			!slot.heldBy &&
			!slot.reservedBy
		)
		if (!stillAvailable) {
			selectedSlotId.value = null
		}
	}

	// If selected date has no more available slots, find a new date
	if (selectedDate.value) {
		const slotsOnDate = slots.filter(
			slot => slot.date === selectedDate.value &&
			!slot.isBooked &&
			!slot.heldBy &&
			!slot.reservedBy
		)
		if (slotsOnDate.length === 0) {
			const newDate = findFirstAvailableDate()
			if (newDate && newDate !== selectedDate.value) {
				selectedDate.value = newDate
				calendarDate.value = new Date(newDate)
			}
		}
	}
}, { immediate: true })

defineExpose({ reset })
</script>

<style lang="scss" scoped>
@use 'sass:color';

.calendar-slot-picker {
	display: flex;
	flex-direction: column;
	gap: $spacing-md;

	&__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: $spacing-md;
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

	&__slots {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: $spacing-sm;
	}

	&__slot {
		@include flex-column;
		@include flex-center;
		gap: $spacing-xs;
		padding: $spacing-xs $spacing-sm;
		border: 2px solid $color-dark-gray;
		border-radius: $border-radius-md;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
		background-color: $color-white;

		&:hover:not(&--disabled):not(&--selected) {
			background-color: $color-light-gray;
		}

		&--selected {
			background-color: $color-dark-gray !important;
			color: $color-white;

			&:hover {
				background-color: color.adjust($color-dark-gray, $lightness: 10%) !important;
			}
		}

		&--disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	&__slot-time {
		@include body-bold-font;
		font-size: 18px;
		color: inherit;
	}

	&__slot-type {
		@include body-font;
		padding: $spacing-xs $spacing-sm;
		border: 1px solid currentColor;
		border-radius: $border-radius-sm;
		color: inherit;
	}

	&__no-date,
	&__no-slots {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		border: 2px dashed $color-light-gray;
		border-radius: $border-radius-md;
		color: $color-dark-gray;
		text-align: center;
		padding: $spacing-lg;

		p {
			@include body-font;
			margin: 0;
		}
	}

	&__confirm-btn {
		width: 100%;
	}

	// Multi-select: Selected slots section - matches ApplicationModal 1:1
	&__selected-section {
		display: flex;
		flex-direction: column;
	}

	&__slots-count {
		@include body-bold-font;
		font-size: 18px;
		text-align: center;
		margin-top: $spacing-sm;
	}

	&__selected-slots {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $spacing-sm;
		height: 52px;
	}

	&__selected-slot {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		padding: $spacing-sm;
		border: 2px solid $color-dark-gray;
		border-radius: $border-radius-md;
		background-color: $color-dark-gray;
		color: $color-white;

		&--empty {
			background-color: transparent;
			border-style: dashed;
			justify-content: flex-start;
		}
	}

	&__selected-slot-info {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: $spacing-sm;
		flex: 1;
		padding-top: 3px;
	}

	&__selected-slot-time {
		@include body-font;
		font-weight: $font-weight-bold;
		color: $color-white;
	}

	&__selected-slot-date {
		font-size: 12px;
		opacity: 0.7;
	}

	&__selected-slot-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		background-color: transparent;
		color: $color-white;
		cursor: pointer;
		border-radius: $border-radius-sm;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: rgba($color-white, 0.2);
		}
	}

	&__selected-slot-empty {
		@include body-font;
		font-size: 12px;
		color: $color-dark-gray;
		opacity: 0.5;
	}
}

// Calendar modal styles are in _global.scss
</style>
