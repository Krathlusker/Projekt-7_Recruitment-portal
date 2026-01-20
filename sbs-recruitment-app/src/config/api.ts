// ==============================================
// SBS Recruitment App - API Configuration
// ==============================================

/// <reference types="vite/client" />

import axios from 'axios'

// Base API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Create axios instance
const api = axios.create({
	baseURL: `${API_BASE_URL}/api`,
	headers: {
		'Content-Type': 'application/json'
	}
})

// Add authorization header for HR requests
export const setAuthHeader = (password: string) => {
	api.defaults.headers.common['Authorization'] = password
}

// Remove authorization header
export const clearAuthHeader = () => {
	delete api.defaults.headers.common['Authorization']
}

export default api
