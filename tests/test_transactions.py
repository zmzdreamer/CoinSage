import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_create_transaction():
    payload = {"amount": 25.5, "category_id": 1, "note": "午饭", "date": "2026-04-15"}
    response = client.post("/api/transactions", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] > 0
    assert data["amount"] == 25.5

def test_list_transactions_by_date():
    response = client.get("/api/transactions?date=2026-04-15")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_delete_transaction():
    payload = {"amount": 10.0, "category_id": 1, "note": "测试", "date": "2026-04-15"}
    created = client.post("/api/transactions", json=payload).json()
    response = client.delete(f"/api/transactions/{created['id']}")
    assert response.status_code == 204

def test_update_transaction():
    payload = {"amount": 30.0, "category_id": 1, "note": "原始", "date": "2026-04-15"}
    created = client.post("/api/transactions", json=payload).json()
    update = {"amount": 55.5, "category_id": 2, "note": "修改后"}
    response = client.patch(f"/api/transactions/{created['id']}", json=update)
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == 55.5
    assert data["category_id"] == 2
    assert data["note"] == "修改后"

def test_update_transaction_not_found():
    response = client.patch("/api/transactions/99999", json={"amount": 1.0, "category_id": 1, "note": ""})
    assert response.status_code == 404
