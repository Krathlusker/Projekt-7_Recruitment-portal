<template>
	<el-button size="large" class="floating-apply-button btn-red" @click="$emit('click')">
		ANSØG NU
	</el-button>
</template>

<script setup lang="ts">

defineEmits<{
	click: []
}>()
</script>

<style lang="scss" scoped>
// Button styling removed - using global btn-red class
// Position-only styling kept for floating behavior

.floating-apply-button {
	position: fixed;
	top: 70%;
	right: $spacing-xl;
	transform: rotate(-90deg);
	transform-origin: 100% 0;
	z-index: $z-index-floating-button;
	transition: right $transition-duration-fast $transition-ease,
		transform $transition-duration $transition-ease,
		background-color $transition-duration $transition-ease,
		color $transition-duration $transition-ease !important;

	&:hover {
		transform: rotate(-90deg) translateY(-6px) !important;
	}
}
</style>
