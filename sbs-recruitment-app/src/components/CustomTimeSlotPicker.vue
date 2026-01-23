<template>
	<div class="custom-time-picker">
		<h4 v-if="title" class="custom-time-picker__title">{{ title }}</h4>

		<!-- Divider -->
		<el-divider>eller opret manuelt</el-divider>

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
</style>
