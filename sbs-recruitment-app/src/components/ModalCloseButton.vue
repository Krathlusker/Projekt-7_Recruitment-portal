<template>
	<el-button class="modal-close-button" @click="$emit('click')" type="default" aria-label="Luk">
		<div class="modal-close-button__icon-wrapper">
			<el-icon :size="48">
				<Plus />
			</el-icon>
		</div>
		<div class="modal-close-button__background"></div>
	</el-button>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'

defineEmits<{
	click: []
}>()
</script>

<style lang="scss" scoped>
@use 'sass:color';

.modal-close-button {
	position: absolute;
	top: -$spacing-lg;
	right: -$spacing-lg;
	width: $close-btn-size-desktop;
	height: $close-btn-size-desktop;
	cursor: pointer;
	border: none !important;
	background: transparent !important;
	background-color: transparent !important;
	box-shadow: none !important;
	z-index: 10;
	padding: 0;

	// Override el-button hover/focus backgrounds and shadows
	&:hover,
	&:focus,
	&:active {
		background: transparent !important;
		background-color: transparent !important;
		box-shadow: none !important;
	}

	&__icon-wrapper {
		position: absolute;
		top: 0;
		left: 0;
		width: $close-btn-size-desktop;
		height: $close-btn-size-desktop;
		display: flex;
		align-items: center;
		justify-content: center;
		transform: rotate(45deg);
		color: $c-primary;
		z-index: 2;
	}

	&__background {
		position: absolute;
		top: $spacing-lg;
		right: $spacing-lg;
		width: $close-btn-size-mobile;
		height: $close-btn-size-mobile;
		background-color: $c-bg;
		border-radius: 0 $border-radius-lg 0 20px; // top-right: standard, bottom-left: større
		z-index: 1;
		transition: background-color $transition-duration $transition-ease;
		box-shadow: $shadow-card;
	}

	&:hover {
		.modal-close-button__background {
			background-color: $c-primary;
		}

		:deep(svg) {
			color: $c-bg;
		}
	}

	&:focus {
		outline: none;
	}

	&:focus-visible {
		.modal-close-button__background {
			outline: 2px solid $c-warning;
			outline-offset: 2px;
		}
	}
}
</style>
