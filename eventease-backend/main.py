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

# Environment variables
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"

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

client = MongoClient(DATABASE_URL, server_api=ServerApi('1'))
db = client.eventease

# Bağlantı testi (isteğe bağlı)
try:
    client.admin.command('ping')
    print("MongoDB bağlantısı başarılı!")
except Exception as e:
    print("MongoDB bağlantı hatası:", e)

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
    
    result = db.events.insert_one(event_doc)
    event_doc["id"] = str(result.inserted_id)
    
    return Event(**event_doc)

@app.get("/events/", response_model=List[Event])
async def get_events():
    events = []
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
    return events

@app.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    event = db.events.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
    
    event["id"] = str(event["_id"])
    return Event(**event)

@app.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, event: EventCreate, current_user: dict = Depends(get_current_user)):
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
    
    return Event(**updated_event)

@app.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    # Check if event exists and user is creator
    existing_event = db.events.find_one({"_id": ObjectId(event_id)})
    if not existing_event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
    
    if existing_event["creator_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Bu etkinliği silme yetkiniz yok")
    
    db.events.delete_one({"_id": ObjectId(event_id)})
    return {"message": "Etkinlik başarıyla silindi"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# USERS koleksiyonunda updatedAt alanı eksik veya null olanları güncelle
db.users.update_many(
    {"$or": [{"updatedAt": {"$exists": False}}, {"updatedAt": None}]},
    {"$set": {"updatedAt": datetime.utcnow()}}
)
# Eğer eski kayıtlarınızda updated_at varsa, hepsini updatedAt'e çevirin
for user in db.users.find({"updated_at": {"$exists": True}}):
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"updatedAt": user["updated_at"]}, "$unset": {"updated_at": ""}}
    )

# EVENTS koleksiyonunda updatedAt alanı eksik veya null olanları güncelle
db.events.update_many(
    {"$or": [{"updatedAt": {"$exists": False}}, {"updatedAt": None}]},
    {"$set": {"updatedAt": datetime.utcnow()}}
)
for event in db.events.find({"updated_at": {"$exists": True}}):
    db.events.update_one(
        {"_id": event["_id"]},
        {"$set": {"updatedAt": event["updated_at"]}, "$unset": {"updated_at": ""}}
    )

print("Tüm kullanıcı ve event kayıtlarında updatedAt alanı düzeltildi.")

# Şifreleri hash'le
for user in db.users.find():
    password = user.get("password")
    # Eğer şifre hashli değilse (düz metinse) hashle
    if password and not password.startswith("$2b$"):
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        db.users.update_one({"_id": user["_id"]}, {"$set": {"password": hashed}})
        print(f"{user['email']} için şifre hash'lendi.")
    else:
        print(f"{user['email']} zaten hash'li.")


