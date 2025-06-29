'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { api, eventHelpers } from '../../../lib/api'

export default function CreateEvent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    maxAttendees: '',
    isPublic: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Form validasyonu
    const validationErrors = eventHelpers.validateEventData(formData)
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '))
      setLoading(false)
      return
    }

    try {
      // API mevcut mu kontrol et
      if (!api.isAvailable()) {
        setError('Backend API henüz yapılandırılmamış. Lütfen daha sonra tekrar deneyin.')
        setLoading(false)
        return
      }

      // Etkinlik verilerini hazırla
      const eventData = {
        title: formData.title,
        description: formData.description,
        date: eventHelpers.formatDateForAPI(formData.date),
        location: formData.location,
        max_attendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
        is_public: formData.isPublic
      }

      // API'ye gönder
      await api.createEvent(eventData, session?.accessToken)
      
      // Başarılı olursa dashboard'a yönlendir
      router.push('/dashboard?message=Etkinlik başarıyla oluşturuldu!')
    } catch (error) {
      console.error('Etkinlik oluşturma hatası:', error)
      setError(error.message || 'Etkinlik oluşturulurken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">EventEase</h1>
            </div>
            <nav className="flex items-center space-x-8">
              <Link href="/events" className="text-gray-500 hover:text-gray-900">
                Etkinlikler
              </Link>
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Yeni Etkinlik Oluştur</h2>
          
          {/* API Durumu */}
          {!api.isAvailable() && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
              <strong>Uyarı:</strong> Backend API henüz yapılandırılmamış. 
              Etkinlik oluşturma özelliği şu anda çalışmıyor.
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-600 mb-2">
                Etkinlik Başlığı *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                value={formData.title}
                onChange={handleChange}
                placeholder="Etkinlik başlığını girin"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-600 mb-2">
                Açıklama *
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={4}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                value={formData.description}
                onChange={handleChange}
                placeholder="Etkinlik açıklamasını girin"
              />
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-600 mb-2">
                Tarih ve Saat *
              </label>
              <input
                type="datetime-local"
                id="date"
                name="date"
                required
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                value={formData.date}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-600 mb-2">
                Konum *
              </label>
              <input
                type="text"
                id="location"
                name="location"
                required
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                value={formData.location}
                onChange={handleChange}
                placeholder="Etkinlik konumunu girin"
              />
            </div>

            <div>
              <label htmlFor="maxAttendees" className="block text-sm font-medium text-gray-600 mb-2">
                Maksimum Katılımcı Sayısı
              </label>
              <input
                type="number"
                id="maxAttendees"
                name="maxAttendees"
                min="1"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                value={formData.maxAttendees}
                onChange={handleChange}
                placeholder="Sınırsız için boş bırakın"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                name="isPublic"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={formData.isPublic}
                onChange={handleChange}
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-600">
                Herkese açık etkinlik
              </label>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <Link
                href="/events"
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                İptal
              </Link>
              <button
                type="submit"
                disabled={loading || !api.isAvailable()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Oluşturuluyor...' : 'Etkinlik Oluştur'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
} 