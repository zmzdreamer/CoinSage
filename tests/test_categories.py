import pytest


def test_list_categories(app_client):
    client, headers = app_client
    response = client.get("/api/categories", headers=headers)
    assert response.status_code == 200
    data = response.json()
    # Registration seeds 6 default categories per user
    assert len(data) >= 6
    names = [c["name"] for c in data]
    assert "餐饮" in names


def test_category_has_required_fields(app_client):
    client, headers = app_client
    response = client.get("/api/categories", headers=headers)
    cat = response.json()[0]
    assert "id" in cat
    assert "name" in cat
    assert "color" in cat
    assert "icon" in cat
