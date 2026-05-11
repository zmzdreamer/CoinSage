from fastapi import APIRouter, Depends
from pydantic import BaseModel
from backend.database import get_db
from backend.models import AISetting, AISettingUpdate, UserInfo
from backend.auth import get_current_user, get_owner_user

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/ai", response_model=AISetting)
def get_ai_settings(user: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM ai_settings WHERE user_id=?", (user.id,)
        ).fetchone()
    if row is None:
        return AISetting(provider="openai", model="", api_key="",
                         base_url=None, enabled=False, updated_at="")
    return AISetting(**dict(row))


@router.put("/ai", response_model=AISetting)
def update_ai_settings(body: AISettingUpdate, user: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        db.execute("""
            INSERT INTO ai_settings (user_id, provider, model, api_key, base_url, enabled, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
                provider=excluded.provider,
                model=excluded.model,
                api_key=excluded.api_key,
                base_url=excluded.base_url,
                enabled=excluded.enabled,
                updated_at=CURRENT_TIMESTAMP
        """, (user.id, body.provider, body.model, body.api_key, body.base_url, int(body.enabled)))
        db.commit()
        row = db.execute(
            "SELECT * FROM ai_settings WHERE user_id=?", (user.id,)
        ).fetchone()
    return AISetting(**dict(row))


class RegistrationUpdate(BaseModel):
    allow_registration: bool


@router.put("/registration")
def update_registration(body: RegistrationUpdate, _: UserInfo = Depends(get_owner_user)):
    with get_db() as db:
        db.execute(
            "INSERT OR REPLACE INTO app_config (key, value) VALUES ('allow_registration', ?)",
            ("1" if body.allow_registration else "0",)
        )
        db.commit()
    return {"allow_registration": body.allow_registration}
