from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class Category(BaseModel):
    id: int
    name: str
    color: str
    icon: str

class TransactionCreate(BaseModel):
    amount: float
    category_id: Optional[int] = None
    note: str = ""
    date: date

class Transaction(TransactionCreate):
    id: int
    created_at: datetime

class TransactionUpdate(BaseModel):
    amount: float
    category_id: int
    note: str = ""

class BudgetCreate(BaseModel):
    category_id: Optional[int] = None
    amount: float
    period: str = "monthly"
    year: int
    month: Optional[int] = None

class Budget(BudgetCreate):
    id: int

class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    password: str

class UserInfo(BaseModel):
    id: int
    username: str
    is_owner: bool

class AuthStatus(BaseModel):
    first_run: bool
    registration_open: bool

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo

class AISettingUpdate(BaseModel):
    provider: str
    model: str
    api_key: str
    base_url: Optional[str] = None
    enabled: bool = True

class AISetting(AISettingUpdate):
    updated_at: str

class RecurringCreate(BaseModel):
    name: str
    amount: float
    category_id: Optional[int] = None
    period: str = "monthly"
    day_of_month: int = 1
    month_of_year: Optional[int] = None
    note: str = ""

class Recurring(RecurringCreate):
    id: int
    active: bool
    created_at: datetime
