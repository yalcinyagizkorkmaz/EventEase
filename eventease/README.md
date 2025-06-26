# EventEase - Etkinlik Yönetim Platformu

Modern teknolojilerle geliştirilmiş etkinlik yönetim platformu.

## 🚀 Teknolojiler

- **Frontend:** Next.js 15 (App Router), React 19, TailwindCSS 4
- **Backend:** FastAPI (Python)
- **Veritabanı:** MongoDB Atlas
- **ORM:** Prisma
- **Kimlik Doğrulama:** NextAuth.js
- **Deploy:** Vercel (Frontend), Railway/Render (Backend)

## 📋 Özellikler

- ✅ Kullanıcı kayıt ve giriş sistemi
- ✅ Etkinlik oluşturma ve yönetimi
- ✅ Etkinlik listeleme ve detay görüntüleme
- ✅ Responsive tasarım
- ✅ Modern UI/UX

## 🛠️ Kurulum

### Gereksinimler

- Node.js 18+
- npm veya yarn
- MongoDB Atlas hesabı

### 1. Projeyi Klonlayın

```bash
git clone https://github.com/yalcinyagizkorkmaz/EventEase.git
cd EventEase/eventease
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Environment Variables

`.env` dosyasını oluşturun:

```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/eventease"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
NEXT_PUBLIC_API_URL="http://localhost:8000"
```

### 4. Veritabanını Hazırlayın

```bash
npx prisma generate
npx prisma db push
```

### 5. Geliştirme Sunucusunu Başlatın

```bash
npm run dev
```

## 🌐 Production Deploy

### Vercel (Frontend)

1. Vercel'e projeyi bağlayın
2. Environment variables'ları ayarlayın:
   - `DATABASE_URL`
   - `NEXTAUTH_URL` (Vercel URL'niz)
   - `NEXTAUTH_SECRET`
   - `NEXT_PUBLIC_API_URL` (Backend URL'niz)

### Backend API

FastAPI backend'i deploy etmek için:

1. `eventease-backend` klasörüne gidin
2. Railway, Render veya Heroku'ya deploy edin
3. Backend URL'yi `NEXT_PUBLIC_API_URL` olarak ayarlayın

## 🔧 API Entegrasyonu

Proje şu anda backend API'si olmadan da çalışır. API yapılandırıldığında:

1. **Environment Variable Ayarlayın:**

   ```env
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   ```

2. **API Durumu Kontrolü:**
   - API mevcut değilse kullanıcıya uyarı gösterilir
   - Etkinlik oluşturma butonu devre dışı kalır
   - Etkinlik listesi boş gösterilir

## 📁 Proje Yapısı

```
eventease/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── auth/           # Kimlik doğrulama sayfaları
│   │   ├── dashboard/      # Dashboard sayfası
│   │   ├── events/         # Etkinlik sayfaları
│   │   └── page.js         # Ana sayfa
│   ├── components/         # React bileşenleri
│   ├── lib/               # Yardımcı fonksiyonlar
│   │   ├── api.js         # API entegrasyonu
│   │   ├── auth.ts        # NextAuth konfigürasyonu
│   │   └── prisma.ts      # Prisma client
│   └── types/             # TypeScript tipleri
├── prisma/                # Veritabanı şeması
└── public/               # Statik dosyalar
```

## 🔐 Güvenlik

- Şifreler bcrypt ile hashlenir
- JWT token tabanlı kimlik doğrulama
- CORS koruması
- Input validasyonu

## 🐛 Sorun Giderme

### API Bağlantı Sorunları

1. `NEXT_PUBLIC_API_URL` environment variable'ını kontrol edin
2. Backend'in çalışır durumda olduğundan emin olun
3. CORS ayarlarını kontrol edin

### Veritabanı Sorunları

1. MongoDB Atlas bağlantı URL'sini kontrol edin
2. Network Access ayarlarını kontrol edin
3. `npx prisma generate` komutunu çalıştırın

## 📝 Lisans

MIT License

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun
