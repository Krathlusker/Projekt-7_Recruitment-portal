<template>
	<el-button type="danger" size="large" class="floating-apply-button" @click="$emit('click')">
		ANSØG NU
		<el-icon>
			<ArrowRight />
		</el-icon>
	</el-button>
</template>

<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue'

defineEmits<{
	click: []
}>()
</script>

<style lang="scss" scoped>
// Button styling removed - using global btn-red class
// Position-only styling kept for floating behavior

.floating-apply-button {
	position: fixed;
	top: 50%;
	right: calc(42px + var(--scrollbar-width, 0px));
	transform: rotate(-90deg);
	transform-origin: 100% 0;
	z-index: $z-index-floating-button;
	transition: right 0.1s ease;

	@include mobile {
		right: calc(24px + var(--scrollbar-width, 0px));
	}
}
</style>
