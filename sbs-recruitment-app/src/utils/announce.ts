/**
 * Accessibility Utilities (WCAG 4.1.3)
 * Hjælpefunktioner til at annoncere dynamiske beskeder til skærmlæsere.
 */

/**
 * Annoncerer en besked til skærmlæsere via aria-live region.
 * Beskeden vises ikke visuelt, men læses op af assistive technology.
 *
 * @param message - Beskeden der skal annonceres
 * @param priority - 'polite' (default) venter til bruger er færdig, 'assertive' afbryder
 *
 * @example
 * announce('Ansøgning sendt')
 * announce('Fejl: Udfyld alle felter', 'assertive')
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
	const announcer = document.getElementById('a11y-announcer')
	if (!announcer) {
		console.warn('A11y announcer element not found. Add <div id="a11y-announcer" aria-live="polite" class="sr-only"></div> to App.vue')
		return
	}

	// Update priority if needed
	announcer.setAttribute('aria-live', priority)

	// Clear and set message with small delay to ensure announcement
	announcer.textContent = ''
	setTimeout(() => {
		announcer.textContent = message
	}, 100)
}

/**
 * Annoncerer en fejlbesked (assertive - afbryder bruger)
 * @param message - Fejlbeskeden der skal annonceres
 */
export function announceError(message: string): void {
	announce(message, 'assertive')
}

/**
 * Annoncerer en succesbesked (polite - venter på bruger)
 * @param message - Succesbeskeden der skal annonceres
 */
export function announceSuccess(message: string): void {
	announce(message, 'polite')
}
