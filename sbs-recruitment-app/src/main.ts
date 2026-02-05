import { createApp } from 'vue'
// Element Plus styles - components are auto-imported on-demand by unplugin
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import './assets/scss/main.scss'
import 'overlayscrollbars/overlayscrollbars.css'

// Note: Critical media preloading is handled by vite-plugin-critical-media
// which injects preload links directly into index.html at build time

// Passive event listener polyfill for third-party libraries
// Fixes Chrome warnings about non-passive touch/wheel events
;(function () {
	const originalAddEventListener = EventTarget.prototype.addEventListener
	EventTarget.prototype.addEventListener = function (
		type: string,
		listener: EventListenerOrEventListenerObject | null,
		options?: boolean | AddEventListenerOptions
	) {
		const passiveEvents = ['touchstart', 'touchmove', 'wheel', 'mousewheel']
		if (passiveEvents.includes(type)) {
			const newOptions: AddEventListenerOptions =
				typeof options === 'boolean'
					? { capture: options, passive: true }
					: { ...(options || {}), passive: options?.passive ?? true }
			return originalAddEventListener.call(this, type, listener, newOptions)
		}
		return originalAddEventListener.call(this, type, listener, options)
	}
})()

const app = createApp(App)

// Element Plus components are auto-imported on-demand
// Locale is handled via ElConfigProvider in App.vue if needed
app.use(router)
app.mount('#app')
