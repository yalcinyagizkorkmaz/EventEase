'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { api, eventHelpers } from '../../../lib/api'

export default function EventDetail() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const eventId = params.id

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isAttending, setIsAttending] = useState(false)
  const [attendanceLoading, setAttendanceLoading] = useState(false)

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
      
      // Kullanıcı giriş yapmışsa katılım durumunu kontrol et
      if (session) {
        // Attendance kontrolünü ayrı bir try-catch bloğunda yap
        try {
          await checkAttendanceStatus()
        } catch (error) {
          console.warn('Attendance kontrolü başarısız, varsayılan durum kullanılıyor:', error)
          // Hata durumunda varsayılan olarak katılmamış olarak işaretle
          setIsAttending(false)
        }
      }
    } catch (error) {
      console.error('Etkinlik detayları yüklenirken hata:', error)
      setError(error.message || 'Etkinlik detayları yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const checkAttendanceStatus = async () => {
    try {
      setAttendanceLoading(true)
      
      // NextAuth token'ını backend token'ına çevir
      const backendTokenResponse = await api.validateNextAuthToken({
        id: session?.user?.id,
        email: session?.user?.email,
        name: session?.user?.name,
        role: session?.user?.role || 'USER'
      })

      console.log('Checking attendance for event:', eventId)
      const response = await api.checkAttendance(eventId, backendTokenResponse.access_token)
      console.log('Attendance response:', response)
      setIsAttending(response.is_attending)
    } catch (error) {
      console.error('Katılım durumu kontrol edilirken hata:', error)
      // Hata durumunda varsayılan olarak katılmamış olarak işaretle
      setIsAttending(false)
      // Hata mesajını gösterme, sadece console'a yazdır
    } finally {
      setAttendanceLoading(false)
    }
  }

  const handleJoinEvent = async () => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    try {
      setIsJoining(true)
      
      // NextAuth token'ını backend token'ına çevir
      const backendTokenResponse = await api.validateNextAuthToken({
        id: session?.user?.id,
        email: session?.user?.email,
        name: session?.user?.name,
        role: session?.user?.role || 'USER'
      })

      await api.joinEvent(eventId, backendTokenResponse.access_token)
      alert('Etkinliğe başarıyla katıldınız!')
      // Katılım durumunu güncelle
      setIsAttending(true)
    } catch (error) {
      console.error('Etkinliğe katılma hatası:', error)
      alert(error.message || 'Etkinliğe katılırken bir hata oluştu')
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeaveEvent = async () => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (!confirm('Bu etkinlikten ayrılmak istediğinizden emin misiniz?')) {
      return
    }

    try {
      setIsLeaving(true)
      
      // NextAuth token'ını backend token'ına çevir
      const backendTokenResponse = await api.validateNextAuthToken({
        id: session?.user?.id,
        email: session?.user?.email,
        name: session?.user?.name,
        role: session?.user?.role || 'USER'
      })

      await api.leaveEvent(eventId, backendTokenResponse.access_token)
      alert('Etkinlikten başarıyla ayrıldınız!')
      // Katılım durumunu güncelle
      setIsAttending(false)
    } catch (error) {
      console.error('Etkinlikten ayrılma hatası:', error)
      alert(error.message || 'Etkinlikten ayrılırken bir hata oluştu')
    } finally {
      setIsLeaving(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!confirm('Bu etkinliği silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return
    }

    try {
      // NextAuth token'ını backend token'ına çevir
      const backendTokenResponse = await api.validateNextAuthToken({
        id: session?.user?.id,
        email: session?.user?.email,
        name: session?.user?.name,
        role: session?.user?.role || 'USER'
      })

      await api.deleteEvent(eventId, backendTokenResponse.access_token)
      alert('Etkinlik başarıyla silindi!')
      router.push('/events/my')
    } catch (error) {
      console.error('Etkinlik silme hatası:', error)
      alert(error.message || 'Etkinlik silinirken bir hata oluştu')
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

  const isEventCreator = event && session && event.creator_id === session.user?.id

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
        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Etkinlik detayları yükleniyor...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Event Details */}
        {!loading && event && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Event Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
                  <div className="flex items-center space-x-4 text-blue-100">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      event.is_public 
                        ? 'bg-green-500 text-white' 
                        : 'bg-yellow-500 text-white'
                    }`}>
                      {event.is_public ? 'Herkese Açık' : 'Özel'}
                    </span>
                    {getEventStatus(event.date) && (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEventStatus(event.date).color}`}>
                        {getEventStatus(event.date).text}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  {isEventCreator && (
                    <>
                      <Link
                        href={`/events/${event.id}/edit`}
                        className="bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-gray-100 font-medium"
                      >
                        Düzenle
                      </Link>
                      <button
                        onClick={handleDeleteEvent}
                        className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 font-medium"
                      >
                        Sil
                      </button>
                    </>
                  )}
                  {!isEventCreator && session && (
                    <>
                      {!isAttending ? (
                        <button
                          onClick={handleJoinEvent}
                          disabled={isJoining || attendanceLoading}
                          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 font-medium disabled:opacity-50"
                        >
                          {isJoining ? 'Katılıyor...' : 'Katıl'}
                        </button>
                      ) : (
                        <button
                          onClick={handleLeaveEvent}
                          disabled={isLeaving || attendanceLoading}
                          className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 font-medium disabled:opacity-50"
                        >
                          {isLeaving ? 'Ayrılıyor...' : 'Ayrıl'}
                        </button>
                      )}
                    </>
                  )}
                  {!session && (
                    <Link
                      href="/auth/signin"
                      className="bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-gray-100 font-medium"
                    >
                      Giriş Yap
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Event Content */}
            <div className="p-8">
              {/* Description */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Açıklama</h2>
                <p className="text-gray-700 leading-relaxed">{event.description}</p>
              </div>

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Date & Time */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Tarih ve Saat</h3>
                  <div className="flex items-center text-gray-700">
                    <svg className="w-5 h-5 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{formatDate(event.date)}</span>
                  </div>
                </div>

                {/* Location */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Konum</h3>
                  <div className="flex items-center text-gray-700">
                    <svg className="w-5 h-5 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{event.location}</span>
                  </div>
                </div>

                {/* Attendees */}
                {event.max_attendees && (
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Katılımcılar</h3>
                    <div className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      <span>{event.current_attendees || 0} / {event.max_attendees} katılımcı</span>
                    </div>
                  </div>
                )}

                {/* Created Info */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Oluşturulma</h3>
                  <div className="flex items-center text-gray-700">
                    <svg className="w-5 h-5 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{event.created_at ? formatDate(event.created_at) : 'Bilinmiyor'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 pt-6 border-t border-gray-200">
                <Link
                  href="/events"
                  className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 font-medium"
                >
                  Tüm Etkinlikler
                </Link>
                {isEventCreator && (
                  <Link
                    href="/events/my"
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium"
                  >
                    Etkinliklerim
                  </Link>
                )}
                {session && !isEventCreator && (
                  <Link
                    href="/events/attending"
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 font-medium"
                  >
                    Katıldığım Etkinlikler
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Not Found */}
        {!loading && !event && !error && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Etkinlik bulunamadı</h3>
            <p className="text-gray-500 mb-6">Aradığınız etkinlik mevcut değil veya silinmiş olabilir.</p>
            <Link
              href="/events"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Tüm Etkinliklere Dön
            </Link>
          </div>
        )}
      </main>
    </div>
  )
} 