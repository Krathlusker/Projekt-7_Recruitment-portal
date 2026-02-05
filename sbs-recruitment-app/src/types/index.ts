// ==============================================
// SBS Recruitment App - TypeScript Types
// ==============================================

// DISC Profile types
export type DiscProfile = 'D' | 'I' | 'S' | 'C'

// Application status types
export type ApplicationStatus =
	| 'pending'
	| 'reviewing'
	| 'interview-scheduled'
	| 'interview-completed'
	| 'accepted'
	| 'rejected'

// Job positions
export type JobPosition = 'pakkeri' | 'produktion' | 'andre'

// Age is stored as a string (e.g., "25", "42") from dropdown selection
// Valid ages are 16-99 years old
export type Age = string

// Interview slot type
export interface InterviewSlot {
	id: string
	date: string
	time: string
	type: 'fysisk' | 'virtuel'
	isBooked: boolean
	bookedBy?: string
	reservedBy?: string
	reservedAt?: string
	heldBy?: string
}

// DISC Question option
export interface DiscOption {
	text: string
	profile: DiscProfile
	points: number
}

// DISC Question
export interface DiscQuestion {
	id: number
	question: string
	options: DiscOption[]
}

// Application form data
export interface ApplicationFormData {
	fullName: string
	phone: string
	email: string
	age: Age | ''  // Specific age as string (e.g., "25")
	jobPosition: JobPosition | ''
	hasCV: boolean
	cvFile: File | null
}

// DISC Test answers
export interface DiscAnswers {
	[questionId: number]: {
		profile: DiscProfile
		points: number
	}
}

// DISC Test result
export interface DiscResult {
	totalPoints: number
	isQualified: boolean
	dominantProfile: DiscProfile
	profileScores: {
		D: number
		I: number
		S: number
		C: number
	}
}

// Full application
export interface Application {
	id: string
	fullName: string
	phone: string
	email: string
	age: Age  // Specific age as string (e.g., "25", "42")
	jobPosition: JobPosition
	cvFileName?: string
	discResult: DiscResult
	selectedSlots: string[]
	confirmedSlot?: InterviewSlot
	status: ApplicationStatus
	createdAt: string
	updatedAt: string
	expiresAt: string
}

// HR Dashboard stats
export interface DashboardStats {
	totalApplications: number
	pendingApplications: number
	scheduledInterviews: number
	completedInterviews: number
}

// Pagination
export interface PaginationState {
	currentPage: number
	itemsPerPage: number
	totalItems: number
}

// Filter options
export interface FilterOptions {
	status: ApplicationStatus | 'all'
	jobPosition: JobPosition | 'all'
}
