import pytest
from datetime import date


def test_set_monthly_budget(app_client):
    client, headers = app_client
    today = date.today()
    payload = {"amount": 2000.0, "period": "monthly", "year": today.year, "month": today.month}
    response = client.post("/api/budgets", json=payload, headers=headers)
    assert response.status_code == 201
    assert response.json()["amount"] == 2000.0


def test_get_current_budget(app_client):
    client, headers = app_client
    response = client.get("/api/budgets/current", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_budget" in data
    assert "total_spent" in data
    assert "remaining" in data
    assert "days_left" in data
