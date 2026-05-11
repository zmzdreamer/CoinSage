import pytest


def test_create_transaction(app_client):
    client, headers = app_client
    # Use a category seeded at registration for this user
    cats = client.get("/api/categories", headers=headers).json()
    cat_id = cats[0]["id"]

    payload = {"amount": 25.5, "category_id": cat_id, "note": "午饭", "date": "2026-04-15"}
    response = client.post("/api/transactions", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] > 0
    assert data["amount"] == 25.5


def test_list_transactions_by_date(app_client):
    client, headers = app_client
    cats = client.get("/api/categories", headers=headers).json()
    cat_id = cats[0]["id"]

    client.post(
        "/api/transactions",
        json={"amount": 10.0, "category_id": cat_id, "note": "列表测试", "date": "2026-04-15"},
        headers=headers,
    )
    response = client.get("/api/transactions?date=2026-04-15", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_delete_transaction(app_client):
    client, headers = app_client
    cats = client.get("/api/categories", headers=headers).json()
    cat_id = cats[0]["id"]

    payload = {"amount": 10.0, "category_id": cat_id, "note": "测试", "date": "2026-04-15"}
    created = client.post("/api/transactions", json=payload, headers=headers).json()
    response = client.delete(f"/api/transactions/{created['id']}", headers=headers)
    assert response.status_code == 204


def test_update_transaction(app_client):
    client, headers = app_client
    cats = client.get("/api/categories", headers=headers).json()
    cat_id = cats[0]["id"]
    cat_id2 = cats[1]["id"] if len(cats) > 1 else cat_id

    payload = {"amount": 30.0, "category_id": cat_id, "note": "原始", "date": "2026-04-15"}
    created = client.post("/api/transactions", json=payload, headers=headers).json()
    update = {"amount": 55.5, "category_id": cat_id2, "note": "修改后"}
    response = client.patch(f"/api/transactions/{created['id']}", json=update, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == 55.5
    assert data["category_id"] == cat_id2
    assert data["note"] == "修改后"


def test_update_transaction_not_found(app_client):
    client, headers = app_client
    cats = client.get("/api/categories", headers=headers).json()
    cat_id = cats[0]["id"]
    response = client.patch(
        "/api/transactions/99999",
        json={"amount": 1.0, "category_id": cat_id, "note": ""},
        headers=headers,
    )
    assert response.status_code == 404
