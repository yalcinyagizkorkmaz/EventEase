# EventEase Backend API

FastAPI ile geliştirilmiş etkinlik yönetim platformu backend API'si.

## 🚀 Kurulum

### 1. Sanal Ortam Oluştur

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# veya
venv\Scripts\activate  # Windows
```

### 2. Bağımlılıkları Yükle

```bash
pip install -r requirements.txt
```

### 3. Environment Variables

`.env` dosyası oluştur:

```env
MONGODB_URL=mongodb://localhost:27017
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
HOST=0.0.0.0
PORT=8000
```

### 4. Sunucuyu Başlat

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 📚 API Dokümantasyonu

Sunucu çalıştıktan sonra:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔗 Endpoint'ler

### Kullanıcı İşlemleri

- `POST /users/` - Yeni kullanıcı oluştur
- `GET /users/` - Tüm kullanıcıları listele

### Etkinlik İşlemleri

- `POST /events/` - Yeni etkinlik oluştur
- `GET /events/` - Tüm etkinlikleri listele
- `GET /events/{event_id}` - Etkinlik detayı
- `PUT /events/{event_id}` - Etkinlik güncelle
- `DELETE /events/{event_id}` - Etkinlik sil

### Sistem

- `GET /` - Ana sayfa
- `GET /health` - Sağlık kontrolü

## 🛠️ Test Etme

### Curl ile Test

```bash
# Sağlık kontrolü
curl http://localhost:8000/health

# Kullanıcı oluştur
curl -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "123456"
  }'

# Etkinlik oluştur
curl -X POST http://localhost:8000/events/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "title": "Test Event",
    "description": "Test Description",
    "date": "2024-01-01T10:00:00",
    "location": "Test Location"
  }'
```

## 🔧 Geliştirme

### Proje Yapısı

```
eventease-backend/
├── main.py              # Ana uygulama
├── requirements.txt     # Python bağımlılıkları
├── .env                # Environment variables
└── README.md           # Bu dosya
```

### Özellikler

- ✅ FastAPI framework
- ✅ MongoDB veritabanı
- ✅ Pydantic modeller
- ✅ CORS desteği
- ✅ JWT authentication (hazırlanıyor)
- ✅ Swagger dokümantasyonu
- ✅ Async/await desteği

## 🔐 Güvenlik

- JWT token authentication
- Password hashing (bcrypt)
- CORS koruması
- Input validation (Pydantic)

## 📝 Notlar

- MongoDB'nin çalışır durumda olduğundan emin ol
- Production'da SECRET_KEY'i değiştir
- CORS origins'i production'da güncelle
