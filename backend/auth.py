from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from config import auth_settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Hash password at startup — truncate to 72 bytes (bcrypt hard limit)
_password_bytes = auth_settings.admin_password.encode("utf-8")[:72]
_HASHED_PASSWORD = bcrypt.hashpw(_password_bytes, bcrypt.gensalt())


def verify_password(plain: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8")[:72], _HASHED_PASSWORD)


def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(
        minutes=auth_settings.token_expire_mins
    )
    return jwt.encode(payload, auth_settings.secret_key, algorithm=auth_settings.algorithm)


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            auth_settings.secret_key,
            algorithms=[auth_settings.algorithm]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_error
        return {"email": email, "name": payload.get("name", "")}
    except JWTError:
        raise credentials_error
