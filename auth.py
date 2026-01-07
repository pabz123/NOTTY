from jose import jwt
from datetime import datetime, timedelta

SECRET_KEY = "change_this_later"
ALGORITHM = "HS256"

def create_token(user_id: int):
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user():
    return None
