from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js frontend
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

# Helper functions
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # JWT token validation logic here
    # For now, return a mock user
    return {"id": "1", "email": "test@test.com", "role": "USER"}

# Routes
@app.get("/")
async def root():
    return {"message": "EventEase API'ye Hoş Geldiniz!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

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
        **event.dict(),
        "creator_id": current_user["id"],
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    if MONGODB_AVAILABLE and db:
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
    
    if MONGODB_AVAILABLE and db:
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

@app.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    if MONGODB_AVAILABLE and db:
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
    if MONGODB_AVAILABLE and db:
        # Check if event exists and user is creator
        existing_event = db.events.find_one({"_id": ObjectId(event_id)})
        if not existing_event:
            raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
        
        if existing_event["creator_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Bu etkinliği düzenleme yetkiniz yok")
        
        update_data = {
            **event.dict(),
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
            **event.dict(),
            "updated_at": datetime.now()
        })
        updated_event = existing_event
    
    return Event(**updated_event)

@app.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    if MONGODB_AVAILABLE and db:
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

@app.get("/events/my", response_model=List[Event])
async def get_my_events(current_user: dict = Depends(get_current_user)):
    events = []
    
    if MONGODB_AVAILABLE and db:
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
    
    return {"data": events}

@app.get("/events/attending", response_model=List[Event])
async def get_attending_events(current_user: dict = Depends(get_current_user)):
    # Kullanıcının katıldığı etkinlikleri bul
    # Bu örnek için basit bir implementasyon - gerçek uygulamada attendance tablosu olmalı
    events = []
    
    if MONGODB_AVAILABLE and db:
        for event in db.events.find({"is_public": True}):  # Şimdilik sadece public etkinlikler
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
        # Mock data kullan - public etkinlikler
        for event in mock_events:
            if event.get("is_public", True):
                events.append(Event(**event))
    
    return {"data": events}

@app.post("/events/{event_id}/join")
async def join_event(event_id: str, current_user: dict = Depends(get_current_user)):
    # Etkinliğin var olup olmadığını kontrol et
    if MONGODB_AVAILABLE and db:
        event = db.events.find_one({"_id": ObjectId(event_id)})
        if not event:
            raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
    else:
        # Mock data kontrol
        event = next((e for e in mock_events if e["id"] == event_id), None)
        if not event:
            raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
    
    # Kullanıcının zaten katılıp katılmadığını kontrol et
    # Bu örnek için basit bir implementasyon
    return {"message": "Etkinliğe başarıyla katıldınız"}

@app.post("/events/{event_id}/leave")
async def leave_event(event_id: str, current_user: dict = Depends(get_current_user)):
    # Etkinliğin var olup olmadığını kontrol et
    if MONGODB_AVAILABLE and db:
        event = db.events.find_one({"_id": ObjectId(event_id)})
        if not event:
            raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
    else:
        # Mock data kontrol
        event = next((e for e in mock_events if e["id"] == event_id), None)
        if not event:
            raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
    
    # Kullanıcının katılıp katılmadığını kontrol et
    # Bu örnek için basit bir implementasyon
    return {"message": "Etkinlikten başarıyla ayrıldınız"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


