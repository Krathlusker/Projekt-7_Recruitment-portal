<template>
	<el-config-provider :locale="locale">
		<router-view />
	</el-config-provider>
</template>

<script setup lang="ts">
import da from 'element-plus/es/locale/lang/da'

const locale = da
</script>
