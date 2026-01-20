<template>
	<button class="floating-apply-button" @click="$emit('click')">
		<span class="floating-apply-button__text">ANSOG NU</span>
		<el-icon class="floating-apply-button__icon">
			<ArrowRight />
		</el-icon>
	</button>
</template>

<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue'

defineEmits<{
	click: []
}>()
</script>

<style lang="scss" scoped>
// Variables and mixins are injected globally via Vite config

.floating-apply-button {
	position: fixed;
	top: 50%;
	right: 42px;
	transform: rotate(-90deg);
	transform-origin: 100% 0;
	z-index: $z-index-floating-button;

	@include flex-center;
	gap: $spacing-sm;

	background-color: $color-red;
	color: $color-white;
	border: none;
	border-radius: $border-radius-md $border-radius-md 0 0;
	padding: $spacing-md calc($spacing-lg);

	@include button-font;
	font-size: $font-size-button;

	cursor: pointer;
	box-shadow: $shadow-modal;
	transition:
		transform 0.2s ease,
		box-shadow 0.2s ease;

	&:hover {
		transform: rotate(-90deg) translateY(-4px);
		box-shadow: 0px 4px 20px 8px rgba(0, 0, 0, 0.3);
	}

	&:active {
		transform: rotate(-90deg);
	}

	&__text {
		font-weight: $font-weight-medium;
	}

	&__icon {
		font-size: 20px;
		transform: rotate(90deg);
	}

	@include mobile {
		right: 26px;
		padding: $spacing-sm $spacing-md;
		font-size: 16px;
	}
}

.floating-apply-button__text {
	padding: 0 0 10px 0;
}

.floating-apply-button__icon {
	padding: 0 10px 0 0;
	font-size: 26px;
}
</style>
