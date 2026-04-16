import pytest
from fastapi.testclient import TestClient
from datetime import date
from backend.main import app

client = TestClient(app)

def test_set_monthly_budget():
    today = date.today()
    payload = {"amount": 2000.0, "period": "monthly", "year": today.year, "month": today.month}
    response = client.post("/api/budgets", json=payload)
    assert response.status_code == 201
    assert response.json()["amount"] == 2000.0

def test_get_current_budget():
    response = client.get("/api/budgets/current")
    assert response.status_code == 200
    data = response.json()
    assert "total_budget" in data
    assert "total_spent" in data
    assert "remaining" in data
    assert "days_left" in data
