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
    category_id: int
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
