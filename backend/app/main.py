from datetime import datetime, timedelta, timezone
import re
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.config import settings
from app.database import Base, engine, get_db
from app.dependencies import admin_user, current_user
from app.email import send_verification_email
from app.models import Review, ReviewReport, User
from app.moderation import ai_moderation_result, moderate_review
from app.schemas import LoginRequest, RegisterRequest, ReviewCreate, ReviewList, TokenResponse
from app.security import create_access_token, hash_password, hash_token, new_verification_token, verify_password
Base.metadata.create_all(bind=engine)
app = FastAPI(title="Arox Store API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_origin], allow_credentials=True,
                   allow_methods=["GET", "POST", "PATCH"], allow_headers=["Authorization", "Content-Type"])
def valid_app_id(app_id: str) -> bool: return bool(re.fullmatch(r"[a-z0-9][a-z0-9-]{1,99}", app_id))
@app.get("/health")
def health(): return {"status": "ok", "service": "arox-store-api"}
@app.post("/api/auth/register", status_code=202)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        return {"message": "If the address can be registered, a verification email will be sent."}
    token = new_verification_token()
    user = User(email=email, password_hash=hash_password(payload.password),
        verification_token_hash=hash_token(token),
        verification_expires_at=datetime.now(timezone.utc) + timedelta(hours=1))
    db.add(user)
    try:
        db.flush()
        send_verification_email(email, token)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=503, detail="Account registration is temporarily unavailable")
    return {"message": "If the address can be registered, a verification email will be sent."}
@app.post("/api/auth/verify")
def verify_email(token: str = Query(min_length=20), db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.verification_token_hash == hash_token(token)))
    expiry = user.verification_expires_at if user else None
    if not user or not expiry or expiry.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification link is invalid or expired")
    user.is_verified = True
    user.verification_token_hash = None
    user.verification_expires_at = None
    db.commit()
    return {"message": "Email verified. You can now sign in."}
@app.post("/api/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_verified: raise HTTPException(status_code=403, detail="Please verify your email before signing in")
    return TokenResponse(access_token=create_access_token(user.id))
@app.get("/api/auth/me")
def me(user: User = Depends(current_user)): return {"id": user.id, "email": user.email, "is_admin": user.is_admin}
@app.get("/api/apps/{app_id}/reviews", response_model=ReviewList)
def list_reviews(app_id: str, db: Session = Depends(get_db)):
    if not valid_app_id(app_id): raise HTTPException(status_code=404, detail="App not found")
    rows = db.scalars(select(Review).where(Review.app_id == app_id, Review.status == "approved")
        .order_by(Review.created_at.desc()).limit(100)).all()
    average, count = db.execute(select(func.avg(Review.rating), func.count(Review.id))
        .where(Review.app_id == app_id, Review.status == "approved")).one()
    return ReviewList(items=rows, average_rating=round(float(average), 2) if average is not None else None, review_count=count)
@app.post("/api/apps/{app_id}/reviews", status_code=201)
def submit_review(app_id: str, payload: ReviewCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not valid_app_id(app_id): raise HTTPException(status_code=404, detail="App not found")
    if db.scalar(select(Review).where(Review.customer_id == user.id, Review.app_id == app_id)):
        raise HTTPException(status_code=409, detail="You have already reviewed this app")
    decision = moderate_review(payload.title, payload.body, ai_moderation_result(payload.title, payload.body))
    review = Review(customer_id=user.id, app_id=app_id, rating=payload.rating,
        title=payload.title.strip(), body=payload.body.strip(), status=decision.status, moderation_reason=decision.reason)
    db.add(review)
    try: db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="You have already reviewed this app")
    return {"id": review.id, "status": review.status,
        "message": "Review published" if review.status == "approved" else "Review received and queued for moderation"}
@app.post("/api/reviews/{review_id}/report", status_code=202)
def report_review(review_id: str, reason: str = Query(min_length=3, max_length=40),
                  user: User = Depends(current_user), db: Session = Depends(get_db)):
    review = db.get(Review, review_id)
    if not review or review.status != "approved": raise HTTPException(status_code=404, detail="Review not found")
    db.add(ReviewReport(review_id=review.id, reporter_id=user.id, reason=reason.strip()))
    db.commit()
    return {"message": "Report received"}
@app.get("/api/admin/reviews")
def pending_reviews(_: User = Depends(admin_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Review).where(Review.status == "pending").order_by(Review.created_at.asc())).all()
    return [{"id": r.id, "app_id": r.app_id, "rating": r.rating, "title": r.title,
             "body": r.body, "reason": r.moderation_reason} for r in rows]
@app.patch("/api/admin/reviews/{review_id}")
def moderate_held_review(review_id: str, action: str = Query(pattern="^(approve|reject)$"),
                         _: User = Depends(admin_user), db: Session = Depends(get_db)):
    review = db.get(Review, review_id)
    if not review or review.status != "pending": raise HTTPException(status_code=404, detail="Pending review not found")
    review.status = "approved" if action == "approve" else "rejected"
    review.moderation_reason = "admin_override"
    db.commit()
    return {"id": review.id, "status": review.status}
