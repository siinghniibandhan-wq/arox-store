import hashlib, hmac, secrets
from datetime import datetime, timedelta, timezone
import jwt
from app.config import settings
def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return "scrypt$" + salt.hex() + "$" + digest.hex()
def verify_password(password: str, encoded: str) -> bool:
    try:
        scheme, salt_hex, digest_hex = encoded.split("$", 2)
        if scheme != "scrypt": return False
        actual = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1)
        return hmac.compare_digest(actual, bytes.fromhex(digest_hex))
    except (ValueError, TypeError): return False
def hash_token(token: str) -> str: return hashlib.sha256(token.encode()).hexdigest()
def create_access_token(user_id: str) -> str:
    if not settings.jwt_secret_key: raise RuntimeError("JWT_SECRET_KEY must be configured")
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode({"sub": user_id, "exp": expires}, settings.jwt_secret_key, algorithm="HS256")
def decode_access_token(token: str) -> str | None:
    if not settings.jwt_secret_key: return None
    try: return jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"]).get("sub")
    except jwt.PyJWTError: return None
def new_verification_token() -> str: return secrets.token_urlsafe(32)
