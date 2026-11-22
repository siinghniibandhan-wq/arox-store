from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.security import decode_access_token
bearer = HTTPBearer(auto_error=False)
def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    user_id = decode_access_token(credentials.credentials) if credentials else None
    user = db.get(User, user_id) if user_id else None
    if not user or not user.is_verified: raise HTTPException(status_code=401, detail="Valid verified customer login required")
    return user
def admin_user(user: User = Depends(current_user)) -> User:
    if not user.is_admin: raise HTTPException(status_code=403, detail="Administrator access required")
    return user
