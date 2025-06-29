'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { api } from '../../../lib/api'

export default function AttendingEvents() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && session) {
      fetchAttendingEvents()
    }
  }, [status, session])

  const fetchAttendingEvents = async () => {
    try {
      setLoading(true)
      setError('')

      if (!api.isAvailable()) {
        setError('Backend API henüz yapılandırılmamış.')
        setLoading(false)
        return
      }

      // NextAuth token'ını backend token'ına çevir
      const backendTokenResponse = await api.validateNextAuthToken({
        id: session?.user?.id,
        email: session?.user?.email,
        name: session?.user?.name,
        role: session?.user?.role || 'USER'
      })

      const response = await api.getAttendingEvents(backendTokenResponse.access_token)
      setEvents(response || [])
    } catch (error) {
      console.error('Katıldığım etkinlikler yüklenirken hata:', error)
      setError(error.message || 'Etkinlikler yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveEvent = async (eventId) => {
    if (!confirm('Bu etkinlikten ayrılmak istediğinizden emin misiniz?')) {
      return
    }

    try {
      await api.leaveEvent(eventId, session?.accessToken)
      // Etkinlik listesini güncelle
      setEvents(events.filter(event => event.id !== eventId))
    } catch (error) {
      console.error('Etkinlikten ayrılma hatası:', error)
      alert('Etkinlikten ayrılırken bir hata oluştu')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEventStatus = (eventDate) => {
    const now = new Date()
    const eventTime = new Date(eventDate)
    
    if (eventTime < now) {
      return { status: 'completed', text: 'Tamamlandı', color: 'bg-gray-100 text-gray-800' }
    } else if (eventTime - now < 24 * 60 * 60 * 1000) { // 24 saat içinde
      return { status: 'upcoming', text: 'Yakında', color: 'bg-orange-100 text-orange-800' }
    } else {
      return { status: 'future', text: 'Gelecek', color: 'bg-blue-100 text-blue-800' }
    }
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

  if (status === 'unauthenticated') {
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Katıldığım Etkinlikler</h2>
          <Link
            href="/events"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Yeni Etkinlik Bul
          </Link>
        </div>

        {/* API Durumu */}
        {!api.isAvailable() && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
            <strong>Uyarı:</strong> Backend API henüz yapılandırılmamış. 
            Katıldığınız etkinlikler şu anda görüntülenemiyor.
          </div>
        )}

        {/* Hata Mesajı */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Etkinlikler yükleniyor...</p>
          </div>
        )}

        {/* Etkinlik Listesi */}
        {!loading && events.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz hiçbir etkinliğe katılmadınız</h3>
            <p className="text-gray-500 mb-6">Etkinliklere katılmak için aşağıdaki butona tıklayın.</p>
            <Link
              href="/events"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Etkinlikleri Keşfet
            </Link>
          </div>
        )}

        {/* Etkinlik Kartları */}
        {!loading && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const eventStatus = getEventStatus(event.date)
              return (
                <div key={event.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-semibold text-gray-900 line-clamp-2">
                        {event.title}
                      </h3>
                      <div className="flex flex-col items-end space-y-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${eventStatus.color}`}>
                          {eventStatus.text}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          event.is_public 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {event.is_public ? 'Herkese Açık' : 'Özel'}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {event.description}
                    </p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(event.date)}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {event.location}
                      </div>
                      {event.max_attendees && (
                        <div className="flex items-center text-sm text-gray-500">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          {event.current_attendees || 0} / {event.max_attendees} katılımcı
                        </div>
                      )}
                      {event.organizer && (
                        <div className="flex items-center text-sm text-gray-500">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Organizatör: {event.organizer.name || event.organizer.email}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => handleLeaveEvent(event.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                        disabled={eventStatus.status === 'completed'}
                      >
                        {eventStatus.status === 'completed' ? 'Tamamlandı' : 'Ayrıl'}
                      </button>
                      <Link
                        href={`/events/${event.id}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                      >
                        Detaylar
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
} 