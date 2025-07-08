'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { api } from '../../../../lib/api'

export default function EditEvent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const eventId = params.id

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    max_attendees: '',
    is_public: true
  })

  useEffect(() => {
    if (eventId) {
      fetchEventDetails()
    }
  }, [eventId])

  const fetchEventDetails = async () => {
    try {
      setLoading(true)
      setError('')

      if (!api.isAvailable()) {
        setError('Backend API henüz yapılandırılmamış.')
        setLoading(false)
        return
      }

      const response = await api.getEvent(eventId)
      setEvent(response)
      
      // Form verilerini doldur
      setFormData({
        title: response.title || '',
        description: response.description || '',
        date: response.date ? new Date(response.date).toISOString().slice(0, 16) : '',
        location: response.location || '',
        max_attendees: response.max_attendees || '',
        is_public: response.is_public !== false
      })

      // Etkinlik oluşturan kişi kontrolü
      if (session && response.creator_id !== session.user?.id) {
        setError('Bu etkinliği düzenleme yetkiniz yok.')
        setLoading(false)
        return
      }
    } catch (error) {
      console.error('Etkinlik detayları yüklenirken hata:', error)
      setError(error.message || 'Etkinlik detayları yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    try {
      setSaving(true)
      setError('')

      // NextAuth token'ını backend token'ına çevir
      const backendTokenResponse = await api.validateNextAuthToken({
        id: session?.user?.id,
        email: session?.user?.email,
        name: session?.user?.name,
        role: session?.user?.role || 'USER'
      })

      await api.updateEvent(eventId, formData, backendTokenResponse.access_token)
      alert('Etkinlik başarıyla güncellendi!')
      router.push(`/events/${eventId}`)
    } catch (error) {
      console.error('Etkinlik güncelleme hatası:', error)
      setError(error.message || 'Etkinlik güncellenirken bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

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

  if (!session) {
    router.push('/auth/signin')
    return null
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
            <h1 className="text-3xl font-bold">Etkinlik Düzenle</h1>
            <p className="text-blue-100 mt-2">Etkinlik bilgilerini güncelleyin</p>
          </div>

          {/* Form */}
          <div className="p-8">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Etkinlik yükleniyor...</p>
              </div>
            ) : error ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Etkinlik Başlığı *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="Etkinlik başlığını girin"
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="Etkinlik açıklamasını girin"
                  />
                </div>

                {/* Date and Time */}
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                    Tarih ve Saat *
                  </label>
                  <input
                    type="datetime-local"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                    Konum *
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="Etkinlik konumunu girin"
                  />
                </div>

                {/* Max Attendees */}
                <div>
                  <label htmlFor="max_attendees" className="block text-sm font-medium text-gray-700 mb-2">
                    Maksimum Katılımcı Sayısı
                  </label>
                  <input
                    type="number"
                    id="max_attendees"
                    name="max_attendees"
                    value={formData.max_attendees}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="Sınırsız için boş bırakın"
                  />
                </div>

                {/* Public/Private */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_public"
                    name="is_public"
                    checked={formData.is_public}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_public" className="ml-2 block text-sm text-gray-700">
                    Herkese açık etkinlik
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <Link
                    href={`/events/${eventId}`}
                    className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 font-medium"
                  >
                    İptal
                  </Link>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
} 