<template>
	<el-config-provider :locale="locale">
		<router-view />
		<!-- ARIA Live Region for dynamic announcements (WCAG 4.1.3) -->
		<div
			id="a11y-announcer"
			aria-live="polite"
			aria-atomic="true"
			class="sr-only"
		></div>
	</el-config-provider>
</template>

<script setup lang="ts">
import da from 'element-plus/es/locale/lang/da'

const locale = da
</script>
