<template>
	<div class="custom-time-picker">
		<h4 v-if="title" class="custom-time-picker__title">{{ title }}</h4>

		<!-- Divider -->
		<el-divider>eller opret manuelt</el-divider>

		<!-- Date selection with our calendar picker -->
		<div class="custom-time-picker__date-header">
			<span class="custom-time-picker__date-display">{{
				localDate ? formatShortDate(localDate) : 'Ingen dato valgt'
			}}</span>
			<el-button class="custom-time-picker__date-btn btn-dark" @click="openCalendarModal">
				<el-icon><Calendar /></el-icon>
				<span>VÆLG DATO</span>
			</el-button>
		</div>

		<!-- Time and type selection -->
		<div class="custom-time-picker__row">
			<el-time-select
				v-model="localTime"
				placeholder="Vælg tid"
				start="08:00"
				step="00:15"
				end="17:00"
				class="custom-time-picker__time"
			/>
			<el-select v-model="localType" placeholder="Vælg type" class="custom-time-picker__type">
				<el-option label="Fysisk (45 min)" value="fysisk" />
				<el-option label="Virtuel (60 min)" value="virtuel" />
			</el-select>
		</div>

		<el-button
			:disabled="!isValid"
			:loading="loading"
			@click="handleSubmit"
			class="btn-dark custom-time-picker__button"
		>
			{{ buttonText }}
		</el-button>
	</div>

	<!-- Calendar Modal (same style as CalendarSlotPicker) -->
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
											class="calendar-modal__day"
											:class="{
												'calendar-modal__day--available': !isDateInPast(data.day),
												'calendar-modal__day--selected': localDate === data.day && !isDateInPast(data.day),
												'calendar-modal__day--disabled': isDateInPast(data.day),
												'calendar-modal__day--other-month': isOtherMonth(data.day),
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
									<span class="calendar-modal__legend-label">Valgbar dato</span>
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
import { Calendar, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

interface Props {
	title?: string
	buttonText?: string
	loading?: boolean
	initialDate?: string
	initialTime?: string
	initialType?: 'fysisk' | 'virtuel'
}

const props = withDefaults(defineProps<Props>(), {
	title: '',
	buttonText: 'Bekræft tid',
	loading: false,
	initialDate: '',
	initialTime: '',
	initialType: 'fysisk'
})

const emit = defineEmits<{
	(e: 'submit', data: { date: string; time: string; type: 'fysisk' | 'virtuel' }): void
}>()

// Local state
const localDate = ref<string>(props.initialDate)
const localTime = ref<string>(props.initialTime)
const localType = ref<string>(props.initialType)

// Calendar modal state
const calendarModalVisible = ref(false)
const calendarDate = ref(new Date())
const calendarSlideDirection = ref<'calendar-slide-left' | 'calendar-slide-right'>('calendar-slide-left')

// Calendar key for transition
const calendarKey = computed(() => {
	return `${calendarDate.value.getFullYear()}-${calendarDate.value.getMonth()}`
})

// Check if current month is displayed
const isCurrentMonth = computed(() => {
	const now = new Date()
	return calendarDate.value.getMonth() === now.getMonth() && calendarDate.value.getFullYear() === now.getFullYear()
})

// Watch for prop changes
watch(
	() => props.initialDate,
	(val) => {
		localDate.value = val
		if (val) {
			calendarDate.value = new Date(val)
		}
	}
)
watch(
	() => props.initialTime,
	(val) => {
		localTime.value = val
	}
)
watch(
	() => props.initialType,
	(val) => {
		localType.value = val
	}
)

// Validation
const isValid = computed(() => {
	return localDate.value && localTime.value && localType.value
})

// Format functions
const formatShortDate = (dateStr: string): string => {
	const date = new Date(dateStr)
	const days = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør']
	const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
	return `${days[date.getDay()]} ${date.getDate()}. ${months[date.getMonth()]}`
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

// Calendar navigation
const openCalendarModal = () => {
	if (localDate.value) {
		calendarDate.value = new Date(localDate.value)
	}
	calendarModalVisible.value = true
}

const closeCalendarModal = () => {
	calendarModalVisible.value = false
}

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

// Date helpers
const isDateInPast = (dateStr: string): boolean => {
	const date = new Date(dateStr)
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	return date < today
}

const isToday = (dateStr: string): boolean => {
	const date = new Date(dateStr)
	const today = new Date()
	return (
		date.getDate() === today.getDate() &&
		date.getMonth() === today.getMonth() &&
		date.getFullYear() === today.getFullYear()
	)
}

const isOtherMonth = (dateStr: string): boolean => {
	const date = new Date(dateStr)
	return date.getMonth() !== calendarDate.value.getMonth()
}

const selectDateAndClose = (dateStr: string) => {
	if (isDateInPast(dateStr)) return
	localDate.value = dateStr
	closeCalendarModal()
}

// Submit handler for manual time
const handleSubmit = () => {
	if (!isValid.value) return

	emit('submit', {
		date: localDate.value,
		time: localTime.value,
		type: localType.value as 'fysisk' | 'virtuel'
	})
}

// Reset function exposed for parent
const reset = () => {
	localDate.value = ''
	localTime.value = ''
	localType.value = 'fysisk'
}

defineExpose({ reset })
</script>

<style lang="scss" scoped>
.custom-time-picker {
	display: flex;
	flex-direction: column;
	gap: $spacing-sm;

	&__title {
		@include body-font;
		font-weight: 600;
		margin: 0 0 $spacing-xs 0;
	}

	&__date-header {
		@include slot-picker-header;
	}

	&__date-display {
		@include slot-picker-date-display;
	}

	&__date-btn {
		@include slot-picker-date-btn;
	}

	&__row {
		display: flex;
		gap: $spacing-sm;
	}

	&__time {
		flex: 1;
	}

	&__type {
		flex: 1;
	}

	&__button {
		width: 100%;
		margin-top: $spacing-xs;
	}
}

// Calendar modal styles are in _global.scss
</style>
