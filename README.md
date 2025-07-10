# EventEase 🎉

EventEase, etkinlik planlama süreçlerini kolaylaştırmak amacıyla geliştirilen bir web platformudur. Organizasyon sahiplerinin etkinliklerini daha verimli yönetmesini sağlarken, hizmet sağlayıcılarıyla doğrudan bağlantı kurmasına da olanak tanır.

## 🚀 Özellikler

- Etkinlik oluşturma ve düzenleme
- Vendor (hizmet sağlayıcı) listeleme ve rezervasyon
- Bütçe planlama ve takip
- Katılımcı yönetimi (RSVP, davet gönderimi)
- WhatsApp üzerinden davet paylaşımı
- Lojistik ve görev yönetimi

## 🛠️ Teknolojiler

- **Frontend**: Next.js, Tailwind CSS
- **Backend**: Node.js, Express
- **Veritabanı**: MongoDB
- **Kimlik Doğrulama**: JWT, Google OAuth
- **Deployment**: Vercel (Frontend), Railway/Render (Backend)

## ⚙️ Kurulum

### 1. Repo'yu klonla
```bash
git clone https://github.com/yalcinyagizkorkmaz/EventEase.git
cd EventEase


##.env
DATABASE_URL=...
NEXTAUTH_URL=...
SECRET_KEY=...
NEXT_PUBLIC_API_URL=...
NEXTAUTH_SECRET=...
ALGORITHM=HS256

#npm install

#npm run dev

🌍 Canlı Demo
Frontend: https://event-ease-phi.vercel.app/

Backend: https://eventease-production.up.railway.app/
