// ==============================================
// SBS Recruitment App - Backend Server
// ==============================================

import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'
import { initDatabase, getDb } from './database.js'

// Load environment variables
dotenv.config({ path: '../.env' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000
const HR_PASSWORD = process.env.HR_PASSWORD || 'sbs2026'

// CORS configuration - allow credentials with specific origins
const corsOptions = {
	origin: (origin, callback) => {
		// Allow requests with no origin (like mobile apps or curl requests)
		// In production, the frontend is served from the same origin
		const allowedOrigins = [
			'http://localhost:5173',
			'http://localhost:3000',
			'http://192.168.8.100:5173',
			'https://sbs.lefty.dk'
		]
		if (!origin || allowedOrigins.includes(origin)) {
			callback(null, true)
		} else {
			callback(null, true) // Allow all origins in dev, but with proper header
		}
	},
	credentials: true
}

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

// File upload configuration
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, path.join(__dirname, 'uploads'))
	},
	filename: (req, file, cb) => {
		const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`
		cb(null, uniqueName)
	}
})

const upload = multer({
	storage,
	limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
	fileFilter: (req, file, cb) => {
		const allowedTypes = ['.pdf']
		const ext = path.extname(file.originalname).toLowerCase()
		if (allowedTypes.includes(ext)) {
			cb(null, true)
		} else {
			cb(new Error('Invalid file type. Only PDF documents are allowed.'))
		}
	}
})

// Authentication middleware for HR endpoints
const authenticateHR = (req, res, next) => {
	const authPassword = req.headers.authorization
	if (authPassword !== HR_PASSWORD) {
		return res.status(401).json({ error: 'Unauthorized' })
	}
	next()
}

// ==============================================
// API Routes
// ==============================================

// Health check
app.get('/api/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ==============================================
// Applications
// ==============================================

// Submit new application
app.post('/api/apply', upload.single('cv'), (req, res) => {
	try {
		const db = getDb()
		const { fullName, phone, email, age, jobPosition, discResult, selectedSlots } = req.body

		const id = uuidv4()
		const now = new Date().toISOString()
		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
		const cvFileName = req.file ? req.file.filename : null

		// Parse and validate selected slots - only keep slots that are actually available
		const slotsArray = JSON.parse(selectedSlots || '[]')
		const availableSlots = []

		if (slotsArray.length > 0) {
			for (const slotId of slotsArray) {
				const slot = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(slotId)
				// Only include slot if it exists, is not booked, and is not held by another application
				if (slot && !slot.isBooked && !slot.heldBy) {
					availableSlots.push(slotId)
				}
			}
		}

		const stmt = db.prepare(`
      INSERT INTO applications (
        id, fullName, phone, email, age, jobPosition,
        cvFileName, discResult, selectedSlots, status,
        createdAt, updatedAt, expiresAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

		stmt.run(
			id,
			fullName,
			phone,
			email,
			age,
			jobPosition,
			cvFileName,
			discResult,
			JSON.stringify(availableSlots), // Only store available slots
			'pending',
			now,
			now,
			expiresAt
		)

		// Mark available slots as "held" by this application
		if (availableSlots.length > 0) {
			const holdStmt = db.prepare(
				'UPDATE interview_slots SET heldBy = ?, reservedBy = NULL, reservedAt = NULL WHERE id = ? AND isBooked = 0 AND heldBy IS NULL'
			)
			for (const slotId of availableSlots) {
				holdStmt.run(id, slotId)
			}
		}

		res.status(201).json({
			id,
			message: 'Application submitted successfully',
			availableSlots // Return which slots were actually reserved
		})
	} catch (error) {
		console.error('Error submitting application:', error)
		res.status(500).json({ error: 'Failed to submit application' })
	}
})

// Get all applications (HR only)
app.get('/api/applications', authenticateHR, (req, res) => {
	try {
		const db = getDb()
		const applications = db.prepare('SELECT * FROM applications ORDER BY createdAt DESC').all()

		// Parse JSON fields - keep all selectedSlots, frontend shows availability status
		const parsed = applications.map((app) => ({
			...app,
			discResult: JSON.parse(app.discResult || '{}'),
			selectedSlots: JSON.parse(app.selectedSlots || '[]'),
			confirmedSlot: app.confirmedSlot ? JSON.parse(app.confirmedSlot) : null
		}))

		res.json(parsed)
	} catch (error) {
		console.error('Error fetching applications:', error)
		res.status(500).json({ error: 'Failed to fetch applications' })
	}
})

// Get single application
app.get('/api/applications/:id', authenticateHR, (req, res) => {
	try {
		const db = getDb()
		const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id)

		if (!application) {
			return res.status(404).json({ error: 'Application not found' })
		}

		// Parse JSON fields - keep all selectedSlots, frontend shows availability status
		const parsed = {
			...application,
			discResult: JSON.parse(application.discResult || '{}'),
			selectedSlots: JSON.parse(application.selectedSlots || '[]'),
			confirmedSlot: application.confirmedSlot ? JSON.parse(application.confirmedSlot) : null
		}

		res.json(parsed)
	} catch (error) {
		console.error('Error fetching application:', error)
		res.status(500).json({ error: 'Failed to fetch application' })
	}
})

// Update application
app.patch('/api/applications/:id', authenticateHR, (req, res) => {
	try {
		const db = getDb()
		const { status, confirmedSlot, selectedSlots } = req.body
		const now = new Date().toISOString()

		let updateQuery = 'UPDATE applications SET updatedAt = ?'
		const params = [now]

		if (status) {
			updateQuery += ', status = ?'
			params.push(status)
		}

		if (confirmedSlot) {
			// If confirmedSlot is a string (slot ID), fetch the slot info
			let slotData = confirmedSlot
			if (typeof confirmedSlot === 'string') {
				const slot = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(confirmedSlot)
				if (slot) {
					slotData = slot
				}
			}
			updateQuery += ', confirmedSlot = ?'
			params.push(JSON.stringify(slotData))
		}

		// Allow clearing or updating selectedSlots
		if (selectedSlots !== undefined) {
			updateQuery += ', selectedSlots = ?'
			params.push(JSON.stringify(selectedSlots))
		}

		updateQuery += ' WHERE id = ?'
		params.push(req.params.id)

		const result = db.prepare(updateQuery).run(...params)

		if (result.changes === 0) {
			return res.status(404).json({ error: 'Application not found' })
		}

		res.json({ message: 'Application updated successfully' })
	} catch (error) {
		console.error('Error updating application:', error)
		res.status(500).json({ error: 'Failed to update application' })
	}
})

// Delete application
app.delete('/api/applications/:id', authenticateHR, (req, res) => {
	try {
		const db = getDb()
		const applicationId = req.params.id

		// Get the CV filename before deleting the application
		const application = db.prepare('SELECT cvFileName FROM applications WHERE id = ?').get(applicationId)

		// Release all slots held by this application
		db.prepare('UPDATE interview_slots SET heldBy = NULL WHERE heldBy = ?').run(applicationId)

		// Release all slots booked by this application (confirmed interview times)
		db.prepare('UPDATE interview_slots SET isBooked = 0, bookedBy = NULL WHERE bookedBy = ?').run(applicationId)

		const result = db.prepare('DELETE FROM applications WHERE id = ?').run(applicationId)

		if (result.changes === 0) {
			return res.status(404).json({ error: 'Application not found' })
		}

		// Delete the CV file if it exists
		if (application?.cvFileName) {
			const cvPath = path.join(__dirname, 'uploads', application.cvFileName)
			fs.unlink(cvPath, (err) => {
				if (err && err.code !== 'ENOENT') {
					console.error('Error deleting CV file:', err)
				}
			})
		}

		res.json({ message: 'Application deleted successfully' })
	} catch (error) {
		console.error('Error deleting application:', error)
		res.status(500).json({ error: 'Failed to delete application' })
	}
})

// Clear all data (for testing) - deletes all applications and resets all interview slots
app.delete('/api/clear-all-data', authenticateHR, (req, res) => {
	try {
		const db = getDb()

		// Delete all files in uploads folder
		const uploadsDir = path.join(__dirname, 'uploads')
		fs.readdir(uploadsDir, (err, files) => {
			if (!err) {
				for (const file of files) {
					// Skip .gitkeep or other hidden files
					if (!file.startsWith('.')) {
						fs.unlink(path.join(uploadsDir, file), (unlinkErr) => {
							if (unlinkErr) {
								console.error('Error deleting file:', file, unlinkErr)
							}
						})
					}
				}
			}
		})

		// Delete all applications
		const deletedApps = db.prepare('DELETE FROM applications').run()

		// Reset all interview slots (remove bookings and reservations)
		db.prepare(
			`UPDATE interview_slots SET
				isBooked = 0,
				bookedBy = NULL,
				reservedBy = NULL,
				reservedAt = NULL,
				heldBy = NULL`
		).run()

		// Delete all interview slots
		const deletedSlots = db.prepare('DELETE FROM interview_slots').run()

		res.json({
			message: 'All data cleared successfully',
			deletedApplications: deletedApps.changes,
			deletedSlots: deletedSlots.changes
		})
	} catch (error) {
		console.error('Error clearing all data:', error)
		res.status(500).json({ error: 'Failed to clear all data' })
	}
})

// ==============================================
// Interview Slots
// ==============================================

// Reservation timeout in milliseconds (5 minutes)
const RESERVATION_TIMEOUT = 5 * 60 * 1000

// Clean expired reservations
const cleanExpiredReservations = () => {
	try {
		const db = getDb()
		const cutoff = new Date(Date.now() - RESERVATION_TIMEOUT).toISOString()
		db.prepare(
			`
      UPDATE interview_slots
      SET reservedBy = NULL, reservedAt = NULL
      WHERE reservedAt IS NOT NULL AND reservedAt < ? AND isBooked = 0
    `
		).run(cutoff)
	} catch (error) {
		console.error('Error cleaning expired reservations:', error)
	}
}

// Run cleanup every minute
setInterval(cleanExpiredReservations, 60 * 1000)

// Get all interview slots
app.get('/api/interview-slots', (req, res) => {
	try {
		// Clean expired reservations first
		cleanExpiredReservations()

		const db = getDb()
		const slots = db.prepare('SELECT * FROM interview_slots ORDER BY date, time').all()
		res.json(slots)
	} catch (error) {
		console.error('Error fetching slots:', error)
		res.status(500).json({ error: 'Failed to fetch interview slots' })
	}
})

// Create interview slot (HR only)
app.post('/api/interview-slots', authenticateHR, (req, res) => {
	try {
		const db = getDb()
		const { date, time, type = 'fysisk' } = req.body
		const id = uuidv4()

		db.prepare(
			`
      INSERT INTO interview_slots (id, date, time, type, isBooked)
      VALUES (?, ?, ?, ?, 0)
    `
		).run(id, date, time, type)

		res.status(201).json({ id, message: 'Slot created successfully' })
	} catch (error) {
		console.error('Error creating slot:', error)
		res.status(500).json({ error: 'Failed to create interview slot' })
	}
})

// Reserve interview slot (temporary hold)
app.post('/api/interview-slots/:id/reserve', (req, res) => {
	try {
		const db = getDb()
		const { sessionId } = req.body
		const slotId = req.params.id

		if (!sessionId) {
			return res.status(400).json({ error: 'Session ID is required' })
		}

		// Clean expired reservations first
		cleanExpiredReservations()

		// Get the slot
		const slot = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(slotId)
		if (!slot) {
			return res.status(404).json({ error: 'Slot not found' })
		}

		if (slot.isBooked) {
			return res.status(400).json({ error: 'Slot is already booked' })
		}

		// Check if held by an application (permanent reservation from submitted application)
		if (slot.heldBy) {
			return res.status(409).json({ error: 'Slot is already reserved by another applicant' })
		}

		// Check if already reserved by another session (temporary reservation)
		if (slot.reservedBy && slot.reservedBy !== sessionId) {
			const reservedAt = new Date(slot.reservedAt).getTime()
			const now = Date.now()
			if (now - reservedAt < RESERVATION_TIMEOUT) {
				return res.status(409).json({ error: 'Slot is already reserved by another user' })
			}
		}

		// Reserve the slot
		const now = new Date().toISOString()
		db.prepare('UPDATE interview_slots SET reservedBy = ?, reservedAt = ? WHERE id = ?').run(sessionId, now, slotId)

		res.json({ message: 'Slot reserved successfully', expiresIn: RESERVATION_TIMEOUT })
	} catch (error) {
		console.error('Error reserving slot:', error)
		res.status(500).json({ error: 'Failed to reserve interview slot' })
	}
})

// Release interview slot reservation
app.post('/api/interview-slots/:id/release', (req, res) => {
	try {
		const db = getDb()
		const { sessionId } = req.body
		const slotId = req.params.id

		if (!sessionId) {
			return res.status(400).json({ error: 'Session ID is required' })
		}

		// Get the slot
		const slot = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(slotId)
		if (!slot) {
			return res.status(404).json({ error: 'Slot not found' })
		}

		// Only release if the session owns the reservation
		if (slot.reservedBy === sessionId) {
			db.prepare('UPDATE interview_slots SET reservedBy = NULL, reservedAt = NULL WHERE id = ?').run(slotId)
		}

		res.json({ message: 'Slot released successfully' })
	} catch (error) {
		console.error('Error releasing slot:', error)
		res.status(500).json({ error: 'Failed to release interview slot' })
	}
})

// Release all reservations for a session
app.post('/api/interview-slots/release-all', (req, res) => {
	try {
		const db = getDb()
		const { sessionId } = req.body

		if (!sessionId) {
			return res.status(400).json({ error: 'Session ID is required' })
		}

		db.prepare('UPDATE interview_slots SET reservedBy = NULL, reservedAt = NULL WHERE reservedBy = ?').run(sessionId)

		res.json({ message: 'All reservations released successfully' })
	} catch (error) {
		console.error('Error releasing reservations:', error)
		res.status(500).json({ error: 'Failed to release reservations' })
	}
})

// Force release interview slot (HR only - no sessionId required)
app.patch('/api/interview-slots/:id/force-release', authenticateHR, (req, res) => {
	try {
		const db = getDb()
		const slotId = req.params.id

		// Get the slot
		const slot = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(slotId)
		if (!slot) {
			return res.status(404).json({ error: 'Slot not found' })
		}

		// Release the slot - clear all reservations and booking
		db.prepare('UPDATE interview_slots SET reservedBy = NULL, reservedAt = NULL, heldBy = NULL WHERE id = ?').run(
			slotId
		)

		res.json({ message: 'Slot force-released successfully' })
	} catch (error) {
		console.error('Error force-releasing slot:', error)
		res.status(500).json({ error: 'Failed to force-release interview slot' })
	}
})

// Delete interview slot (HR only)
app.delete('/api/interview-slots/:id', authenticateHR, (req, res) => {
	try {
		const db = getDb()
		db.prepare('DELETE FROM interview_slots WHERE id = ?').run(req.params.id)
		res.json({ message: 'Slot deleted successfully' })
	} catch (error) {
		console.error('Error deleting slot:', error)
		res.status(500).json({ error: 'Failed to delete interview slot' })
	}
})

// Book interview slot (HR only)
app.patch('/api/interview-slots/:id/book', authenticateHR, (req, res) => {
	try {
		const db = getDb()
		const { applicationId } = req.body
		const slotId = req.params.id

		// Get the slot
		const slot = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(slotId)
		if (!slot) {
			return res.status(404).json({ error: 'Slot not found' })
		}

		if (slot.isBooked && slot.bookedBy !== applicationId) {
			return res.status(400).json({ error: 'Slot is already booked by another applicant' })
		}

		// Check if slot is held by another application
		if (slot.heldBy && slot.heldBy !== applicationId) {
			return res.status(400).json({ error: 'Slot is reserved by another applicant' })
		}

		// Book the slot - clear all reservations (heldBy, reservedBy)
		db.prepare(`
			UPDATE interview_slots
			SET isBooked = 1, bookedBy = ?, heldBy = NULL, reservedBy = NULL, reservedAt = NULL
			WHERE id = ?
		`).run(applicationId, slotId)

		res.json({ message: 'Slot booked successfully' })
	} catch (error) {
		console.error('Error booking slot:', error)
		res.status(500).json({ error: 'Failed to book interview slot' })
	}
})

// Unbook interview slot (HR only)
app.patch('/api/interview-slots/:id/unbook', authenticateHR, (req, res) => {
	try {
		const db = getDb()
		const slotId = req.params.id

		// Get the slot
		const slot = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(slotId)
		if (!slot) {
			return res.status(404).json({ error: 'Slot not found' })
		}

		// Unbook the slot
		db.prepare('UPDATE interview_slots SET isBooked = 0, bookedBy = NULL WHERE id = ?').run(slotId)

		res.json({ message: 'Slot unbooked successfully' })
	} catch (error) {
		console.error('Error unbooking slot:', error)
		res.status(500).json({ error: 'Failed to unbook interview slot' })
	}
})

// Confirm interview slot for application
app.post('/api/applications/:id/confirm-slot', (req, res) => {
	try {
		const db = getDb()
		const { slotId } = req.body
		const applicationId = req.params.id

		// Get the slot
		const slot = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(slotId)
		if (!slot) {
			return res.status(404).json({ error: 'Slot not found' })
		}

		if (slot.isBooked) {
			return res.status(400).json({ error: 'Slot is already booked' })
		}

		// Check if slot is held by another application
		if (slot.heldBy && slot.heldBy !== applicationId) {
			return res.status(400).json({ error: 'Slot is reserved by another applicant' })
		}

		// Update the confirmed slot - mark as booked and clear all reservations
		db.prepare(`
			UPDATE interview_slots
			SET isBooked = 1, bookedBy = ?, heldBy = NULL, reservedBy = NULL, reservedAt = NULL
			WHERE id = ?
		`).run(applicationId, slotId)

		// Release all other slots held by this application (make them available again)
		db.prepare('UPDATE interview_slots SET heldBy = NULL WHERE heldBy = ? AND id != ?').run(applicationId, slotId)

		// Update the application
		const confirmedSlot = { ...slot, isBooked: true }
		db.prepare('UPDATE applications SET confirmedSlot = ?, status = ? WHERE id = ?').run(
			JSON.stringify(confirmedSlot),
			'interview-scheduled',
			applicationId
		)

		res.json({ message: 'Interview slot confirmed' })
	} catch (error) {
		console.error('Error confirming slot:', error)
		res.status(500).json({ error: 'Failed to confirm interview slot' })
	}
})

// Release confirmed interview slot (make it available again, but keep slots reserved)
app.post('/api/applications/:id/release-confirmed-slot', authenticateHR, (req, res) => {
	try {
		const db = getDb()
		const applicationId = req.params.id

		// Get the application to find the confirmed slot and selected slots
		const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId)
		if (!application) {
			return res.status(404).json({ error: 'Application not found' })
		}

		if (!application.confirmedSlot) {
			return res.status(400).json({ error: 'No confirmed slot to release' })
		}

		const confirmedSlot = JSON.parse(application.confirmedSlot)
		let selectedSlots = JSON.parse(application.selectedSlots || '[]')

		// Release the booked slot (make it available again)
		db.prepare('UPDATE interview_slots SET isBooked = 0, bookedBy = NULL WHERE id = ?').run(confirmedSlot.id)

		// Try to re-hold slots that are still available (not booked or held by others)
		// Keep all selectedSlots in the list - frontend will show "not available" for unavailable ones
		if (selectedSlots.length > 0) {
			// Only set heldBy if slot is not booked AND (not held OR held by this application)
			const holdStmt = db.prepare(`
				UPDATE interview_slots
				SET heldBy = ?
				WHERE id = ? AND isBooked = 0 AND (heldBy IS NULL OR heldBy = ?)
			`)

			for (const slotId of selectedSlots) {
				// Try to hold - will only succeed if slot is available
				holdStmt.run(applicationId, slotId, applicationId)
			}
		}

		// Clear confirmed slot from application, update selectedSlots, and reset status
		db.prepare('UPDATE applications SET confirmedSlot = NULL, selectedSlots = ?, status = ? WHERE id = ?').run(
			JSON.stringify(selectedSlots),
			'pending',
			applicationId
		)

		res.json({ message: 'Confirmed slot released successfully, slots are now reserved' })
	} catch (error) {
		console.error('Error releasing confirmed slot:', error)
		res.status(500).json({ error: 'Failed to release confirmed slot' })
	}
})

// ==============================================
// File Downloads
// ==============================================

// Download CV
app.get('/api/download-cv/:filename', authenticateHR, (req, res) => {
	const filePath = path.join(__dirname, 'uploads', req.params.filename)
	res.download(filePath, (err) => {
		if (err) {
			console.error('Error downloading file:', err)
			res.status(404).json({ error: 'File not found' })
		}
	})
})

// ==============================================
// Static File Serving (Production)
// ==============================================

// In production, serve the built Vue app
const isProduction = process.env.NODE_ENV === 'production'
if (isProduction) {
	const distPath = path.join(__dirname, '..', 'dist')

	// Serve static files with correct MIME types
	app.use(express.static(distPath, {
		setHeaders: (res, filePath) => {
			if (filePath.endsWith('.js')) {
				res.setHeader('Content-Type', 'application/javascript')
			} else if (filePath.endsWith('.css')) {
				res.setHeader('Content-Type', 'text/css')
			} else if (filePath.endsWith('.html')) {
				res.setHeader('Content-Type', 'text/html')
			}
		}
	}))

	// Handle SPA routing - serve index.html for all non-API routes
	app.get('*', (req, res, next) => {
		if (req.path.startsWith('/api')) {
			return next()
		}
		res.sendFile(path.join(distPath, 'index.html'))
	})
}

// ==============================================
// Server Initialization
// ==============================================

// Host to listen on (0.0.0.0 for network access, localhost for local only)
const HOST = process.env.HOST || '0.0.0.0'

// Initialize database and start server
initDatabase()
	.then(() => {
		// Check if running under Phusion Passenger (cPanel)
		if (typeof(PhusionPassenger) !== 'undefined') {
			PhusionPassenger.configure({ autoInstall: false })
			app.listen('passenger', () => {
				console.log('[PASSENGER] Server running via Phusion Passenger')
				console.log(`[backend] HR Password: ${HR_PASSWORD}`)
			})
		} else {
			app.listen(PORT, HOST, () => {
				const mode = isProduction ? 'PRODUCTION' : 'DEVELOPMENT'
				console.log(`[${mode}] Server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`)
				if (HOST === '0.0.0.0') {
					console.log(`[${mode}] Network access enabled - server accessible from LAN`)
				}
				console.log(`[backend] HR Password: ${HR_PASSWORD}`)
			})
		}
	})
	.catch((error) => {
		console.error('Failed to initialize database:', error)
		process.exit(1)
	})
