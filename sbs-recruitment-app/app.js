// ==============================================
// SBS Recruitment App - cPanel Entry Point
// ==============================================

import { existsSync } from 'fs'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('[app.js] Starting SBS Recruitment App...')
console.log('[app.js] Directory:', __dirname)

// Install server dependencies if missing
const serverPath = join(__dirname, 'server')
const serverNodeModules = join(serverPath, 'node_modules')

console.log('[app.js] Server path:', serverPath)
console.log('[app.js] node_modules exists:', existsSync(serverNodeModules))

if (!existsSync(serverNodeModules)) {
	console.log('[app.js] Installing server dependencies...')
	try {
		execSync('npm install --omit=dev', {
			cwd: serverPath,
			stdio: 'inherit'
		})
		console.log('[app.js] Dependencies installed!')
	} catch (error) {
		console.error('[app.js] Failed to install:', error.message)
		process.exit(1)
	}
}

// Start the server (dynamic import for ES module)
console.log('[app.js] Starting server...')
import('./server/index.js').catch(err => {
	console.error('[app.js] Failed to start server:', err.message)
	console.error(err.stack)
	process.exit(1)
})

