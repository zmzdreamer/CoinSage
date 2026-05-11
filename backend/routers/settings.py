from fastapi import APIRouter, Depends
from backend.database import get_db
from backend.models import AISetting, AISettingUpdate, UserInfo
from backend.auth import get_current_user

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/ai", response_model=AISetting)
def get_ai_settings(user: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        row = db.execute("SELECT * FROM ai_settings WHERE id=1").fetchone()
    if row is None:
        return AISetting(provider="openai", model="", api_key="",
                         base_url=None, enabled=False, updated_at="")
    return AISetting(**dict(row))


@router.put("/ai", response_model=AISetting)
def update_ai_settings(body: AISettingUpdate, user: UserInfo = Depends(get_current_user)):
    with get_db() as db:
        db.execute("""
            INSERT INTO ai_settings (id, provider, model, api_key, base_url, enabled, updated_at)
            VALUES (1, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                provider=excluded.provider,
                model=excluded.model,
                api_key=excluded.api_key,
                base_url=excluded.base_url,
                enabled=excluded.enabled,
                updated_at=CURRENT_TIMESTAMP
        """, (body.provider, body.model, body.api_key, body.base_url, int(body.enabled)))
        db.commit()
        row = db.execute("SELECT * FROM ai_settings WHERE id=1").fetchone()
    return AISetting(**dict(row))
