<template>
	<div class="custom-time-picker">
		<h4 v-if="title" class="custom-time-picker__title">{{ title }}</h4>

		<!-- Existing slots collapsible section -->
		<div v-if="availableSlots && availableSlots.length > 0" class="custom-time-picker__existing">
			<button type="button" class="custom-time-picker__toggle" @click="showExistingSlots = !showExistingSlots">
				<span>Vælg fra eksisterende tider ({{ availableSlots.length }} ledige)</span>
				<span class="custom-time-picker__toggle-icon">{{ showExistingSlots ? '▲' : '▼' }}</span>
			</button>

			<Transition name="slide">
				<OverlayScrollbarsComponent
					v-if="showExistingSlots"
					class="custom-time-picker__slots-list"
					:options="{ scrollbars: { autoHide: 'scroll', autoHideDelay: 500 } }"
				>
					<div
						v-for="slot in availableSlots"
						:key="slot.id"
						class="custom-time-picker__slot-item"
						:class="{ 'custom-time-picker__slot-item--selected': selectedExistingSlot === slot.id }"
						@click="selectExistingSlot(slot)"
					>
						<div class="custom-time-picker__slot-info">
							<span class="custom-time-picker__slot-date">{{ formatDate(slot.date) }}</span>
							<span class="custom-time-picker__slot-time">{{ slot.time }}</span>
							<span class="custom-time-picker__slot-type">{{ slot.type === 'fysisk' ? 'Fysisk' : 'Virtuel' }}</span>
						</div>
						<el-button size="small" class="btn-yellow" @click.stop="handleSelectExisting(slot)"> Vælg </el-button>
					</div>
				</OverlayScrollbarsComponent>
			</Transition>
		</div>

		<!-- Divider -->
		<div v-if="availableSlots && availableSlots.length > 0" class="custom-time-picker__divider">
			<span>eller opret manuelt</span>
		</div>

		<!-- Manual time creation -->
		<div class="custom-time-picker__row">
			<el-date-picker
				v-model="localDate"
				type="date"
				placeholder="Vælg dato"
				format="YYYY-MM-DD"
				value-format="YYYY-MM-DD"
				:disabled-date="disablePastDates"
				class="custom-time-picker__date"
			/>
			<el-time-select
				v-model="localTime"
				placeholder="Vælg tid"
				start="08:00"
				step="00:15"
				end="17:00"
				class="custom-time-picker__time"
			/>
		</div>

		<div class="custom-time-picker__row">
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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'

interface TimeSlot {
	id: string
	date: string
	time: string
	type: 'fysisk' | 'virtuel'
	isBooked?: boolean
	reservedBy?: string
	heldBy?: string
}

interface Props {
	title?: string
	buttonText?: string
	loading?: boolean
	initialDate?: string
	initialTime?: string
	initialType?: 'fysisk' | 'virtuel'
	availableSlots?: TimeSlot[]
}

const props = withDefaults(defineProps<Props>(), {
	title: '',
	buttonText: 'Bekræft tid',
	loading: false,
	initialDate: '',
	initialTime: '',
	initialType: 'fysisk',
	availableSlots: () => []
})

const emit = defineEmits<{
	(e: 'submit', data: { date: string; time: string; type: 'fysisk' | 'virtuel' }): void
	(e: 'select-existing', slot: TimeSlot): void
}>()

// Local state
const localDate = ref<string>(props.initialDate)
const localTime = ref<string>(props.initialTime)
const localType = ref<string>(props.initialType)
const showExistingSlots = ref(false)
const selectedExistingSlot = ref<string | null>(null)

// Watch for prop changes
watch(
	() => props.initialDate,
	(val) => {
		localDate.value = val
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

// Disable past dates
const disablePastDates = (date: Date): boolean => {
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	return date < today
}

// Format date for display
const formatDate = (dateString: string): string => {
	const date = new Date(dateString)
	const days = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør']
	const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
	return `${days[date.getDay()]} ${date.getDate()}. ${months[date.getMonth()]}`
}

// Select existing slot (highlight)
const selectExistingSlot = (slot: TimeSlot) => {
	selectedExistingSlot.value = slot.id
}

// Handle selecting an existing slot
const handleSelectExisting = (slot: TimeSlot) => {
	emit('select-existing', slot)
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
	showExistingSlots.value = false
	selectedExistingSlot.value = null
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

	&__existing {
		display: flex;
		flex-direction: column;
		gap: $spacing-xs;
	}

	&__toggle {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: $spacing-sm $spacing-md;
		background-color: $color-light-gray;
		border: 1px solid darken($color-light-gray, 10%);
		border-radius: $border-radius-sm;
		cursor: pointer;
		@include body-font;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: darken($color-light-gray, 5%);
		}
	}

	&__toggle-icon {
		font-size: 10px;
	}

	&__slots-list {
		display: flex;
		flex-direction: column;
		gap: $spacing-xs;
		max-height: 200px;
		overflow-y: auto;
		padding: $spacing-xs;
		background-color: $color-white;
		border: 1px solid $color-light-gray;
		border-radius: $border-radius-sm;
	}

	&__slot-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: $spacing-sm;
		background-color: $color-light-gray;
		border-radius: $border-radius-sm;
		cursor: pointer;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: darken($color-light-gray, 5%);
		}

		&--selected {
			background-color: $color-yellow;
		}
	}

	&__slot-info {
		display: flex;
		gap: $spacing-md;
		@include body-font;
	}

	&__slot-date {
		font-weight: 600;
	}

	&__slot-time {
		color: $color-dark-gray;
	}

	&__slot-type {
		color: $color-gray;
		font-size: 11px;
	}

	&__divider {
		display: flex;
		align-items: center;
		gap: $spacing-sm;
		margin: $spacing-sm 0;

		&::before,
		&::after {
			content: '';
			flex: 1;
			height: 1px;
			background-color: $color-light-gray;
		}

		span {
			@include body-font;
			color: $color-gray;
			font-size: 11px;
			white-space: nowrap;
		}
	}

	&__row {
		display: flex;
		gap: $spacing-sm;
	}

	&__date {
		flex: 1;
	}

	&__time {
		flex: 1;
	}

	&__type {
		width: 100%;
	}

	&__button {
		width: 100%;
		margin-top: $spacing-xs;
	}
}

// Slide transition
.slide-enter-active,
.slide-leave-active {
	transition: all 0.3s ease;
	overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
	max-height: 0;
	opacity: 0;
}

.slide-enter-to,
.slide-leave-from {
	max-height: 200px;
	opacity: 1;
}
</style>
