// API Base URL - Environment variable'dan al, yoksa localhost kullan
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Debug için API URL'yi logla
console.log('API Base URL:', API_BASE_URL)
console.log('Environment:', process.env.NODE_ENV)

// API'nin mevcut olup olmadığını kontrol et
const isApiAvailable = () => true;

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
    if (!isApiAvailable()) {
      throw new Error('API henüz yapılandırılmamış')
    }
    const response = await fetch(`${API_BASE_URL}/health`)
    return handleResponse(response)
  },

  // NextAuth token'ını backend token'ına çevir
  validateNextAuthToken: async (nextAuthToken) => {
    if (!isApiAvailable()) {
      throw new Error('API henüz yapılandırılmamış')
    }
    const response = await fetch(`${API_BASE_URL}/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(nextAuthToken),
    })
    return handleResponse(response)
  },

  // User operations
  createUser: async (userData) => {
    if (!isApiAvailable()) {
      throw new Error('API henüz yapılandırılmamış')
    }
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
    if (!isApiAvailable()) {
      throw new Error('API henüz yapılandırılmamış')
    }
    const response = await fetch(`${API_BASE_URL}/users/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleResponse(response)
  },

  // Event operations
  createEvent: async (eventData, token) => {
    if (!isApiAvailable()) {
      throw new Error('API henüz yapılandırılmamış')
    }
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
    if (!isApiAvailable()) {
      // API yoksa boş array döndür
      return []
    }
    try {
      const response = await fetch(`${API_BASE_URL}/events/`)
      return handleResponse(response)
    } catch (error) {
      console.warn('API erişilemiyor, boş liste döndürülüyor:', error.message)
      return []
    }
  },

  getMyEvents: async (token) => {
    if (!isApiAvailable()) {
      throw new Error('API henüz yapılandırılmamış')
    }
    const response = await fetch(`${API_BASE_URL}/events/my`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleResponse(response)
  },

  getAttendingEvents: async (token) => {
    if (!isApiAvailable()) {
      throw new Error('API henüz yapılandırılmamış')
    }
    const response = await fetch(`${API_BASE_URL}/events/attending`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleResponse(response)
  },

  joinEvent: async (eventId, token) => {
    if (!isApiAvailable()) {
      throw new Error('API henüz yapılandırılmamış')
    }
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleResponse(response)
  },

  leaveEvent: async (eventId, token) => {
    if (!isApiAvailable()) {
      throw new Error('API henüz yapılandırılmamış')
    }
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/leave`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleResponse(response)
  },

  checkAttendance: async (eventId, token) => {
    if (!isApiAvailable()) {
      throw new Error('API henüz yapılandırılmamış')
    }
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/is-attending`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleResponse(response)
  },

  getEvent: async (eventId) => {
    if (!isApiAvailable()) {
      throw new Error('API henüz yapılandırılmamış')
    }
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`)
    return handleResponse(response)
  },

  updateEvent: async (eventId, eventData, token) => {
    if (!isApiAvailable()) {
      throw new Error('API henüz yapılandırılmamış')
    }
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
    if (!isApiAvailable()) {
      throw new Error('API henüz yapılandırılmamış')
    }
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleResponse(response)
  },

  // API durumunu kontrol et
  isAvailable: () => isApiAvailable(),
  
  // API URL'yi döndür (debug için)
  getApiUrl: () => API_BASE_URL
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