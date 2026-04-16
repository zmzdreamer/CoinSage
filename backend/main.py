from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from backend.database import get_db, init_db
from backend.routers import categories, transactions, budgets, ai

load_dotenv()

app = FastAPI(title="CoinSage API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    # 本地自托管 PWA，开发阶段放通所有来源
    # 生产部署时替换为具体域名，勿与 allow_credentials=True 同用
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(ai.router)

@app.on_event("startup")
def startup():
    with get_db() as db:
        init_db(db)

@app.get("/health")
def health():
    return {"status": "ok"}
