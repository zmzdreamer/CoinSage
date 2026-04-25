from fastapi import APIRouter, HTTPException, status
from backend.database import get_db
from backend.models import UserLogin, Token, UserInfo
from backend.auth import verify_password, create_access_token, get_current_user
from fastapi import Depends

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(body: UserLogin):
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM users WHERE username=?", (body.username,)
        ).fetchone()
    if row is None or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )
    user = UserInfo(id=row["id"], username=row["username"], is_admin=bool(row["is_admin"]))
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=user)


@router.get("/me", response_model=UserInfo)
def me(user: UserInfo = Depends(get_current_user)):
    return user
