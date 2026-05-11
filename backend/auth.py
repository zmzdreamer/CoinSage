import bcrypt
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from backend.database import get_db
from backend.models import UserInfo

def _get_secret_key() -> str:
    with get_db() as db:
        row = db.execute("SELECT value FROM app_config WHERE key='jwt_secret'").fetchone()
        if row:
            return row["value"]
    raise RuntimeError("jwt_secret not found in app_config — has init_db() been called?")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode() if isinstance(hashed, str) else hashed)



def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode(payload, _get_secret_key(), algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInfo:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="登录已过期，请重新登录",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, _get_secret_key(), algorithms=[ALGORITHM])
        sub = payload.get("sub")
        user_id: int = int(sub) if sub is not None else None
        if user_id is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    with get_db() as db:
        row = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    if row is None:
        raise credentials_exc
    return UserInfo(id=row["id"], username=row["username"], is_owner=bool(row["is_owner"]))


def get_owner_user(user: UserInfo = Depends(get_current_user)) -> UserInfo:
    if not user.is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要 Owner 权限")
    return user
