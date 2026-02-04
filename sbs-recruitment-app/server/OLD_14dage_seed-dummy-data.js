// ==============================================
// Seed Dummy Applications & Interview Slots
// ==============================================
// Run: node server/seed-dummy-data.js

import { initDatabase, getDb } from './database.js'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Source CV file to copy for dummy data
const SOURCE_CV = path.join(__dirname, 'Multimedie Designer - invitation til dimission 27. januar 2026 - kl. 13.30.pdf')
const UPLOADS_DIR = path.join(__dirname, 'uploads')

// Ensure uploads directory exists
function ensureUploadsDir() {
	if (!fs.existsSync(UPLOADS_DIR)) {
		fs.mkdirSync(UPLOADS_DIR, { recursive: true })
		console.log('Created uploads directory')
	}
}

// Copy source CV to uploads with unique name
function createDummyCV() {
	ensureUploadsDir()

	const uniqueName = `${Date.now()}-${uuidv4()}.pdf`
	const destPath = path.join(UPLOADS_DIR, uniqueName)

	try {
		fs.copyFileSync(SOURCE_CV, destPath)
		return uniqueName
	} catch (err) {
		console.error('Error copying CV file:', err)
		return null
	}
}

// DISC Configuration (matches app)
const QUALIFICATION_THRESHOLD = 11
const MAX_POINTS = 15

// Points per profile per question (S and C are preferred = 3 points)
const PROFILE_POINTS = {
	D: [1, 1, 1, 2, 1], // 5 questions, points for D answer
	I: [2, 2, 2, 2, 2], // points for I answer
	S: [3, 3, 3, 3, 3], // points for S answer
	C: [3, 3, 3, 3, 3]  // points for C answer
}

// Dummy data
const firstNames = ['Anders', 'Mette', 'Lars', 'Sofie', 'Mikkel', 'Emma', 'Rasmus', 'Ida', 'Christian', 'Julie', 'Thomas', 'Anna', 'Martin', 'Maria', 'Nikolaj', 'Camilla', 'Jonas', 'Louise', 'Frederik', 'Katrine']
const lastNames = ['Nielsen', 'Jensen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen', 'Sørensen', 'Rasmussen', 'Jørgensen', 'Petersen', 'Madsen', 'Kristensen', 'Olsen', 'Thomsen']
const jobPositions = ['Pakkeri', 'Produktion', 'Andre stillinger']
const discTypes = ['D', 'I', 'S', 'C']
const interviewTimes = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30']
const interviewTypes = ['fysisk', 'virtuel']

// Generate dates for next 14 weekdays
function getNextWeekdays() {
	const dates = []
	const today = new Date()
	let daysAdded = 0
	let offset = 1

	while (daysAdded < 14) {
		const date = new Date(today)
		date.setDate(date.getDate() + offset)
		// Skip weekends
		if (date.getDay() !== 0 && date.getDay() !== 6) {
			dates.push(date.toISOString().split('T')[0])
			daysAdded++
		}
		offset++
	}
	return dates
}

// Generate random phone
function randomPhone() {
	return `${20 + Math.floor(Math.random() * 80)} ${10 + Math.floor(Math.random() * 90)} ${10 + Math.floor(Math.random() * 90)} ${10 + Math.floor(Math.random() * 90)}`
}

// Generate random age
function randomAge() {
	return String(18 + Math.floor(Math.random() * 35)) // 18-52
}

// Generate DISC result with proper scoring (like the app does)
// forceQualified: true = score >= 11, false = score < 11
function generateDiscResult(forceQualified) {
	const profileScores = { D: 0, I: 0, S: 0, C: 0 }
	let totalPoints = 0

	// Simulate 5 question answers
	for (let q = 0; q < 5; q++) {
		let chosenProfile

		if (forceQualified) {
			// Prefer S and C (3 points each) to get high score
			chosenProfile = Math.random() > 0.3 ? (Math.random() > 0.5 ? 'S' : 'C') : (Math.random() > 0.5 ? 'I' : 'D')
		} else {
			// Prefer D and I (1-2 points) to get low score
			chosenProfile = Math.random() > 0.3 ? (Math.random() > 0.5 ? 'D' : 'I') : (Math.random() > 0.5 ? 'S' : 'C')
		}

		const points = PROFILE_POINTS[chosenProfile][q]
		profileScores[chosenProfile] += points
		totalPoints += points
	}

	// Adjust if needed to ensure we meet the qualification requirement
	if (forceQualified && totalPoints < QUALIFICATION_THRESHOLD) {
		// Boost to meet threshold
		const boost = QUALIFICATION_THRESHOLD - totalPoints
		profileScores.S += boost
		totalPoints = QUALIFICATION_THRESHOLD
	} else if (!forceQualified && totalPoints >= QUALIFICATION_THRESHOLD) {
		// Reduce to be below threshold
		const reduce = totalPoints - QUALIFICATION_THRESHOLD + 1
		profileScores.S = Math.max(0, profileScores.S - reduce)
		totalPoints = QUALIFICATION_THRESHOLD - 1
	}

	// Find dominant profile
	const dominantProfile = Object.entries(profileScores)
		.sort((a, b) => b[1] - a[1])[0][0]

	return {
		result: JSON.stringify({
			totalPoints,
			isQualified: totalPoints >= QUALIFICATION_THRESHOLD,
			dominantProfile,
			profileScores
		}),
		totalPoints,
		isQualified: totalPoints >= QUALIFICATION_THRESHOLD,
		dominantProfile
	}
}

// Main
async function seed() {
	console.log('Initializing database...')
	await initDatabase()

	const db = getDb()

	// Clear existing data
	console.log('Clearing existing data...')
	db.exec('DELETE FROM applications')
	db.exec('DELETE FROM interview_slots')

	// ==============================================
	// 1. Create interview slots for next 14 weekdays
	// ==============================================
	console.log('\nCreating interview slots for next 14 weekdays...')

	const dates = getNextWeekdays()
	const allSlots = []

	const slotStmt = db.prepare(`
		INSERT INTO interview_slots (id, date, time, type, isBooked, bookedBy, heldBy)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`)

	let slotCounter = 0
	for (const date of dates) {
		// 3-5 slots per day
		const numSlots = 3 + Math.floor(Math.random() * 3)
		const usedTimes = new Set()

		for (let i = 0; i < numSlots; i++) {
			let time
			do {
				time = interviewTimes[Math.floor(Math.random() * interviewTimes.length)]
			} while (usedTimes.has(time))
			usedTimes.add(time)

			const slotId = `slot-${Date.now()}-${++slotCounter}`
			const type = interviewTypes[Math.floor(Math.random() * interviewTypes.length)]

			slotStmt.run(slotId, date, time, type, 0, null, null)
			allSlots.push({ id: slotId, date, time, type })
		}
	}
	console.log(`  Created ${allSlots.length} interview slots`)

	// ==============================================
	// 2. Create applications
	// ==============================================
	console.log('\nCreating applications...')

	const appStmt = db.prepare(`
		INSERT INTO applications (
			id, fullName, phone, email, age, jobPosition,
			cvFileName, discResult, selectedSlots, confirmedSlot, status,
			createdAt, updatedAt, expiresAt
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)

	const updateSlotStmt = db.prepare(`
		UPDATE interview_slots SET isBooked = 1, bookedBy = ? WHERE id = ?
	`)

	const holdSlotStmt = db.prepare(`
		UPDATE interview_slots SET heldBy = ? WHERE id = ?
	`)

	const usedSlots = new Set()
	const usedEmails = new Set()

	// Helper to get 2 unique available slots
	function getTwoUniqueSlots() {
		const available = allSlots.filter(s => !usedSlots.has(s.id))
		if (available.length < 2) return null

		const shuffled = available.sort(() => Math.random() - 0.5)
		return [shuffled[0], shuffled[1]]
	}

	// Helper to get 1 available slot
	function getOneSlot() {
		const available = allSlots.filter(s => !usedSlots.has(s.id))
		if (available.length < 1) return null
		return available[Math.floor(Math.random() * available.length)]
	}

	// Helper to create unique email
	function getUniqueEmail(firstName, lastName) {
		let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`
		let counter = 1
		while (usedEmails.has(email)) {
			email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${counter++}@example.com`
		}
		usedEmails.add(email)
		return email
	}

	const now = new Date()

	// ==============================================
	// QUALIFIED (score >= 11): 2 selected times
	// ==============================================

	// --- PENDING: Qualified, 2 selected times, none confirmed yet ---
	console.log('  Creating qualified pending applications (2 selected, none confirmed)...')
	for (let i = 0; i < 10; i++) {
		const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
		const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
		const fullName = `${firstName} ${lastName}`
		const email = getUniqueEmail(firstName, lastName)

		const slots = getTwoUniqueSlots()
		if (!slots) continue

		// Mark both slots as used (reserved by this application)
		usedSlots.add(slots[0].id)
		usedSlots.add(slots[1].id)

		const disc = generateDiscResult(true) // Qualified
		const createdAt = new Date(now.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString()
		const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

		const appId = uuidv4()
		// selectedSlots is an array of slot IDs only (like frontend sends)
		const selectedSlotsArr = JSON.stringify([slots[0].id, slots[1].id])

		const cvFileName = createDummyCV()
		appStmt.run(
			appId, fullName, randomPhone(), email, randomAge(),
			jobPositions[Math.floor(Math.random() * jobPositions.length)],
			cvFileName, disc.result, selectedSlotsArr, null, 'pending',
			createdAt, createdAt, expiresAt
		)

		// Hold both slots for this application
		holdSlotStmt.run(appId, slots[0].id)
		holdSlotStmt.run(appId, slots[1].id)

		console.log(`    ${fullName} - pending, ${disc.totalPoints} point, ${disc.dominantProfile}-profil (2 valgte, ingen bekræftet)`)
	}

	// --- INTERVIEW-SCHEDULED: Qualified, 2 selected times, 1 confirmed ---
	console.log('  Creating qualified applications with scheduled interview...')
	for (let i = 0; i < 8; i++) {
		const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
		const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
		const fullName = `${firstName} ${lastName}`
		const email = getUniqueEmail(firstName, lastName)

		const slots = getTwoUniqueSlots()
		if (!slots) continue

		// Mark both slots as used
		usedSlots.add(slots[0].id)
		usedSlots.add(slots[1].id)

		const disc = generateDiscResult(true)
		const createdAt = new Date(now.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString()
		const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

		const appId = uuidv4()
		// selectedSlots is an array of slot IDs only (like frontend sends)
		const selectedSlotsArr = JSON.stringify([slots[0].id, slots[1].id])
		const confirmedSlot = JSON.stringify({ id: slots[0].id, date: slots[0].date, time: slots[0].time, type: slots[0].type })

		const cvFileName = createDummyCV()
		appStmt.run(
			appId, fullName, randomPhone(), email, randomAge(),
			jobPositions[Math.floor(Math.random() * jobPositions.length)],
			cvFileName, disc.result, selectedSlotsArr, confirmedSlot, 'interview-scheduled',
			createdAt, createdAt, expiresAt
		)

		// Book the confirmed slot
		updateSlotStmt.run(appId, slots[0].id)

		console.log(`    ${fullName} - interview-scheduled, ${disc.totalPoints} point, ${disc.dominantProfile}-profil (bekræftet: ${slots[0].date} ${slots[0].time})`)
	}

	// --- ACCEPTED: Qualified, confirmed slot ---
	console.log('  Creating accepted applications...')
	for (let i = 0; i < 6; i++) {
		const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
		const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
		const fullName = `${firstName} ${lastName}`
		const email = getUniqueEmail(firstName, lastName)

		const slot = getOneSlot()
		if (!slot) continue

		usedSlots.add(slot.id)

		const disc = generateDiscResult(true)
		const createdAt = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
		const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

		const appId = uuidv4()
		const confirmedSlot = JSON.stringify({ id: slot.id, date: slot.date, time: slot.time, type: slot.type })
		const cvFileName = createDummyCV()

		appStmt.run(
			appId, fullName, randomPhone(), email, randomAge(),
			jobPositions[Math.floor(Math.random() * jobPositions.length)],
			cvFileName, disc.result, null, confirmedSlot, 'accepted',
			createdAt, createdAt, expiresAt
		)

		updateSlotStmt.run(appId, slot.id)

		console.log(`    ${fullName} - accepted, ${disc.totalPoints} point, ${disc.dominantProfile}-profil (${slot.date} ${slot.time})`)
	}

	// ==============================================
	// NOT QUALIFIED (score < 11): No times OR manually assigned
	// ==============================================

	// --- REJECTED: Low score, no times at all ---
	console.log('  Creating rejected applications (low DISC, no times)...')
	for (let i = 0; i < 8; i++) {
		const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
		const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
		const fullName = `${firstName} ${lastName}`
		const email = getUniqueEmail(firstName, lastName)

		const disc = generateDiscResult(false) // Not qualified
		const createdAt = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
		const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

		const appId = uuidv4()
		const cvFileName = createDummyCV()

		appStmt.run(
			appId, fullName, randomPhone(), email, randomAge(),
			jobPositions[Math.floor(Math.random() * jobPositions.length)],
			cvFileName, disc.result, null, null, 'rejected',
			createdAt, createdAt, expiresAt
		)

		console.log(`    ${fullName} - rejected, ${disc.totalPoints} point, ${disc.dominantProfile}-profil (ingen tider)`)
	}

	// --- PENDING: Low score, HR manually assigned time (not confirmed) ---
	console.log('  Creating low DISC applications with HR assigned time (pending)...')
	for (let i = 0; i < 5; i++) {
		const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
		const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
		const fullName = `${firstName} ${lastName}`
		const email = getUniqueEmail(firstName, lastName)

		const slot = getOneSlot()
		if (!slot) continue

		const disc = generateDiscResult(false)
		const createdAt = new Date(now.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString()
		const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

		const appId = uuidv4()
		// HR manually assigned - not confirmed yet
		const confirmedSlot = JSON.stringify({
			id: slot.id, date: slot.date, time: slot.time, type: slot.type,
			manuallyAssigned: true
		})
		const cvFileName = createDummyCV()

		appStmt.run(
			appId, fullName, randomPhone(), email, randomAge(),
			jobPositions[Math.floor(Math.random() * jobPositions.length)],
			cvFileName, disc.result, null, confirmedSlot, 'pending',
			createdAt, createdAt, expiresAt
		)

		console.log(`    ${fullName} - pending, ${disc.totalPoints} point, ${disc.dominantProfile}-profil (HR tildelt: ${slot.date} ${slot.time})`)
	}

	// --- ACCEPTED: Low score, HR manually assigned and confirmed ---
	console.log('  Creating low DISC applications with HR assigned time (accepted)...')
	for (let i = 0; i < 3; i++) {
		const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
		const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
		const fullName = `${firstName} ${lastName}`
		const email = getUniqueEmail(firstName, lastName)

		const slot = getOneSlot()
		if (!slot) continue

		usedSlots.add(slot.id)

		const disc = generateDiscResult(false)
		const createdAt = new Date(now.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString()
		const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

		const appId = uuidv4()
		const confirmedSlot = JSON.stringify({
			id: slot.id, date: slot.date, time: slot.time, type: slot.type,
			manuallyAssigned: true
		})
		const cvFileName = createDummyCV()

		appStmt.run(
			appId, fullName, randomPhone(), email, randomAge(),
			jobPositions[Math.floor(Math.random() * jobPositions.length)],
			cvFileName, disc.result, null, confirmedSlot, 'accepted',
			createdAt, createdAt, expiresAt
		)

		updateSlotStmt.run(appId, slot.id)

		console.log(`    ${fullName} - accepted, ${disc.totalPoints} point, ${disc.dominantProfile}-profil (HR tildelt & bekræftet: ${slot.date} ${slot.time})`)
	}

	// ==============================================
	// Summary
	// ==============================================
	console.log('\n==============================================')
	console.log('SUMMARY')
	console.log('==============================================')
	console.log(`Qualification threshold: ${QUALIFICATION_THRESHOLD} points`)

	const slotCount = db.prepare('SELECT COUNT(*) as count FROM interview_slots').get()
	const bookedCount = db.prepare('SELECT COUNT(*) as count FROM interview_slots WHERE isBooked = 1').get()
	const appCount = db.prepare('SELECT COUNT(*) as count FROM applications').get()
	const pendingCount = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'pending'").get()
	const scheduledCount = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'interview-scheduled'").get()
	const acceptedCount = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'accepted'").get()
	const rejectedCount = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'rejected'").get()

	console.log(`\nInterview slots: ${slotCount.count} (${bookedCount.count} booked)`)
	console.log(`Applications: ${appCount.count}`)
	console.log(`  - Pending: ${pendingCount.count}`)
	console.log(`  - Interview scheduled: ${scheduledCount.count}`)
	console.log(`  - Accepted: ${acceptedCount.count}`)
	console.log(`  - Rejected: ${rejectedCount.count}`)
	console.log('\nDone!')
}

seed().catch(console.error)
