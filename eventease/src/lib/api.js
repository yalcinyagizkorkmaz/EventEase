const API_BASE_URL = 'http://localhost:8000'

// Helper function to handle API responses
async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Bir hata oluştu' }))
    throw new Error(error.detail || 'API hatası')
  }
  return response.json()
}

// API service functions
export const api = {
  // Health check
  health: async () => {
    const response = await fetch(`${API_BASE_URL}/health`)
    return handleResponse(response)
  },

  // User operations
  createUser: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })
    return handleResponse(response)
  },

  getUsers: async (token) => {
    const response = await fetch(`${API_BASE_URL}/users/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleResponse(response)
  },

  // Event operations
  createEvent: async (eventData, token) => {
    const response = await fetch(`${API_BASE_URL}/events/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(eventData),
    })
    return handleResponse(response)
  },

  getEvents: async () => {
    const response = await fetch(`${API_BASE_URL}/events/`)
    return handleResponse(response)
  },

  getEvent: async (eventId) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`)
    return handleResponse(response)
  },

  updateEvent: async (eventId, eventData, token) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(eventData),
    })
    return handleResponse(response)
  },

  deleteEvent: async (eventId, token) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleResponse(response)
  },
}

// Event data transformation helpers
export const eventHelpers = {
  // Convert date string to ISO format for API
  formatDateForAPI: (dateString) => {
    return new Date(dateString).toISOString()
  },

  // Format date for display
  formatDateForDisplay: (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  },

  // Validate event data
  validateEventData: (data) => {
    const errors = []
    
    if (!data.title || data.title.trim().length < 3) {
      errors.push('Başlık en az 3 karakter olmalıdır')
    }
    
    if (!data.description || data.description.trim().length < 10) {
      errors.push('Açıklama en az 10 karakter olmalıdır')
    }
    
    if (!data.date) {
      errors.push('Tarih seçilmelidir')
    } else if (new Date(data.date) < new Date()) {
      errors.push('Etkinlik tarihi gelecekte olmalıdır')
    }
    
    if (!data.location || data.location.trim().length < 3) {
      errors.push('Konum en az 3 karakter olmalıdır')
    }
    
    return errors
  }
} 