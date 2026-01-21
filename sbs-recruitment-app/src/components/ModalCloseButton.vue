<template>
	<button class="modal-close-button" @click="$emit('click')" type="button" aria-label="Luk">
		<div class="modal-close-button__icon-wrapper">
			<el-icon :size="48">
				<Plus />
			</el-icon>
		</div>
		<div class="modal-close-button__background"></div>
	</button>
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
	top: -24px;
	right: -24px;
	width: 102px;
	height: 102px;
	cursor: pointer;
	border: none;
	background: transparent;
	z-index: 10;
	padding: 0;

	&__icon-wrapper {
		position: absolute;
		top: 0;
		left: 0;
		width: 102px;
		height: 102px;
		display: flex;
		align-items: center;
		justify-content: center;
		transform: rotate(45deg);
		color: $color-dark-gray;
		z-index: 2;
	}

	&__background {
		position: absolute;
		top: 24px;
		right: 24px;
		width: 54px;
		height: 54px;
		background-color: $color-light-gray;
		border-radius: 0 $border-radius-lg 0 $border-radius-lg; // top-right og bottom-left
		box-shadow: $shadow-modal;
		z-index: 1;
	}

	&:hover {
		.modal-close-button__background {
			background-color: color.adjust(#ebebeb, $lightness: -5%);
		}
	}

	&:focus {
		outline: none;
	}

	&:focus-visible {
		.modal-close-button__background {
			outline: 2px solid $color-yellow;
			outline-offset: 2px;
		}
	}
}
</style>
