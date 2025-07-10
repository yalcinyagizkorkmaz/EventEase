from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson import ObjectId
from jose import jwt
import bcrypt
import uuid

# Environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
ALGORITHM = "HS256"
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")

app = FastAPI(
    title="EventEase API",
    description="Etkinlik yönetim platformu API'si",
    version="1.0.0"
)

# CORS ayarları
origins = [
    "http://localhost:3000",  # Local development
    "https://event-ease.vercel.app",
    "https://event-ease-c7aiv0cux-yalcin-yagiz-korkmazs-projects.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # 👈 hangi domainlerden gelen istekleri kabul edeceksin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Pydantic Models
class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    role: str
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str
    password: str

class EventBase(BaseModel):
    title: str
    description: str
    date: datetime
    location: str
    max_attendees: Optional[int] = None
    is_public: bool = True

class EventCreate(EventBase):
    pass

class Event(EventBase):
    id: str
    creator_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Database (MongoDB)
DATABASE_URL = os.getenv("DATABASE_URL")

NEXTAUTH_SECRET = os.getenv("NEXTAUTH_SECRET", "206ab6876a8e9d80affcb5b92bdf02e2")

# Geçici olarak MongoDB bağlantısını devre dışı bırak
try:
    client = MongoClient(DATABASE_URL, server_api=ServerApi('1'))
    db = client.eventease
    # Bağlantı testi
    client.admin.command('ping')
    print("MongoDB bağlantısı başarılı!")
    MONGODB_AVAILABLE = True
except Exception as e:
    print("MongoDB bağlantı hatası:", e)
    print("Mock data kullanılacak...")
    MONGODB_AVAILABLE = False
    # Mock database
    db = None

# Mock data for testing
mock_events = []
mock_users = []
mock_attendances = []  # Kullanıcıların katıldığı etkinlikleri takip etmek için

# Test için mock attendance kayıtları ekle
def add_test_attendance_data():
    global mock_attendances, mock_events
    
    # Test etkinlikleri ekle
    mock_events = [
        {
            "id": "test-event-1",
            "title": "Yazılım Geliştirme Meetup",
            "description": "Modern web teknolojileri hakkında konuşacağız. React, Next.js ve backend teknolojileri tartışılacak.",
            "date": datetime.now() + timedelta(days=7),
            "location": "İstanbul Teknoloji Merkezi",
            "max_attendees": 50,
            "is_public": True,
            "creator_id": "2",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        },
        {
            "id": "test-event-2", 
            "title": "Startup Networking Etkinliği",
            "description": "Girişimciler ve yatırımcılar bir araya geliyor. Networking fırsatları ve mentorluk.",
            "date": datetime.now() + timedelta(days=14),
            "location": "Ankara İnovasyon Merkezi",
            "max_attendees": 100,
            "is_public": True,
            "creator_id": "3",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        },
        {
            "id": "test-event-3",
            "title": "Müzik Festivali",
            "description": "Yerel sanatçıların performansları ve canlı müzik. Açık hava etkinliği.",
            "date": datetime.now() + timedelta(days=21),
            "location": "İzmir Kültür Parkı",
            "max_attendees": 200,
            "is_public": True,
            "creator_id": "4",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
    ]
    
    # Test kullanıcısı için attendance kayıtları (kullanıcı ID'si dinamik olacak)
    mock_attendances = []
    print(f"Mock data eklendi: {len(mock_events)} etkinlik hazır")

# Test data'yı ekle
add_test_attendance_data()

# Helper functions
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        # JWT token'ı decode et
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        email = payload.get("email")
        name = payload.get("name")
        role = payload.get("role", "USER")
        
        if user_id is None:
            raise HTTPException(status_code=401, detail="Geçersiz token")
        
        return {
            "id": user_id,
            "email": email,
            "name": name,
            "role": role
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi dolmuş")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Geçersiz token")
    except Exception as e:
        # Debug için geçici olarak mock user döndür
        print(f"Token decode hatası: {e}")
        return {"id": "1", "email": "test@test.com", "role": "USER"}

# Routes
@app.get("/")
async def root():
    return {"message": "EventEase API'ye Hoş Geldiniz!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

# NextAuth token'ını kabul eden endpoint
@app.post("/auth/validate")
async def validate_nextauth_token(token_data: dict):
    try:
        # NextAuth token'ından kullanıcı bilgilerini al
        user_id = token_data.get("id")
        email = token_data.get("email")
        name = token_data.get("name")
        role = token_data.get("role", "USER")
        
        if not user_id or not email:
            raise HTTPException(status_code=401, detail="Geçersiz token")
        
        # Backend JWT token'ı oluştur
        backend_token_data = {
            "sub": user_id,
            "email": email,
            "name": name,
            "role": role
        }
        backend_token = jwt.encode(backend_token_data, SECRET_KEY, algorithm=ALGORITHM)
        
        return {
            "access_token": backend_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": email,
                "name": name,
                "role": role
            }
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token doğrulama hatası: {str(e)}")

# User routes
@app.post("/users/", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate):
    # Check if user already exists
    existing_user = db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email zaten kullanılıyor")
    
    # Create user document
    user_doc = {
        "name": user.name,
        "email": user.email,
        "password": user.password,  # In real app, hash this
        "role": "USER",
        "created_at": datetime.now()
    }
    
    result = db.users.insert_one(user_doc)
    user_doc["id"] = str(result.inserted_id)
    
    return User(**user_doc)


@app.post("/login")
async def login(user: UserLogin):
    db_user = db.users.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=400, detail="Kullanıcı bulunamadı")
    if not bcrypt.checkpw(user.password.encode("utf-8"), db_user["password"].encode("utf-8")):
        raise HTTPException(status_code=400, detail="Şifre yanlış")
    # JWT token üret
    token_data = {
        "sub": str(db_user["_id"]),
        "email": db_user["email"],
        "name": db_user["name"],
        "role": db_user["role"]
    }
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}

@app.get("/users/", response_model=List[User])
async def get_users(current_user: dict = Depends(get_current_user)):
    users = []
    for user in db.users.find():
        # MongoDB ObjectId'yi string'e çevir
        user["id"] = str(user["_id"])
        
        # Eksik alanları varsayılan değerlerle doldur
        if "created_at" not in user:
            user["created_at"] = datetime.now()
        if "role" not in user:
            user["role"] = "USER"
        if "name" not in user:
            user["name"] = "Unknown User"
        if "email" not in user:
            user["email"] = "unknown@example.com"
            
        users.append(User(**user))
    return users

# Event routes
@app.post("/events/", response_model=Event, status_code=status.HTTP_201_CREATED)
async def create_event(event: EventCreate, current_user: dict = Depends(get_current_user)):
    event_doc = {
        **event.model_dump(),
        "creator_id": current_user["id"],
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    if MONGODB_AVAILABLE and db is not None:
        result = db.events.insert_one(event_doc)
        event_doc["id"] = str(result.inserted_id)
    else:
        # Mock data kullan
        event_doc["id"] = str(uuid.uuid4())
        mock_events.append(event_doc)
    
    return Event(**event_doc)

@app.get("/events/", response_model=List[Event])
async def get_events():
    events = []
    
    if MONGODB_AVAILABLE and db is not None:
        for event in db.events.find():
            # MongoDB ObjectId'yi string'e çevir
            event["id"] = str(event["_id"])
            
            # Eksik alanları varsayılan değerlerle doldur
            if "created_at" not in event:
                event["created_at"] = datetime.now()
            if "updated_at" not in event:
                event["updated_at"] = datetime.now()
            if "creator_id" not in event:
                event["creator_id"] = "unknown"
            if "is_public" not in event:
                event["is_public"] = True
                
            events.append(Event(**event))
    else:
        # Mock data kullan
        for event in mock_events:
            events.append(Event(**event))
    
    return events

@app.get("/events/my", response_model=List[Event])
async def get_my_events(current_user: dict = Depends(get_current_user)):
    events = []
    
    if MONGODB_AVAILABLE and db is not None:
        for event in db.events.find({"creator_id": current_user["id"]}):
            # MongoDB ObjectId'yi string'e çevir
            event["id"] = str(event["_id"])
            
            # Eksik alanları varsayılan değerlerle doldur
            if "created_at" not in event:
                event["created_at"] = datetime.now()
            if "updated_at" not in event:
                event["updated_at"] = datetime.now()
            if "creator_id" not in event:
                event["creator_id"] = current_user["id"]
            if "is_public" not in event:
                event["is_public"] = True
                
            events.append(Event(**event))
    else:
        # Mock data kullan - kullanıcının oluşturduğu etkinlikler
        for event in mock_events:
            if event.get("creator_id") == current_user["id"]:
                events.append(Event(**event))
    
    return events

@app.get("/events/attending", response_model=List[Event])
async def get_attending_events(current_user: dict = Depends(get_current_user)):
    # Kullanıcının katıldığı etkinlikleri bul
    events = []
    
    print(f"Kullanıcı ID: {current_user['id']}")
    print(f"MongoDB Available: {MONGODB_AVAILABLE}")
    
    if MONGODB_AVAILABLE and db is not None:
        # Kullanıcının attendance kayıtlarını bul
        attendance_records = db.attendances.find({"user_id": current_user["id"]})
        
        for attendance in attendance_records:
            # Her attendance kaydı için etkinliği bul
            event = db.events.find_one({"_id": ObjectId(attendance["event_id"])})
            if event:
                # MongoDB ObjectId'yi string'e çevir
                event["id"] = str(event["_id"])
                
                # Eksik alanları varsayılan değerlerle doldur
                if "created_at" not in event:
                    event["created_at"] = datetime.now()
                if "updated_at" not in event:
                    event["updated_at"] = datetime.now()
                if "creator_id" not in event:
                    event["creator_id"] = "unknown"
                if "is_public" not in event:
                    event["is_public"] = True
                    
                events.append(Event(**event))
    else:
        # Mock data kullan - kullanıcının katıldığı etkinlikler
        print(f"Mock attendances: {mock_attendances}")
        user_attendances = [a for a in mock_attendances if a["user_id"] == current_user["id"]]
        print(f"User attendances: {user_attendances}")
        print(f"Mock events: {[e.get('id', 'no-id') for e in mock_events]}")
        
        for attendance in user_attendances:
            event = next((e for e in mock_events if e["id"] == attendance["event_id"]), None)
            if event:
                events.append(Event(**event))
    
    print(f"Returning {len(events)} events for user {current_user['id']}")
    return events

@app.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    if MONGODB_AVAILABLE and db is not None:
        event = db.events.find_one({"_id": ObjectId(event_id)})
        if not event:
            raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
        event["id"] = str(event["_id"])
    else:
        # Mock data kullan
        event = next((e for e in mock_events if e["id"] == event_id), None)
        if not event:
            raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
    
    return Event(**event)

@app.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, event: EventCreate, current_user: dict = Depends(get_current_user)):
    if MONGODB_AVAILABLE and db is not None:
        # Check if event exists and user is creator
        existing_event = db.events.find_one({"_id": ObjectId(event_id)})
        if not existing_event:
            raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
        
        if existing_event["creator_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Bu etkinliği düzenleme yetkiniz yok")
        
        update_data = {
            **event.model_dump(),
            "updated_at": datetime.now()
        }
        
        db.events.update_one(
            {"_id": ObjectId(event_id)},
            {"$set": update_data}
        )
        
        updated_event = db.events.find_one({"_id": ObjectId(event_id)})
        updated_event["id"] = str(updated_event["_id"])
    else:
        # Mock data kullan
        existing_event = next((e for e in mock_events if e["id"] == event_id), None)
        if not existing_event:
            raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
        
        if existing_event["creator_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Bu etkinliği düzenleme yetkiniz yok")
        
        # Update mock event
        existing_event.update({
            **event.model_dump(),
            "updated_at": datetime.now()
        })
        updated_event = existing_event
    
    return Event(**updated_event)

@app.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    if MONGODB_AVAILABLE and db is not None:
        # Check if event exists and user is creator
        existing_event = db.events.find_one({"_id": ObjectId(event_id)})
        if not existing_event:
            raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
        
        if existing_event["creator_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Bu etkinliği silme yetkiniz yok")
        
        db.events.delete_one({"_id": ObjectId(event_id)})
    else:
        # Mock data kullan
        existing_event = next((e for e in mock_events if e["id"] == event_id), None)
        if not existing_event:
            raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
        
        if existing_event["creator_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Bu etkinliği silme yetkiniz yok")
        
        # Remove from mock data
        mock_events[:] = [e for e in mock_events if e["id"] != event_id]
    
    return {"message": "Etkinlik başarıyla silindi"}

@app.post("/events/{event_id}/join")
async def join_event(event_id: str, current_user: dict = Depends(get_current_user)):
    # Etkinliğin var olup olmadığını kontrol et
    if MONGODB_AVAILABLE and db is not None:
        event = db.events.find_one({"_id": ObjectId(event_id)})
        if not event:
            raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
        
        # Kullanıcının zaten katılıp katılmadığını kontrol et
        existing_attendance = db.attendances.find_one({
            "user_id": current_user["id"],
            "event_id": event_id
        })
        
        if existing_attendance:
            raise HTTPException(status_code=400, detail="Bu etkinliğe zaten katılmışsınız")
        
        # Attendance kaydı oluştur
        attendance_doc = {
            "user_id": current_user["id"],
            "event_id": event_id,
            "joined_at": datetime.now()
        }
        
        db.attendances.insert_one(attendance_doc)
    else:
        # Mock data kontrol
        event = next((e for e in mock_events if e["id"] == event_id), None)
        if not event:
            raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
        
        # Kullanıcının zaten katılıp katılmadığını kontrol et
        existing_attendance = next((a for a in mock_attendances 
                                  if a["user_id"] == current_user["id"] and a["event_id"] == event_id), None)
        
        if existing_attendance:
            raise HTTPException(status_code=400, detail="Bu etkinliğe zaten katılmışsınız")
        
        # Mock attendance kaydı oluştur
        mock_attendances.append({
            "user_id": current_user["id"],
            "event_id": event_id,
            "joined_at": datetime.now()
        })
        print(f"Kullanıcı {current_user['id']} etkinlik {event_id}'ye katıldı")
        print(f"Toplam attendance kaydı: {len(mock_attendances)}")
    
    return {"message": "Etkinliğe başarıyla katıldınız"}

@app.post("/events/{event_id}/leave")
async def leave_event(event_id: str, current_user: dict = Depends(get_current_user)):
    # Etkinliğin var olup olmadığını kontrol et
    if MONGODB_AVAILABLE and db is not None:
        event = db.events.find_one({"_id": ObjectId(event_id)})
        if not event:
            raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
        
        # Kullanıcının katılıp katılmadığını kontrol et
        existing_attendance = db.attendances.find_one({
            "user_id": current_user["id"],
            "event_id": event_id
        })
        
        if not existing_attendance:
            raise HTTPException(status_code=400, detail="Bu etkinliğe katılmamışsınız")
        
        # Attendance kaydını sil
        db.attendances.delete_one({
            "user_id": current_user["id"],
            "event_id": event_id
        })
    else:
        # Mock data kontrol
        event = next((e for e in mock_events if e["id"] == event_id), None)
        if not event:
            raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
        
        # Kullanıcının katılıp katılmadığını kontrol et
        existing_attendance = next((a for a in mock_attendances 
                                  if a["user_id"] == current_user["id"] and a["event_id"] == event_id), None)
        
        if not existing_attendance:
            raise HTTPException(status_code=400, detail="Bu etkinliğe katılmamışsınız")
        
        # Mock attendance kaydını sil
        mock_attendances[:] = [a for a in mock_attendances 
                             if not (a["user_id"] == current_user["id"] and a["event_id"] == event_id)]
    
    return {"message": "Etkinlikten başarıyla ayrıldınız"}

@app.get("/events/{event_id}/is-attending")
async def check_attendance(event_id: str, current_user: dict = Depends(get_current_user)):
    """Kullanıcının belirli bir etkinliğe katılıp katılmadığını kontrol et"""
    
    if MONGODB_AVAILABLE and db is not None:
        # Attendance kaydını kontrol et
        attendance = db.attendances.find_one({
            "user_id": current_user["id"],
            "event_id": event_id
        })
        
        return {"is_attending": attendance is not None}
    else:
        # Mock data kontrol
        attendance = next((a for a in mock_attendances 
                          if a["user_id"] == current_user["id"] and a["event_id"] == event_id), None)
        
        return {"is_attending": attendance is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


