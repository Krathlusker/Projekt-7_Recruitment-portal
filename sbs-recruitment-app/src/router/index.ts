import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '@/views/LandingPage.vue'

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'home',
			component: LandingPage
		},
		{
			path: '/hr-dashboard',
			name: 'hr-dashboard',
			component: () => import('@/views/HRDashboard.vue')
		}
	]
})

export default router
