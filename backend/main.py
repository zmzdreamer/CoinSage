from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from backend.database import get_db, init_db
from backend.routers import categories, transactions, budgets, ai
from backend.routers import auth as auth_router
from backend.routers import settings as settings_router

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    with get_db() as db:
        init_db(db)
    yield

app = FastAPI(title="CoinSage API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(settings_router.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(ai.router)


@app.get("/health")
def health():
    return {"status": "ok"}
