from fastapi import APIRouter, HTTPException, status, Depends
from backend.database import get_db
from backend.models import UserLogin, UserRegister, AuthStatus, Token, UserInfo
from backend.auth import verify_password, create_access_token, get_current_user
import bcrypt

router = APIRouter(prefix="/api/auth", tags=["auth"])

DEFAULT_CATEGORIES = [
    ('餐饮', '#f97316', 'utensils'),
    ('交通', '#3b82f6', 'car'),
    ('购物', '#ec4899', 'shopping-bag'),
    ('娱乐', '#8b5cf6', 'gamepad'),
    ('医疗', '#ef4444', 'heart'),
    ('其他', '#6b7280', 'more-horizontal'),
]


def _seed_categories(db, user_id: int):
    for name, color, icon in DEFAULT_CATEGORIES:
        db.execute(
            "INSERT OR IGNORE INTO categories (user_id, name, color, icon) VALUES (?,?,?,?)",
            (user_id, name, color, icon)
        )


@router.get("/status", response_model=AuthStatus)
def auth_status():
    with get_db() as db:
        user_count = db.execute("SELECT COUNT(*) as n FROM users").fetchone()["n"]
        reg_row = db.execute(
            "SELECT value FROM app_config WHERE key='allow_registration'"
        ).fetchone()
    registration_open = (reg_row["value"] == "1") if reg_row else True
    return AuthStatus(first_run=(user_count == 0), registration_open=registration_open)


@router.post("/register", response_model=Token, status_code=201)
def register(body: UserRegister):
    # Validate inputs first (fast fail, no DB needed)
    if not body.username.strip():
        raise HTTPException(status_code=400, detail="用户名不能为空")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="密码至少 6 位")

    with get_db() as db:
        db.execute("BEGIN EXCLUSIVE")
        user_count = db.execute("SELECT COUNT(*) as n FROM users").fetchone()["n"]
        is_first = user_count == 0

        if not is_first:
            reg_row = db.execute(
                "SELECT value FROM app_config WHERE key='allow_registration'"
            ).fetchone()
            if not reg_row or reg_row["value"] != "1":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="注册已关闭，请联系管理员"
                )

        existing = db.execute(
            "SELECT id FROM users WHERE username=?", (body.username.strip(),)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="用户名已被占用")

        pw_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
        cur = db.execute(
            "INSERT INTO users (username, password_hash, is_owner) VALUES (?,?,?)",
            (body.username.strip(), pw_hash, 1 if is_first else 0)
        )
        user_id = cur.lastrowid
        _seed_categories(db, user_id)
        db.commit()
        row = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()

    user = UserInfo(id=row["id"], username=row["username"], is_owner=bool(row["is_owner"]))
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=user)


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
    user = UserInfo(id=row["id"], username=row["username"], is_owner=bool(row["is_owner"]))
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=user)


@router.get("/me", response_model=UserInfo)
def me(user: UserInfo = Depends(get_current_user)):
    return user
